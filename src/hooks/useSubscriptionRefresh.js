import { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getSubscriptionStatus } from "@/Endpoionts/subscription";
import { checkUserConnected } from "@/Endpoionts/Auth";
import { setSubscriptionStatus } from "@/Store/Slices/Subscription";
import { setNostrUser } from "@/Store/Slices/User";

const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 30000;

// Returns true once `next` reflects a completed purchase relative to `baseline`
// (webhook landed): access unblocked, subscription active, or the plan changed.
const reflectsPurchase = (baseline, next) => {
  if (!next) return false;
  if (baseline?.access_blocked && next.access_blocked === false) return true;
  if (!baseline?.active && next.active === true) return true;
  if (baseline?.plan !== next.plan && next.active === true) return true;
  if (baseline?.pending_plan && !next.pending_plan) return true;
  return false;
};

/**
 * Keeps the local subscription/session state in sync with the server after a
 * checkout that happens in a separate tab (Stripe/Airwallex `window.open`).
 *
 * - Re-fetches on mount and whenever the tab regains visibility / focus, so
 *   returning from the checkout tab pulls fresh server truth.
 * - `startPolling()` polls the status endpoint to beat the payment webhook,
 *   stopping as soon as the purchase is reflected (or after a timeout).
 */
export default function useSubscriptionRefresh() {
  const dispatch = useDispatch();
  const subscription = useSelector((state) => state.subscription);
  const isConnected = useSelector((state) => state.isConnected);
  const [confirming, setConfirming] = useState(false);

  const pollTimer = useRef(null);
  const pollDeadline = useRef(0);
  const baselineRef = useRef(null);
  const isConnectedRef = useRef(false);

  // Keep a ref in sync so the mount-only effect's listeners read the latest
  // connection state without re-subscribing on every change.
  isConnectedRef.current = isConnected;

  const refreshOnce = useCallback(async () => {
    try {
      const [status, online] = await Promise.all([
        getSubscriptionStatus().catch(() => null),
        checkUserConnected().catch(() => null),
      ]);
      if (status) dispatch(setSubscriptionStatus(status));
      if (online && online !== false) dispatch(setNostrUser(online));
      return status;
    } catch {
      return null;
    }
  }, [dispatch]);

  const stopPolling = useCallback(() => {
    if (pollTimer.current) {
      clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
    setConfirming(false);
  }, []);

  const startPolling = useCallback(() => {
    // Snapshot the pre-payment status so we can tell when the webhook flips it.
    baselineRef.current = subscription.status || null;
    pollDeadline.current = Date.now() + POLL_TIMEOUT_MS;
    setConfirming(true);

    if (pollTimer.current) clearInterval(pollTimer.current);
    pollTimer.current = setInterval(async () => {
      if (Date.now() > pollDeadline.current) {
        stopPolling();
        return;
      }
      const status = await refreshOnce();
      if (reflectsPurchase(baselineRef.current, status)) {
        stopPolling();
      }
    }, POLL_INTERVAL_MS);
  }, [subscription.status, refreshOnce, stopPolling]);

  // Refresh on mount and whenever the user comes back to this tab/window.
  useEffect(() => {
    refreshOnce();

    const onVisible = () => {
      if (document.visibilityState === "visible" && isConnectedRef.current) {
        refreshOnce();
      }
    };
    const onFocus = () => {
      if (isConnectedRef.current) refreshOnce();
    };

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onFocus);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onFocus);
      if (pollTimer.current) clearInterval(pollTimer.current);
    };
  }, [refreshOnce]);

  return { confirming, startPolling, refreshOnce };
}
