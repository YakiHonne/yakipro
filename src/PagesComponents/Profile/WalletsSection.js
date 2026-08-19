import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { useTranslation } from "react-i18next";
import Overlay from "@/Components/Overlay";
import Icon from "@/Components/LucideIcon";
import Button from "@/Components/UI/Button";
import YakiNameField from "./YakiNameField";
import useNameClaim from "@/hooks/useNameClaim";
import useAccountAccess from "@/hooks/useAccountAccess";
import useAccessFailure from "@/hooks/useAccessFailure";
import useFeatureQuota, { QUOTA_FEATURES } from "@/hooks/useFeatureQuota";
import { createWallet } from "@/Endpoionts/account";
import { getSubscriptionStatus } from "@/Endpoionts/subscription";
import { setSubscriptionStatus } from "@/Store/Slices/Subscription";
import { setToast } from "@/Store/Slices/Extras";
import { downloadAsFile } from "@/Helpers/Encryptions";
import { copyText } from "@/Helpers/Helpers";

const WALLET_DOMAIN = "@wallet.yakihonne.com";

// Wallets can only be created through Yakihonne's own NWC service, and how many
// depends on the plan (trial 1, basic 3, premium unlimited). The server owns those
// numbers — they arrive as the wallet-creation usage entry — so nothing here
// hardcodes a limit; the quota decides whether to offer creation or an upgrade.
export default function WalletsSection({ currentLud16, onUse, exit }) {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const { wallets, inTrial } = useAccountAccess();
  const { showPaymentSheet, handleAccessFailure } = useAccessFailure();
  const { quotas, refresh: refreshQuota } = useFeatureQuota([
    QUOTA_FEATURES.walletCreation,
  ]);
  const quota = quotas[QUOTA_FEATURES.walletCreation];

  const [creating, setCreating] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const claim = useNameClaim({ kind: "wallet", enabled: expanded });

  const exhausted = !!quota?.exhausted;
  const remainingLabel = quota?.unlimited
    ? t("AWltUnlim")
    : quota
      ? `${quota.remaining} ${t("AWltLeft")}`
      : "";

  const refreshAccount = async () => {
    try {
      const data = await getSubscriptionStatus();
      dispatch(setSubscriptionStatus(data));
    } catch {}
  };

  // The connection secret is returned exactly once, so it goes straight to a file
  // before anything else can fail.
  const persistWallet = (data) => {
    const toSave = [
      "Important: Store this information securely. If you lose it, recovery may not be possible. Keep it private and protected at all times",
      "---",
      `Address: ${data.lightningAddress}`,
      `NWC secret: ${data.connectionSecret}`,
    ];
    const saved = downloadAsFile(
      toSave.join("\n"),
      "text/plain",
      `${data.lightningAddress}-NWC.txt`,
      false,
    );
    dispatch(
      setToast(
        saved
          ? { type: 1, desc: t("AWltSaved") }
          : {
              type: 3,
              desc: `${t("AWltSaveManual")} ${data.lightningAddress}`,
            },
      ),
    );
  };

  const handleCreate = async () => {
    if (!claim.claimable || creating) return;

    // A trial account gets one wallet at most, and an exhausted quota on any plan
    // means the next wallet has to be bought — both route to the payment sheet
    // rather than a dead-end error from the API.
    if (exhausted) {
      showPaymentSheet("wallet-creation");
      return;
    }

    setCreating(true);
    try {
      const data = await createWallet(claim.value);
      persistWallet(data);
      await refreshAccount();
      await refreshQuota();
      claim.reset("");
      setExpanded(false);
    } catch (err) {
      if (!handleAccessFailure(err, { source: "wallet-creation" })) {
        dispatch(
          setToast({ type: 3, desc: err?.message || t("AWltFail") }),
        );
      }
    } finally {
      setCreating(false);
    }
  };

  const toggle = () => {
    if (!expanded && exhausted) {
      showPaymentSheet("wallet-creation");
      return;
    }
    setExpanded(!expanded);
  };

  return (
    <Overlay width={480} exit={exit}>
      <div
        className="fx-centered fx-col box-pad-h box-pad-v fit-container fx-start-v"
        style={{ gap: "1rem" }}
      >
        <div className="fit-container fx-scattered">
          <h4>{t("AWltTitle")}</h4>
          <div className="close" onClick={exit}>
            <div></div>
          </div>
        </div>

        {remainingLabel && (
          <p className="p-medium gray-c fit-container">{remainingLabel}</p>
        )}

        <div
          className="fit-container fx-col fx-centered"
          style={{ gap: ".5rem" }}
        >
          {wallets.length === 0 && (
            <p className="p-medium gray-c fit-container">{t("AWltEmpty")}</p>
          )}
          {wallets.map((name) => {
            const address = name.includes("@")
              ? name
              : `${name}${WALLET_DOMAIN}`;
            const inUse = currentLud16 === address;
            return (
              <div
                key={name}
                // sc-s-18 carries no styling in this app (it is a YakiV5
                // leftover), so the border comes from border-all here — without a
                // real border there is nothing for borderColor to recolor.
                className="fit-container round-corner-m border-all box-pad-h-m box-pad-v-m"
                style={
                  inUse
                    ? { borderColor: "var(--color-green-main)" }
                    : undefined
                }
              >
                <div className="fit-container fx-scattered">
                  <div
                    className="fx-centered fx-start-h"
                    style={{ minWidth: 0 }}
                  >
                    <Icon name="wallet" size={20} />
                    <p className="p-one-line">{address}</p>
                  </div>
                  <div className="fx-centered" style={{ gap: ".5rem" }}>
                    <div
                      className="pointer fx-centered"
                      title={t("AoTWbxS")}
                      onClick={() => copyText(address, t("AoTWbxS"))}
                    >
                      <Icon name="copy" size={16} />
                    </div>
                    {inUse ? (
                      // The green check plus the row's green border already say
                      // "this is the one in use"; the sentence that was here
                      // outgrew the address it was annotating.
                      <div className="fx-centered" title={t("AvW5dTF")}>
                        <Icon name="check" size={16} isColored />
                      </div>
                    ) : (
                      <button
                        className="btn btn-small btn-gray"
                        style={{ minWidth: "max-content" }}
                        onClick={() => {
                          onUse?.(address);
                          exit?.();
                        }}
                      >
                        {t("AdrMY4n")}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {expanded && (
          <div
            className="fit-container fx-centered fx-col"
            style={{ gap: ".5rem" }}
          >
            <YakiNameField
              label={t("AWltNew")}
              suffix={WALLET_DOMAIN}
              value={claim.value}
              state={claim.state}
              reason={claim.reason}
              onChange={claim.onChange}
            />
            <Button
              label={t("AWltCreate")}
              type={claim.claimable ? "primary" : "gray"}
              size="m"
              full
              disabled={!claim.claimable || creating}
              loading={creating}
              onClick={handleCreate}
            />
          </div>
        )}

        <div className="fit-container">
          <Button
            label={
              exhausted
                ? t("AWltUpgrade")
                : expanded
                  ? t("Ap06Zt4")
                  : t("AWltAdd")
            }
            type="gray"
            size="m"
            full
            leftIcon={expanded ? undefined : "plus"}
            onClick={toggle}
          />
        </div>
      </div>
    </Overlay>
  );
}
