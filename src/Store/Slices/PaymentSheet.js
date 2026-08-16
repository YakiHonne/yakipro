import { createSlice } from "@reduxjs/toolkit";

const paymentSheetSlice = createSlice({
  name: "paymentSheet",
  initialState: {
    open: false,
    trialEnded: false,
    dismissible: true,
    source: "",
  },
  reducers: {
    openPaymentSheet(state, action) {
      state.open = true;
      state.trialEnded = action.payload?.trialEnded ?? false;
      state.dismissible = action.payload?.dismissible ?? true;
      state.source = action.payload?.source ?? "";
    },
    closePaymentSheet(state) {
      state.open = false;
      state.trialEnded = false;
      state.dismissible = true;
      state.source = "";
    },
  },
});

export const { openPaymentSheet, closePaymentSheet } =
  paymentSheetSlice.actions;
export const PaymentSheetReducer = paymentSheetSlice.reducer;
