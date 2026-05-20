import { useLiveQuery } from 'dexie-react-hooks'
import { analyticsDb } from '@/lib/analyticsDb'

export function useContentByKind(pubkey, kind, limit = 20) {
  return useLiveQuery(async () => {
    if (!pubkey) return []
    const rows = await analyticsDb.contentStats
      .where('authorPubkey')
      .equals(pubkey)
      .filter((row) => row.kind === kind)
      .toArray()
    return rows.sort((a, b) => b.publishedAt - a.publishedAt).slice(0, limit)
  }, [pubkey, kind, limit])
}
