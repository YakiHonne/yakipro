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
import { setUserRelaysCache } from "@/Cache/userRelaysCache";
import { setSubscriptionStatus, clearSubscriptionStatus } from "@/Store/Slices/Subscription";
import { getSubscriptionStatus } from "@/Endpoionts/subscription";
import { resetAccountScopedCaches } from "@/Cache/accountScope";

const ACCOUNTS_KEY = "yaki-accounts";
const AUTH_KEY = "_nostruserkeys";

/**
 * Marks the start of a new account's session by dropping every in-memory cache filled by
 * the previous one.
 *
 * Signing in navigates client-side (`router.replace("/dashboard")`) instead of reloading, so
 * `_app` and every module singleton it imported outlive the account change — without this,
 * those caches keep answering for the PREVIOUS pubkey. That is the "stats show the old
 * account" bug, first seen on the dashboard and then on the subscription page.
 *
 * The account-scoped Redux slices are cleared by the `setUserKeys` middleware in Store.js,
 * which catches the login paths that never reach this function. Calling both is safe: each
 * is idempotent per pubkey.
 */
export const activateAccount = (pubkey) => resetAccountScopedCaches(pubkey);

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

// A freshly-created account has published nothing, so none of these lookups will ever
// resolve — relays simply stay silent and each fetchEvent runs to its full internal
// timeout. Running them in sequence made that cost stack up before the app could render.
// They're independent, so fetch them in parallel and cap the wait: a missing profile /
// contact list / relay list is a normal state for a new account, not something worth
// blocking the dashboard on.
const METADATA_FETCH_TIMEOUT_MS = 4000;

const withTimeout = (promise, ms) =>
  Promise.race([
    Promise.resolve(promise).catch(() => null),
    new Promise((resolve) => setTimeout(() => resolve(null), ms)),
  ]);

export const fetchUserMetadata = async (pubkey) => {
  try {
    const user = ndkInstance.getUser({ pubkey });

    const [, followEvent, relayEvent] = await Promise.all([
      withTimeout(user?.fetchProfile(), METADATA_FETCH_TIMEOUT_MS),
      withTimeout(
        ndkInstance.fetchEvent({ kinds: [3], authors: [pubkey] }),
        METADATA_FETCH_TIMEOUT_MS,
      ),
      withTimeout(
        ndkInstance.fetchEvent({ kinds: [10002], authors: [pubkey] }),
        METADATA_FETCH_TIMEOUT_MS,
      ),
    ]);

    const metadata = user?.profile || {};
    store.dispatch(setUserMetadata(metadata));

    if (followEvent) {
      const followings = followEvent.tags
        .filter((t) => t[0] === "p")
        .map((t) => t[1]);
      store.dispatch(setUserFollowings(followings));
    }

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

    // Before anything reads cached state: if this is a different account than the one the
    // in-memory caches were filled for, drop them now.
    activateAccount(keys.pub);

    await applySignerToNDK(keys);

    store.dispatch(setUserKeys(keys));

    // Metadata comes from relays; the backend session below doesn't depend on it. Awaiting it
    // here kept `loadingConnectedUser` (which gates the whole app behind a spinner) true for the
    // full relay round-trip — worst on a new account, where there is no profile to find. Let it
    // resolve in the background and store it whenever it lands.
    fetchUserMetadata(keys.pub).then((metadata) => {
      saveAccountLocally(keys.pub, keys, metadata);
    });

    fetchBlossomServers(keys.pub);

    try {
      const res = await checkUserConnected();
      // The server session cookie may still be bound to a PREVIOUSLY logged-in
      // pubkey (account switch, stale session). /online returns whoever the
      // session says — so only trust it when it matches the locally-selected
      // account; otherwise rebind the session via apiLogin before trusting it.
      const sessionMatchesLocal =
        res && res !== false && res.pubkey === keys.pub;

      if (sessionMatchesLocal) {
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

// Brand-new accounts publish nothing before signup finishes, so there is no relay state
// to discover — every fetch would just burn its timeout. `createAccount` therefore seeds
// the store directly from what the user typed instead of round-tripping through relays,
// and only then hands off to the backend. Order matters: signer → publish → API login.
export const createAccount = async ({ keys, name, picture }) => {
  // A previous session's cookie would otherwise make /online answer for the OLD pubkey,
  // and the dashboard would render that account's data under the new one.
  try {
    await apiLogout();
  } catch {
    // no session to drop — expected on a first-ever signup
  }
  store.dispatch(setIsConnected(false));
  store.dispatch(setNostrUser(null));
  // Wipes every in-memory cache (plans, allowed relays, gateway access, …) so a brand-new
  // account never inherits the prior session's data. The account-scoped slices are cleared
  // by the `setUserKeys` dispatch below — which lands before the seeding that follows it,
  // so the seeded profile/relays survive.
  activateAccount(keys.pub);

  await applySignerToNDK(keys);

  const metadata = {
    name,
    display_name: name,
    about: "",
    picture: picture || "",
    banner: "",
  };

  const relays = DEFAULT_SIGNUP_RELAYS.map((url) => ({
    url,
    read: true,
    write: true,
  }));

  // Publish profile + relay list. Failures here are non-fatal: the account keys are
  // already valid, and a retry can republish later — blocking signup on relay latency
  // would be worse than a profile that propagates a moment late.
  await Promise.allSettled([
    publishSignupEvent({ kind: 0, content: JSON.stringify(metadata), tags: [] }),
    publishSignupEvent({
      kind: 10002,
      content: "",
      tags: DEFAULT_SIGNUP_RELAYS.map((url) => ["r", url]),
    }),
  ]);

  // Seed local state from what we just published rather than re-reading it from relays.
  localStorage.setItem(AUTH_KEY, JSON.stringify(keys));
  store.dispatch(setUserKeys(keys));
  store.dispatch(setUserMetadata(metadata));
  store.dispatch(setUserFollowings([]));
  store.dispatch(setUserRelays(relays));
  setUserRelaysCache(relays);
  saveAccountLocally(keys.pub, keys, metadata);

  const loginRes = await apiLogin({ publicKey: keys.pub, userKeys: keys });
  if (!loginRes || loginRes === false) {
    return false;
  }
  store.dispatch(setNostrUser(loginRes));
  store.dispatch(setIsConnected(true));
  store.dispatch(setLoadingConnectedUser(false));

  getSubscriptionStatus()
    .then((data) => store.dispatch(setSubscriptionStatus(data)))
    .catch(() => store.dispatch(setSubscriptionStatus(null)));

  return true;
};

const DEFAULT_SIGNUP_RELAYS = [
  "wss://nostr-01.yakihonne.com",
  "wss://nostr-02.yakihonne.com",
  "wss://relay.damus.io",
];

const SIGNUP_PUBLISH_TIMEOUT_MS = 4000;

const publishSignupEvent = async ({ kind, content, tags }) => {
  const { NDKEvent } = await import("@nostr-dev-kit/ndk");
  const event = new NDKEvent(ndkInstance);
  event.kind = kind;
  event.content = content;
  event.tags = tags;
  return withTimeout(event.publish(), SIGNUP_PUBLISH_TIMEOUT_MS);
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
    // `force`: there is no incoming pubkey to compare against, and signing back into the
    // SAME account must still start from clean caches, which the pubkey check would skip.
    resetAccountScopedCaches(null, { force: true });
    apiLogout();
    ndkInstance.signer = undefined;
  } catch (err) {
    console.error("[AccountInit] Logout error:", err);
  }
};
