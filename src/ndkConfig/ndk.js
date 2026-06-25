import NDK from "@nostr-dev-kit/ndk";

const DEFAULT_RELAYS = [
  "wss://relay.damus.io",
  "wss://relay.primal.net",
  "wss://nos.lol",
  "wss://relay.nostr.band",
  "wss://offchain.pub",
];

const relayUrls =
  process.env.NEXT_PUBLIC_NOSTR_RELAYS
    ? process.env.NEXT_PUBLIC_NOSTR_RELAYS.split(",").map((r) => r.trim())
    : DEFAULT_RELAYS;

let ndkInstance = null;

export function getNDK() {
  if (!ndkInstance) {
    ndkInstance = new NDK({
      explicitRelayUrls: relayUrls,
      autoConnectUserRelays: true,
      autoFetchUserMutelist: true,
    });
  }
  return ndkInstance;
}

export { relayUrls };
export default getNDK;
