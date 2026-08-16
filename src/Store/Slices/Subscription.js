import { createSlice } from "@reduxjs/toolkit";

const ACCOUNT_FIELD_DEFAULTS = {
  username: "",
  onboarded: false,
  in_trial: false,
  trial_used: false,
  nip05: null,
  wallets: [],
};

const pickAccountFields = (payload) => {
  if (!payload) return { ...ACCOUNT_FIELD_DEFAULTS };
  return {
    username: payload.username ?? "",
    onboarded: payload.onboarded ?? false,
    in_trial: payload.in_trial ?? false,
    trial_used: payload.trial_used ?? false,
    nip05: payload.nip05 ?? null,
    wallets: payload.wallets ?? [],
  };
};

const subscriptionSlice = createSlice({
  name: "subscription",
  initialState: {
    status: null,
    loaded: false,
    forcePaywall: false,
    account: { ...ACCOUNT_FIELD_DEFAULTS },
    accountSeeded: false,
  },
  reducers: {
    setSubscriptionStatus(state, action) {
      state.status = action.payload;
      state.loaded = true;
      if (action.payload) {
        state.account = pickAccountFields(action.payload);
        state.accountSeeded = true;
      }
    },
    seedAccountFields(state, action) {
      if (!action.payload) return;
      state.account = pickAccountFields(action.payload);
      state.accountSeeded = true;
    },
    patchAccountFields(state, action) {
      state.account = { ...state.account, ...(action.payload || {}) };
    },
    clearSubscriptionStatus(state) {
      state.status = null;
      state.loaded = false;
      state.forcePaywall = false;
      state.account = { ...ACCOUNT_FIELD_DEFAULTS };
      state.accountSeeded = false;
    },
    setForcePaywall(state, action) {
      state.forcePaywall = action.payload;
    },
  },
});

export const {
  setSubscriptionStatus,
  clearSubscriptionStatus,
  setForcePaywall,
  seedAccountFields,
  patchAccountFields,
} = subscriptionSlice.actions;
export const SubscriptionReducer = subscriptionSlice.reducer;
