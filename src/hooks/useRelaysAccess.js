import React, { useEffect, useState } from "react";
import useRelaysMetadata from "./useRelaysMetadata";
import { useSelector } from "react-redux";
import { NDKEvent } from "@nostr-dev-kit/ndk";
import { ndkInstance } from "@/Helpers/NDKInstance";
import { useDispatch } from "react-redux";
import { getSubData, sleepTimer } from "@/Helpers/Helpers";
import { setToast } from "@/Store/Slices/Extras";
import { InitEvent } from "@/Helpers/Encryptions";

export default function useRelaysAccess({ relay }) {
  const dispatch = useDispatch();
  const { relayMetadata } = useRelaysMetadata(relay);
  const [isMembershipRequired, setIsMembershipRequired] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [isRelayAccessLoading, setIsRelayAccessLoading] = useState(false);
  const [requestCode, setRequestCode] = useState(false);
  const userKeys = useSelector((state) => state.userKeys);

  useEffect(() => {
    if ((relayMetadata.self || relayMetadata.pubkey) && userKeys) {
      let isLocked =
        relayMetadata.supported_nips.includes(43) ||
        relayMetadata.supported_nips.includes(63);
      if (isLocked) {
        setIsMembershipRequired(true);
        setIsRelayAccessLoading(true);
        checkMember({
          relayPubkey: relayMetadata.self || relayMetadata.pubkey,
          userPubkey: userKeys.pub,
        }).then((status) => {
          setIsMember(status);
          setIsRelayAccessLoading(false);
        });
      }
    } else {
      setIsMember(isMember);
    }
  }, [relayMetadata, userKeys]);

  // Membership is per-account: this component survives an account switch, so the previous
  // account's "is a member" answer would otherwise stay on screen until (or unless) the
  // check above re-resolves.
  useEffect(() => {
    setIsMember(false);
    setRequestCode(false);
  }, [userKeys?.pub]);

  const checkMember = async ({ relayPubkey, userPubkey }) => {
    let data = await getSubData({
      filter: [
        {
          kinds: [8000, 8001],
          authors: [relayPubkey],
          "#p": [userPubkey],
        },
      ],
      timeout: 50,
      relayUrls: [relay],
      cacheUsage: "ONLY_RELAY",
    });

    if (data.data.length > 0) {
      let isRemoved = data.data[0].kind === 8001;
      if (!isRemoved) {
        return true;
      } else return false;
    }
    return false;
  };

  const handleJoinRequest = async (code) => {
    setIsRelayAccessLoading(true);
    let event = {
      kind: 28934,
      tags: [["-"], ["claim", code]],
    };
    let eventInitEx = await InitEvent(event);
    if (!eventInitEx) {
      setIsRelayAccessLoading(false);
      return;
    }
    let status = await publishToRelay({ event: eventInitEx, relay });
    if (status) {
      let v = await verifyMembership();
      setIsMember(v);
    }
    setIsRelayAccessLoading(false);
  };

  const publishToRelay = async ({ event }) => {
    return new Promise(async (resolve) => {
      let relayInstance = ndkInstance.pool.getRelay(relay);
      let eventInstance = new NDKEvent(ndkInstance, event);
      await relayInstance.connect();

      let publish = () => {
        relayInstance
          .publish(eventInstance)
          .then((data) => {
            resolve(true);
          })
          .catch((err) => {
            console.log(err);
            if (err.toString().includes("auth-required")) {
              relayInstance.authPolicy = ndkInstance.relayAuthDefaultPolicy;
              relayInstance.on("authed", () => {
                console.log("authenticated");
                publish();
              });
            } else {
              dispatch(setToast({ type: 2, desc: err.message }));
              resolve(false);
            }
          });
      };
      publish();
    });
  };

  const handleRequestCode = async () => {
    setIsRelayAccessLoading(true);
    let data = await getSubData({
      filter: [
        {
          kinds: [28935],
          authors: [relayMetadata.self || relayMetadata.pubkey],
        },
      ],
      timeout: 50,
      relayUrls: [relay],
    });
    if (data.data.length > 0) {
      let code = data.data[0].tags.find((tag) => tag[0] === "claim");
      if (code) {
        setRequestCode(code[1]);
        setIsRelayAccessLoading(false);
        return code[1];
      }
    }
    setIsRelayAccessLoading(false);
  };

  const handleLeaveRely = async () => {
    setIsRelayAccessLoading(true);
    let event = {
      kind: 28936,
      tags: [["-"]],
    };
    let eventInitEx = await InitEvent(event);
    if (!eventInitEx) {
      setIsRelayAccessLoading(false);
      return;
    }
    let status = await publishToRelay({ event: eventInitEx, relay });
    if (status) {
      let v = await verifyMembership();
      setIsMember(v);
    }
    setIsRelayAccessLoading(false);
  };

  const verifyMembership = async () => {
    let attempt = 0;
    while (attempt < 5) {
      let status = await checkMember({
        relayPubkey: relayMetadata.self || relayMetadata.pubkey,
        userPubkey: userKeys.pub,
      });
      if (status) {
        return true;
      }
      sleepTimer(1000);
      attempt++;
    }
    return false;
  };

  return {
    isMembershipRequired,
    handleJoinRequest,
    handleRequestCode,
    handleLeaveRely,
    requestCode,
    setRequestCode,
    isMember,
    isRelayAccessLoading,
  };
}
