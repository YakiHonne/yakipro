import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSelector, useDispatch } from "react-redux";
import useUserRelays from "@/hooks/useUserRelays";
import useRelaysMetadata from "@/hooks/useRelaysMetadata";
import useRelaysAccess from "@/hooks/useRelaysAccess";
import useAllowedRelays from "@/hooks/useAllowedRelays";
import Icon from "@/Components/LucideIcon";
import Button from "@/Components/UI/Button";
import Spinner from "@/Components/Spinner";
import LoadingScreen from "@/Components/LoadingScreen";
import axios from "axios";
import Overlay from "@/Components/Overlay";
import { publishEvent } from "@/Helpers/Helpers";
import { setUserRelays } from "@/Store/Slices/UserData";
import { setUserRelaysCache } from "@/Cache/userRelaysCache";
import { setToast } from "@/Store/Slices/Extras";
import { InitEvent } from "@/Helpers/Encryptions";
import { getPremiumRelayInviteCode } from "@/Endpoionts/Relays";

const PREMIUM_RELAY = process.env.NEXT_PUBLIC_PREMIUM_RELAY;

const RelayRow = ({ relayUrl, isDiscovery = false }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const userRelays = useSelector((state) => state.userRelays);
  const currentPubkey = useSelector((state) => state.userKeys?.pub ?? null);
  const { relayMetadata } = useRelaysMetadata(relayUrl);
  const {
    isMembershipRequired,
    isMember,
    handleJoinRequest,
    isRelayAccessLoading,
    handleRequestCode,
  } = useRelaysAccess({ relay: relayUrl });

  const {
    allowedRelays,
    addAllowedRelay,
    isLoading: isAllowedLoading,
  } = useAllowedRelays();

  const [showInput, setShowInput] = useState(false);
  const [code, setCode] = useState("");
  const [isAddingRelay, setIsAddingRelay] = useState(false);

  const isPremium = relayMetadata?.supported_nips?.includes(63);
  const isAlreadyAdded = userRelays.find((r) => r.url === relayUrl);
  const isDelegated = allowedRelays?.delegation_list?.includes(relayUrl);

  const isAutoManaged = !isDiscovery && relayUrl === PREMIUM_RELAY;
  // Latches after the auto-join/delegation runs once. Without clearing it on an account
  // change, this component stays mounted across a switch and the new account never gets
  // its own auto-join — it inherits the previous account's "already handled" flag.
  const autoRanRef = useRef(false);
  const autoRanOwnerRef = useRef(currentPubkey);
  if (autoRanOwnerRef.current !== currentPubkey) {
    autoRanOwnerRef.current = currentPubkey;
    autoRanRef.current = false;
  }

  useEffect(() => {
    if (
      !isAutoManaged ||
      !isMembershipRequired ||
      isRelayAccessLoading ||
      isAllowedLoading ||
      autoRanRef.current
    ) {
      return;
    }

    autoRanRef.current = true;
    (isMember
      ? isDelegated
        ? Promise.resolve()
        : onAllowDelegation()
      : onAutoJoin()
    ).finally(() => {
      autoRanRef.current = false;
    });
  }, [isAutoManaged, isMembershipRequired, isMember, isDelegated, isRelayAccessLoading, isAllowedLoading]);

  const onAutoJoin = async () => {
    const inviteCode = await getPremiumRelayInviteCode();
    if (inviteCode) {
      await handleJoinRequest(inviteCode);
    }
  };

  const onAllowDelegation = async () => {
    const accessCode = await handleRequestCode();
    if (accessCode) {
      const success = await addAllowedRelay({
        relays_list: userRelays.map((r) => r.url),
        delegated_relay: relayUrl,
        delegated_relay_access_code: accessCode,
      });
      if (success) {
        dispatch(setToast({ type: 1, desc: "Delegation allowed!" }));
      } else {
        dispatch(setToast({ type: 2, desc: "Failed to allow delegation" }));
      }
    } else {
      dispatch(
        setToast({ type: 2, desc: "Could not retrieve delegation code" }),
      );
    }
  };

  const handleAddRelay = async () => {
    if (isAlreadyAdded) {
      dispatch(setToast({ type: 2, desc: "Relay already in your list" }));
      return;
    }
    setIsAddingRelay(true);
    try {
      const newRelayObj = { url: relayUrl, read: true, write: true };
      const updatedRelays = [...userRelays, newRelayObj];
      const tags = updatedRelays.map((r) =>
        [
          "r",
          r.url,
          r.read && r.write ? undefined : r.read ? "read" : "write",
        ].filter(Boolean),
      );
      const event = {
        kind: 10002,
        tags,
        content: "",
      };
      const eventInitEx = await InitEvent(event);
      if (!eventInitEx) {
        return;
      }
      const success = await publishEvent(eventInitEx);
      if (success) {
        dispatch(setUserRelays(updatedRelays));
        setUserRelaysCache(updatedRelays);
        dispatch(setToast({ type: 1, desc: "Relay added successfully!" }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAddingRelay(false);
    }
  };

  const onJoin = async () => {
    if (!code) return;
    await handleJoinRequest(code);
    setShowInput(false);
  };

  return (
    <>
      <div className="fit-container round-corner-m border-all box-pad-h-m box-pad-v-s fx-scattered">
        <div className="fx-centered fx-start-h fx-gap-h">
          <div
            className="bg-cover"
            style={{
              backgroundImage: `url(${relayMetadata?.icon || ""})`,
              width: 38,
              height: 38,
              borderRadius: "50%",
              backgroundColor: "var(--color-divider)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {!relayMetadata?.icon && <Icon name="server" size={24} />}
          </div>
          <div className="fx-col fx-start-v" style={{ gap: 0 }}>
            <p className="p-bold p-one-line">
              {relayMetadata?.name || relayUrl.replace("wss://", "")}
            </p>
            <p className="gray-c p-medium p-one-line">{relayUrl}</p>
          </div>
        </div>
        <div className="fx-centered fx-gap-h">
          {isPremium && <Icon name="crown" size={20} />}
          {isPremium && isMembershipRequired && (
            <div className="fx-centered fx-gap-h">
              {isRelayAccessLoading || isAllowedLoading ? (
                <Spinner size={20} />
              ) : isAutoManaged ? (
                isMember && isDelegated ? null : <Spinner size={20} />
              ) : isMember ? (
                isDiscovery ? (
                  <Button
                    label={isAlreadyAdded ? "Added" : "Add relay"}
                    type={isAlreadyAdded ? "gray" : "primary"}
                    disabled={isAlreadyAdded}
                    loading={isAddingRelay}
                    onClick={handleAddRelay}
                    size="s"
                  />
                ) : (
                  !isDelegated && (
                    <Button
                      label="Allow delegation"
                      type="gray"
                      onClick={onAllowDelegation}
                    />
                  )
                )
              ) : (
                <Button
                  label="Join to add"
                  size="s"
                  type="primary"
                  onClick={() => setShowInput(true)}
                />
              )}
            </div>
          )}
          {!isPremium && relayMetadata && (
            <div className="sticker sticker-gst-orange sticker-small">
              subscription not supported
            </div>
          )}
        </div>
      </div>

      {showInput && (
        <Overlay exit={() => setShowInput(false)} width={400}>
          <div
            className="fx-col fx-centered fx-gap-v-l box-pad-h box-pad-v-l relative"
            style={{
              backgroundColor: "var(--color-primary-bg)",
              borderRadius: "24px",
            }}
          >
            {/* Close button */}
            <div
              className="close"
              style={{
                position: "absolute",
                top: "20px",
                right: "20px",
                zIndex: 10,
              }}
              onClick={() => setShowInput(false)}
            >
              <div />
            </div>

            <div className="fx-col fx-centered fx-gap-v-s">
              <h2 className="p-bold p-centered" style={{ fontSize: "1.5rem" }}>
                Request to join relay
              </h2>
              <p className="gray-c p-centered" style={{ maxWidth: "250px" }}>
                An invitation code is required, ask a member to get it for you
              </p>
            </div>

            <input
              type="text"
              placeholder="Invitation code"
              className="if p-centered"
              style={{
                borderRadius: "12px",
                height: "48px",
                backgroundColor: "transparent",
              }}
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />

            <Button
              label="Join relay"
              full
              size="l"
              type="primary"
              loading={isRelayAccessLoading}
              onClick={onJoin}
              style={{ borderRadius: "12px", height: "52px" }}
            />
          </div>
        </Overlay>
      )}
    </>
  );
};

export default function RelaysList() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { userRelays, loading } = useUserRelays();
  const [showNewRelays, setShowNewRelays] = useState(false);
  const [newRelays, setNewRelays] = useState([]);
  const [isFetchingNew, setIsFetchingNew] = useState(false);
  const autoAddRanRef = useRef(false);

  useEffect(() => {
    if (
      !PREMIUM_RELAY ||
      loading ||
      autoAddRanRef.current ||
      userRelays.some((r) => r.url === PREMIUM_RELAY)
    ) {
      return;
    }

    autoAddRanRef.current = true;
    (async () => {
      const newRelayObj = { url: PREMIUM_RELAY, read: true, write: true };
      const updatedRelays = [...userRelays, newRelayObj];
      const tags = updatedRelays.map((r) =>
        [
          "r",
          r.url,
          r.read && r.write ? undefined : r.read ? "read" : "write",
        ].filter(Boolean),
      );
      const event = { kind: 10002, tags, content: "" };
      const eventInitEx = await InitEvent(event);
      if (!eventInitEx) return;
      const success = await publishEvent(eventInitEx);
      if (success) {
        dispatch(setUserRelays(updatedRelays));
        setUserRelaysCache(updatedRelays);
      }
    })().finally(() => {
      autoAddRanRef.current = false;
    });
  }, [userRelays, loading]);

  const handleFetchNewRelays = async () => {
    setIsFetchingNew(true);
    try {
      const res = await axios.get(
        "https://cache-v2.yakihonne.com/api/v1/relays/nips/63",
      );
      setNewRelays([...res.data, "wss://premium.yakihonne.com"]);
      setShowNewRelays(true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsFetchingNew(false);
    }
  };

  if (loading) return <LoadingScreen height="300" />;

  return (
    <div className="fit-container box-pad-h-m box-pad-v-m fx-gap-v-m fx-col no-scrollbar">
      <div className="fx-scattered">
        <h3 className="p-primary-c">{t("AStkKfQ")}</h3>
        <Button
          label={t("New relays")}
          size="s"
          type="primary"
          leftIcon="plus"
          onClick={handleFetchNewRelays}
          loading={isFetchingNew}
        />
      </div>

      {showNewRelays && (
        <Overlay exit={() => setShowNewRelays(false)}>
          <div
            className="box-pad-h box-pad-v fx-centered fx-gap-v-l fx-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="fit-container fx-scattered">
              <h4>Premium Relays (NIP-63)</h4>
              <div className="close" onClick={() => setShowNewRelays(false)}>
                <div />
              </div>
            </div>
            <div className="fx-col fx-gap-v fx-centered fit-container">
              {newRelays.map((url) => (
                <RelayRow key={url} relayUrl={url} isDiscovery={true} />
              ))}
              {newRelays.length === 0 && (
                <p className="p-centered gray-c">No new premium relays found</p>
              )}
            </div>
          </div>
        </Overlay>
      )}

      <div className="fx-col fx-gap-v fx-centered fit-container">
        {userRelays.map((relay) => (
          <RelayRow key={relay.url} relayUrl={relay.url} />
        ))}
        {userRelays.length === 0 && (
          <div className="fx-centered box-pad-v-m">
            <p className="gray-c">No relays found</p>
          </div>
        )}
      </div>
    </div>
  );
}
