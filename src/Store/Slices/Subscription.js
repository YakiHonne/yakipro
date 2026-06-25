import { createSlice } from "@reduxjs/toolkit";

const subscriptionSlice = createSlice({
  name: "subscription",
  initialState: {
    status: null,
    loaded: false,
    forcePaywall: false,
  },
  reducers: {
    setSubscriptionStatus(state, action) {
      state.status = action.payload;
      state.loaded = true;
    },
    clearSubscriptionStatus(state) {
      state.status = null;
      state.loaded = false;
      state.forcePaywall = false;
    },
    setForcePaywall(state, action) {
      state.forcePaywall = action.payload;
    },
  },
});

export const { setSubscriptionStatus, clearSubscriptionStatus, setForcePaywall } = subscriptionSlice.actions;
export const SubscriptionReducer = subscriptionSlice.reducer;
