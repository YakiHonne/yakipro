import { createSlice } from "@reduxjs/toolkit";

const nostrUserSlice = createSlice({
  name: "nostrUser",
  initialState: null,
  reducers: {
    setNostrUser(state, action) {
      return action.payload;
    },
    clearNostrUser() {
      return null;
    },
  },
});

const isConnectedSlice = createSlice({
  name: "isConnected",
  initialState: false,
  reducers: {
    setIsConnected(state, action) {
      return action.payload;
    },
  },
});

const loadingConnectedUserSlice = createSlice({
  name: "loadingConnectedUser",
  initialState: true,
  reducers: {
    setLoadingConnectedUser(state, action) {
      return action.payload;
    },
  },
});

export const { setNostrUser, clearNostrUser } = nostrUserSlice.actions;
export const { setIsConnected } = isConnectedSlice.actions;
export const { setLoadingConnectedUser } = loadingConnectedUserSlice.actions;

export const NostrUserReducer = nostrUserSlice.reducer;
export const IsConnectedReducer = isConnectedSlice.reducer;
export const LoadingConnectedUserReducer = loadingConnectedUserSlice.reducer;
