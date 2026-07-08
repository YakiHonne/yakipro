import axiosInstance from "@/Helpers/HTTP_Client";

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

export const getPlans = async () => {
  if (_plansCache) return _plansCache;
  try {
    const data = await axiosInstance.get("/api/v1/plans");
    _plansCache = data.data?.plans ?? [];
    return _plansCache;
  } catch (err) {
    console.log(err);
    return [];
  }
};

export const clearPlansCache = () => {
  _plansCache = null;
};
export const getStripeAccount = async () => {
  try {
    const data = await axiosInstance.get("/api/v1/provider");
    return data.data;
  } catch (err) {
    console.log(err);
    return false;
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
    });
    const url = data.data?.url;
    if (url) window.open(url);
    return data.data;
  } catch (err) {
    console.log(err);
    return false;
  }
};
