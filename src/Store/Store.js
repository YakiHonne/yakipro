import { configureStore } from "@reduxjs/toolkit";

import {
  UserKeysReducer,
  UserMetadataReducer,
  UserRelaysReducer,
  UserFollowingsReducer,
  UserMutedListReducer,
  UserBookmarksReducer,
  UserInterestListReducer,
  UserBlossomServersReducer,
} from "./Slices/UserData";

import {
  IsDarkModeReducer,
  ToastReducer,
  NostrAuthorsReducer,
} from "./Slices/Extras";

import { PublishersReducer } from "./Slices/Publishers";
import { NostrUserReducer, IsConnectedReducer, LoadingConnectedUserReducer } from "./Slices/User";
import { AnalyticsReducer } from "./analyticsSlice";
import { SubscriptionReducer } from "./Slices/Subscription";

export const store = configureStore({
  reducer: {
    nostrUser: NostrUserReducer,
    isConnected: IsConnectedReducer,
    loadingConnectedUser: LoadingConnectedUserReducer,
    userKeys: UserKeysReducer,
    userMetadata: UserMetadataReducer,
    userRelays: UserRelaysReducer,
    userFollowings: UserFollowingsReducer,
    userMutedList: UserMutedListReducer,
    userBookmarks: UserBookmarksReducer,
    userInterestList: UserInterestListReducer,
    userBlossomServers: UserBlossomServersReducer,
    isDarkMode: IsDarkModeReducer,
    toast: ToastReducer,
    nostrAuthors: NostrAuthorsReducer,
    publishers: PublishersReducer,
    analytics: AnalyticsReducer,
    subscription: SubscriptionReducer,
  },
});
