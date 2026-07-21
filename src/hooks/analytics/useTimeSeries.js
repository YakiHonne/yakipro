import { useLiveQuery } from 'dexie-react-hooks'
import { analyticsDb } from '@/lib/analyticsDb'
import { subDays, parseISO, format, startOfWeek, startOfMonth, getUnixTime } from 'date-fns'
import { dateKeyFromTimestamp } from '@/lib/analytics/timeUtils'

const WEEKLY_THRESHOLD = 90
const MONTHLY_THRESHOLD = 365

function bucketKeyFor(dateKey, bucket) {
  if (bucket === 'day') return dateKey
  const d = parseISO(dateKey)
  return bucket === 'week'
    ? format(startOfWeek(d, { weekStartsOn: 1 }), 'yyyy-MM-dd')
    : format(startOfMonth(d), 'yyyy-MM')
}

function aggregateDaily(dailyCounts, field, bucket) {
  const sorted = Array.from(dailyCounts.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, value]) => ({ date, [field]: value }))

  if (bucket === 'day') return sorted

  const map = new Map()
  for (const entry of sorted) {
    const key = bucketKeyFor(entry.date, bucket)
    map.set(key, (map.get(key) || 0) + (entry[field] || 0))
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, value]) => ({ date, [field]: value }))
}

export function bucketFor(days) {
  if (days > MONTHLY_THRESHOLD) return 'month'
  if (days > WEEKLY_THRESHOLD)  return 'week'
  return 'day'
}

// Derives the series directly from the source-of-truth tables (contentStats/statEvents/
// followerEvents) instead of the incrementally-accumulated profileStats.daily* counters, which
// can drift from the real data (stale entries from earlier sync bugs, evicted entries past the
// 1200-cap, etc). This keeps chart totals always consistent with what the drill-down overlay
// queries from the same tables.
async function buildNoteSeries(pubkey, days) {
  if (!pubkey) return []
  const cutoff = getUnixTime(subDays(new Date(), days))

  const rows = await analyticsDb.contentStats
    .where('authorPubkey').equals(pubkey)
    .filter((r) => r.kind === 1 && r.publishedAt >= cutoff)
    .toArray()

  const dailyCounts = new Map()
  for (const r of rows) {
    const key = dateKeyFromTimestamp(r.publishedAt)
    dailyCounts.set(key, (dailyCounts.get(key) || 0) + 1)
  }

  return aggregateDaily(dailyCounts, 'count', bucketFor(days))
}

async function buildZapSeries(pubkey, days) {
  if (!pubkey) return []
  const cutoff = getUnixTime(subDays(new Date(), days))

  const rows = await analyticsDb.statEvents
    .where('createdAt').aboveOrEqual(cutoff)
    .filter((r) => r.statType === 'zap')
    .toArray()

  const dailyCounts = new Map()
  for (const r of rows) {
    const key = dateKeyFromTimestamp(r.createdAt)
    dailyCounts.set(key, (dailyCounts.get(key) || 0) + (r.value || 0))
  }

  return aggregateDaily(dailyCounts, 'sats', bucketFor(days))
}

async function buildReactionSeries(pubkey, days) {
  if (!pubkey) return []
  const cutoff = getUnixTime(subDays(new Date(), days))

  const rows = await analyticsDb.statEvents
    .where('createdAt').aboveOrEqual(cutoff)
    .filter((r) => r.statType === 'reaction')
    .toArray()

  const dailyCounts = new Map()
  for (const r of rows) {
    const key = dateKeyFromTimestamp(r.createdAt)
    dailyCounts.set(key, (dailyCounts.get(key) || 0) + (r.value || 0))
  }

  return aggregateDaily(dailyCounts, 'count', bucketFor(days))
}

async function buildFollowerSeries(pubkey, days) {
  if (!pubkey) return []
  const cutoff = getUnixTime(subDays(new Date(), days))

  const rows = await analyticsDb.followerEvents
    .where('[pubkey+createdAt]')
    .between([pubkey, cutoff], [pubkey, Number.MAX_SAFE_INTEGER], true, true)
    .toArray()

  const dailyCounts = new Map()
  for (const r of rows) {
    const key = r.dateKey || dateKeyFromTimestamp(r.createdAt)
    dailyCounts.set(key, (dailyCounts.get(key) || 0) + 1)
  }

  return aggregateDaily(dailyCounts, 'count', bucketFor(days))
}

export function useZapTimeSeries(pubkey, days = 30) {
  return useLiveQuery(() => buildZapSeries(pubkey, days), [pubkey, days])
}

export function useReactionsTimeSeries(pubkey, days = 30) {
  return useLiveQuery(() => buildReactionSeries(pubkey, days), [pubkey, days])
}

export function useNoteTimeSeries(pubkey, days = 30) {
  return useLiveQuery(() => buildNoteSeries(pubkey, days), [pubkey, days])
}

export function useFollowerTimeSeries(pubkey, days = 90) {
  return useLiveQuery(() => buildFollowerSeries(pubkey, days), [pubkey, days])
}
