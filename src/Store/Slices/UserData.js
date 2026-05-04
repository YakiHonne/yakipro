import { createSlice } from "@reduxjs/toolkit";

// ─── User Keys ───────────────────────────────────────────────────────────────
const userKeysSlice = createSlice({
  name: "userKeys",
  initialState: null,
  reducers: {
    setUserKeys: (_, action) => action.payload,
    clearUserKeys: () => null,
  },
});

// ─── User Metadata (profile) ─────────────────────────────────────────────────
const userMetadataSlice = createSlice({
  name: "userMetadata",
  initialState: null,
  reducers: {
    setUserMetadata: (_, action) => action.payload,
  },
});

// ─── User Relays ─────────────────────────────────────────────────────────────
const userRelaysSlice = createSlice({
  name: "userRelays",
  initialState: [],
  reducers: {
    setUserRelays: (_, action) => action.payload,
  },
});

// ─── User Followings ─────────────────────────────────────────────────────────
const userFollowingsSlice = createSlice({
  name: "userFollowings",
  initialState: [],
  reducers: {
    setUserFollowings: (_, action) => action.payload,
  },
});

// ─── User Muted List ─────────────────────────────────────────────────────────
const userMutedListSlice = createSlice({
  name: "userMutedList",
  initialState: { userMutedList: [], allTags: [] },
  reducers: {
    setUserMutedList: (_, action) => action.payload,
  },
});

// ─── User Bookmarks ──────────────────────────────────────────────────────────
const userBookmarksSlice = createSlice({
  name: "userBookmarks",
  initialState: [],
  reducers: {
    setUserBookmarks: (_, action) => action.payload,
  },
});

// ─── User Interest List ──────────────────────────────────────────────────────
const userInterestListSlice = createSlice({
  name: "userInterestList",
  initialState: [],
  reducers: {
    setUserInterestList: (_, action) => action.payload,
  },
});

// ─── User Blossom Servers ─────────────────────────────────────────────────────
const userBlossomServersSlice = createSlice({
  name: "userBlossomServers",
  initialState: [],
  reducers: {
    setUserBlossomServers: (_, action) => action.payload,
  },
});

export const { setUserKeys, clearUserKeys } = userKeysSlice.actions;
export const { setUserMetadata } = userMetadataSlice.actions;
export const { setUserRelays } = userRelaysSlice.actions;
export const { setUserFollowings } = userFollowingsSlice.actions;
export const { setUserMutedList } = userMutedListSlice.actions;
export const { setUserBookmarks } = userBookmarksSlice.actions;
export const { setUserInterestList } = userInterestListSlice.actions;
export const { setUserBlossomServers } = userBlossomServersSlice.actions;

export const UserKeysReducer = userKeysSlice.reducer;
export const UserMetadataReducer = userMetadataSlice.reducer;
export const UserRelaysReducer = userRelaysSlice.reducer;
export const UserFollowingsReducer = userFollowingsSlice.reducer;
export const UserMutedListReducer = userMutedListSlice.reducer;
export const UserBookmarksReducer = userBookmarksSlice.reducer;
export const UserInterestListReducer = userInterestListSlice.reducer;
export const UserBlossomServersReducer = userBlossomServersSlice.reducer;
