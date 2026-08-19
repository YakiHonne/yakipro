import { useEffect, useState } from "react";
import { getRelayMetadata } from "@/Cache/relayMetadataCache";
import { saveRelayMetadata } from "@/Helpers/Helpers";

const isNip63 = (metadata) => !!metadata?.supported_nips?.includes(63);

export default function useRelaysNip63(urls) {
  const key = (urls || []).join(",");
  const [premiumUrls, setPremiumUrls] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const list = (urls || []).filter(Boolean);

    const resolve = async () => {
      if (list.length === 0) {
        if (!cancelled) {
          setPremiumUrls([]);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      const unresolved = list.filter((url) => getRelayMetadata(url)?.isEmpty);
      if (unresolved.length > 0) {
        try {
          await saveRelayMetadata(unresolved);
        } catch (err) {
          console.error("[useRelaysNip63] metadata fetch failed", err);
        }
      }
      if (cancelled) return;
      setPremiumUrls(list.filter((url) => isNip63(getRelayMetadata(url))));
      setLoading(false);
    };

    resolve();
    return () => {
      cancelled = true;
    };
  }, [key]);

  return { premiumUrls, loading };
}
