import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useRouter } from "next/router";
import Icon from "@/Components/Icon";
import { setForcePaywall } from "@/Store/Slices/Subscription";
import Button from "./UI/Button";

const HIDDEN_PATHS = new Set(["/pricing", "/settings", "/login", "/", "/404"]);

export default function TrialBanner() {
  const router = useRouter();
  const dispatch = useDispatch();
  const subscription = useSelector((state) => state.subscription);
  const isConnected = useSelector((state) => state.isConnected);
  const [dismissed, setDismissed] = useState(false);

  if (!isConnected) return null;
  if (!subscription.loaded || !subscription.status) return null;
  if (dismissed) return null;
  if (HIDDEN_PATHS.has(router.pathname)) return null;

  const { in_trial, trial_ends_at, access_blocked } = subscription.status;

  // Only show for active trials — blocked users are handled by IsPremium
  if (!in_trial || access_blocked) return null;

  const daysLeft = Math.max(
    0,
    Math.ceil((trial_ends_at - Math.floor(Date.now() / 1000)) / 86400),
  );

  return (
    <div
      style={{
        width: "100%",
        backgroundColor: "rgba(255,167,38,0.12)",
        borderBottom: "1px solid var(--color-primary-accent)",
        padding: "8px 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
        flexShrink: 0,
        zIndex: 100,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <p style={{ color: "var(--color-primary-accent)", margin: 0 }}>
          You are on a free trial —{" "}
          <strong>
            {daysLeft} {daysLeft === 1 ? "day" : "days"} remaining
          </strong>
          . Upgrade to keep access.
        </p>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          flexShrink: 0,
        }}
      >
        <Button
          onClick={() => dispatch(setForcePaywall(true))}
          label={`Upgrade now`}
          size="s"
          type="primary"
        />

        <button
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            opacity: 0.6,
            padding: "4px 6px",
            fontSize: "1rem",
            lineHeight: 1,
            color: "var(--color-primary-accent)",
          }}
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
