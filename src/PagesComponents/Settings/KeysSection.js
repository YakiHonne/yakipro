import React, { useState } from "react";
import { useSelector } from "react-redux";
import { getBech32 } from "@/Helpers/Encryptions";
import { copyText } from "@/Helpers/Helpers";
import Icon from "@/Components/Icon";
import Button from "@/Components/UI/Button";

const shortenKey = (key) =>
  key ? `${key.slice(0, 12)}...${key.slice(-8)}` : "";

export default function KeysSection() {
  const userKeys = useSelector((state) => state.userKeys);
  const [showNsec, setShowNsec] = useState(false);

  if (!userKeys) return null;

  const npub = getBech32("npub", userKeys.pub);
  const nsec = userKeys.sec ? getBech32("nsec", userKeys.sec) : null;

  return (
    <div
      className="fx-centered fx-col fit-container"
      style={{ rowGap: "16px" }}
    >
      {/* Warning banner */}
      <div
        className="fit-container fx-centered round-corner box-pad-h-m box-pad-v-s"
        style={{
          backgroundColor: "var(--color-orange-side)",
          border: "1px solid var(--color-orange-main)",
          columnGap: "10px",
        }}
      >
        <p style={{ color: "var(--color-orange-main)" }}>
          Never share your private key. Anyone with it has full control of your
          account.
        </p>
      </div>

      {/* Public key */}
      <div
        className="yp-card box-pad-h-m box-pad-v-m fx-centered fx-col"
        style={{ rowGap: "12px" }}
      >
        <div className="fit-container fx-scattered">
          <h4>Public key (npub)</h4>
          <p className="p-secondary-c ">Safe to share</p>
        </div>
        <div
          className="fit-container fx-scattered round-corner box-pad-h-m box-pad-v-s"
          style={{
            backgroundColor: "var(--color-primary-bg-side)",
            border: "1px solid var(--color-divider)",
          }}
        >
          <p className="" style={{ fontFamily: "monospace" }}>
            {shortenKey(npub)}
          </p>
          <Button
            size="m"
            type="gray"
            onClick={() => copyText(npub, "Public key copied!")}
            label={"copy"}
            leftIcon={"copy"}
          />
        </div>
      </div>

      {/* Private key */}
      <div
        className="yp-card box-pad-h-m box-pad-v-m fx-centered fx-col"
        style={{ rowGap: "12px" }}
      >
        <div className="fit-container fx-scattered">
          <h4>Private key (nsec)</h4>
          {!nsec && (
            <p className="p-secondary-c ">
              {userKeys.ext ? "Using browser extension" : "Not available"}
            </p>
          )}
        </div>
        {nsec ? (
          <div
            className="fit-container fx-scattered round-corner box-pad-h-m box-pad-v-s"
            style={{
              backgroundColor: "var(--color-primary-bg-side)",
              border: "1px solid var(--color-divider)",
            }}
          >
            <p className="" style={{ fontFamily: "monospace" }}>
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
                onClick={() => copyText(nsec, "Private key copied!")}
                label={"copy"}
                leftIcon={"copy"}
              />
            </div>
          </div>
        ) : (
          <div
            className="fit-container round-corner box-pad-h-m fx-centered"
            style={{
              height: "2.5rem",
              backgroundColor: "var(--color-primary-bg-side)",
              border: "1px solid var(--color-divider)",
            }}
          >
            <p className="p-secondary-c ">
              {userKeys.ext
                ? "Private key is managed by your browser extension"
                : "No private key available in this session"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
