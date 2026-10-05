import { useEffect, useRef, useState, useCallback } from "react";
import { useSelector } from "react-redux";
import { getSubData } from "@/Helpers/Helpers";
import { waitForRelays } from "@/Helpers/NDKInstance";
import {
  PAID_NOTE_LABEL,
  isPremiumEvent,
} from "@/Helpers/ContentTags";

const PAGE_SIZE = 20;
// The premium filter runs client-side, so one relay page can hold few or no
// matches. Keep paging until a page's worth is found, within this many requests,
// rather than stopping on an empty page while older premium posts still exist.
const MAX_PREMIUM_REQUESTS = 3;
// Premium posts are usually a small share of the author's history, so each relay
// request scans a wider window instead of making many sequential 20-event trips.
const PREMIUM_SCAN_SIZE = 100;
// getSubData resolves only after this long without a new event, so it is paid on
// every request, once per page.
const FETCH_IDLE_TIMEOUT = 300;

const emptyEntry = () => ({
  events: [],
  hasMore: true,
  until: undefined,
  fetching: false,
});

// variant: "all" | "paid" (notes only) | "premium"
export default function useUserContent(
  selectedTab,
  articleKind = 30023,
  variant = "all",
) {
  const userKeys = useSelector((state) => state.userKeys);
  const userRelays = useSelector((state) => state.userRelays);

  const kind = selectedTab === 0 ? 1 : articleKind;
  const key = `${selectedTab}-${kind}-${variant}`;

  // Keyed only by tab/kind, so on an account switch the previous account's fetched events
  // stayed in this ref and rendered under the new account (the effects below skip fetching
  // once `events.length > 0`). Drop the whole ref when the pubkey changes.
  const cacheRef = useRef({});
  // The author's deletion list is the same for every tab and page; fetching it
  // once per account keeps it off each page's critical path. Deletions made from
  // this page are applied by the caller (onDelete), not re-read here.
  const deletionsRef = useRef(null);
  // waitForRelays costs up to its full timeout for every unreachable relay, so it
  // runs once per relay list rather than before every page.
  const relaysReadyForRef = useRef("");
  const cacheOwnerRef = useRef(userKeys?.pub ?? null);
  if (cacheOwnerRef.current !== (userKeys?.pub ?? null)) {
    cacheOwnerRef.current = userKeys?.pub ?? null;
    cacheRef.current = {};
    deletionsRef.current = null;
    relaysReadyForRef.current = "";
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
    const relaysKey = relayUrls.join(",");
    if (relaysReady && relaysReadyForRef.current !== relaysKey) {
      const waitStart = Date.now();
      const ready = await waitForRelays(relayUrls);
      relaysReadyForRef.current = relaysKey;
      try {
        if (localStorage.getItem("debugSubData"))
          console.log(
            `[useUserContent] waitForRelays ${Date.now() - waitStart}ms`,
            { ready, notReady: relayUrls.filter((u) => !ready.includes(u)) },
          );
      } catch { }
    }

    const buildFilter = () => [
      {
        kinds: [kind],
        authors: [userKeys.pub],
        limit: variant === "premium" ? PREMIUM_SCAN_SIZE : PAGE_SIZE,
        ...(variant === "paid" ? { "#l": [PAID_NOTE_LABEL] } : {}),
        ...(e.until ? { until: e.until } : {}),
      },
    ];
    const matches = (ev) => variant !== "premium" || isPremiumEvent(ev);

    try {
      // 100ms was far below a relay round-trip. getSubData starts its timer on the
      // first EOSE when nothing has arrived yet, so the fastest relay answering
      // "nothing here" ended the whole subscription before the relay that actually
      // holds the author's notes had replied — an empty content page on every load.
      if (!deletionsRef.current) {
        deletionsRef.current = getSubData({
          filter: [{ kinds: [5], authors: [userKeys.pub] }],
          timeout: FETCH_IDLE_TIMEOUT,
        }).catch(() => {
          deletionsRef.current = null;
          return { data: [] };
        });
      }
      const [firstPage, { data: deletions }] = await Promise.all([
        getSubData({ filter: buildFilter(), timeout: FETCH_IDLE_TIMEOUT }),
        deletionsRef.current,
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

      let data = firstPage.data;
      let found = 0;
      for (let request = 1; ; request++) {
        if (!data || data.length === 0) {
          // Only give up on paging for a *real* empty answer. Before the account's
          // relays are connected the pool can only reach the platform defaults, and
          // latching hasMore=false there permanently blocks the retry that would
          // run once they arrive.
          if (relaysReady) e.hasMore = false;
          break;
        }

        // Paging follows the raw page, not the filtered one: until/hasMore must
        // advance past events the premium check discarded.
        const oldest = data.reduce(
          (min, ev) => (ev.created_at < min ? ev.created_at : min),
          Infinity,
        );
        e.until = oldest - 1;
        e.hasMore = data.length >= buildFilter()[0].limit;

        const seen = new Set(e.events.map((ev) => ev.id));
        const fresh = data.filter((ev) => {
          if (seen.has(ev.id) || isDeleted(ev) || !matches(ev)) return false;
          seen.add(ev.id);
          return true;
        });
        e.events = [...e.events, ...fresh];
        found += fresh.length;

        if (
          variant !== "premium" ||
          !e.hasMore ||
          found >= PAGE_SIZE ||
          request >= MAX_PREMIUM_REQUESTS
        )
          break;
        ({ data } = await getSubData({
          filter: buildFilter(),
          timeout: FETCH_IDLE_TIMEOUT,
        }));
      }
      bump((n) => n + 1);
    } catch (err) {
      console.error("[useUserContent] error:", err);
    } finally {
      e.fetching = false;
      setLoading(false);
    }
  }, [userKeys?.pub, kind, key, variant, userRelays]);

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
    // Re-observing after each load matters for the premium filter: a page with few
    // matches leaves the sentinel on screen, and an observer only fires on
    // visibility *changes*, so it would never ask for the next page. A fresh
    // observe() reports the current state straight away. It also picks up the
    // sentinel node remounted when switching away from the scheduled list.
  }, [loading, key]);

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
