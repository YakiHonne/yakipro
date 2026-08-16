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
  setUserMetadata,
  setUserFollowings,
  setUserRelays,
  setUserBlossomServers,
} from "./Slices/UserData";

import {
  IsDarkModeReducer,
  ToastReducer,
  NostrAuthorsReducer,
} from "./Slices/Extras";

import { PublishersReducer } from "./Slices/Publishers";
import { NostrUserReducer, IsConnectedReducer, LoadingConnectedUserReducer } from "./Slices/User";
import { AnalyticsReducer } from "./analyticsSlice";
import {
  SubscriptionReducer,
  clearSubscriptionStatus,
} from "./Slices/Subscription";
import { PaymentSheetReducer } from "./Slices/PaymentSheet";
import { resetAccountScopedCaches } from "@/Cache/accountScope";

// Signing in never reloads the page, so module-level caches outlive the account change and
// keep answering for the previous pubkey. `setUserKeys` is the one action every login path
// dispatches — session restore, each LoginPage method, the LoginSignup overlay, signup — so
// resetting here covers them all, including any path added later that forgets to.
//
// Doing it here (rather than at each call site) also covers the login paths that dispatch
// the new keys without going through `AccountInit` — e.g. the LoginSignup overlay.
const accountScopeMiddleware = (storeApi) => (next) => (action) => {
  if (action.type !== "userKeys/setUserKeys") return next(action);

  const pubkey = action.payload?.pub ?? null;
  const previous = storeApi.getState().userKeys?.pub ?? null;
  // Logout dispatches setUserKeys(null) and force-resets separately; only act on a real
  // change between two accounts.
  const switched = Boolean(pubkey) && pubkey !== previous;

  // Caches first, so nothing can read the outgoing account's data after the keys change.
  if (switched) resetAccountScopedCaches(pubkey);

  const result = next(action);

  // Then the account-scoped slices, dispatched after `next` so we're no longer inside
  // another action's dispatch. Cleared rather than left stale so no screen renders the
  // previous account's values in the window before the new data arrives.
  if (switched) {
    storeApi.dispatch(clearSubscriptionStatus());
    storeApi.dispatch(setUserMetadata(null));
    storeApi.dispatch(setUserFollowings([]));
    storeApi.dispatch(setUserRelays([]));
    storeApi.dispatch(setUserBlossomServers([]));
  }

  return result;
};

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
    paymentSheet: PaymentSheetReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(accountScopeMiddleware),
});
