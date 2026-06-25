import { ndkInstance } from "@/Helpers/NDKInstance";
import {
  NDKNip07Signer,
  NDKNip46Signer,
  NDKPrivateKeySigner,
  NDKRelayAuthPolicies,
} from "@nostr-dev-kit/ndk";
import {
  setUserKeys,
  setUserMetadata,
  setUserFollowings,
  setUserRelays,
  setUserBlossomServers,
} from "@/Store/Slices/UserData";
import { store } from "@/Store/Store";
import {
  login as apiLogin,
  logout as apiLogout,
  checkUserConnected,
} from "@/Endpoionts/Auth";
import { setIsConnected, setLoadingConnectedUser, setNostrUser } from "@/Store/Slices/User";
import {
  clearUserRelaysCache,
  setUserRelaysCache,
} from "@/Cache/userRelaysCache";
import { setSubscriptionStatus, clearSubscriptionStatus } from "@/Store/Slices/Subscription";
import { getSubscriptionStatus } from "@/Endpoionts/subscription";

const ACCOUNTS_KEY = "yaki-accounts";
const AUTH_KEY = "_nostruserkeys";

export const applySignerToNDK = async (keys) => {
  try {
    if (keys.ext) {
      ndkInstance.signer = new NDKNip07Signer(undefined, ndkInstance);
    } else if (keys.sec) {
      ndkInstance.signer = new NDKPrivateKeySigner(keys.sec);
    } else if (keys.bunker) {
      const localSigner = new NDKPrivateKeySigner(keys.localKeys.sec);
      const signer = new NDKNip46Signer(ndkInstance, keys.bunker, localSigner);
      ndkInstance.signer = signer;
      await signer.blockUntilReady();
    }

    ndkInstance.relayAuthDefaultPolicy = NDKRelayAuthPolicies.signIn({
      ndk: ndkInstance,
    });
  } catch (err) {
    console.error("[AccountInit] applySignerToNDK error:", err);
  }
};

export const saveAccountLocally = (pubkey, keys, metadata = null) => {
  try {
    const accountsRaw = localStorage.getItem(ACCOUNTS_KEY);
    let accounts = accountsRaw ? JSON.parse(accountsRaw) : [];

    accounts = accounts.filter((acc) => acc.pubkey !== pubkey);

    accounts.unshift({
      pubkey,
      keys,
      metadata,
      lastActive: Date.now(),
    });

    accounts = accounts.slice(0, 10);

    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch (err) {
    console.error("[AccountInit] Failed to save account locally:", err);
  }
};

export const fetchUserMetadata = async (pubkey) => {
  try {
    const user = ndkInstance.getUser({ pubkey });
    try {
      await user?.fetchProfile();
    } catch (err) {}

    const metadata = user?.profile || {};
    store.dispatch(setUserMetadata(metadata));

    const followEvent = await ndkInstance.fetchEvent({
      kinds: [3],
      authors: [pubkey],
    });

    if (followEvent) {
      const followings = followEvent.tags
        .filter((t) => t[0] === "p")
        .map((t) => t[1]);
      store.dispatch(setUserFollowings(followings));
    }

    const relayEvent = await ndkInstance.fetchEvent({
      kinds: [10002],
      authors: [pubkey],
    });

    if (relayEvent) {
      const relays = relayEvent.tags
        .filter((t) => t[0] === "r")
        .map((t) => ({
          url: t[1],
          read: t[2] === "read" || !t[2],
          write: t[2] === "write" || !t[2],
        }));
      store.dispatch(setUserRelays(relays));
      setUserRelaysCache(relays);
    }

    return metadata;
  } catch (err) {
    console.error("[AccountInit] Failed to fetch metadata:", err);
    return null;
  }
};

const fetchBlossomServers = (pubkey) => {
  try {
    const sub = ndkInstance.subscribe(
      [{ kinds: [10063], authors: [pubkey] }],
      { cacheUsage: "CACHE_FIRST", closeOnEose: true },
    );
    sub.on("event", (ev) => {
      const raw = ev.rawEvent ? ev.rawEvent() : ev;
      const servers = (raw.tags || [])
        .filter((t) => t[0] === "server" && /^https?:\/\//.test(t[1]))
        .map((t) => t[1]);
      if (servers.length > 0) {
        store.dispatch(setUserBlossomServers(servers));
      }
    });
  } catch (err) {
    console.error("[AccountInit] fetchBlossomServers error:", err);
  }
};

export const initAppAccount = async () => {
  try {
    const authRaw = localStorage.getItem(AUTH_KEY);
    if (!authRaw) {
      store.dispatch(setLoadingConnectedUser(false));
      return;
    }

    const keys = JSON.parse(authRaw);
    if (!keys || !keys.pub) {
      store.dispatch(setLoadingConnectedUser(false));
      return;
    }

    await applySignerToNDK(keys);

    store.dispatch(setUserKeys(keys));

    const metadata = await fetchUserMetadata(keys.pub);

    saveAccountLocally(keys.pub, keys, metadata);

    fetchBlossomServers(keys.pub);

    try {
      const res = await checkUserConnected();
      if (res && res !== false) {
        store.dispatch(setNostrUser(res));
        store.dispatch(setIsConnected(true));
      } else {
        const loginRes = await apiLogin({ publicKey: keys.pub, userKeys: keys });
        if (loginRes && loginRes !== false) {
          store.dispatch(setNostrUser(loginRes));
          store.dispatch(setIsConnected(true));
        }
      }
    } catch {
      try {
        const loginRes = await apiLogin({ publicKey: keys.pub, userKeys: keys });
        if (loginRes && loginRes !== false) {
          store.dispatch(setNostrUser(loginRes));
          store.dispatch(setIsConnected(true));
        }
      } catch (err) {
        console.error("[AccountInit] backend login error:", err);
      }
    } finally {
      store.dispatch(setLoadingConnectedUser(false));
      getSubscriptionStatus()
        .then((data) => store.dispatch(setSubscriptionStatus(data)))
        .catch(() => store.dispatch(setSubscriptionStatus(null)));
    }
  } catch (err) {
    console.error("[AccountInit] initAppAccount error:", err);
    store.dispatch(setLoadingConnectedUser(false));
  }
};

export const logoutUser = () => {
  try {
    localStorage.removeItem(AUTH_KEY);
    store.dispatch(setUserKeys(null));
    store.dispatch(setUserMetadata(null));
    store.dispatch(setUserFollowings([]));
    store.dispatch(setUserRelays([]));
    store.dispatch(setUserBlossomServers([]));
    store.dispatch(setIsConnected(false));
    store.dispatch(clearSubscriptionStatus());
    clearUserRelaysCache();
    apiLogout();
    ndkInstance.signer = undefined;
  } catch (err) {
    console.error("[AccountInit] Logout error:", err);
  }
};
