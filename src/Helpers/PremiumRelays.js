import { getRelayMetadata } from "@/Cache/relayMetadataCache";
import { saveRelayMetadata } from "@/Helpers/Helpers";

export const resolvePremiumRelays = async (userRelays) => {
  const usable = (userRelays || []).filter((r) => r?.url && (r.read || r.write));

  const unresolved = usable
    .map((r) => r.url)
    .filter((url) => getRelayMetadata(url)?.isEmpty !== false);

  if (unresolved.length > 0) {
    try {
      await saveRelayMetadata(unresolved);
    } catch (err) {
      console.error("[resolvePremiumRelays] metadata fetch failed", err);
    }
  }

  return usable
    .filter((r) => getRelayMetadata(r.url)?.supported_nips?.includes(63))
    .map((r) => r.url);
};
