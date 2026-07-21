import { useEffect, useRef } from "react";
import { getNDK } from "@/ndkConfig/ndk";
import { AnalyticsSyncEngine } from "@/lib/analytics/SyncEngine";
import { store } from "@/Store/Store";
import { setSyncPhase } from "@/Store/analyticsSlice";
import { getUserRelaysCache } from "@/Cache/userRelaysCache";

export default function AnalyticsProvider({ pubkey, children }) {
  const engineRef = useRef(null);

  useEffect(() => {
    if (!pubkey) return;

    store.dispatch(setSyncPhase("idle"));

    const ndk = getNDK();
    console.log("[AnalyticsProvider] starting, pubkey:", pubkey);

    const run = async () => {
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
          const relayEvent = await ndk.fetchEvent({ kinds: [10002], authors: [pubkey] });
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

      if (!ndk.pool || ndk.pool.connectedRelays().length === 0) {
        console.log("[AnalyticsProvider] calling ndk.connect()");
        await ndk.connect().catch((err) =>
          console.warn("[AnalyticsProvider] ndk.connect error", err)
        );
        console.log("[AnalyticsProvider] ndk.connect() resolved");
      } else {
        console.log("[AnalyticsProvider] NDK already connected");
      }

      const engine = new AnalyticsSyncEngine(ndk, pubkey);
      engineRef.current = engine;
      engine.initialize();
    };

    run();
  }, [pubkey]);

  return children;
}
