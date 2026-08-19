import React from "react";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/router";
import Overlay from "@/Components/Overlay";
import Button from "@/Components/UI/Button";
import Icon from "@/Components/LucideIcon";

const DISMISS_KEY = "yaki-premium-requirements-dismissed";

// Whether the author has opted out of this warning entirely. Read through a
// helper so the storage key lives in one place and a locked-down browser (where
// localStorage throws) simply shows the warning rather than crashing the editor.
export const isPremiumWarningDismissed = () => {
  try {
    return localStorage.getItem(DISMISS_KEY) === "true";
  } catch {
    return false;
  }
};

const dismissPermanently = () => {
  try {
    localStorage.setItem(DISMISS_KEY, "true");
  } catch {}
};

// Premium content needs two independent things, and each one fails differently:
// without a NIP-63 relay there is nowhere to store it privately, and without
// monetization enabled nobody can pay to unlock it. Both are reported together so
// the author fixes the whole setup in one trip rather than discovering the second
// problem after fixing the first.
export default function PremiumRequirementsOverlay({
  hasPremiumRelays,
  hasMonetization,
  exit,
}) {
  const { t } = useTranslation();
  const router = useRouter();

  const goToSubscription = () => {
    exit();
    router.push("/subscription");
  };

  const handleNeverShowAgain = () => {
    dismissPermanently();
    exit();
  };

  return (
    <Overlay width={520} exit={exit}>
      <div
        className="fx-col box-pad-h box-pad-v fit-container relative"
        style={{ gap: "1.25rem" }}
      >
        {/* The close button is taken out of flow so the title can centre against
            the full width of the overlay rather than against the space left over
            beside it. */}
        <div
          className="close"
          style={{ position: "absolute", top: "16px", right: "16px", zIndex: 1 }}
          onClick={exit}
        >
          <div />
        </div>

        {/* Sits below the close button rather than beside it: centring against the
            full width is what keeps the title on one line, and the top margin is
            what stops that line running underneath the button. */}
        <h3
          className="p-centered fit-container"
          style={{ margin: 0, marginTop: "1.5rem" }}
        >
          {t("APremReqT")}
        </h3>

        <p className="gray-c p-centered fit-container" style={{ margin: 0 }}>
          {t("APremReqD")}
        </p>

        <div className="fit-container fx-col" style={{ gap: ".75rem" }}>
          {!hasPremiumRelays && (
            <div
              className="fit-container round-corner-m border-all box-pad-h-m box-pad-v-m fx-col fx-start-v"
              style={{ gap: ".4rem" }}
            >
              <div className="fx-centered fx-start-h" style={{ gap: ".5rem" }}>
                <Icon name="server" size={18} />
                <p className="p-bold">{t("ANoPremRelT")}</p>
              </div>
              <p className="gray-c p-medium">{t("ANoPremRelD")}</p>
            </div>
          )}
          {!hasMonetization && (
            <div
              className="fit-container round-corner-m border-all box-pad-h-m box-pad-v-m fx-col fx-start-v"
              style={{ gap: ".4rem" }}
            >
              <div className="fx-centered fx-start-h" style={{ gap: ".5rem" }}>
                <Icon name="wallet" size={18} />
                <p className="p-bold">{t("ANoMonT")}</p>
              </div>
              <p className="gray-c p-medium">{t("ANoMonD")}</p>
            </div>
          )}
        </div>

        <div
          className="fit-container fx-centered fx-gap-h"
          style={{ marginTop: ".5rem" }}
        >
          <Button
            label={t("AFixSetup")}
            type="primary"
            size="m"
            full
            onClick={goToSubscription}
          />
          <Button
            label={t("ADontShow")}
            type="gray"
            size="m"
            full
            onClick={handleNeverShowAgain}
          />
        </div>
      </div>
    </Overlay>
  );
}
