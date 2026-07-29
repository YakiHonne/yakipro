import { useEffect, useRef } from "react";
import { getNDK } from "@/ndkConfig/ndk";
import { AnalyticsSyncEngine } from "@/lib/analytics/SyncEngine";
import { store } from "@/Store/Store";
import { setSyncPhase } from "@/Store/analyticsSlice";
import { getUserRelaysCache } from "@/Cache/userRelaysCache";

const RELAY_LIST_TIMEOUT_MS = 5000;

// Resolves to null on timeout or failure rather than rejecting: every caller here
// treats "no relay list" as a valid, non-fatal answer and carries on.
const withTimeout = (promise, ms) =>
  Promise.race([
    Promise.resolve(promise).catch(() => null),
    new Promise((resolve) => setTimeout(() => resolve(null), ms)),
  ]);

export default function AnalyticsProvider({ pubkey, children }) {
  const engineRef = useRef(null);
  // Which pubkey we've already kicked off a sync for. The effect can re-run for
  // reasons that have nothing to do with the account changing (StrictMode's
  // double-invoke, a remount from the post-login redirect, `setUserKeys`
  // dispatching a fresh object during session restore). Keying off the pubkey
  // *value* rather than effect lifetime makes a redundant re-run a no-op instead
  // of tearing down an in-flight startup.
  const startedForRef = useRef(null);

  useEffect(() => {
    if (!pubkey) return;
    if (startedForRef.current === pubkey) {
      console.log("[AnalyticsProvider] sync already started for", pubkey);
      return;
    }

    // A different account than the one currently syncing: tear that one down
    // first so its live subscription stops writing under the new pubkey.
    if (engineRef.current) {
      engineRef.current.stop();
      engineRef.current = null;
    }

    startedForRef.current = pubkey;

    store.dispatch(setSyncPhase("idle"));

    const ndk = getNDK();
    console.log("[AnalyticsProvider] starting, pubkey:", pubkey);

    const run = async () => {
      // Connect FIRST. On a fresh login this NDK instance is cold (it's separate
      // from the login/signer NDK), so any relay-list fetch below would otherwise
      // hang against a pool with zero connected relays — which is exactly why the
      // sync used to appear "stuck" until the user navigated away and back and hit
      // an already-warm NDK. Connecting up front makes the first attempt work.
      if (!ndk.pool || ndk.pool.connectedRelays().length === 0) {
        console.log("[AnalyticsProvider] calling ndk.connect()");
        await ndk.connect().catch((err) =>
          console.warn("[AnalyticsProvider] ndk.connect error", err)
        );
        console.log("[AnalyticsProvider] ndk.connect() resolved");
      } else {
        console.log("[AnalyticsProvider] NDK already connected");
      }

      // The account's own write relays (where its notes/articles actually live) aren't part of
      // this NDK instance's default relay set — without them, backfill only sees whatever the
      // handful of hardcoded aggregator relays happen to have cached for this pubkey, which is
      // often a small fraction of the real history.
      const cachedRelays = getUserRelaysCache();
      let writeRelayUrls = (cachedRelays || [])
        .filter((r) => r.write)
        .map((r) => r.url);

      if (writeRelayUrls.length === 0) {
        try {
          // Bounded: on a cold first connect this fetch can hang for as long as NDK
          // is willing to wait, and everything below — including creating the engine
          // — sits behind it. Extra write relays only ever *widen* backfill coverage,
          // so it's far better to start syncing against the default relay set now and
          // miss a few sources than to leave the dashboard with no sync running at all.
          const relayEvent = await withTimeout(
            ndk.fetchEvent({ kinds: [10002], authors: [pubkey] }),
            RELAY_LIST_TIMEOUT_MS
          );
          if (relayEvent) {
            writeRelayUrls = relayEvent.tags
              .filter((t) => t[0] === "r" && (t[2] === "write" || !t[2]))
              .map((t) => t[1]);
          }
        } catch (err) {
          console.warn("[AnalyticsProvider] failed to fetch NIP-65 relay list", err);
        }
      }

      for (const url of writeRelayUrls) {
        ndk.addExplicitRelay(url, undefined, true);
      }
      console.log("[AnalyticsProvider] added write relays:", writeRelayUrls);

      const engine = new AnalyticsSyncEngine(ndk, pubkey);
      engineRef.current = engine;
      engine.initialize();
    };

    run().catch((err) => {
      // Never leave `startedForRef` pinned to a pubkey whose startup blew up before
      // the engine existed — otherwise the guard would suppress every later retry
      // and the dashboard would sit at 'idle' forever.
      console.error("[AnalyticsProvider] startup failed", err);
      if (!engineRef.current) startedForRef.current = null;
      store.dispatch(setSyncPhase("error"));
    });
  }, [pubkey]);

  return children;
}
