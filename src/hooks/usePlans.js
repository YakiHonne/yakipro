import {
  enableStripe,
  getProviderLogin,
  getStripeAccount,
  getSubPlans,
} from "@/Endpoionts/payment";
import { extractLightningPlans, getSubData } from "@/Helpers/Helpers";
import React, { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import {
  clearPlansCache,
  getPlansCache,
  setPlansCache,
} from "@/Cache/plansCache";

export default function usePlans() {
  const userKeys = useSelector((state) => state.userKeys);
  const [plans, setPlans] = useState({
    fiat: [],
    crypto: [],
    ln: [],
    isFiatEnable: false,
    isCryptoEnabled: false,
    isLnEnabled: false,
  });
  const [loading, setLoading] = useState(false);
  const [stripeAccount, setStripeAccount] = useState(null);
  const [timestamp, setTimeStamp] = useState(false);
  const gatewayUrl = useMemo(() => {
    if (!userKeys) return null;
    return process.env.NEXT_PUBLIC_GATEWAY_URL + userKeys.pub;
  }, [userKeys]);

  useEffect(() => {
    if (userKeys) fetchPlans();
    else clearPlansCache();
  }, [timestamp, userKeys]);

  const fetchPlans = async () => {
    const cached = getPlansCache();
    if (cached && !timestamp) {
      setStripeAccount(cached.stripeAccount);
      setPlans(cached.plans);
      return;
    }
    setLoading(true);
    const [provider, subPlans, nostrPlans] = await Promise.all([
      getStripeAccount(),
      getSubPlans(),
      getSubData({
        filter: [
          {
            authors: [userKeys.pub],
            "#d": [process.env.NEXT_PUBLIC_GATEWAY_PUBKEY],
            kinds: [30164],
          },
        ],
      }),
    ]);
    let tags = nostrPlans.data.length > 0 ? nostrPlans.data[0].tags : [];
    let l = extractLightningPlans(tags);

    // Fiat & crypto pricing live in CreatorSubPlans (served by /subplans), one
    // doc per provider ("stripe-fiat" / "stripe-crypto"). /provider only returns
    // the Stripe account with no pricing, which is why fiat never loaded.
    const fiatPlan = subPlans.find((p) => p.provider === "stripe-fiat");
    const cryptoPlan = subPlans.find((p) => p.provider === "stripe-crypto");

    const processedPlans = {
      fiat: fiatPlan?.pricing ?? [],
      crypto: cryptoPlan?.pricing ?? [],
      ln: l,
      isFiatEnable: fiatPlan ? fiatPlan.active : false,
      isCryptoEnabled: cryptoPlan ? cryptoPlan.active : false,
      isLnEnabled: l?.length > 0,
    };

    setStripeAccount(provider);
    setPlans(processedPlans);
    setPlansCache({ stripeAccount: provider, plans: processedPlans });
    setLoading(false);
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
