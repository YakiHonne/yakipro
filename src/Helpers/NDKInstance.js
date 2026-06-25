import NDK from "@nostr-dev-kit/ndk";
import NDKCacheAdapterDexie from "@nostr-dev-kit/ndk-cache-dexie";

const DEFAULT_RELAYS = [
  "wss://nostr-01.yakihonne.com",
  "wss://relay.damus.io",
  "wss://relay.primal.net",
  "wss://nos.lol",
  "wss://relay.nostr.band",
  "wss://offchain.pub",
];

export const relaysOnPlatform = DEFAULT_RELAYS;

const ndkInstance = new NDK({
  explicitRelayUrls: relaysOnPlatform,
  enableOutboxModel: true,
});

await ndkInstance.connect(1000);

if (typeof window !== "undefined") {
  ndkInstance.cacheAdapter = new NDKCacheAdapterDexie({
    dbName: "yakipro-ndk-store",
    expirationTime: 3600 * 24 * 7,
    profileCacheSize: 200,
  });
}

export { ndkInstance };

export const addExplicitRelays = (relayList) => {
  try {
    if (!Array.isArray(relayList)) return;
    const toAdd = relayList.filter(
      (relay) => !ndkInstance.explicitRelayUrls.includes(`${relay}`),
    );
    if (toAdd.length === 0) return;
    for (const relay of toAdd) {
      ndkInstance.addExplicitRelay(relay, undefined, true);
    }
  } catch (err) {
    console.error("[NDK] addExplicitRelays error:", err);
  }
};
