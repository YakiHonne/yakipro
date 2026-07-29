import { useState, useEffect, useCallback } from "react";
import { useSelector } from "react-redux";
import { getAllowedRelays, addAllowedRelays } from "@/Endpoionts/Relays";
import { registerAccountScopedReset } from "@/Cache/accountScope";

// Not keyed by pubkey: without the reset below, the second account to sign in on this
// browser reads the first account's allowed-relay list straight out of this variable.
let allowedRelaysCache = null;

registerAccountScopedReset(() => {
  allowedRelaysCache = null;
});

export default function useAllowedRelays() {
  // Clearing the module cache isn't enough on its own: this component stays mounted
  // across an account switch, so its own state copy would still hold the old list.
  // Keying the fetch on the pubkey re-runs it for the new account.
  const userKeys = useSelector((state) => state.userKeys);
  const pubkey = userKeys?.pub;

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
  }, [pubkey]);

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
    // Drop the outgoing account's list before refetching so it can't be rendered as if it
    // belonged to the incoming one. `allowedRelaysCache` has already been cleared by the
    // account-scope reset at this point, so this is null on a switch and the just-cached
    // value on an ordinary remount.
    setAllowedRelays(allowedRelaysCache);
    fetchAllowedRelays();
  }, [fetchAllowedRelays]);

  return {
    allowedRelays,
    addAllowedRelay: handleAddAllowedRelay,
    isLoading,
  };
}
