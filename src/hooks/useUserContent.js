import { useEffect, useRef, useState, useCallback } from "react";
import { useSelector } from "react-redux";
import { getSubData } from "@/Helpers/Helpers";
import { waitForRelays } from "@/Helpers/NDKInstance";

const PAGE_SIZE = 20;

const emptyEntry = () => ({
  events: [],
  hasMore: true,
  until: undefined,
  fetching: false,
});

export default function useUserContent(selectedTab, articleKind = 30023) {
  const userKeys = useSelector((state) => state.userKeys);
  const userRelays = useSelector((state) => state.userRelays);

  const kind = selectedTab === 0 ? 1 : articleKind;
  const key = `${selectedTab}-${kind}`;

  // Keyed only by tab/kind, so on an account switch the previous account's fetched events
  // stayed in this ref and rendered under the new account (the effects below skip fetching
  // once `events.length > 0`). Drop the whole ref when the pubkey changes.
  const cacheRef = useRef({});
  const cacheOwnerRef = useRef(userKeys?.pub ?? null);
  if (cacheOwnerRef.current !== (userKeys?.pub ?? null)) {
    cacheOwnerRef.current = userKeys?.pub ?? null;
    cacheRef.current = {};
  }

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

    // Wait for the account's relays before asking them anything. A premium relay
    // answers an unauthenticated REQ with an immediate empty EOSE, so querying
    // early returns "no notes" rather than an error — and the page then shows an
    // empty list for an author who has plenty.
    const relayUrls = (userRelays || [])
      .map((relay) => (typeof relay === "string" ? relay : relay?.url))
      .filter(Boolean);
    const relaysReady = relayUrls.length > 0;
    if (relaysReady) await waitForRelays(relayUrls);

    const filter = [
      {
        kinds: [kind],
        authors: [userKeys.pub],
        limit: PAGE_SIZE,
        ...(e.until ? { until: e.until } : {}),
      },
    ];

    try {
      // 100ms was far below a relay round-trip. getSubData starts its timer on the
      // first EOSE when nothing has arrived yet, so the fastest relay answering
      // "nothing here" ended the whole subscription before the relay that actually
      // holds the author's notes had replied — an empty content page on every load.
      const [{ data }, { data: deletions }] = await Promise.all([
        getSubData({ filter, timeout: 2000 }),
        getSubData({
          filter: [{ kinds: [5], authors: [userKeys.pub] }],
          timeout: 2000,
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
        // Only give up on paging for a *real* empty answer. Before the account's
        // relays are connected the pool can only reach the platform defaults, and
        // latching hasMore=false there permanently blocks the retry that would
        // run once they arrive.
        if (relaysReady) e.hasMore = false;
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
  }, [userKeys?.pub, kind, key, userRelays]);

  // userRelays is in the deps deliberately: landing on this page directly runs the
  // first fetch before the relay list has loaded, and without a re-run when it
  // arrives the page stayed empty until the component remounted — which is why
  // navigating away and back "fixed" it.
  useEffect(() => {
    const e = getEntry(key);
    if (userKeys?.pub && e.events.length === 0 && e.hasMore) {
      fetchPage();
    }
  }, [userKeys?.pub, key, userRelays]);

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
