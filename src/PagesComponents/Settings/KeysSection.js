import React, { useState } from "react";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { getBech32, downloadAsFile } from "@/Helpers/Encryptions";
import { copyText } from "@/Helpers/Helpers";
import Icon from "@/Components/LucideIcon";
import Button from "@/Components/UI/Button";
import GoogleAccountSection from "./GoogleAccountSection";

const shortenKey = (key) =>
  key ? `${key.slice(0, 12)}...${key.slice(-8)}` : "";

const FieldCard = ({ title, hint, children }) => (
  <div
    className="yp-card box-pad-h-m box-pad-v-m fx-centered fx-col"
    style={{ rowGap: "12px" }}
  >
    <div className="fit-container fx-scattered">
      <h4>{title}</h4>
      {hint && <p className="p-secondary-c">{hint}</p>}
    </div>
    {children}
  </div>
);

const ValueRow = ({ children }) => (
  <div
    className="fit-container fx-scattered round-corner box-pad-h-m box-pad-v-s"
    style={{
      backgroundColor: "var(--color-primary-bg-side)",
      border: "1px solid var(--color-divider)",
      columnGap: "10px",
    }}
  >
    {children}
  </div>
);

export default function KeysSection() {
  const { t } = useTranslation();
  const userKeys = useSelector((state) => state.userKeys);
  const [showNsec, setShowNsec] = useState(false);

  if (!userKeys) return null;

  const npub = getBech32("npub", userKeys.pub);
  const nsec = userKeys.sec ? getBech32("nsec", userKeys.sec) : null;
  // A Google account signs over NIP-46, so there is no local secret key to
  // show; the bunker URL and the recovery flow take its place.
  const isRemoteAccount = !!(userKeys.central || userKeys.bunker);

  const exportKeys = () => {
    const toSave = [
      "Important: Store this information securely. If you lose it, recovery may not be possible. Keep it private and protected at all times",
      "---",
      "Account credentials",
      `Private key: ${nsec || "N/A"}`,
      `Public key: ${npub}`,
    ];
    downloadAsFile(toSave.join("\n"), "text/plain", "account-credentials.txt");
  };

  return (
    <div className="fx-centered fx-col fit-container" style={{ rowGap: "16px" }}>
      {!isRemoteAccount && (
        <div
          className="fit-container fx-centered round-corner box-pad-h-m box-pad-v-s"
          style={{
            backgroundColor: "var(--color-orange-side)",
            border: "1px solid var(--color-orange-main)",
            columnGap: "10px",
          }}
        >
          <p style={{ color: "var(--color-orange-main)" }}>
            Never share your private key. Anyone with it has full control of
            your account.
          </p>
        </div>
      )}

      {userKeys.email && (
        <FieldCard title={t("AcpRrIH")}>
          <ValueRow>
            <p style={{ fontFamily: "monospace" }}>{userKeys.email}</p>
          </ValueRow>
        </FieldCard>
      )}

      {userKeys.bunker && (
        <FieldCard title={t("AoLGP7H")} hint={t("AB7RH4M")}>
          <ValueRow>
            <p
              style={{
                fontFamily: "monospace",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {shortenKey(userKeys.bunker)}
            </p>
            <Button
              size="m"
              type="gray"
              onClick={() => copyText(userKeys.bunker, t("ADOA9ab"))}
              label={"copy"}
              leftIcon={"copy"}
            />
          </ValueRow>
        </FieldCard>
      )}

      <FieldCard title={t("AZRwERj")} hint={t("A9pRbqh")}>
        <ValueRow>
          <p style={{ fontFamily: "monospace" }}>{shortenKey(npub)}</p>
          <Button
            size="m"
            type="gray"
            onClick={() => copyText(npub, t("AzSXXQm"))}
            label={"copy"}
            leftIcon={"copy"}
          />
        </ValueRow>
      </FieldCard>

      {!isRemoteAccount && (
        <FieldCard
          title={t("Az0mazr")}
          hint={
            !nsec
              ? userKeys.ext
                ? t("ApmycvH")
                : t("Au372KY")
              : t("AnQpdZ9")
          }
        >
          {nsec ? (
            <ValueRow>
              <p style={{ fontFamily: "monospace" }}>
                {showNsec ? shortenKey(nsec) : "•".repeat(24)}
              </p>
              <div className="fx-centered" style={{ columnGap: "8px" }}>
                <Button
                  size="m"
                  type="gray"
                  onClick={() => setShowNsec((v) => !v)}
                  label={showNsec ? "Hide" : "Show"}
                  leftIcon={showNsec ? "eye-closed" : "eye-opened"}
                />
                <Button
                  size="m"
                  type="gray"
                  onClick={() => copyText(nsec, t("AStACDI"))}
                  label={"copy"}
                  leftIcon={"copy"}
                />
              </div>
            </ValueRow>
          ) : (
            <div
              className="fit-container round-corner box-pad-h-m fx-centered"
              style={{
                height: "2.5rem",
                backgroundColor: "var(--color-primary-bg-side)",
                border: "1px solid var(--color-divider)",
              }}
            >
              <p className="p-secondary-c">
                {userKeys.ext ? t("ApmycvH") : t("Au372KY")}
              </p>
            </div>
          )}
        </FieldCard>
      )}

      {userKeys.central && <GoogleAccountSection />}

      <div className="fit-container fx-end-h">
        <Button
          size="m"
          type="gray"
          onClick={exportKeys}
          label={t("ADv1bgl")}
          leftIcon={"download"}
        />
      </div>
    </div>
  );
}
