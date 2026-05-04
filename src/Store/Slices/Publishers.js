import { createSlice } from "@reduxjs/toolkit";

const publishersSlice = createSlice({
  name: "publishers",
  initialState: {
    toPublish: false, // { kind, content, tags, ... }
    isPublishing: false,
    toast: [],
  },
  reducers: {
    setToPublish: (state, action) => {
      state.toPublish = action.payload;
    },
    setIsPublishing: (state, action) => {
      state.isPublishing = action.payload;
    },
    setToast: (state, action) => {
      const id = Date.now();
      state.toast.push({ ...action.payload, id });
    },
    removeToast: (state, action) => {
      state.toast = state.toast.filter((toast) => toast.id !== action.payload);
    },
  },
});

export const { setToPublish, setIsPublishing, setToast, removeToast } =
  publishersSlice.actions;

export const PublishersReducer = publishersSlice.reducer;
