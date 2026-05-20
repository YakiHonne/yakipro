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
    // User
    userKeys: UserKeysReducer,
    userMetadata: UserMetadataReducer,
    userRelays: UserRelaysReducer,
    userFollowings: UserFollowingsReducer,
    userMutedList: UserMutedListReducer,
    userBookmarks: UserBookmarksReducer,
    userInterestList: UserInterestListReducer,
    userBlossomServers: UserBlossomServersReducer,
    // App
    isDarkMode: IsDarkModeReducer,
    toast: ToastReducer,
    nostrAuthors: NostrAuthorsReducer,
    // Publishers
    publishers: PublishersReducer,
    // Analytics
    analytics: AnalyticsReducer,
    // Subscription
    subscription: SubscriptionReducer,
  },
});
