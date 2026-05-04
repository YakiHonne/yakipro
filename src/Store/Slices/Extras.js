import { createSlice } from "@reduxjs/toolkit";

// ─── Dark Mode ───────────────────────────────────────────────────────────────
const isDarkModeSlice = createSlice({
  name: "isDarkMode",
  initialState: "dark",
  reducers: {
    setIsDarkMode: (_, action) => action.payload,
  },
});

// ─── Toast ───────────────────────────────────────────────────────────────────
const toastSlice = createSlice({
  name: "toast",
  initialState: [],
  reducers: {
    setToast: (state, action) => {
      const id = Date.now() + Math.random();
      state.push({ ...action.payload, id });
    },
    clearToast: (state, action) => {
      if (action.payload?.id) {
        return state.filter((t) => t.id !== action.payload.id);
      }
      return [];
    },
  },
});

// ─── Nostr Authors (profile cache) ───────────────────────────────────────────
const nostrAuthorsSlice = createSlice({
  name: "nostrAuthors",
  initialState: [],
  reducers: {
    setNostrAuthors: (_, action) => action.payload ?? [],
  },
});

export const { setIsDarkMode } = isDarkModeSlice.actions;
export const { setToast, clearToast } = toastSlice.actions;
export const { setNostrAuthors } = nostrAuthorsSlice.actions;

export const IsDarkModeReducer = isDarkModeSlice.reducer;
export const ToastReducer = toastSlice.reducer;
export const NostrAuthorsReducer = nostrAuthorsSlice.reducer;
