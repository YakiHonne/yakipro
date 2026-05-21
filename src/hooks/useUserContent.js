import { useEffect, useRef, useState, useCallback } from "react";
import { useSelector } from "react-redux";
import { getSubData } from "@/Helpers/Helpers";

const PAGE_SIZE = 20;

// Returns a fresh cache entry for a key that hasn't been seen before
const emptyEntry = () => ({
  events: [],
  hasMore: true,
  until: undefined,
  fetching: false,
});

// articleKind lets the caller switch between 30023 (published) and 30024 (drafts).
// Already-fetched keys are cached so switching back never hits the network again.
export default function useUserContent(selectedTab, articleKind = 30023) {
  const userKeys = useSelector((state) => state.userKeys);

  const kind = selectedTab === 0 ? 1 : articleKind;
  const key = `${selectedTab}-${kind}`;

  // Persistent per-key cache; lives for the component's lifetime
  const cacheRef = useRef({});
  const getEntry = (k) => {
    if (!cacheRef.current[k]) cacheRef.current[k] = emptyEntry();
    return cacheRef.current[k];
  };

  // Bump triggers a re-render so the UI picks up the latest cache entry
  const [, bump] = useState(0);
  const [loading, setLoading] = useState(false);

  // Read active key's data for rendering
  const entry = getEntry(key);

  const fetchPage = useCallback(async () => {
    const e = getEntry(key);
    if (!userKeys?.pub || e.fetching || !e.hasMore) return;

    e.fetching = true;
    setLoading(true);

    const filter = [
      {
        kinds: [kind],
        authors: [userKeys.pub],
        limit: PAGE_SIZE,
        ...(e.until ? { until: e.until } : {}),
      },
    ];

    try {
      const { data } = await getSubData({ filter, timeout: 100 });

      if (!data || data.length === 0) {
        e.hasMore = false;
        bump((n) => n + 1);
        return;
      }

      const deduped = data.filter((d) => !e.events.some((ex) => ex.id === d.id));
      const merged = [...e.events, ...deduped];
      const oldest = merged.reduce(
        (min, ev) => (ev.created_at < min ? ev.created_at : min),
        Infinity
      );

      e.events = merged;
      e.until = oldest - 1;
      e.hasMore = data.length >= PAGE_SIZE;
      bump((n) => n + 1);
    } catch (err) {
      console.error("[useUserContent] error:", err);
    } finally {
      e.fetching = false;
      setLoading(false);
    }
  }, [userKeys?.pub, kind, key]); // new fetchPage when key changes

  // Fetch on mount / key change — skipped entirely if this key already has data
  useEffect(() => {
    const e = getEntry(key);
    if (userKeys?.pub && e.events.length === 0 && e.hasMore) {
      fetchPage();
    }
  }, [userKeys?.pub, key]); // intentionally excludes fetchPage to avoid double-fire

  // Sentinel IntersectionObserver for infinite scroll
  const sentinelRef = useRef(null);

  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      ([obs]) => {
        if (obs.isIntersecting && entry.hasMore && !loading) fetchPage();
      },
      { threshold: 0.1 }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [fetchPage, entry.hasMore, loading]);

  // Clears the cache for the current key and re-fetches from scratch
  const refresh = useCallback(() => {
    cacheRef.current[key] = emptyEntry();
    bump((n) => n + 1);
  }, [key]);

  // Re-fetch after refresh clears the entry
  useEffect(() => {
    const e = getEntry(key);
    if (userKeys?.pub && e.events.length === 0 && e.hasMore && !e.fetching) {
      fetchPage();
    }
  }, [entry.events.length]); // fires when refresh zeroes the list

  return {
    events: entry.events,
    loading,
    hasMore: entry.hasMore,
    sentinelRef,
    refresh,
  };
}
