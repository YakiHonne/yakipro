import { createSlice } from "@reduxjs/toolkit";

// Represents the currently logged-in Nostr user
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

// Tracks whether the user has connected their Nostr key
const isConnectedSlice = createSlice({
  name: "isConnected",
  initialState: false,
  reducers: {
    setIsConnected(state, action) {
      return action.payload;
    },
  },
});

export const { setNostrUser, clearNostrUser } = nostrUserSlice.actions;
export const { setIsConnected } = isConnectedSlice.actions;

export const NostrUserReducer = nostrUserSlice.reducer;
export const IsConnectedReducer = isConnectedSlice.reducer;
