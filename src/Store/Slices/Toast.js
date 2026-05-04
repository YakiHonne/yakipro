import { createSlice } from "@reduxjs/toolkit";

const initialState = { toasts: [] };

export const ToastSlice = createSlice({
  name: "Toast",
  initialState,
  reducers: {
    setToast: (state, action) => {
      const id = Date.now() + Math.random();
      state.toasts.push({ ...action.payload, id });
    },
    clearToast: (state, action) => {
      if (action.payload?.id) {
        state.toasts = state.toasts.filter((t) => t.id !== action.payload.id);
      } else {
        state.toasts = [];
      }
    },
  },
});

export const { setToast, clearToast } = ToastSlice.actions;
export const ToastReducer = ToastSlice.reducer;
