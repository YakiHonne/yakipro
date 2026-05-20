import { useLiveQuery } from 'dexie-react-hooks'
import { analyticsDb } from '@/lib/analyticsDb'

export function useProfileStats(pubkey) {
  return useLiveQuery(
    () => (pubkey ? analyticsDb.profileStats.get(pubkey) : undefined),
    [pubkey]
  )
}
