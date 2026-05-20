import { store } from '@/Store/Store'
import {
  setSyncPhase,
  setSyncProgress,
  setIsFirstRun,
  setLastSyncedAt,
} from '@/Store/analyticsSlice'
import { setToast } from '@/Store/Slices/Extras'
import { analyticsDb, appendToTimeSeries } from '@/lib/analyticsDb'
import { parseSatsFromZap, getETag, getTitleFromEvent } from './zapUtils'
import { dateKeyFromTimestamp, delay } from './timeUtils'

const BATCH_SIZE = 200
const FETCH_TIMEOUT_MS = 8000

export class AnalyticsSyncEngine {
  constructor(ndk, pubkey) {
    this.ndk = ndk
    this.pubkey = pubkey
    this._liveSubscription = null
    this._lastKind3CreatedAt = 0
  }

  async initialize() {
    try {
      store.dispatch(setSyncPhase('backfill'))
      store.dispatch(setSyncProgress({ percent: 0, message: 'Connecting to relays…' }))

      await this._waitForConnection()

      // Check how many events we've already processed for this pubkey
      const processedCount = await analyticsDb.processedEvents.count()
      const authoredCursor = await analyticsDb.syncCursors.get(
        `${this.pubkey}::authored`
      )

      // Treat as first run if no cursor OR cursor exists but DB is empty
      // (handles the case where cursor was written but backfill got 0 events)
      const isFirstRun = !authoredCursor || processedCount === 0

      if (isFirstRun) {
        // Clear any stale cursors so backfill starts fresh
        await analyticsDb.syncCursors.clear()
        store.dispatch(setIsFirstRun(true))
        await this.fullBackfill()
      } else {
        await this.deltaSync()
      }

      this.openLiveSubscription()
      store.dispatch(setSyncPhase('live'))
      store.dispatch(setIsFirstRun(false))
    } catch (err) {
      console.error('[SyncEngine] initialize error', err)
      store.dispatch(setSyncPhase('error'))
      store.dispatch(setIsFirstRun(false))
    }
  }

  _waitForConnection() {
    return new Promise((resolve) => {
      const connected = () => this.ndk.pool?.connectedRelays().length > 0
      if (connected()) {
        console.log('[SyncEngine] relay already connected')
        return resolve()
      }
      console.log('[SyncEngine] waiting for relay connection…')
      const check = setInterval(() => {
        if (connected()) {
          clearInterval(check)
          console.log('[SyncEngine] relay connected, starting sync')
          resolve()
        }
      }, 100)
      setTimeout(() => {
        clearInterval(check)
        console.warn('[SyncEngine] relay connection timeout — proceeding anyway')
        resolve()
      }, 15_000)
    })
  }

  async fullBackfill() {
    store.dispatch(setSyncPhase('backfill'))

    const authoredFilters = {
      authors: [this.pubkey],
      kinds: [1, 3, 6, 7, 30023, 30024],
    }
    const receivedFilters = {
      '#p': [this.pubkey],
      kinds: [3, 6, 7, 9735],
    }

    const authoredCount = await this._paginatedFetch(authoredFilters, 'authored content')
    const receivedCount = await this._paginatedFetch(receivedFilters, 'received interactions')

    console.log(`[SyncEngine] backfill done — authored: ${authoredCount}, received: ${receivedCount}`)

    // Only write cursor if we actually got events, so a relay timeout
    // doesn't permanently mark the account as synced with 0 data
    if (authoredCount > 0 || receivedCount > 0) {
      const now = Math.floor(Date.now() / 1000)
      await analyticsDb.syncCursors.put({
        key: `${this.pubkey}::authored`,
        pubkey: this.pubkey,
        filterGroup: 'authored',
        since: now,
        lastSyncedAt: now,
      })
      await analyticsDb.syncCursors.put({
        key: `${this.pubkey}::received`,
        pubkey: this.pubkey,
        filterGroup: 'received',
        since: now,
        lastSyncedAt: now,
      })
      store.dispatch(setLastSyncedAt(now))
    } else {
      console.warn('[SyncEngine] backfill got 0 events — cursor not written, will retry next visit')
    }

    store.dispatch(setSyncPhase('done'))
  }

  // Returns total events processed in this fetch
  async _paginatedFetch(baseFilters, label) {
    const now = Math.floor(Date.now() / 1000)
    const THREE_YEARS_AGO = now - 3 * 365 * 24 * 3600
    let until = now
    let totalProcessed = 0
    let page = 0
    const MAX_PAGES = 200 // 200 × 200 = 40,000 events max

    while (page < MAX_PAGES) {
      page++

      // Progress based on how far back in time we've reached vs 3-year window
      const timePercent = Math.round(((now - until) / (now - THREE_YEARS_AGO)) * 90)
      store.dispatch(
        setSyncProgress({
          percent: Math.min(95, timePercent),
          message: `Fetching ${label}… ${totalProcessed} events`,
        })
      )

      const filters = { ...baseFilters, until, limit: BATCH_SIZE }
      const events = await this._fetchPage(filters)

      console.log(`[SyncEngine] ${label} page ${page} got ${events.length} events`)

      if (events.length === 0) break

      for (const event of events) {
        await this.processEvent(event)
      }
      totalProcessed += events.length

      if (events.length < BATCH_SIZE) break

      const oldest = events.reduce(
        (min, e) => (e.created_at < min ? e.created_at : min),
        events[0].created_at
      )
      until = oldest - 1

      await delay(300)
    }

    return totalProcessed
  }

  _fetchPage(filters) {
    return new Promise((resolve) => {
      const events = new Map()
      let resolved = false

      const done = (reason) => {
        if (resolved) return
        resolved = true
        console.log(`[SyncEngine] _fetchPage done (${reason}) with ${events.size} events`)
        resolve(Array.from(events.values()))
      }

      const sub = this.ndk.subscribe(filters, {
        closeOnEose: true,
        groupable: false,
      })

      sub.on('event', (event) => {
        events.set(event.id, event)
      })

      sub.on('eose', () => done('eose'))

      setTimeout(() => done('timeout'), FETCH_TIMEOUT_MS)
    })
  }

  async deltaSync() {
    store.dispatch(setSyncPhase('delta'))

    const [authoredCursor, receivedCursor] = await Promise.all([
      analyticsDb.syncCursors.get(`${this.pubkey}::authored`),
      analyticsDb.syncCursors.get(`${this.pubkey}::received`),
    ])

    const authoredSince = authoredCursor?.since ?? 0
    const receivedSince = receivedCursor?.since ?? 0

    console.log(`[SyncEngine] deltaSync since authored=${authoredSince} received=${receivedSince}`)

    const [authoredEvents, receivedEvents] = await Promise.all([
      this._fetchPage({ authors: [this.pubkey], kinds: [1, 3, 6, 7, 30023, 30024], since: authoredSince }),
      this._fetchPage({ '#p': [this.pubkey], kinds: [3, 6, 7, 9735], since: receivedSince }),
    ])

    for (const event of [...authoredEvents, ...receivedEvents]) {
      await this.processEvent(event)
    }

    const now = Math.floor(Date.now() / 1000)
    await analyticsDb.syncCursors.put({
      key: `${this.pubkey}::authored`,
      pubkey: this.pubkey,
      filterGroup: 'authored',
      since: now,
      lastSyncedAt: now,
    })
    await analyticsDb.syncCursors.put({
      key: `${this.pubkey}::received`,
      pubkey: this.pubkey,
      filterGroup: 'received',
      since: now,
      lastSyncedAt: now,
    })

    store.dispatch(setLastSyncedAt(now))
  }

  openLiveSubscription() {
    const now = Math.floor(Date.now() / 1000)

    this._liveSubscription = this.ndk.subscribe(
      [
        { authors: [this.pubkey], kinds: [1, 3, 6, 7, 30023, 30024], since: now },
        { '#p': [this.pubkey], kinds: [3, 6, 7, 9735], since: now },
      ],
      { closeOnEose: false, groupable: false }
    )

    this._liveSubscription.on('event', async (event) => {
      await this.processEvent(event)
      const toast = this._buildLiveToast(event)
      if (toast) store.dispatch(setToast(toast))
    })
  }

  _buildLiveToast(event) {
    switch (event.kind) {
      case 9735: {
        const sats = parseSatsFromZap(event)
        return { desc: `You received ${sats.toLocaleString()} sats`, type: 1, icon: 'bolt-bold' }
      }
      case 7:
        return { desc: 'Someone reacted to your content', type: 1, icon: 'heart' }
      case 6:
        return { desc: 'Someone reposted your content', type: 1, icon: 'buzz' }
      case 3:
        return { desc: 'Someone followed you', type: 1, icon: 'user-followed' }
      default:
        return null
    }
  }

  async processEvent(event) {
    const existing = await analyticsDb.processedEvents.get(event.id)
    if (existing) return

    await analyticsDb.processedEvents.put({
      eventId: event.id,
      processedAt: Date.now(),
    })

    // Use the event's own creation date so backfilled events land on the right day
    const dateKey = dateKeyFromTimestamp(event.created_at)

    switch (event.kind) {
      case 1:     await this._processNote(event, dateKey);        break
      case 30023: await this._processArticle(event);              break
      case 30024: await this._processDraft(event);                break
      case 7:     await this._processReaction(event, dateKey);    break
      case 6:     await this._processRepost(event);               break
      case 9735:  await this._processZap(event, dateKey);         break
      case 3:     await this._processContactList(event, dateKey); break
    }
  }

  async _processNote(event, today) {
    if (event.pubkey !== this.pubkey) return
    await this._upsertContentStats({
      eventId: event.id,
      authorPubkey: this.pubkey,
      kind: 1,
      publishedAt: event.created_at,
      title: '',
      summary: event.content.slice(0, 120),
    })
    await this._modifyProfileStats((row) => {
      row.notesCount = (row.notesCount || 0) + 1
      row.dailyNotes = appendToTimeSeries(row.dailyNotes || [], today, 'count', 1)
    })
  }

  async _processArticle(event) {
    if (event.pubkey !== this.pubkey) return
    await this._upsertContentStats({
      eventId: event.id,
      authorPubkey: this.pubkey,
      kind: 30023,
      publishedAt: event.created_at,
      title: getTitleFromEvent(event),
      summary: event.content.slice(0, 120),
    })
    await this._modifyProfileStats((row) => {
      row.articlesCount = (row.articlesCount || 0) + 1
    })
  }

  async _processDraft(event) {
    if (event.pubkey !== this.pubkey) return
    await this._modifyProfileStats((row) => {
      row.draftsCount = (row.draftsCount || 0) + 1
    })
  }

  async _processReaction(event, today) {
    const eTag = getETag(event)
    if (event.pubkey === this.pubkey) {
      await this._modifyProfileStats((row) => {
        row.reactionsGiven = (row.reactionsGiven || 0) + 1
      })
    } else if (eTag) {
      await analyticsDb.contentStats.where('eventId').equals(eTag).modify((row) => {
        row.reactionsCount = (row.reactionsCount || 0) + 1
      })
      await analyticsDb.statEvents.put({
        eventId: event.id,
        contentEventId: eTag,
        createdAt: event.created_at,
        statType: 'reaction',
        value: 1,
      })
      await this._modifyProfileStats((row) => {
        row.reactionsReceived = (row.reactionsReceived || 0) + 1
        row.dailyReactions = appendToTimeSeries(row.dailyReactions || [], today, 'count', 1)
      })
    }
  }

  async _processRepost(event) {
    const eTag = getETag(event)
    if (event.pubkey === this.pubkey) {
      await this._modifyProfileStats((row) => {
        row.repostsGiven = (row.repostsGiven || 0) + 1
      })
    } else if (eTag) {
      await analyticsDb.contentStats.where('eventId').equals(eTag).modify((row) => {
        row.repostsCount = (row.repostsCount || 0) + 1
      })
      await this._modifyProfileStats((row) => {
        row.repostsReceived = (row.repostsReceived || 0) + 1
      })
    }
  }

  async _processZap(event, today) {
    const sats = parseSatsFromZap(event)
    const eTag = getETag(event)
    if (eTag) {
      await analyticsDb.contentStats.where('eventId').equals(eTag).modify((row) => {
        row.zapsCount = (row.zapsCount || 0) + 1
        row.zapsSats = (row.zapsSats || 0) + sats
      })
      await analyticsDb.statEvents.put({
        eventId: event.id,
        contentEventId: eTag,
        createdAt: event.created_at,
        statType: 'zap',
        value: sats,
      })
    }
    await this._modifyProfileStats((row) => {
      row.zapsReceivedCount = (row.zapsReceivedCount || 0) + 1
      row.zapsReceivedSats = (row.zapsReceivedSats || 0) + sats
      row.dailyZapsSats = appendToTimeSeries(row.dailyZapsSats || [], today, 'sats', sats)
    })
  }

  async _processContactList(event, today) {
    if (event.created_at <= this._lastKind3CreatedAt) return
    this._lastKind3CreatedAt = event.created_at

    if (event.pubkey === this.pubkey) {
      const followingCount = event.tags.filter((t) => t[0] === 'p').length
      await this._modifyProfileStats((row) => {
        row.followingCount = followingCount
      })
    } else {
      await this._modifyProfileStats((row) => {
        row.followersCount = (row.followersCount || 0) + 1
        row.dailyFollowers = appendToTimeSeries(row.dailyFollowers || [], today, 'count', 1)
      })
    }
  }

  async _upsertContentStats(data) {
    const existing = await analyticsDb.contentStats.get(data.eventId)
    if (existing) return
    await analyticsDb.contentStats.put({
      reactionsCount: 0,
      repostsCount: 0,
      repliesCount: 0,
      zapsCount: 0,
      zapsSats: 0,
      ...data,
    })
  }

  async _modifyProfileStats(mutator) {
    const existing = await analyticsDb.profileStats.get(this.pubkey)
    if (existing) {
      mutator(existing)
      await analyticsDb.profileStats.put(existing)
    } else {
      const blank = this._blankProfileStats()
      mutator(blank)
      await analyticsDb.profileStats.put(blank)
    }
  }

  _blankProfileStats() {
    return {
      pubkey: this.pubkey,
      notesCount: 0,
      articlesCount: 0,
      draftsCount: 0,
      reactionsGiven: 0,
      repostsGiven: 0,
      reactionsReceived: 0,
      repostsReceived: 0,
      repliesReceived: 0,
      zapsReceivedCount: 0,
      zapsReceivedSats: 0,
      followingCount: 0,
      followersCount: 0,
      dailyZapsSats: [],
      dailyReactions: [],
      dailyNotes: [],
      dailyFollowers: [],
    }
  }
}
