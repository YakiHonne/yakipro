import NDK from "@nostr-dev-kit/ndk";
import NDKCacheAdapterDexie from "@nostr-dev-kit/ndk-cache-dexie";

const DEFAULT_RELAYS = [
  "wss://nostr-01.yakihonne.com",
  "wss://relay.damus.io",
  "wss://relay.primal.net",
  "wss://offchain.pub",
];

export const relaysOnPlatform = DEFAULT_RELAYS;

const ndkInstance = new NDK({
  explicitRelayUrls: relaysOnPlatform,
  enableOutboxModel: true,
  // NDK's own default pairs purplepag.es with a relay that no longer answers,
  // which every outbox lookup then waits on.
  outboxRelayUrls: ["wss://purplepag.es", "wss://nostr-01.yakihonne.com"],
});

if (typeof window !== "undefined") {
  ndkInstance.cacheAdapter = new NDKCacheAdapterDexie({
    dbName: "yakipro-ndk-store",
    expirationTime: 3600 * 24 * 7,
    profileCacheSize: 200,
  });

  // Not awaited. This module is imported by `_app`, so a top-level await here
  // held every page — the landing page included — until all relays had
  // connected or the timeout passed, and one unreachable relay made that the
  // full timeout on every load. Subscriptions opened before a socket is up are
  // sent once it connects.
  ndkInstance.connect().catch((err) => {
    console.error("[NDK] connect error:", err);
  });
}

export { ndkInstance };

// Adds the account's own relays to the pool AND opens the sockets, resolving once
// they are connected (or have failed) rather than fire-and-forget. Reads issued
// straight after login would otherwise race the handshake and query only the
// relays that happened to be up already.
//
// The auth policy is deliberately not passed per relay: NDK falls back to
// `ndk.relayAuthDefaultPolicy` when a relay has none of its own, and that policy
// is installed by applySignerToNDK before this ever runs — so an AUTH challenge
// from a premium relay is answered with a signed event automatically.
export const addExplicitRelays = async (relayList, { timeout = 3000 } = {}) => {
  try {
    if (!Array.isArray(relayList)) return [];

    const urls = relayList.filter(
      (relay) => typeof relay === "string" && relay.startsWith("wss://"),
    );
    if (urls.length === 0) return [];

    for (const url of urls) {
      if (!ndkInstance.explicitRelayUrls?.includes(url)) {
        ndkInstance.addExplicitRelay(url, undefined, true);
      }
    }

    // Wait for the handshakes, but never block login on a dead relay: whichever
    // are up by the deadline are enough to read from, and the rest keep
    // reconnecting in the background.
    const connected = await Promise.all(
      urls.map(
        (url) =>
          new Promise((resolve) => {
            const relay = ndkInstance.pool.getRelay(url, true);
            if (!relay) return resolve(null);
            // `connected` is the public getter (status >= CONNECTED and socket
            // open). Comparing raw status numbers here is a trap: 1 is
            // DISCONNECTED, not connected.
            if (relay.connected) return resolve(url);

            const timer = setTimeout(() => resolve(null), timeout);
            relay.once?.("connect", () => {
              clearTimeout(timer);
              resolve(url);
            });
          }),
      ),
    );

    return connected.filter(Boolean);
  } catch (err) {
    console.error("[NDK] addExplicitRelays error:", err);
    return [];
  }
};

// Resolves once the account's relays are connected — and, for relays that
// challenge with AUTH, once that exchange has settled. A protected event (tagged
// ["-"], as premium/NIP-63 notes are) is simply not served to an unauthenticated
// subscription: the relay answers EOSE with nothing, which is indistinguishable
// from "you have no notes". Querying before this resolves is what produced an
// empty content page for an author whose notes are all on a premium relay.
export const waitForRelays = async (urls, { timeout = 4000 } = {}) => {
  const list = (urls || []).filter(
    (url) => typeof url === "string" && url.startsWith("wss://"),
  );
  if (list.length === 0) return [];

  const ready = await Promise.all(
    list.map(
      (url) =>
        new Promise((resolve) => {
          const relay = ndkInstance.pool.getRelay(url, true);
          if (!relay) return resolve(null);

          // AUTHENTICATED (8) and CONNECTED (5) are both usable; a relay that
          // never challenges simply stays at CONNECTED.
          const settled = () =>
            relay.connected || relay.connectivity?.status >= 5;
          if (settled()) return resolve(url);

          const timer = setTimeout(() => resolve(null), timeout);
          const finish = () => {
            clearTimeout(timer);
            resolve(url);
          };
          relay.once?.("authed", finish);
          relay.once?.("connect", () => {
            // Give an AUTH challenge a moment to complete before declaring the
            // relay usable; without it the first query races the handshake.
            setTimeout(() => {
              if (relay.connectivity?.status === 6 || relay.connectivity?.status === 7) return;
              finish();
            }, 250);
          });
        }),
    ),
  );

  return ready.filter(Boolean);
};
