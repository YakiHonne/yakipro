import {
  enableStripe,
  getPlans,
  getProviderLogin,
  getStripeAccount,
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
    const [apiPlans, provider, nostrPlans] = await Promise.all([
      getPlans(),
      getStripeAccount(),
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
    const plansList = Array.isArray(apiPlans) ? apiPlans : [];
    let f = plansList.find((_) => _.provider === "stripe-fiat");
    let c = plansList.find((_) => _.provider === "stripe-crypto");
    let tags = nostrPlans.data.length > 0 ? nostrPlans.data[0].tags : [];
    let l = extractLightningPlans(tags);

    let f_ = f ? f.pricing : [];
    let c_ = c ? c.pricing : [];

    const processedPlans = {
      fiat: f_,
      crypto: c_,
      ln: l,
      isFiatEnable: f?.active,
      isCryptoEnabled: c?.active,
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
