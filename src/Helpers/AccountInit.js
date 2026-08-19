import {
  ndkInstance,
  relaysOnPlatform,
  addExplicitRelays,
} from "@/Helpers/NDKInstance";
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
import {
  setSubscriptionStatus,
  clearSubscriptionStatus,
  seedAccountFields,
} from "@/Store/Slices/Subscription";
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

// fetchEvent resolves null for "this account has no such event", which is exactly
// what withTimeout returns when the read times out or throws. Callers that must
// act on genuine absence need those two apart, so failures get a distinct value.
export const TIMED_OUT = Symbol("timed-out");

const readEvent = (promise, ms) =>
  Promise.race([
    Promise.resolve(promise).catch(() => TIMED_OUT),
    new Promise((resolve) => setTimeout(() => resolve(TIMED_OUT), ms)),
  ]);

const PREMIUM_RELAY = process.env.NEXT_PUBLIC_PREMIUM_RELAY;
const RELAY_PUBLISH_TIMEOUT_MS = 4000;

// Every account must end up with a relay list that includes the premium relay, and
// this runs at login rather than on the relays screen. An account with no kind
// 10002 gets the platform defaults plus the premium relay; an account that already
// has a list only gains the premium relay, keeping its own entries untouched.
//
// This runs on every load, but the conditions above are self-limiting: once the
// list contains the premium relay there is nothing left to do, so a settled
// account never republishes. A stored "already seeded" flag was worse than
// useless here — it recorded the attempt rather than the result, so one silently
// failed publish locked the account out of ever retrying.
const ensureRelayList = async (existingRelays, relayReadSucceeded) => {
  if (!PREMIUM_RELAY) {
    console.warn("[AccountInit] NEXT_PUBLIC_PREMIUM_RELAY is not set");
    return existingRelays;
  }
  // A timed-out read is not "no relays": seeding on it would overwrite a list we
  // simply failed to see.
  if (!relayReadSucceeded) {
    console.warn("[AccountInit] Relay list read failed; not seeding");
    return existingRelays;
  }
  // A watch-only login (bare pubkey, no signer) cannot sign a kind 10002. This is
  // also where a failed applySignerToNDK lands, which is worth saying out loud
  // rather than returning quietly.
  if (!ndkInstance.signer) {
    console.warn("[AccountInit] No signer available; cannot publish relay list");
    return existingRelays;
  }

  const hasPremium = existingRelays.some((r) => r.url === PREMIUM_RELAY);
  if (existingRelays.length > 0 && hasPremium) return existingRelays;

  const base =
    existingRelays.length > 0
      ? existingRelays
      : relaysOnPlatform.map((url) => ({ url, read: true, write: true }));

  const updated = base.some((r) => r.url === PREMIUM_RELAY)
    ? base
    : [...base, { url: PREMIUM_RELAY, read: true, write: true }];

  try {
    const { NDKEvent, NDKRelaySet } = await import("@nostr-dev-kit/ndk");
    const event = new NDKEvent(ndkInstance);
    event.kind = 10002;
    event.content = "";
    event.tags = updated.map((r) =>
      [
        "r",
        r.url,
        r.read && r.write ? undefined : r.read ? "read" : "write",
      ].filter(Boolean),
    );

    // The list has to land on the relays it names — including the ones just added,
    // which are not in NDK's default pool. Publishing without an explicit set sends
    // it only to whatever pool NDK already holds, so the new relays never receive
    // the very event that declares them.
    const relaySet = NDKRelaySet.fromRelayUrls(
      updated.map((r) => r.url),
      ndkInstance,
    );
    // Not withTimeout: that catches rejections into null, so a publish that failed
    // outright still looked like a success and got marked as seeded — silently,
    // with nothing in the console to show for it.
    const publishedTo = await Promise.race([
      event.publish(relaySet),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("relay list publish timed out")),
          RELAY_PUBLISH_TIMEOUT_MS,
        ),
      ),
    ]);

    // publish() resolves with the set of relays that accepted the event; an empty
    // set means every one rejected it, which is a failure however it resolved.
    if (!publishedTo || publishedTo.size === 0) {
      console.error("[AccountInit] Relay list rejected by every relay");
      return updated;
    }

    console.log(
      `[AccountInit] Published relay list (${updated.length} relays) to ${publishedTo.size} relay(s)`,
    );
  } catch (err) {
    console.error("[AccountInit] Failed to publish relay list:", err);
  }

  return updated;
};

// NDK's fetchProfile returns an NDKUserProfile, not the raw kind 0: it renames
// display_name to displayName and appends its own profileEvent/created_at fields.
// The whole app reads and republishes nostr field names, so a profile fetched this
// way showed an empty "display name" box — and saving would then have published
// that empty value back, deleting the user's real display name.
//
// NDK keeps the untouched event in profileEvent, so the original content is
// recovered from there and only falls back to un-renaming when it is absent.
const toRawMetadata = (profile) => {
  if (!profile) return {};

  if (profile.profileEvent) {
    try {
      const parsed = JSON.parse(profile.profileEvent);
      const content = JSON.parse(parsed.content);
      if (content && typeof content === "object") return content;
    } catch (err) {
      console.error("[AccountInit] Could not parse profileEvent:", err);
    }
  }

  const { displayName, profileEvent, created_at, image, ...rest } = profile;
  return {
    ...rest,
    ...(displayName !== undefined ? { display_name: displayName } : {}),
  };
};

export const fetchUserMetadata = async (pubkey) => {
  try {
    const user = ndkInstance.getUser({ pubkey });

    const [, followEvent, relayEvent] = await Promise.all([
      withTimeout(user?.fetchProfile(), METADATA_FETCH_TIMEOUT_MS),
      withTimeout(
        ndkInstance.fetchEvent({ kinds: [3], authors: [pubkey] }),
        METADATA_FETCH_TIMEOUT_MS,
      ),
      readEvent(
        ndkInstance.fetchEvent({ kinds: [10002], authors: [pubkey] }),
        METADATA_FETCH_TIMEOUT_MS,
      ),
    ]);

    const metadata = toRawMetadata(user?.profile);
    store.dispatch(setUserMetadata(metadata));

    if (followEvent) {
      const followings = followEvent.tags
        .filter((t) => t[0] === "p")
        .map((t) => t[1]);
      store.dispatch(setUserFollowings(followings));
    }

    // A null relayEvent is a real answer — the account publishes no kind 10002 —
    // and must seed defaults. Only TIMED_OUT means "we could not read it", which
    // is the case where seeding would clobber a list that does exist.
    const relayReadSucceeded = relayEvent !== TIMED_OUT;
    const existingRelays =
      relayEvent && relayEvent !== TIMED_OUT
        ? relayEvent.tags
            .filter((t) => t[0] === "r" && t[1])
            .map((t) => ({
              url: t[1],
              read: t[2] === "read" || !t[2],
              write: t[2] === "write" || !t[2],
            }))
        : [];

    const relays = await ensureRelayList(existingRelays, relayReadSucceeded);

    if (relays.length > 0) {
      store.dispatch(setUserRelays(relays));
      setUserRelaysCache(relays);

      // NDK is constructed with only the platform defaults, so until the account's
      // own relays are added to the pool every read still goes to those five —
      // which is why an author whose notes live elsewhere sees an empty feed.
      // Awaited so the sockets are actually open (and AUTH answered) before the
      // content page starts querying.
      await addExplicitRelays(relays.map((r) => r.url));
    }

    return metadata;
  } catch (err) {
    console.error("[AccountInit] Failed to fetch metadata:", err);
    return null;
  }
};

const BLOSSOM_SERVER = process.env.NEXT_PUBLIC_BLOSSOM_SERVER;

// Mirrors the relay-list rule: whatever the account already publishes is kept, and
// our server is appended only when missing. An account with no kind 10063 at all
// gets a list containing just ours.
//
// The subscribe-with-callback shape this replaces could only ever react to an
// event that existed — "the user has no blossom list" produced no callback and so
// no chance to seed one, which is the case that needs seeding most.
const ensureBlossomServers = async (pubkey, existingServers) => {
  if (!BLOSSOM_SERVER) return existingServers;
  if (existingServers.includes(BLOSSOM_SERVER)) return existingServers;
  if (!ndkInstance.signer) {
    console.warn("[AccountInit] No signer available; cannot publish blossom list");
    return existingServers;
  }

  const updated = [...existingServers, BLOSSOM_SERVER];

  try {
    const { NDKEvent } = await import("@nostr-dev-kit/ndk");
    const event = new NDKEvent(ndkInstance);
    event.kind = 10063;
    event.content = "";
    event.tags = updated.map((server) => ["server", server]);

    const publishedTo = await Promise.race([
      event.publish(),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("blossom list publish timed out")),
          RELAY_PUBLISH_TIMEOUT_MS,
        ),
      ),
    ]);

    if (!publishedTo || publishedTo.size === 0) {
      console.error("[AccountInit] Blossom list rejected by every relay");
      return updated;
    }

    console.log(
      `[AccountInit] Published blossom list (${updated.length} server(s)) to ${publishedTo.size} relay(s)`,
    );
  } catch (err) {
    console.error("[AccountInit] Failed to publish blossom list:", err);
  }

  return updated;
};

// Reads and stores the list right away — the Media page renders from it, so this
// must not wait on the backend session. Returns the servers so the seeding step
// can act on them once `onboarded` is known, rather than reading the list twice.
const fetchBlossomServers = async (pubkey) => {
  try {
    const event = await readEvent(
      ndkInstance.fetchEvent({ kinds: [10063], authors: [pubkey] }),
      METADATA_FETCH_TIMEOUT_MS,
    );

    // As with relays, a failed read must not look like an empty list: seeding on
    // it would drop servers the account actually has.
    if (event === TIMED_OUT) {
      console.warn("[AccountInit] Blossom list read failed");
      return null;
    }

    const raw = event?.rawEvent ? event.rawEvent() : event;
    const servers = (raw?.tags || [])
      .filter((t) => t[0] === "server" && /^https?:\/\//.test(t[1]))
      .map((t) => t[1]);

    if (servers.length > 0) {
      store.dispatch(setUserBlossomServers(servers));
    }

    return servers;
  } catch (err) {
    console.error("[AccountInit] fetchBlossomServers error:", err);
    return null;
  }
};

// Only accounts that have not finished onboarding get our server added. An
// onboarded account has already had its chance to curate this list, so a server it
// removed on purpose must not silently reappear.
const seedBlossomServers = async (pubkey, blossomRead, session) => {
  try {
    if (session?.onboarded !== false) return;

    // null means the read failed — distinct from an empty list. Seeding on it
    // would publish over servers we simply could not see.
    const existingServers = await blossomRead;
    if (existingServers === null) return;

    const servers = await ensureBlossomServers(pubkey, existingServers);
    if (servers.length > 0) {
      store.dispatch(setUserBlossomServers(servers));
    }
  } catch (err) {
    console.error("[AccountInit] seedBlossomServers error:", err);
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

    // The list itself is read immediately — nothing about fetching it depends on
    // the session. Only the seeding decision below needs `onboarded`.
    const blossomRead = fetchBlossomServers(keys.pub);

    try {
      const res = await checkUserConnected();
      // The server session cookie may still be bound to a PREVIOUSLY logged-in
      // pubkey (account switch, stale session). /online returns whoever the
      // session says — so only trust it when it matches the locally-selected
      // account; otherwise rebind the session via apiLogin before trusting it.
      const sessionMatchesLocal =
        res && res !== false && res.pubkey === keys.pub;

      let session = null;

      if (sessionMatchesLocal) {
        session = res;
        store.dispatch(setNostrUser(res));
        store.dispatch(seedAccountFields(res));
        store.dispatch(setIsConnected(true));
      } else {
        const loginRes = await apiLogin({ publicKey: keys.pub, userKeys: keys });
        if (loginRes && loginRes !== false) {
          session = loginRes;
          store.dispatch(setNostrUser(loginRes));
          store.dispatch(seedAccountFields(loginRes));
          store.dispatch(setIsConnected(true));
        }
      }

      // Seeding waits on the session, since the decision depends on `onboarded`.
      seedBlossomServers(keys.pub, blossomRead, session);
    } catch {
      try {
        const loginRes = await apiLogin({ publicKey: keys.pub, userKeys: keys });
        if (loginRes && loginRes !== false) {
          store.dispatch(setNostrUser(loginRes));
          store.dispatch(seedAccountFields(loginRes));
          store.dispatch(setIsConnected(true));
          seedBlossomServers(keys.pub, blossomRead, loginRes);
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
  await addExplicitRelays(relays.map((r) => r.url));
  saveAccountLocally(keys.pub, keys, metadata);

  const loginRes = await apiLogin({ publicKey: keys.pub, userKeys: keys });
  if (!loginRes || loginRes === false) {
    return false;
  }
  store.dispatch(setNostrUser(loginRes));
  store.dispatch(seedAccountFields(loginRes));
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
