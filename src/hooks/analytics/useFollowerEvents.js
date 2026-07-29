import { useCallback, useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { analyticsDb } from '@/lib/analyticsDb'

export function useFollowersForDay(pubkey, since, until) {
  return useLiveQuery(async () => {
    if (!pubkey) return []
    const rows = await analyticsDb.followerEvents
      .where('[pubkey+createdAt]')
      .between([pubkey, since], [pubkey, until], true, true)
      .toArray()
    return rows.sort((a, b) => b.createdAt - a.createdAt)
  }, [pubkey, since, until])
}

const PAGE_SIZE = 20

export function useFollowersList(pubkey) {
  const [items, setItems] = useState([])
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const stateRef = useRef({ loading: false, hasMore: true, loaded: 0 })

  // `items` accumulates across `loadMore` calls and the paging cursor lives in a ref, so
  // without this an account switch would append the new account's followers onto the
  // previous account's list, starting at the old offset.
  const ownerRef = useRef(pubkey)
  if (ownerRef.current !== pubkey) {
    ownerRef.current = pubkey
    stateRef.current = { loading: false, hasMore: true, loaded: 0 }
  }

  useEffect(() => {
    setItems([])
    setHasMore(true)
    setLoading(false)
  }, [pubkey])

  const loadMore = useCallback(async () => {
    const state = stateRef.current
    if (!pubkey || state.loading || !state.hasMore) return
    state.loading = true
    setLoading(true)
    try {
      const rows = await analyticsDb.followerEvents
        .where('pubkey')
        .equals(pubkey)
        .toArray()
      rows.sort((a, b) => b.createdAt - a.createdAt)

      const page = rows.slice(state.loaded, state.loaded + PAGE_SIZE)
      state.loaded += page.length
      state.hasMore = state.loaded < rows.length
      setItems((prev) => [...prev, ...page])
      setHasMore(state.hasMore)
    } finally {
      state.loading = false
      setLoading(false)
    }
  }, [pubkey])

  return { items, hasMore, loading, loadMore }
}
