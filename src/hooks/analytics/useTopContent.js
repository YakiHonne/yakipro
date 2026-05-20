import { useLiveQuery } from 'dexie-react-hooks'
import { analyticsDb } from '@/lib/analyticsDb'

export function useTopContent(pubkey, limit = 10) {
  return useLiveQuery(async () => {
    if (!pubkey) return []
    const rows = await analyticsDb.contentStats
      .where('authorPubkey')
      .equals(pubkey)
      .toArray()
    return rows.sort((a, b) => b.reactionsCount - a.reactionsCount).slice(0, limit)
  }, [pubkey, limit])
}
