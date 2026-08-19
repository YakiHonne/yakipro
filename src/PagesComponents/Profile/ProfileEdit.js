import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { nip19 } from "nostr-tools";
import axios from "axios";
import PagePlaceholder from "@/Components/PlaceholderScreens/PagePlaceholder";
import { pphValues } from "@/Content/PagesPlaceholdersValues";
import Spinner from "@/Components/Spinner";
import Icon from "@/Components/LucideIcon";
import { setToast } from "@/Store/Slices/Publishers";
import { setUserMetadata } from "@/Store/Slices/UserData";
import { setSubscriptionStatus } from "@/Store/Slices/Subscription";
import { getSubscriptionStatus } from "@/Endpoionts/subscription";
import { claimUsername } from "@/Endpoionts/account";
import { decodeUrlOrAddress, encodeLud06, InitEvent } from "@/Helpers/Encryptions";
import { FileUpload } from "@/Helpers/FileUpload";
import { copyText, publishEvent } from "@/Helpers/Helpers";
import useAccountAccess from "@/hooks/useAccountAccess";
import useAccessFailure from "@/hooks/useAccessFailure";
import useNameClaim from "@/hooks/useNameClaim";
import YakiNameField from "./YakiNameField";
import YakiNip05Overlay from "./YakiNip05Overlay";
import WalletsSection from "./WalletsSection";

function FilePicker({ element, setFile }) {
  const inputRef = React.useRef(null);
  return (
    <>
      <div onClick={() => inputRef.current?.click()}>{element}</div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) setFile({ file });
          e.target.value = "";
        }}
      />
    </>
  );
}

export default function ProfileEdit() {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const userMetadata = useSelector((state) => state.userMetadata);
  const userKeys = useSelector((state) => state.userKeys);
  const userRelays = useSelector((state) => state.userRelays);
  const { handleAccessFailure, showPaymentSheet } = useAccessFailure();
  const {
    plan,
    active,
    inTrial,
    username: yakiUsername,
    hasUsername,
    nip05Name,
    nip05,
  } = useAccountAccess();

  const canUseYakiNames = ["basic", "premium"].includes(plan) && active;

  const [claimingUsername, setClaimingUsername] = useState(false);
  const [showNip05Overlay, setShowNip05Overlay] = useState(false);
  const [showWalletOverlay, setShowWalletOverlay] = useState(false);

  const usernameClaim = useNameClaim({
    kind: "username",
    enabled: canUseYakiNames && !hasUsername,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isImageUploading, setImageUploading] = useState(false);
  const [userDisplayName, setUserDisplayName] = useState(false);
  const [userName, setUserName] = useState(false);
  const [userAbout, setUserAbout] = useState(false);
  const [userWebsite, setUserWebsite] = useState(false);
  const [userNip05, setUserNip05] = useState(false);
  const [userLud16, setUserLud16] = useState(false);
  const [userLud06, setUserLud06] = useState(false);
  const [userPicture, setUserPicture] = useState(false);
  const [userBanner, setUserBanner] = useState(false);

  const [showMore, setShowMore] = useState(false);

  useEffect(() => {
    triggerEdit();
  }, [userMetadata]);

  const hasPendingUsername =
    canUseYakiNames && !hasUsername && usernameClaim.claimable;

  // Builds the kind 0 to publish by layering edits ON TOP of the full existing
  // metadata. Only fields the form actually manages are touched, and each one
  // only when it holds a real edit (`false` is the "untouched" sentinel these
  // states are initialised with) — so anything the form does not know about, and
  // anything the user did not change, survives untouched.
  const buildMetadata = (patch = {}) => {
    const content = { ...(userMetadata || {}) };

    const edits = {
      picture: userPicture,
      banner: userBanner,
      name: userName,
      display_name: userDisplayName,
      about: userAbout,
      website: userWebsite,
      nip05: userNip05,
      lud06: userLud06,
      lud16: userLud16,
    };

    for (const [key, value] of Object.entries(edits)) {
      if (value !== false) content[key] = value;
    }

    return { ...content, ...patch };
  };

  // Publishes directly rather than routing through the global Publishing
  // component: that indirection is what made the button hang. The spinner was
  // tied to a Redux `isPublishing` flag owned elsewhere, so if signing never
  // settled — an ignored extension prompt, a missing signer — the flag stayed
  // true and the spinner span forever with no way back.
  const publishMetadata = async (content) => {
    if (isLoading) return false;
    setIsLoading(true);

    try {
      const eventInitEx = await InitEvent({
        kind: 0,
        content: JSON.stringify(content),
        tags: [],
      });

      // Signing was refused or failed: nothing was published, so the form must
      // keep the user's edits rather than pretending they landed.
      if (!eventInitEx) {
        dispatch(setToast({ type: 2, desc: t("APubFail") }));
        return false;
      }

      // Reflect the change locally as soon as it is signed. publishEvent's
      // read-back can lag by seconds or time out on a slow relay while the event
      // is perfectly fine, and the form should not sit stale waiting on that.
      dispatch(setUserMetadata(content));

      const writeUrls = (userRelays || [])
        .map((relay) => (typeof relay === "string" ? relay : relay?.url))
        .filter((url) => typeof url === "string" && url.length > 0);

      await publishEvent(eventInitEx, writeUrls);

      dispatch(setToast({ type: 1, desc: t("A8alhKV") }));
      return true;
    } catch (err) {
      console.error("[ProfileEdit] failed to publish metadata", err);
      dispatch(setToast({ type: 2, desc: t("APubFail") }));
      return false;
    } finally {
      // Always clears, on every path — this is the guarantee the old Redux
      // round-trip could not make.
      setIsLoading(false);
    }
  };

  const updateInfos = async () => {
    const metadataChanged = !checkMetadata();

    if (hasPendingUsername) {
      const claimed = await claimPendingUsername();
      // A failed claim must not silently drop pending metadata edits, so the
      // Nostr half still runs; only the username half is abandoned.
      if (!claimed && !metadataChanged) return;
    }

    if (!metadataChanged) return;

    await publishMetadata(buildMetadata());
  };

  const publishField = (patch) => publishMetadata(buildMetadata(patch));

  const refreshAccount = async () => {
    try {
      const data = await getSubscriptionStatus();
      dispatch(setSubscriptionStatus(data));
    } catch {}
  };

  const claimPendingUsername = async () => {
    if (claimingUsername) return false;
    setClaimingUsername(true);
    try {
      await claimUsername(usernameClaim.value);
      await refreshAccount();
      dispatch(setToast({ type: 1, desc: t("Ayq4yyv") }));
      setClaimingUsername(false);
      return true;
    } catch (err) {
      if (!handleAccessFailure(err, { source: "username" })) {
        dispatch(
          setToast({
            type: 3,
            desc: err?.response?.data?.message || t("AQMQDrO"),
          }),
        );
      }
      setClaimingUsername(false);
      return false;
    }
  };

  const visitProfile = () => {
    try {
      const target = hasUsername
        ? yakiUsername
        : nip19.npubEncode(userKeys.pub);
      window.open(
        `https://yakihonne.com/${target}`,
        "_blank",
        "noopener,noreferrer",
      );
    } catch (err) {
      console.error("[ProfileEdit] failed to open profile", err);
    }
  };

  const handleUseWallet = (address) => {
    handleLUD16({ target: { value: address } });
  };

  const handleUseNip05 = (address) => {
    setUserNip05(address);
    publishField({ nip05: address });
    refreshAccount();
  };

  // Every keystroke lands here, so most values are half-typed addresses. Both the
  // bech32 decode and the LNURL round-trip throw on those; letting either escape
  // takes down the whole edit form, so nothing here may reject.
  const handleLUD16 = async (e) => {
    const add = e.target.value;
    setUserLud16(add);

    let endpoint = "";
    try {
      endpoint = decodeUrlOrAddress(add) || "";
    } catch {
      endpoint = "";
    }

    // lud06 is derived from lud16, so it tracks that field. Mirror triggerEdit's
    // seeding exactly when there is nothing to encode: writing "" where the seed
    // left undefined reads as a change and publishes an empty lud06 into kind 0
    // for an account that never had one.
    const tempAdd = endpoint ? encodeLud06(endpoint) : "";
    if (!tempAdd) {
      setUserLud06(add ? "" : userMetadata?.lud06);
      return;
    }

    setUserLud06(tempAdd);

    // Resolving the LNURL only upgrades the typed value to the address the server
    // reports; a failure here is not worth surfacing while the user is still typing.
    try {
      const { data } = await axios.get(endpoint);
      const metadata = JSON.parse(data.metadata);
      const identifier = metadata.find((entry) =>
        entry[0].includes("identifier"),
      );
      if (identifier) setUserLud16(identifier[1]);
    } catch {}
  };

  const uploadImages = async (data, kind) => {
    let file = data.file;
    setImageUploading(true);
    const uploaded = await FileUpload({ file, userKeys });
    const url = uploaded?.url;
    if (url) {
      if (kind === "banner") {
        setUserBanner(url);
      }
      if (kind === "picture") {
        setUserPicture(url);
      }
      setImageUploading(false);
      return;
    }
    dispatch(
      setToast({
        type: 2,
        desc: t("AxlGS0U"),
      }),
    );
    setImageUploading(false);
  };

  const triggerEdit = () => {
    if (!userMetadata) return;
    setUserPicture(userMetadata.picture);
    setUserBanner(userMetadata.banner);
    setUserName(userMetadata.name);
    setUserDisplayName(userMetadata.display_name);
    setUserWebsite(userMetadata.website);
    setUserAbout(userMetadata.about);
    setUserNip05(userMetadata.nip05);
    setUserLud16(userMetadata.lud16);
    setUserLud06(userMetadata.lud06);
    // Deliberately does NOT touch isLoading: this runs on every userMetadata
    // change, including the optimistic dispatch made mid-publish, and clearing
    // the flag there would drop the spinner while the event is still in flight.
    // publishMetadata's finally owns that state now.
  };

  const checkMetadata = () => {
    let tempUserMetadata = { ...userMetadata };
    tempUserMetadata.picture = userPicture;
    tempUserMetadata.banner = userBanner;
    tempUserMetadata.name = userName;
    tempUserMetadata.display_name = userDisplayName;
    tempUserMetadata.website = userWebsite;
    tempUserMetadata.about = userAbout;
    tempUserMetadata.nip05 = userNip05;
    tempUserMetadata.lud16 = userLud16;
    tempUserMetadata.lud06 = userLud06;

    return JSON.stringify(userMetadata) === JSON.stringify(tempUserMetadata);
  };

  const nothingToUpdate = () =>
    checkMetadata() && !hasPendingUsername && !claimingUsername;

  // Separate from nothingToUpdate: while a publish is in flight there IS something
  // to update, but the button must not accept a second click and sign the same
  // event twice.
  const isBusy = isLoading || claimingUsername || isImageUploading;

  return (
    <>
      {showWalletOverlay && (
        <WalletsSection
          currentLud16={userLud16}
          onUse={handleUseWallet}
          exit={() => setShowWalletOverlay(false)}
        />
      )}
      {showNip05Overlay && (
        <YakiNip05Overlay
          pubkey={userKeys?.pub}
          nip05Name={nip05Name}
          isActive={nip05?.is_active !== false}
          currentNip05={userNip05}
          onUse={handleUseNip05}
          exit={() => setShowNip05Overlay(false)}
        />
      )}
      <div>
        <div
          className={`${isLoading || isImageUploading ? "flash" : ""}`}
          style={{
            pointerEvents: isLoading || isImageUploading ? "none" : "auto",
          }}
        >
          <div
            className="fx-centered fit-container  fx-start-v"
            style={{ gap: 0 }}
          >
            <div className="main-middle">
              {userMetadata &&
                (userKeys.sec || userKeys.ext || userKeys.bunker) && (
                  <>
                    <div
                      className="fit-container fx-centered fx-col"
                      style={{ gap: 0 }}
                    >
                      <div
                        className="fit-container fx-centered fx-end-v"
                        style={{
                          height: "250px",
                          position: "relative",
                        }}
                      >
                        <div
                          className="fit-container bg-img cover-bg sc-s"
                          style={{
                            backgroundImage: `url(${userBanner})`,
                            height: "70%",
                            zIndex: 0,
                            position: "absolute",
                            left: 0,
                            top: 0,
                            borderBottom: "1px solid var(--v5-very-dim-gray)",
                            border: "none",
                          }}
                        ></div>
                        <div
                          className="fx-centered pointer"
                          style={{
                            position: "absolute",
                            right: "16px",
                            top: "16px",
                          }}
                        >
                          <FilePicker
                            element={
                              <div className="fx-centered sticker  sticker-gray">
                                {t("AmcaRMQ")}
                                <Icon name="plus" size={14} />
                              </div>
                            }
                            setFile={(data) => {
                              uploadImages(data, "banner");
                            }}
                          />

                          {userBanner && (
                            <div
                              className="close"
                              onClick={() => setUserBanner("")}
                              style={{ position: "static" }}
                            >
                              <div></div>
                            </div>
                          )}
                        </div>
                        <FilePicker
                          element={
                            <div className="fit-container fx-col fx-centered box-pad-h">
                              <div
                                style={{
                                  border: "6px solid var(--color-primary-bg)",
                                  borderRadius: "50%",
                                  position: "relative",
                                  overflow: "hidden",
                                }}
                                className="settings-profile-pic"
                              >
                                <div
                                  style={{
                                    position: "relative",
                                    backgroundImage: userPicture
                                      ? `url(${userPicture})`
                                      : "none",
                                    backgroundColor:
                                      "var(--color-primary-bg-side2)",
                                    border: "none",
                                    minWidth: "128px",
                                    aspectRatio: "1/1",
                                    borderRadius: "50%",
                                    zIndex: 1,
                                  }}
                                  className="bg-img cover-bg fx-centered"
                                >
                                  {!userPicture && (
                                    <Icon
                                      name="user_01"
                                      size={56}
                                      opacity={0.35}
                                    />
                                  )}
                                </div>
                                <div
                                  style={{
                                    position: "absolute",
                                    left: 0,
                                    top: 0,
                                    width: "100%",
                                    height: "100%",
                                    zIndex: 1,
                                    backgroundColor: "rgba(0,0,0,.8)",
                                  }}
                                  className="fx-centered pointer toggle fx-col"
                                >
                                  <Icon name="image_01" size={24} />
                                  <p className="gray-c">{t("AadiJFs")}</p>
                                </div>
                              </div>
                            </div>
                          }
                          setFile={(data) => {
                            uploadImages(data, "picture");
                          }}
                        />
                      </div>
                      <div className="fit-container fx-col fx-centered box-pad-h">
                        <div className="box-pad-v-s fx-centered fx-col fit-container">
                          <div
                            className="fx-centered fx-col fit-container"
                            style={{ columnGap: "10px", rowGap: "16px" }}
                          >
                            {canUseYakiNames && (
                              <>
                                {hasUsername ? (
                                  <div className="yaki-username-border">
                                    <div className="yaki-username-border-spinner" />
                                    <div className="yaki-username-border-content">
                                      <YakiNameField
                                        label={t("Ap3wrvF")}
                                        prefix="yakihonne.com/"
                                        value={yakiUsername}
                                        state="owned"
                                        reason={t("Azvn2wX")}
                                        disabled
                                        badge
                                        action={
                                          <div
                                            className="pointer fx-centered"
                                            title={t("AoTWbxS")}
                                            onClick={() =>
                                              copyText(
                                                `https://yakihonne.com/${yakiUsername}`,
                                                t("AoTWbxS"),
                                              )
                                            }
                                          >
                                            <Icon name="copy" size={16} />
                                          </div>
                                        }
                                      />
                                    </div>
                                  </div>
                                ) : (
                                  <YakiNameField
                                    label={t("Ap3wrvF")}
                                    prefix="yakihonne.com/"
                                    value={usernameClaim.value}
                                    state={usernameClaim.state}
                                    reason={usernameClaim.reason}
                                    onChange={usernameClaim.onChange}
                                    onIntercept={
                                      inTrial
                                        ? () => showPaymentSheet("username")
                                        : undefined
                                    }
                                  />
                                )}
                              </>
                            )}
                            <div
                              className="fx-centered fit-container fx-start-v profile-edit-row"
                              style={{ columnGap: "10px", rowGap: "16px" }}
                            >
                              <div className="fit-container sc-s-18 no-bg box-pad-v-s">
                                <p className="p-medium gray-c box-pad-h-m">
                                  {t("ALtjgkI")}
                                </p>
                                <input
                                  className="if ifs-full if-no-border"
                                  style={{ height: "36px" }}
                                  placeholder={t("ALtjgkI")}
                                  value={userDisplayName || ""}
                                  onChange={(e) =>
                                    setUserDisplayName(e.target.value)
                                  }
                                />
                              </div>
                              <div className="fit-container sc-s-18 no-bg box-pad-v-s">
                                <p className="p-medium gray-c box-pad-h-m">
                                  {t("ALCpv2S")}
                                </p>
                                <div className="fx-centered fit-container">
                                  <p style={{ paddingLeft: "1rem" }}>@</p>
                                  <input
                                    className="if ifs-full if-no-border"
                                    style={{ height: "36px", paddingLeft: "0" }}
                                    placeholder={t("ALCpv2S")}
                                    value={userName || ""}
                                    onChange={(e) =>
                                      setUserName(e.target.value)
                                    }
                                  />
                                </div>
                              </div>
                            </div>
                            <div className="fit-container sc-s-18 no-bg box-pad-v-s">
                              <p
                                className="p-medium gray-c box-pad-h-m"
                                style={{ paddingTop: ".5rem" }}
                              >
                                {t("ATpIZr5")}
                              </p>
                              <textarea
                                className="txt-area box-pad-v-m ifs-full if-no-border"
                                placeholder={t("ATpIZr5")}
                                rows={20}
                                value={userAbout || ""}
                                onChange={(e) => setUserAbout(e.target.value)}
                              />
                            </div>
                            <div className="fit-container sc-s-18 no-bg box-pad-v-s">
                              <p
                                className="p-medium gray-c box-pad-h-m"
                                style={{ paddingTop: ".5rem" }}
                              >
                                {t("Ab3i56m")}
                              </p>
                              <input
                                className="if ifs-full if-no-border"
                                style={{ height: "36px" }}
                                placeholder={t("Ab3i56m")}
                                value={userWebsite || ""}
                                onChange={(e) => setUserWebsite(e.target.value)}
                              />
                            </div>
                            <div className="fit-container sc-s-18 no-bg box-pad-v-s">
                              <div className="fx-scattered fit-container">
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <p className="p-medium gray-c box-pad-h-m">
                                    {t("AsS6BPz")}
                                  </p>
                                  <input
                                    className="if ifs-full if-no-border"
                                    style={{ height: "36px" }}
                                    placeholder={t("AsS6BPz")}
                                    value={userNip05 || ""}
                                    onChange={(e) =>
                                      setUserNip05(e.target.value)
                                    }
                                  />
                                </div>
                                {canUseYakiNames && (
                                  <div className="box-pad-h-m">
                                    <button
                                      className="btn btn-small btn-gray"
                                      style={{ minWidth: "max-content" }}
                                      onClick={() =>
                                        inTrial
                                          ? showPaymentSheet("nip05")
                                          : setShowNip05Overlay(true)
                                      }
                                    >
                                      {t("AikNyQn")}
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="fit-container sc-s-18 no-bg box-pad-v-s">
                              <div className="fx-scattered fit-container">
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <p className="p-medium gray-c box-pad-h-m">
                                    {t("A40BuYB")}
                                  </p>
                                  <input
                                    className="if ifs-full if-no-border"
                                    style={{ height: "36px" }}
                                    placeholder={t("A40BuYB")}
                                    value={userLud16 || ""}
                                    onChange={handleLUD16}
                                  />
                                </div>
                                <div className="box-pad-h-m">
                                  <button
                                    className="btn btn-small btn-gray"
                                    style={{ minWidth: "max-content" }}
                                    onClick={() => setShowWalletOverlay(true)}
                                  >
                                    {t("AWltTitle")}
                                  </button>
                                </div>
                              </div>
                            </div>

                            {showMore && (
                              <>
                                <div className="fit-container sc-s-18 no-bg box-pad-v-s">
                                  <p className="p-medium gray-c box-pad-h-m">
                                    {t("AvQu51Y")}
                                  </p>
                                  <input
                                    className="if ifs-full if-no-border"
                                    style={{ height: "36px" }}
                                    placeholder={t("AvQu51Y")}
                                    value={userPicture || ""}
                                    onChange={(e) =>
                                      setUserPicture(e.target.value)
                                    }
                                  />
                                </div>
                                <div className="fit-container sc-s-18 no-bg box-pad-v-s">
                                  <p className="p-medium gray-c box-pad-h-m">
                                    {t("ApHMzMe")}
                                  </p>
                                  <input
                                    className="if ifs-full if-no-border"
                                    style={{ height: "36px" }}
                                    placeholder={t("ApHMzMe")}
                                    value={userBanner || ""}
                                    onChange={(e) =>
                                      setUserBanner(e.target.value)
                                    }
                                  />
                                </div>
                              </>
                            )}
                          </div>
                          <div
                            className="fit-container box-pad-v-s box-pad-h fx-centered pointer"
                            onClick={() => setShowMore(!showMore)}
                          >
                            <p>{t("Ayc6Y5B")}</p>
                            <Icon name="arrow" />
                          </div>
                          <div
                            className="fx-centered fit-container box-marg fx-col"
                            style={{ gap: "12px", marginTop: "1rem" }}
                          >
                            <div
                              className="fx-centered fit-container"
                              style={{ gap: "10px" }}
                            >
                              <button
                                className={`btn btn-normal fx fit-container ${
                                  nothingToUpdate() || isBusy
                                    ? "btn-disabled"
                                    : ""
                                }`}
                                onClick={updateInfos}
                                disabled={nothingToUpdate() || isBusy}
                              >
                                {isLoading || claimingUsername ? (
                                  <Spinner />
                                ) : (
                                  <>
                                    {isImageUploading
                                      ? t("ADIvW8N")
                                      : t("A8alhKV")}
                                  </>
                                )}
                              </button>
                              {!checkMetadata() && (
                                <button
                                  className={"btn btn-gst fx "}
                                  onClick={triggerEdit}
                                >
                                  {isLoading ? (
                                    <Spinner />
                                  ) : (
                                    <>
                                      {isImageUploading
                                        ? t("ADIvW8N")
                                        : t("Ap06Zt4")}
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                            <button
                              className="btn btn-gst fx fit-container"
                              onClick={visitProfile}
                            >
                              {t("AVisitPr")}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              {userMetadata &&
                !userKeys.sec &&
                !userKeys.ext &&
                !userKeys.bunker && (
                  <PagePlaceholder name={pphValues.NOT_CONNECTED} />
                )}
              {!userMetadata && (
                <PagePlaceholder name={pphValues.NOT_CONNECTED} />
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
