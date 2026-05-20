import { createSlice } from "@reduxjs/toolkit";

// null  = not yet fetched
// false = fetch failed (fail-open)
// {}    = fetched data

const subscriptionSlice = createSlice({
  name: "subscription",
  initialState: {
    status: null,   // the full API response object, null while loading
    loaded: false,  // true once the first fetch completes (success or fail)
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
