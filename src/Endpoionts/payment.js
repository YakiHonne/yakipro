import axiosInstance from "@/Helpers/HTTP_Client";
import { registerAccountScopedReset } from "@/Cache/accountScope";

export const enableStripe = async ({ country = "" }) => {
  try {
    const data = await axiosInstance.post("/api/v1/enable-stripe", { country });
    return data.data;
  } catch (err) {
    console.log(err);
    return false;
  }
};
let _plansCache = null;
let _plansRequest = null;

const PLANS_TIMEOUT_MS = 12000;
const PLANS_RETRY_DELAYS_MS = [1500, 4000];

// Callers render whatever this resolves with once, on mount, so a single failed
// request used to leave the plan cards empty until the component remounted.
// Transient failures are retried here instead, concurrent callers share one
// request, and an empty answer is never cached as if it were the plan list.
const requestPlans = async () => {
  for (let attempt = 0; ; attempt++) {
    try {
      const { data } = await axiosInstance.get("/api/v1/plans", {
        timeout: PLANS_TIMEOUT_MS,
      });
      const plans = data?.plans ?? [];
      if (plans.length > 0) _plansCache = plans;
      return plans;
    } catch (err) {
      console.log(err);
      const retryable = !err?.response || err.response.status >= 500;
      if (!retryable || attempt >= PLANS_RETRY_DELAYS_MS.length) return [];
      await new Promise((resolve) =>
        setTimeout(resolve, PLANS_RETRY_DELAYS_MS[attempt]),
      );
    }
  }
};

export const getPlans = async () => {
  if (_plansCache) return _plansCache;
  if (!_plansRequest) {
    _plansRequest = requestPlans().finally(() => {
      _plansRequest = null;
    });
  }
  return _plansRequest;
};

export const clearPlansCache = () => {
  _plansCache = null;
};

// /plans is session-authenticated, so a response fetched under the previous account
// must not be reused for the next one.
registerAccountScopedReset(clearPlansCache);
export const getStripeAccount = async () => {
  try {
    const data = await axiosInstance.get("/api/v1/provider");
    return data.data;
  } catch (err) {
    console.log(err);
    return false;
  }
};
// The creator's per-method subscription plans (fiat/crypto) with their pricing
// and active flag. /provider only returns the Stripe account (no pricing), so
// this is the authoritative source for the fiat/crypto price lists.
//
// Resolves null when the request failed, which is not the same answer as a
// creator with no plans.
export const getSubPlans = async () => {
  try {
    const data = await axiosInstance.get("/api/v1/subplans");
    return Array.isArray(data.data) ? data.data : [];
  } catch (err) {
    console.log(err);
    return null;
  }
};
export const getProviderLogin = async () => {
  try {
    const data = await axiosInstance.get("/api/v1/provider-login");
    return data.data;
  } catch (err) {
    console.log(err);
    return false;
  }
};
export const postProducts = async ({ pricings, currency, method }) => {
  try {
    let newPricings = pricings.filter((_) => !_.id);
    if (newPricings.length === 0) return pricings;
    const data = await axiosInstance.post("/api/v1/products", {
      pricings: newPricings,
      currency,
      method,
    });
    return data.data;
  } catch (err) {
    console.log(err);
    return false;
  }
};

export const removeProduct = async ({ price_id, method }) => {
  try {
    const data = await axiosInstance.delete(`/api/v1/products`, {
      params: { price_id, method },
    });
    return data.data;
  } catch (err) {
    console.log(err);
    return false;
  }
};
export const changeStatus = async ({ method }) => {
  try {
    const data = await axiosInstance.post(`/api/v1/products/status`, {
      method,
    });
    return data.data;
  } catch (err) {
    console.log(err);
    return false;
  }
};

export const getSubscriptionLink = async ({ plan_id }) => {
  try {
    const data = await axiosInstance.post("/api/v1/subscription-link", {
      plan_id,
      // main:false → backend uses YakiPro's success_url; omitting it defaults
      // to main:true and returns the user to YakiV5 after paying.
      main: false,
    });
    const url = data.data?.url;
    if (url) window.open(url);
    return data.data;
  } catch (err) {
    console.log(err);
    return false;
  }
};

// Opens the Stripe billing portal. main:false so Stripe returns the user to
// YakiPro's /subscription. Errors are re-thrown so the caller can surface the
// backend's `message` (not_a_stripe_subscriber / no_stripe_customer / etc.).
export const openBillingPortal = async () => {
  const { data } = await axiosInstance.post("/api/v1/billing-portal", {
    main: false,
  });
  if (data?.url) window.open(data.url);
  return data;
};
