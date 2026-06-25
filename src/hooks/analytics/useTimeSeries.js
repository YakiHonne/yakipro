import { useLiveQuery } from 'dexie-react-hooks'
import { analyticsDb } from '@/lib/analyticsDb'
import { subDays, parseISO, format, startOfWeek, startOfMonth, isAfter } from 'date-fns'

const WEEKLY_THRESHOLD = 90
const MONTHLY_THRESHOLD = 365

function aggregate(sorted, field, bucket) {
  if (bucket === 'day') return sorted

  const map = new Map()
  for (const entry of sorted) {
    const d = parseISO(entry.date)
    const key =
      bucket === 'week'
        ? format(startOfWeek(d, { weekStartsOn: 1 }), 'yyyy-MM-dd')
        : format(startOfMonth(d), 'yyyy-MM')
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

async function buildSeries(pubkey, days, field) {
  if (!pubkey) return []
  const profile = await analyticsDb.profileStats.get(pubkey)
  if (!profile) return []

  const raw = profile[field] || []
  const cutoff = subDays(new Date(), days)

  const filtered = raw
    .filter((e) => isAfter(parseISO(e.date), cutoff) || e.date === format(cutoff, 'yyyy-MM-dd'))
    .sort((a, b) => (a.date < b.date ? -1 : 1))

  return aggregate(filtered, field === 'dailyZapsSats' ? 'sats' : 'count', bucketFor(days))
}

export function useZapTimeSeries(pubkey, days = 30) {
  return useLiveQuery(() => buildSeries(pubkey, days, 'dailyZapsSats'), [pubkey, days])
}

export function useReactionsTimeSeries(pubkey, days = 30) {
  return useLiveQuery(() => buildSeries(pubkey, days, 'dailyReactions'), [pubkey, days])
}

export function useNoteTimeSeries(pubkey, days = 30) {
  return useLiveQuery(() => buildSeries(pubkey, days, 'dailyNotes'), [pubkey, days])
}

export function useFollowerTimeSeries(pubkey, days = 90) {
  return useLiveQuery(() => buildSeries(pubkey, days, 'dailyFollowers'), [pubkey, days])
}
