import { useEffect, useRef, useState, useCallback } from "react";
import { useSelector } from "react-redux";
import { getSubData } from "@/Helpers/Helpers";

const PAGE_SIZE = 20;

const KIND_MAP = {
  0: 1, // Notes tab
  1: 30023, // Articles tab
};

export default function useUserContent(selectedTab) {
  const userKeys = useSelector((state) => state.userKeys);

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const untilRef = useRef(undefined);
  const isFetchingRef = useRef(false);
  const currentTabRef = useRef(selectedTab);

  const kind = KIND_MAP[selectedTab];

  const reset = useCallback(() => {
    setEvents([]);
    setHasMore(true);
    untilRef.current = undefined;
  }, []);

  useEffect(() => {
    if (currentTabRef.current !== selectedTab) {
      currentTabRef.current = selectedTab;
      reset();
    }
  }, [selectedTab, reset]);

  const fetchPage = useCallback(async () => {
    if (!userKeys?.pub || isFetchingRef.current || !hasMore) return;

    isFetchingRef.current = true;
    setLoading(true);

    const filter = [
      {
        kinds: [kind],
        authors: [userKeys.pub],
        limit: PAGE_SIZE,
        ...(untilRef.current ? { until: untilRef.current } : {}),
      },
    ];

    try {
      const { data } = await getSubData({ filter, timeout: 100 });

      if (!data || data.length === 0) {
        setHasMore(false);
        return;
      }
      const deduped = data.filter(
        (e) => !events.some((existing) => existing.id === e.id),
      );

      setEvents((prev) => {
        const merged = [...prev, ...deduped];
        const oldest = merged.reduce(
          (min, e) => (e.created_at < min ? e.created_at : min),
          Infinity,
        );
        untilRef.current = oldest - 1;
        return merged;
      });

      if (data.length < PAGE_SIZE) setHasMore(false);
    } catch (err) {
      console.error("[useUserContent] error:", err);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [userKeys?.pub, kind, hasMore]);

  // Initial fetch when pubkey or tab changes
  useEffect(() => {
    if (userKeys?.pub) fetchPage();
  }, [userKeys?.pub, kind]);

  // Sentinel ref for IntersectionObserver
  const sentinelRef = useRef(null);

  useEffect(() => {
    if (!sentinelRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !loading) fetchPage();
      },
      { threshold: 0.1 },
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [fetchPage, hasMore, loading]);

  return { events, loading, hasMore, sentinelRef, refresh: reset };
}
