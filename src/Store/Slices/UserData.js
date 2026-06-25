import { createSlice } from "@reduxjs/toolkit";

const userKeysSlice = createSlice({
  name: "userKeys",
  initialState: null,
  reducers: {
    setUserKeys: (_, action) => action.payload,
    clearUserKeys: () => null,
  },
});

const userMetadataSlice = createSlice({
  name: "userMetadata",
  initialState: null,
  reducers: {
    setUserMetadata: (_, action) => action.payload,
  },
});

const userRelaysSlice = createSlice({
  name: "userRelays",
  initialState: [],
  reducers: {
    setUserRelays: (_, action) => action.payload,
  },
});

const userFollowingsSlice = createSlice({
  name: "userFollowings",
  initialState: [],
  reducers: {
    setUserFollowings: (_, action) => action.payload,
  },
});

const userMutedListSlice = createSlice({
  name: "userMutedList",
  initialState: { userMutedList: [], allTags: [] },
  reducers: {
    setUserMutedList: (_, action) => action.payload,
  },
});

const userBookmarksSlice = createSlice({
  name: "userBookmarks",
  initialState: [],
  reducers: {
    setUserBookmarks: (_, action) => action.payload,
  },
});

const userInterestListSlice = createSlice({
  name: "userInterestList",
  initialState: [],
  reducers: {
    setUserInterestList: (_, action) => action.payload,
  },
});

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
