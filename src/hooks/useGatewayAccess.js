import { useState, useEffect, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { getSubData, publishEvent, saveUsers } from "@/Helpers/Helpers";
import { InitEvent } from "@/Helpers/Encryptions";
import { setToast } from "@/Store/Slices/Extras";
import { getRelayMetadata } from "@/Cache/relayMetadataCache";
import { registerAccountScopedReset } from "@/Cache/accountScope";

let gatewayAccessCache = {};
let gatewayFollowListCache = {};
let gatewayDirectSubscribersCache = {};

// These are keyed by strings containing the user's pubkey, so a stale entry can't be
// read by a different account — but they would otherwise grow across every switch and
// keep serving a pre-switch snapshot to an account that signs back in.
registerAccountScopedReset(() => {
  gatewayAccessCache = {};
  gatewayFollowListCache = {};
  gatewayDirectSubscribersCache = {};
});

export default function useGatewayAccess(gatewayPubkey) {
  const dispatch = useDispatch();
  const userKeys = useSelector((state) => state.userKeys);
  const [accessEvent, setAccessEvent] = useState(null);
  const [followList, setFollowList] = useState(null);
  const [directSubscribers, setDirectSubscribers] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const aTagValue =
    gatewayPubkey && userKeys?.pub
      ? `30000:${gatewayPubkey}:${userKeys.pub}`
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

  const fetchGatewayFollowList = useCallback(async () => {
    if (!gatewayPubkey || !userKeys?.pub) return;

    const cacheKey = `${gatewayPubkey}:${userKeys.pub}`;
    if (gatewayFollowListCache[cacheKey]) {
      setFollowList(gatewayFollowListCache[cacheKey]);
      if (gatewayDirectSubscribersCache[cacheKey]) {
        setDirectSubscribers(gatewayDirectSubscribersCache[cacheKey]);
      }
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
          {
            kinds: [1163],
            authors: [userKeys.pub],
          },
        ],
        relayUrls: premiumRelays,
        cacheUsage: "ONLY_RELAY",
      });

      if (res.data.length > 0) {
        const event = res.data.find((_) => _.kind === 30000);
        const eventSub = res.data.filter((_) => _.kind === 1163);
        const pTags = event.tags
          .filter((tag) => tag[0] === "p")
          .map((tag) => tag[1]);
        const pTagsSub = eventSub
          .map((e) =>
            e.tags
              .filter((tag) => tag[0] === "p")
              .map((tag) => ({ id: e.id, pubkey: tag[1] })),
          )
          .flat();
        saveUsers([...new Set([...pTags, ...pTagsSub.map((s) => s.pubkey)])]);
        setFollowList(pTags);
        setDirectSubscribers(pTagsSub);
        gatewayFollowListCache[cacheKey] = pTags;
        gatewayDirectSubscribersCache[cacheKey] = pTagsSub;
      }
    } catch (err) {
      console.error("[useGatewayAccess] Error fetching follow list:", err);
    } finally {
      setIsLoading(false);
    }
  }, [gatewayPubkey, userKeys?.pub, getPremiumRelays]);

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

  const removeDirectSubscriber = useCallback(
    async (id) => {
      if (!gatewayPubkey || !userKeys?.pub) return;

      const cacheKey = `${gatewayPubkey}:${userKeys.pub}`;
      const updated = (directSubscribers || []).filter((s) => s.id !== id);

      try {
        const premiumRelays = getPremiumRelays();
        if (premiumRelays.length === 0) return;

        const eventContent = {
          kind: 5,
          content: "",
          tags: [["e", id]],
        };

        const signedEvent = await InitEvent(eventContent);
        if (!signedEvent) return;

        let status = await publishEvent(signedEvent, premiumRelays);
        if (status) {
          setDirectSubscribers(updated);
          gatewayDirectSubscribersCache[cacheKey] = updated;
          dispatch(setToast({ type: 1, desc: "Subscriber removed" }));
        } else {
          dispatch(setToast({ type: 2, desc: "Failed to remove subscriber" }));
        }
      } catch (err) {
        console.error("[useGatewayAccess] Error removing subscriber:", err);
        setDirectSubscribers(directSubscribers);
        gatewayDirectSubscribersCache[cacheKey] = directSubscribers;
        dispatch(setToast({ type: 2, desc: "Failed to remove subscriber" }));
      }
    },
    [
      gatewayPubkey,
      userKeys?.pub,
      directSubscribers,
      getPremiumRelays,
      dispatch,
    ],
  );

  const addDirectSubscriber = useCallback(
    async (subscriberPubkey) => {
      if (!gatewayPubkey || !userKeys?.pub) return null;

      const cacheKey = `${gatewayPubkey}:${userKeys.pub}`;
      const premiumRelays = getPremiumRelays();
      if (premiumRelays.length === 0) {
        dispatch(setToast({ type: 2, desc: "No premium relays available" }));
        return null;
      }

      const eventContent = {
        kind: 1163,
        content: "",
        tags: [["p", subscriberPubkey]],
      };

      const signedEvent = await InitEvent(eventContent);
      if (!signedEvent) return null;

      const success = await publishEvent(signedEvent, premiumRelays);
      if (!success) {
        dispatch(setToast({ type: 2, desc: "Failed to add subscriber" }));
        return null;
      }

      const newEntry = { id: signedEvent.id, pubkey: subscriberPubkey };
      const updated = [newEntry, ...(directSubscribers || [])];
      setDirectSubscribers(updated);
      gatewayDirectSubscribersCache[cacheKey] = updated;
      dispatch(setToast({ type: 1, desc: "Subscriber added" }));
      return newEntry;
    },
    [
      gatewayPubkey,
      userKeys?.pub,
      directSubscribers,
      getPremiumRelays,
      dispatch,
    ],
  );

  return {
    accessEvent,
    followList,
    directSubscribers,
    isLoading,
    publishGatewayAccess,
    removeDirectSubscriber,
    addDirectSubscriber,
  };
}
