import { store } from '@/Store/Store'
import {
  setSyncPhase,
  setSyncProgress,
  setIsFirstRun,
  setLastSyncedAt,
} from '@/Store/analyticsSlice'
import { setToast } from '@/Store/Slices/Extras'
import { analyticsDb, appendToTimeSeries } from '@/lib/analyticsDb'
import { parseSatsFromZap, getETag, getTitleFromEvent, getDTag } from './zapUtils'
import { dateKeyFromTimestamp, delay } from './timeUtils'

const BATCH_SIZE = 200
const FETCH_TIMEOUT_MS = 8000

export class AnalyticsSyncEngine {
  constructor(ndk, pubkey) {
    this.ndk = ndk
    this.pubkey = pubkey
    this._liveSubscription = null
  }

  async initialize(attempt = 1) {
    const MAX_ATTEMPTS = 3
    try {
      store.dispatch(setSyncPhase('backfill'))
      store.dispatch(setSyncProgress({ percent: 0, message: 'Connecting to relays…' }))

      await this._waitForConnection()

      const processedCount = await analyticsDb.processedEvents
        .where('ownerPubkey')
        .equals(this.pubkey)
        .count()
      const authoredCursor = await analyticsDb.syncCursors.get(
        `${this.pubkey}::authored`
      )

      const isFirstRun = !authoredCursor || processedCount === 0

      if (isFirstRun) {
        // Only this account's cursors — clearing the whole table would restart
        // every other signed-in account's backfill from scratch.
        await analyticsDb.syncCursors
          .where('pubkey')
          .equals(this.pubkey)
          .delete()
        store.dispatch(setIsFirstRun(true))
        await this.fullBackfill()
      } else {
        await this._resumeIncompleteBackfills()
        await this.deltaSync()
      }

      this.openLiveSubscription()
      store.dispatch(setSyncPhase('live'))
      store.dispatch(setIsFirstRun(false))
    } catch (err) {
      console.error(`[SyncEngine] initialize error (attempt ${attempt}/${MAX_ATTEMPTS})`, err)
      if (attempt < MAX_ATTEMPTS) {
        // Transient failures (relays still coming up right after login, brief
        // network drop) shouldn't leave sync permanently stuck until the user
        // navigates away and back. Back off and retry the whole init.
        await delay(2000 * attempt)
        return this.initialize(attempt + 1)
      }
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
      kinds: [6, 7, 9735],
    }

    const authoredCount = await this._paginatedFetch(authoredFilters, 'authored', 'authored content')
    const receivedCount = await this._paginatedFetch(receivedFilters, 'received', 'received interactions')
    const followerCount = await this._paginatedFetch(
      { '#p': [this.pubkey], kinds: [3] },
      'followers',
      'followers'
    )

    console.log(`[SyncEngine] backfill done — authored: ${authoredCount}, received: ${receivedCount}, followers: ${followerCount}`)

    store.dispatch(setLastSyncedAt(Math.floor(Date.now() / 1000)))
    store.dispatch(setSyncPhase('done'))
  }

  // Resumes any backfill (authored/received/followers) that was interrupted before reaching the
  // oldest event — a cursor left in filterGroup `${key}-backfill` state means the previous run
  // stopped mid-pagination (tab closed, relay drop) rather than genuinely running out of events.
  async _resumeIncompleteBackfills() {
    const keys = ['authored', 'received', 'followers']
    const filterMap = {
      authored: { authors: [this.pubkey], kinds: [1, 3, 6, 7, 30023, 30024] },
      received: { '#p': [this.pubkey], kinds: [6, 7, 9735] },
      followers: { '#p': [this.pubkey], kinds: [3] },
    }
    for (const key of keys) {
      const cursor = await analyticsDb.syncCursors.get(`${this.pubkey}::${key}`)
      if (cursor?.filterGroup === `${key}-backfill`) {
        store.dispatch(setSyncPhase('backfill'))
        await this._paginatedFetch(filterMap[key], key, key, cursor.until)
      }
    }
  }

  // Paginates a filter backwards in time via `until`, persisting progress after every page so a
  // reload resumes instead of restarting. Only stops when a page returns 0 events — a page
  // shorter than BATCH_SIZE does NOT mean history is exhausted, since relays commonly cap the
  // number of events returned per request below the requested `limit` even when older events
  // still exist upstream.
  async _paginatedFetch(baseFilters, cursorKey, label, resumeUntil) {
    const now = Math.floor(Date.now() / 1000)
    const THREE_YEARS_AGO = now - 3 * 365 * 24 * 3600
    let until = resumeUntil ?? now
    let totalProcessed = 0
    let page = 0
    let fullyDrained = false
    const MAX_PAGES = 500

    while (page < MAX_PAGES) {
      page++

      const timePercent = Math.round(((now - until) / (now - THREE_YEARS_AGO)) * 90)
      store.dispatch(
        setSyncProgress({
          percent: Math.min(95, timePercent),
          message: `Fetching ${label}… ${totalProcessed} events`,
        })
      )

      const filters = { ...baseFilters, until, limit: BATCH_SIZE }
      const { events, complete } = await this._fetchPageReliably(filters)

      console.log(`[SyncEngine] ${label} page ${page} got ${events.length} events (complete=${complete})`)

      if (!complete && events.length === 0) {
        // Relays never confirmed EOSE for this window after retries — stop for now without
        // advancing `until`, so the next sync resumes this exact window instead of skipping it.
        console.warn(`[SyncEngine] ${label} page never completed, stopping — will resume same window next sync`)
        break
      }

      if (events.length > 0) {
        for (const event of events) {
          await this.processEvent(event)
        }
        totalProcessed += events.length
      }

      if (!complete) {
        // Got a partial batch before giving up on EOSE — persist what we found, but keep `until`
        // where it was so the next run re-fetches this window and picks up anything missed.
        await analyticsDb.syncCursors.put({
          key: `${this.pubkey}::${cursorKey}`,
          pubkey: this.pubkey,
          filterGroup: `${cursorKey}-backfill`,
          until,
          lastSyncedAt: Math.floor(Date.now() / 1000),
        })
        break
      }

      if (events.length === 0) {
        fullyDrained = true
        break
      }

      const oldest = events.reduce(
        (min, e) => (e.created_at < min ? e.created_at : min),
        events[0].created_at
      )
      until = oldest - 1

      await analyticsDb.syncCursors.put({
        key: `${this.pubkey}::${cursorKey}`,
        pubkey: this.pubkey,
        filterGroup: `${cursorKey}-backfill`,
        until,
        lastSyncedAt: Math.floor(Date.now() / 1000),
      })

      await delay(300)
    }

    // Only write the terminal "complete" cursor when pagination genuinely ran out of events
    // (relay-confirmed EOSE with 0 results). Any other exit (timeout, MAX_PAGES) leaves the
    // `-backfill` cursor in place so the next sync resumes instead of silently giving up.
    if (fullyDrained) {
      const finishedNow = Math.floor(Date.now() / 1000)
      await analyticsDb.syncCursors.put({
        key: `${this.pubkey}::${cursorKey}`,
        pubkey: this.pubkey,
        filterGroup: cursorKey,
        since: finishedNow,
        lastSyncedAt: finishedNow,
      })
    }

    return totalProcessed
  }

  // Resolves with { events, complete }. `complete` is true only when relays actually sent EOSE —
  // if the timeout wins the race first, the page is a partial snapshot and must NOT be treated as
  // a real page boundary (advancing `until` from a timed-out partial batch skips unfetched history).
  _fetchPage(filters) {
    return new Promise((resolve) => {
      const events = new Map()
      let resolved = false

      const done = (reason) => {
        if (resolved) return
        resolved = true
        console.log(`[SyncEngine] _fetchPage done (${reason}) with ${events.size} events`)
        resolve({ events: Array.from(events.values()), complete: reason === 'eose' })
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

  // Fetches one page, retrying the identical `until` window (with backoff) whenever the relay
  // pool times out before sending EOSE, instead of accepting a partial batch as if it were complete.
  async _fetchPageReliably(filters, maxAttempts = 4) {
    let lastResult = { events: [], complete: false }
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      lastResult = await this._fetchPage(filters)
      if (lastResult.complete) return lastResult
      console.warn(`[SyncEngine] page timed out (attempt ${attempt}/${maxAttempts}), retrying same window`)
      await delay(500 * attempt)
    }
    return lastResult
  }

  async deltaSync() {
    store.dispatch(setSyncPhase('delta'))

    const [authoredCursor, receivedCursor, followersCursor] = await Promise.all([
      analyticsDb.syncCursors.get(`${this.pubkey}::authored`),
      analyticsDb.syncCursors.get(`${this.pubkey}::received`),
      analyticsDb.syncCursors.get(`${this.pubkey}::followers`),
    ])

    const authoredSince = authoredCursor?.since ?? 0
    const receivedSince = receivedCursor?.since ?? 0
    const followersSince = followersCursor?.since ?? 0

    console.log(`[SyncEngine] deltaSync since authored=${authoredSince} received=${receivedSince} followers=${followersSince}`)

    const [authoredResult, receivedResult, followerResult] = await Promise.all([
      this._fetchPageReliably({ authors: [this.pubkey], kinds: [1, 3, 6, 7, 30023, 30024], since: authoredSince }),
      this._fetchPageReliably({ '#p': [this.pubkey], kinds: [6, 7, 9735], since: receivedSince }),
      this._fetchPageReliably({ '#p': [this.pubkey], kinds: [3], since: followersSince }),
    ])

    for (const event of [...authoredResult.events, ...receivedResult.events, ...followerResult.events]) {
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
    await analyticsDb.syncCursors.put({
      key: `${this.pubkey}::followers`,
      pubkey: this.pubkey,
      filterGroup: 'followers',
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
        { '#p': [this.pubkey], kinds: [6, 7, 9735], since: now },
        { '#p': [this.pubkey], kinds: [3], since: now },
      ],
      { closeOnEose: false, groupable: false }
    )

    this._liveSubscription.on('event', async (event) => {
      const outcome = await this.processEvent(event)
      const toast = this._buildLiveToast(event, outcome)
      if (toast) store.dispatch(setToast(toast))
    })
  }

  _buildLiveToast(event, outcome) {
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
        // Only announce a follow when a genuinely new follower was recorded —
        // not for unfollows or stale/duplicate contact lists.
        return outcome === 'follow-added'
          ? { desc: 'Someone followed you', type: 1, icon: 'user-followed' }
          : null
      default:
        return null
    }
  }

  async processEvent(event) {
    const existing = await analyticsDb.processedEvents.get([this.pubkey, event.id])
    if (existing) return

    await analyticsDb.processedEvents.put({
      ownerPubkey: this.pubkey,
      eventId: event.id,
      processedAt: Date.now(),
    })

    const dateKey = dateKeyFromTimestamp(event.created_at)

    switch (event.kind) {
      case 1:     await this._processNote(event, dateKey);        break
      case 30023: await this._processArticle(event);              break
      case 30024: await this._processDraft(event);                break
      case 7:     await this._processReaction(event, dateKey);    break
      case 6:     await this._processRepost(event);               break
      case 9735:  await this._processZap(event, dateKey);         break
      case 3:     return this._processContactList(event, dateKey)
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
      dTag: getDTag(event),
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
        ownerPubkey: this.pubkey,
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
        ownerPubkey: this.pubkey,
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
    if (event.pubkey === this.pubkey) {
      const followingCount = event.tags.filter((t) => t[0] === 'p').length
      await this._modifyProfileStats((row) => {
        row.followingCount = followingCount
      })
      return
    }

    // Kind 3 is replaceable: an incoming contact list is only a follow if it
    // actually tags us. A relay's `#p` filter can match on a stale copy, or the
    // author may have unfollowed us in this newer revision — so verify our
    // pubkey is present in the event's `p` tags before treating it as a follow.
    const followsUs = event.tags.some(
      (t) => t[0] === 'p' && t[1] === this.pubkey
    )

    const existing = await analyticsDb.followerEvents.get([this.pubkey, event.pubkey])

    if (!followsUs) {
      // This author no longer follows us. If we had them stored, and this event
      // is newer than what we recorded, remove them and decrement the count.
      if (existing && event.created_at > existing.createdAt) {
        await analyticsDb.followerEvents.delete([this.pubkey, event.pubkey])
        await this._modifyProfileStats((row) => {
          row.followersCount = Math.max(0, (row.followersCount || 0) - 1)
        })
        return 'follow-removed'
      }
      return 'noop'
    }

    if (existing) {
      if (event.created_at <= existing.createdAt) return 'noop'
      await analyticsDb.followerEvents.put({ ...existing, createdAt: event.created_at })
      return 'noop'
    }

    await analyticsDb.followerEvents.put({
      pubkey: this.pubkey,
      followerPubkey: event.pubkey,
      createdAt: event.created_at,
      dateKey: today,
    })
    await this._modifyProfileStats((row) => {
      row.followersCount = (row.followersCount || 0) + 1
      row.dailyFollowers = appendToTimeSeries(row.dailyFollowers || [], today, 'count', 1)
    })
    return 'follow-added'
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
