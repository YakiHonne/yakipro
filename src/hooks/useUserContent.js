import { useEffect, useRef, useState, useCallback } from "react";
import { useSelector } from "react-redux";
import { getSubData } from "@/Helpers/Helpers";

const PAGE_SIZE = 20;

const emptyEntry = () => ({
  events: [],
  hasMore: true,
  until: undefined,
  fetching: false,
});

export default function useUserContent(selectedTab, articleKind = 30023) {
  const userKeys = useSelector((state) => state.userKeys);

  const kind = selectedTab === 0 ? 1 : articleKind;
  const key = `${selectedTab}-${kind}`;

  const cacheRef = useRef({});
  const getEntry = (k) => {
    if (!cacheRef.current[k]) cacheRef.current[k] = emptyEntry();
    return cacheRef.current[k];
  };

  const [, bump] = useState(0);
  const [loading, setLoading] = useState(false);

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
      const [{ data }, { data: deletions }] = await Promise.all([
        getSubData({ filter, timeout: 100 }),
        getSubData({
          filter: [{ kinds: [5], authors: [userKeys.pub] }],
          timeout: 100,
        }),
      ]);

      const deletedIds = new Set();
      const deletedAddrs = new Set();
      for (const del of deletions || []) {
        for (const tag of del.tags || []) {
          if (tag[0] === "e" && tag[1]) deletedIds.add(tag[1]);
          if (tag[0] === "a" && tag[1]) deletedAddrs.add(tag[1]);
        }
      }
      const isDeleted = (ev) =>
        deletedIds.has(ev.id) || deletedAddrs.has(`${ev.kind}:${ev.pubkey}:${(ev.tags || []).find((t) => t[0] === "d")?.[1] || ""}`);

      if (!data || data.length === 0) {
        e.hasMore = false;
        bump((n) => n + 1);
        return;
      }

      const live = data.filter((ev) => !isDeleted(ev));
      const deduped = live.filter((d) => !e.events.some((ex) => ex.id === d.id));
      const merged = [...e.events, ...deduped];
      const oldest = merged.reduce(
        (min, ev) => (ev.created_at < min ? ev.created_at : min),
        Infinity
      );

      const seen = new Set();
      e.events = merged.filter((ev) => {
        if (seen.has(ev.id)) return false;
        seen.add(ev.id);
        return true;
      });
      e.until = oldest - 1;
      e.hasMore = data.length >= PAGE_SIZE;
      bump((n) => n + 1);
    } catch (err) {
      console.error("[useUserContent] error:", err);
    } finally {
      e.fetching = false;
      setLoading(false);
    }
  }, [userKeys?.pub, kind, key]);

  useEffect(() => {
    const e = getEntry(key);
    if (userKeys?.pub && e.events.length === 0 && e.hasMore) {
      fetchPage();
    }
  }, [userKeys?.pub, key]);

  const sentinelRef = useRef(null);

  const fetchStateRef = useRef({ fetchPage, hasMore: entry.hasMore, loading });
  fetchStateRef.current = { fetchPage, hasMore: entry.hasMore, loading };

  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      ([obs]) => {
        const { fetchPage: fp, hasMore, loading: isLoading } = fetchStateRef.current;
        if (obs.isIntersecting && hasMore && !isLoading) fp();
      },
      { threshold: 0.1, rootMargin: "200px 0px" }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, []);

  const refresh = useCallback(() => {
    cacheRef.current[key] = emptyEntry();
    bump((n) => n + 1);
  }, [key]);

  useEffect(() => {
    const e = getEntry(key);
    if (userKeys?.pub && e.events.length === 0 && e.hasMore && !e.fetching) {
      fetchPage();
    }
  }, [entry.events.length]);

  return {
    events: entry.events,
    loading,
    hasMore: entry.hasMore,
    sentinelRef,
    refresh,
  };
}
