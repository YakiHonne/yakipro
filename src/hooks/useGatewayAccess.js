import { useState, useEffect, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { getSubData, publishEvent, saveUsers } from "@/Helpers/Helpers";
import { InitEvent } from "@/Helpers/Encryptions";
import { setToast } from "@/Store/Slices/Extras";
import { getRelayMetadata } from "@/Cache/relayMetadataCache";

// In-memory cache for Gateway Access and Follow Lists
let gatewayAccessCache = {};
let gatewayFollowListCache = {};

/**
 * useGatewayAccess - Hook to manage gateway-specific access and follow lists.
 * @param {string} gatewayPubkey - The public key of the gateway relay.
 */
export default function useGatewayAccess(gatewayPubkey) {
  const dispatch = useDispatch();
  const userKeys = useSelector((state) => state.userKeys);
  const [accessEvent, setAccessEvent] = useState(null);
  const [followList, setFollowList] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const aTagValue =
    gatewayPubkey && userKeys?.pub
      ? `3000:${gatewayPubkey}:${userKeys.pub}`
      : null;

  const userRelays = useSelector((state) => state.userRelays);

  const getPremiumRelays = useCallback(() => {
    return userRelays
      .filter((r) => {
        const metadata = getRelayMetadata(r.url);
        return metadata?.supported_nips?.includes(63) && (r.read || r.write);
      })
      .map((r) => r.url);
  }, [userRelays]);

  const fetchGatewayAccess = useCallback(async () => {
    if (!aTagValue) return;

    if (gatewayAccessCache[aTagValue]) {
      setAccessEvent(gatewayAccessCache[aTagValue]);
      return;
    }

    setIsLoading(true);
    try {
      let premiumRelays = getPremiumRelays();
      if (premiumRelays.length === 0) {
        setIsLoading(false);
        return;
      }
      const res = await getSubData({
        filter: [
          {
            kinds: [1163],
            "#a": [aTagValue],
          },
        ],
        relayUrls: premiumRelays,
      });
      if (res.data.length > 0) {
        const event = res.data[0];
        setAccessEvent(event);
        gatewayAccessCache[aTagValue] = event;
      }
    } catch (err) {
      console.error("[useGatewayAccess] Error fetching access:", err);
    } finally {
      setIsLoading(false);
    }
  }, [aTagValue, getPremiumRelays]);

  /**
   * Fetches the Kind 3000 follow list event for the user from the gateway.
   */
  const fetchGatewayFollowList = useCallback(async () => {
    if (!gatewayPubkey || !userKeys?.pub) return;

    const cacheKey = `${gatewayPubkey}:${userKeys.pub}`;
    if (gatewayFollowListCache[cacheKey]) {
      setFollowList(gatewayFollowListCache[cacheKey]);
      return;
    }

    setIsLoading(true);
    try {
      let premiumRelays = getPremiumRelays();
      if (premiumRelays.length === 0) {
        setIsLoading(false);
        return;
      }
      const res = await getSubData({
        filter: [
          {
            kinds: [30000],
            authors: [gatewayPubkey],
            "#d": [userKeys.pub],
          },
        ],
        relayUrls: premiumRelays,
      });

      if (res.data.length > 0) {
        const event = res.data[0];
        const pTags = event.tags
          .filter((tag) => tag[0] === "p")
          .map((tag) => tag[1]);
        saveUsers(pTags);
        setFollowList(pTags);
        gatewayFollowListCache[cacheKey] = pTags;
      }
    } catch (err) {
      console.error("[useGatewayAccess] Error fetching follow list:", err);
    } finally {
      setIsLoading(false);
    }
  }, [gatewayPubkey, userKeys?.pub, getPremiumRelays]);

  /**
   * Publishes a Kind 1163 access event to the gateway.
   */
  const publishGatewayAccess = async () => {
    if (!aTagValue) {
      dispatch(setToast({ type: 2, desc: "Authentication required" }));
      return;
    }

    setIsLoading(true);
    try {
      let premiumRelays = getPremiumRelays();
      if (premiumRelays.length === 0) {
        dispatch(
          setToast({
            type: 2,
            desc: "No premium relays found in your configuration",
          }),
        );
        setIsLoading(false);
        return;
      }
      const eventContent = {
        kind: 1163,
        content: "",
        tags: [["a", aTagValue]],
      };

      const signedEvent = await InitEvent(eventContent);
      if (!signedEvent) {
        setIsLoading(false);
        return;
      }

      const success = await publishEvent(signedEvent, premiumRelays);
      if (success) {
        setAccessEvent(signedEvent);
        gatewayAccessCache[aTagValue] = signedEvent;
        dispatch(setToast({ type: 1, desc: "Access published successfully!" }));
      } else {
        dispatch(setToast({ type: 2, desc: "Failed to publish access" }));
      }
    } catch (err) {
      console.error("[useGatewayAccess] Error publishing access:", err);
      dispatch(setToast({ type: 2, desc: "An error occurred" }));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (gatewayPubkey && userKeys?.pub) {
      fetchGatewayAccess();
      fetchGatewayFollowList();
    }
  }, [
    gatewayPubkey,
    userKeys?.pub,
    fetchGatewayAccess,
    fetchGatewayFollowList,
  ]);

  return {
    accessEvent,
    followList,
    isLoading,
    publishGatewayAccess,
  };
}
