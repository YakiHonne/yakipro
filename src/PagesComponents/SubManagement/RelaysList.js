import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSelector, useDispatch } from "react-redux";
import useUserRelays from "@/hooks/useUserRelays";
import useRelaysMetadata from "@/hooks/useRelaysMetadata";
import useRelaysAccess from "@/hooks/useRelaysAccess";
import useAllowedRelays from "@/hooks/useAllowedRelays";
import useRelaysNip63 from "@/hooks/useRelaysNip63";
import useAccountAccess from "@/hooks/useAccountAccess";
import Icon from "@/Components/LucideIcon";
import Button from "@/Components/UI/Button";
import Spinner from "@/Components/Spinner";
import LoadingScreen from "@/Components/LoadingScreen";
import axios from "axios";
import Overlay from "@/Components/Overlay";
import DeleteWarning from "@/Components/DeleteWarning";
import { publishEvent } from "@/Helpers/Helpers";
import { setUserRelays } from "@/Store/Slices/UserData";
import { setUserRelaysCache } from "@/Cache/userRelaysCache";
import { setToast } from "@/Store/Slices/Extras";
import { openPaymentSheet } from "@/Store/Slices/PaymentSheet";
import { InitEvent } from "@/Helpers/Encryptions";
import { getPremiumRelayInviteCode } from "@/Endpoionts/Relays";
import { getRelayMetadata } from "@/Cache/relayMetadataCache";
import { saveRelayMetadata } from "@/Helpers/Helpers";

const PREMIUM_RELAY = process.env.NEXT_PUBLIC_PREMIUM_RELAY;

const relaysToTags = (relays) =>
  relays.map((r) =>
    [
      "r",
      r.url,
      r.read && r.write ? undefined : r.read ? "read" : "write",
    ].filter(Boolean),
  );

// publishEvent resolves false when it cannot read the event back within its 3s
// window — but the event was still sent. Treating that as a failure left the UI
// showing the old relay list after a successful edit, so only a signing failure
// (which genuinely produces no event) counts as failure here.
const publishRelaysList = async (relays) => {
  const event = { kind: 10002, tags: relaysToTags(relays), content: "" };
  const eventInitEx = await InitEvent(event);
  if (!eventInitEx) return false;
  // Target the relays the list itself names, so a newly added relay receives the
  // event that declares it rather than only the pool NDK already holds.
  await publishEvent(
    eventInitEx,
    relays.map((r) => r.url),
  );
  return true;
};

// Typing a bare host is the common case, so the scheme is added rather than
// rejected. ws:// and https:// are rewritten to wss:// instead of being refused —
// the intent is unambiguous and a relay is always wss.
const normalizeRelayUrl = (value) => {
  let trimmed = (value || "").trim().replace(/\/+$/, "");
  if (!trimmed) return "";

  trimmed = trimmed.replace(/^(wss|ws|https|http):\/\//i, "");
  if (!trimmed) return "";

  // Reject anything that is not a plausible host: it must have a dot-separated
  // TLD and no spaces, otherwise "hello world" would become wss://hello world.
  if (!/^[^\s/]+\.[^\s/]+/.test(trimmed)) return "";

  return `wss://${trimmed}`;
};

const RelayRow = ({ relayUrl, isDiscovery = false, onRemove }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const userRelays = useSelector((state) => state.userRelays);
  const currentPubkey = useSelector((state) => state.userKeys?.pub ?? null);
  const { relayMetadata } = useRelaysMetadata(relayUrl);
  const { isPaid, isPremium: hasPremiumPlan } = useAccountAccess();
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
  const [autoRunSettled, setAutoRunSettled] = useState(false);

  const isPremiumRelay = relayMetadata?.supported_nips?.includes(63);
  const isAlreadyAdded = userRelays.find((r) => r.url === relayUrl);
  const isDelegated = allowedRelays?.delegation_list?.includes(relayUrl);

  // A trial account may hold the relay in its list, but joining and delegating are
  // paid actions: it gets the plain "join relay" button, which routes through the
  // payment sheet. Only a genuinely paid account is auto-managed.
  const canJoinPremium = isPaid || hasPremiumPlan;
  // Auto-JOIN is specific to our own relay, because only it has an invite code we
  // can fetch. Auto-DELEGATE applies to any premium relay the user is already a
  // member of — including one they just added by hand — since delegation is the
  // step that actually makes the relay usable and needs no invite.
  const isAutoManaged =
    !isDiscovery && relayUrl === PREMIUM_RELAY && canJoinPremium;
  const canAutoDelegate =
    !isDiscovery && isPremiumRelay && canJoinPremium && isMember;

  const autoRanRef = useRef(false);
  const autoRanOwnerRef = useRef(currentPubkey);
  if (autoRanOwnerRef.current !== currentPubkey) {
    autoRanOwnerRef.current = currentPubkey;
    autoRanRef.current = false;
  }

  useEffect(() => {
    setAutoRunSettled(false);
  }, [currentPubkey]);

  useEffect(() => {
    if (
      (!isAutoManaged && !canAutoDelegate) ||
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
      : isAutoManaged
        ? onAutoJoin()
        : Promise.resolve()
    )
      .catch((err) => {
        // Without this the rejection escapes as an unhandled promise, and the
        // ref stays latched so the account can never retry for the session.
        console.error("[RelaysList] auto join/delegate failed", err);
        autoRanRef.current = false;
      })
      .finally(() => {
        setAutoRunSettled(true);
      });
  }, [
    isAutoManaged,
    canAutoDelegate,
    isMembershipRequired,
    isMember,
    isDelegated,
    isRelayAccessLoading,
    isAllowedLoading,
  ]);

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
        dispatch(setToast({ type: 1, desc: t("Ae7Gd9q") }));
      } else {
        dispatch(setToast({ type: 2, desc: t("Ak1Fs8y") }));
      }
    } else {
      dispatch(setToast({ type: 2, desc: t("Ak1Fs8y") }));
    }
  };

  const handleAddRelay = async () => {
    if (isAlreadyAdded) {
      dispatch(setToast({ type: 2, desc: t("Ap2Hv5n") }));
      return;
    }
    setIsAddingRelay(true);
    try {
      const updatedRelays = [
        ...userRelays,
        { url: relayUrl, read: true, write: true },
      ];
      const success = await publishRelaysList(updatedRelays);
      if (success) {
        dispatch(setUserRelays(updatedRelays));
        setUserRelaysCache(updatedRelays);
        dispatch(setToast({ type: 1, desc: t("Aw3Rj4x") }));
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

  // Only OUR relay is sold as part of the plan, so only it can send the author to
  // the payment sheet. A third-party NIP-63 relay issues its own invite codes and
  // has nothing to do with this subscription — gating it behind our paywall would
  // block a join we have no say over.
  const onJoinClick = () => {
    if (relayUrl === PREMIUM_RELAY && !canJoinPremium) {
      dispatch(openPaymentSheet({ source: "premium-relay-join" }));
      return;
    }
    setShowInput(true);
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
          {isPremiumRelay && <Icon name="crown" size={20} />}
          {isPremiumRelay && isMembershipRequired && (
            <div className="fx-centered fx-gap-h">
              {isRelayAccessLoading || isAllowedLoading ? (
                <Spinner size={20} />
              ) : isAutoManaged || canAutoDelegate ? (
                isMember && isDelegated ? null : autoRunSettled ? (
                  <div className="sticker sticker-gst-red sticker-small">
                    {t("Ay8Wq3d")}
                  </div>
                ) : (
                  <Spinner size={20} />
                )
              ) : isMember ? (
                isDiscovery ? (
                  <Button
                    label={isAlreadyAdded ? t("At4Zp7d") : t("Ag8Mk3w")}
                    type={isAlreadyAdded ? "gray" : "primary"}
                    disabled={isAlreadyAdded}
                    loading={isAddingRelay}
                    onClick={handleAddRelay}
                    size="s"
                  />
                ) : (
                  !isDelegated && (
                    <Button
                      label={t("As5Bn2v")}
                      type="gray"
                      size="s"
                      // Delegation is a paid action. A trial account can reach
                      // this branch (it is excluded from isAutoManaged), so the
                      // button must gate rather than delegate.
                      onClick={
                        canJoinPremium
                          ? onAllowDelegation
                          : () =>
                              dispatch(
                                openPaymentSheet({
                                  source: "premium-relay-delegation",
                                }),
                              )
                      }
                    />
                  )
                )
              ) : (
                <Button
                  label={t("Au9Tc6h")}
                  size="s"
                  type="primary"
                  onClick={onJoinClick}
                />
              )}
            </div>
          )}
          {onRemove && (
            <div className="pointer fx-centered" onClick={() => onRemove(relayUrl)}>
              <Icon name="trash" size={18} />
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
                {t("Ac2Nq8b")}
              </h2>
              <p className="gray-c p-centered" style={{ maxWidth: "250px" }}>
                {t("Ah6Ly1r")}
              </p>
            </div>

            <input
              type="text"
              placeholder={t("Aj9Vw5t")}
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
              label={t("Au9Tc6h")}
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
  const [customRelay, setCustomRelay] = useState("");
  const [customError, setCustomError] = useState("");
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [relayToRemove, setRelayToRemove] = useState(null);
  const [isRemoving, setIsRemoving] = useState(false);

  const userRelayUrls = useMemo(
    () => userRelays.map((r) => r.url),
    [userRelays],
  );
  const { premiumUrls, loading: isResolvingPremium } =
    useRelaysNip63(userRelayUrls);

  const handleFetchNewRelays = async () => {
    setIsFetchingNew(true);
    try {
      const res = await axios.get(
        "https://cache-v2.yakihonne.com/api/v1/relays/nips/63",
      );
      const candidates = Array.from(
        new Set(
          [...(res.data || []), PREMIUM_RELAY].filter(
            (url) => typeof url === "string" && url.startsWith("wss://"),
          ),
        ),
      );

      // The cache's answer is a claim, not proof — it goes stale when a relay drops
      // NIP-63, and the premium relay is appended here without ever having been in
      // it. Confirm each one against its own NIP-11 document so this overlay only
      // ever offers relays that really do support premium content.
      const unresolved = candidates.filter(
        (url) => getRelayMetadata(url)?.isEmpty !== false,
      );
      if (unresolved.length > 0) {
        try {
          await saveRelayMetadata(unresolved);
        } catch (err) {
          console.error("[RelaysList] metadata fetch failed", err);
        }
      }

      const suggested = candidates.filter((url) =>
        getRelayMetadata(url)?.supported_nips?.includes(63),
      );

      setNewRelays(suggested);
      setShowNewRelays(true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsFetchingNew(false);
    }
  };

  const handleAddCustomRelay = async () => {
    const url = normalizeRelayUrl(customRelay);
    if (!url) {
      setCustomError(t("Ar7Kx3m"));
      return;
    }
    if (userRelays.some((r) => r.url === url)) {
      setCustomError(t("Ap2Hv5n"));
      return;
    }
    setCustomError("");
    setIsAddingCustom(true);
    try {
      // This list only shows NIP-63 relays, so adding a relay that doesn't
      // support it would publish the entry and then hide it — the user would see
      // nothing happen. Check the relay's own document before committing.
      if (getRelayMetadata(url)?.isEmpty !== false) {
        try {
          await saveRelayMetadata([url]);
        } catch (err) {
          console.error("[RelaysList] metadata fetch failed", err);
        }
      }

      const metadata = getRelayMetadata(url);
      // An unreachable relay and a relay that answered "no NIP-63" are different
      // problems: the first is worth retrying, the second never will be. Saying
      // "not premium" for both sends the user off to fix the wrong thing.
      // saveRelayMetadata resolves either way, so a still-empty record after the
      // fetch is what identifies the unreachable case.
      if (metadata?.isEmpty !== false) {
        setCustomError(t("ARelayUnreach"));
        setIsAddingCustom(false);
        return;
      }
      if (!metadata?.supported_nips?.includes(63)) {
        setCustomError(t("ANotPrem"));
        setIsAddingCustom(false);
        return;
      }

      const updatedRelays = [...userRelays, { url, read: true, write: true }];
      const success = await publishRelaysList(updatedRelays);
      if (success) {
        dispatch(setUserRelays(updatedRelays));
        setUserRelaysCache(updatedRelays);
        dispatch(setToast({ type: 1, desc: t("Aw3Rj4x") }));
        setCustomRelay("");
        // The relay is now in the list, so its row renders in the premium list
        // behind this overlay and takes over from here: RelayRow resolves
        // membership and either starts delegation or offers "join relay".
        setShowNewRelays(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAddingCustom(false);
    }
  };

  const handleRemoveRelay = async () => {
    if (!relayToRemove) return;
    setIsRemoving(true);
    try {
      const updatedRelays = userRelays.filter((r) => r.url !== relayToRemove);
      const success = await publishRelaysList(updatedRelays);
      if (success) {
        dispatch(setUserRelays(updatedRelays));
        setUserRelaysCache(updatedRelays);
        dispatch(setToast({ type: 1, desc: t("Ad2Ph5m") }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsRemoving(false);
      setRelayToRemove(null);
    }
  };

  if (loading) return <LoadingScreen height="300" />;

  return (
    <div className="fit-container box-pad-h-m box-pad-v-m fx-gap-v-m fx-col no-scrollbar">
      <div className="fx-scattered">
        <h3 className="p-primary-c">{t("AStkKfQ")}</h3>
        <Button
          label={t("An4Bx7k")}
          size="s"
          type="primary"
          leftIcon="plus"
          onClick={handleFetchNewRelays}
          loading={isFetchingNew}
        />
      </div>

      {relayToRemove && (
        <DeleteWarning
          title={t("Az3Ct8p")}
          description={t("Ay5Dn1u")}
          exit={() => setRelayToRemove(null)}
          handleDelete={handleRemoveRelay}
          actionButtonLabel={t("AvEJw6B")}
        />
      )}

      {showNewRelays && (
        <Overlay exit={() => setShowNewRelays(false)}>
          <div
            className="box-pad-h box-pad-v fx-centered fx-gap-v-l fx-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="fit-container fx-scattered">
              <h4>{t("Aq6Wm2z")}</h4>
              <div className="close" onClick={() => setShowNewRelays(false)}>
                <div />
              </div>
            </div>

            <div className="fit-container fx-col fx-gap-v-m">
              <p className="p-medium gray-c">{t("ATqpiwj")}</p>
              <div className="fx-col fx-gap-v fx-centered fit-container">
                {newRelays.map((url) => (
                  <RelayRow key={url} relayUrl={url} isDiscovery={true} />
                ))}
                {newRelays.length === 0 && (
                  <p className="p-centered gray-c">{t("Av8Jr4s")}</p>
                )}
              </div>
            </div>

            <div className="fit-container fx-col fx-gap-v-m">
              <p className="p-medium gray-c">{t("AabmNg4")}</p>
              <div className="fit-container fx-centered fx-gap-h">
                <input
                  type="text"
                  className="if ifs-full"
                  placeholder="wss://"
                  value={customRelay}
                  onChange={(e) => {
                    setCustomRelay(e.target.value);
                    setCustomError("");
                  }}
                />
                <Button
                  label={t("AflwmPU")}
                  size="m"
                  type="primary"
                  loading={isAddingCustom}
                  onClick={handleAddCustomRelay}
                />
              </div>
              {customError && <p className="p-medium p-red-c">{customError}</p>}
            </div>
          </div>
        </Overlay>
      )}

      <div className="fx-col fx-gap-v fx-centered fit-container">
        {isResolvingPremium && userRelays.length > 0 && (
          <div className="fx-centered box-pad-v-m">
            <Spinner size={20} />
          </div>
        )}
        {/* Premium-only by design: this screen manages NIP-63 relays. Removal still
            filters the full userRelays list, so the non-premium entries that are
            hidden here are preserved on every republish. */}
        {!isResolvingPremium &&
          premiumUrls.map((url) => (
            <RelayRow key={url} relayUrl={url} onRemove={setRelayToRemove} />
          ))}
        {!isResolvingPremium && premiumUrls.length === 0 && (
          <div className="fx-centered box-pad-v-m">
            <p className="gray-c">{t("Ab6Kw9t")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
