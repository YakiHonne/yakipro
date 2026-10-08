import {
  enableStripe,
  getProviderLogin,
  getStripeAccount,
  getSubPlans,
} from "@/Endpoionts/payment";
import { extractLightningPlans, getSubData } from "@/Helpers/Helpers";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import {
  clearPlansCache,
  getPlansCache,
  setPlansCache,
} from "@/Cache/plansCache";
import { getAccountScope } from "@/Cache/accountScope";

const emptyPlans = () => ({
  fiat: [],
  crypto: [],
  ln: [],
  isFiatEnable: false,
  isCryptoEnabled: false,
  isLnEnabled: false,
});

const RETRY_DELAY_MS = 2000;

// Several screens mount this hook at once; they share one request per account
// rather than each firing the three reads.
let plansRequest = null;
let plansRequestFor = null;

const readPlans = async (pubkey) => {
  const [provider, subPlans, nostrPlans] = await Promise.all([
    getStripeAccount(),
    getSubPlans(),
    getSubData({
      filter: [
        {
          authors: [pubkey],
          "#d": [process.env.NEXT_PUBLIC_GATEWAY_PUBKEY],
          kinds: [30164],
        },
      ],
    }),
  ]);
  // getStripeAccount answers false, and getSubPlans null, only when the request
  // itself failed.
  const failed = provider === false || subPlans === null;
  let tags = nostrPlans.data.length > 0 ? nostrPlans.data[0].tags : [];
  let l = extractLightningPlans(tags);

  // Fiat & crypto pricing live in CreatorSubPlans (served by /subplans), one
  // doc per provider ("stripe-fiat" / "stripe-crypto"). /provider only returns
  // the Stripe account with no pricing, which is why fiat never loaded.
  const fiatPlan = (subPlans || []).find((p) => p.provider === "stripe-fiat");
  const cryptoPlan = (subPlans || []).find(
    (p) => p.provider === "stripe-crypto",
  );

  return {
    failed,
    stripeAccount: provider,
    plans: {
      fiat: fiatPlan?.pricing ?? [],
      crypto: cryptoPlan?.pricing ?? [],
      ln: l,
      isFiatEnable: fiatPlan ? fiatPlan.active : false,
      isCryptoEnabled: cryptoPlan ? cryptoPlan.active : false,
      isLnEnabled: l?.length > 0,
    },
  };
};

const loadPlans = (pubkey) => {
  if (plansRequest && plansRequestFor === pubkey) return plansRequest;

  plansRequestFor = pubkey;
  const request = (async () => {
    let result = await readPlans(pubkey);
    if (result.failed) {
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      result = await readPlans(pubkey);
    }
    // A failed read is shown but not cached: caching it kept "no plans" on screen
    // for the rest of the session, long after the backend had recovered.
    if (!result.failed && getAccountScope() === pubkey)
      setPlansCache({ stripeAccount: result.stripeAccount, plans: result.plans });
    return result;
  })().finally(() => {
    if (plansRequest === request) plansRequest = null;
  });
  plansRequest = request;
  return request;
};

export default function usePlans() {
  const userKeys = useSelector((state) => state.userKeys);
  // Depend on the pubkey, not the `userKeys` object: session restore dispatches a fresh
  // object for the same account, which would otherwise re-trigger a full refetch.
  const pubkey = userKeys?.pub ?? null;
  const [plans, setPlans] = useState(emptyPlans);
  const [loading, setLoading] = useState(false);
  const [stripeAccount, setStripeAccount] = useState(null);
  const [timestamp, setTimeStamp] = useState(false);
  const requestedFor = useRef(pubkey);
  requestedFor.current = pubkey;
  const gatewayUrl = useMemo(() => {
    if (!pubkey) return null;
    return process.env.NEXT_PUBLIC_GATEWAY_URL + pubkey;
  }, [pubkey]);

  // This component stays mounted across an account switch, so clearing the module cache
  // isn't enough on its own — the previous account's plans would keep rendering from local
  // state until the refetch resolved. Reset to empty first, then load the new account's.
  useEffect(() => {
    setPlans(emptyPlans());
    setStripeAccount(null);
  }, [pubkey]);

  useEffect(() => {
    if (pubkey) fetchPlans();
    else clearPlansCache();
  }, [timestamp, pubkey]);

  const fetchPlans = async () => {
    const cached = getPlansCache();
    if (cached && !timestamp) {
      setStripeAccount(cached.stripeAccount);
      setPlans(cached.plans);
      return;
    }
    setLoading(true);
    try {
      const result = await loadPlans(pubkey);
      // The account changed while this was in flight; its result belongs to the
      // previous one.
      if (requestedFor.current !== pubkey) return;
      setStripeAccount(result.stripeAccount);
      setPlans(result.plans);
    } catch (err) {
      console.error("[usePlans] error:", err);
    } finally {
      if (requestedFor.current === pubkey) setLoading(false);
    }
  };

  const finishSetup = async () => {
    setLoading(true);
    const data = await enableStripe({ country: "" });
    if (data) {
      window.open(data, "_blank");
    }
    setLoading(false);
  };
  const loginAccount = async () => {
    setLoading(true);
    const data = await getProviderLogin();
    if (data) {
      window.open(data, "_blank");
    }
    setLoading(false);
  };

  const refresh = () => {
    clearPlansCache();
    // A request already in flight predates whatever change prompted the refresh.
    plansRequest = null;
    setTimeStamp(Date.now());
  };

  return {
    plans,
    loading,
    stripeAccount,
    loginAccount,
    gatewayUrl,
    refresh,
    finishSetup,
  };
}
