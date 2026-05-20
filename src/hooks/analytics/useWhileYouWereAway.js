import { useLiveQuery } from 'dexie-react-hooks'
import { analyticsDb } from '@/lib/analyticsDb'

export function useWhileYouWereAway(pubkey, lastVisit) {
  return useLiveQuery(async () => {
    if (!pubkey || !lastVisit) return null

    const lastVisitMs = lastVisit * 1000
    const newProcessed = await analyticsDb.processedEvents
      .where('processedAt')
      .above(lastVisitMs)
      .toArray()

    const newEventIds = new Set(newProcessed.map((e) => e.eventId))

    const contentRows = await analyticsDb.contentStats
      .where('authorPubkey')
      .equals(pubkey)
      .toArray()

    let newReactions = 0
    let newReposts = 0
    let newZaps = 0
    let satsEarned = 0

    for (const row of contentRows) {
      if (newEventIds.has(row.eventId)) {
        newReactions += row.reactionsCount || 0
        newReposts += row.repostsCount || 0
        newZaps += row.zapsCount || 0
        satsEarned += row.zapsSats || 0
      }
    }

    return { newReactions, newReposts, newZaps, satsEarned }
  }, [pubkey, lastVisit])
}
