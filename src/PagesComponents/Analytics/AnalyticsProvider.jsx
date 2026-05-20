import { useEffect, useRef } from "react";
import { getNDK } from "@/ndkConfig/ndk";
import { AnalyticsSyncEngine } from "@/lib/analytics/SyncEngine";
import { store } from "@/Store/Store";
import { setSyncPhase } from "@/Store/analyticsSlice";

export default function AnalyticsProvider({ pubkey, children }) {
  const engineRef = useRef(null);

  useEffect(() => {
    if (!pubkey) return;

    // Reset to idle so stale phase from a previous session doesn't interfere
    store.dispatch(setSyncPhase("idle"));

    const ndk = getNDK();
    console.log("[AnalyticsProvider] starting, pubkey:", pubkey);

    const run = async () => {
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
