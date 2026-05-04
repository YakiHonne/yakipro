import { useState, useEffect, useCallback } from "react";
import { getAllowedRelays, addAllowedRelays } from "@/Endpoionts/Relays";

let allowedRelaysCache = null;

/**
 * useAllowedRelays - Hook to manage the user's allowed and delegated relay list.
 */
export default function useAllowedRelays() {
  const [allowedRelays, setAllowedRelays] = useState(allowedRelaysCache);
  const [isLoading, setIsLoading] = useState(false);

  const fetchAllowedRelays = useCallback(async () => {
    if (allowedRelaysCache) {
      setAllowedRelays(allowedRelaysCache);
      return;
    }
    setIsLoading(true);
    try {
      const data = await getAllowedRelays();
      if (data) {
        allowedRelaysCache = data;
        setAllowedRelays(data);
      }
    } catch (err) {
      console.error("[useAllowedRelays] Error fetching allowed relays:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleAddAllowedRelay = async ({
    relays_list,
    delegated_relay,
    delegated_relay_access_code,
  }) => {
    setIsLoading(true);
    try {
      const data = await addAllowedRelays({
        relays_list,
        delegated_relay,
        delegated_relay_access_code,
      });
      if (data) {
        allowedRelaysCache = data;
        setAllowedRelays(data);
        return data;
      }
    } catch (err) {
      console.error("[useAllowedRelays] Error adding allowed relay:", err);
    } finally {
      setIsLoading(false);
    }
    return false;
  };

  useEffect(() => {
    fetchAllowedRelays();
  }, [fetchAllowedRelays]);

  return {
    allowedRelays,
    addAllowedRelay: handleAddAllowedRelay,
    isLoading,
  };
}
