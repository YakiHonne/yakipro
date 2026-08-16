import React from "react";
import Icon from "@/Components/LucideIcon";

const formatTimeRemaining = (resetAt) => {
  if (!resetAt) return null;
  const seconds = resetAt - Math.floor(Date.now() / 1000);
  if (seconds <= 0) return null;

  const days = Math.floor(seconds / 86400);
  if (days >= 1) return days === 1 ? "1 day" : `${days} days`;

  const hours = Math.floor(seconds / 3600);
  if (hours >= 1) return hours === 1 ? "1 hour" : `${hours} hours`;

  const minutes = Math.max(1, Math.floor(seconds / 60));
  return minutes === 1 ? "1 minute" : `${minutes} minutes`;
};

export default function QuotaBanner({ quota, showUpgrade, onUpgrade }) {
  if (!quota?.exhausted) return null;

  const remaining = formatTimeRemaining(quota.resetAt);

  return (
    <div
      className="fit-container fx-scattered box-pad-h-m"
      style={{
        gap: "12px",
        padding: "10px 14px",
        backgroundColor: "var(--color-orange-side)",
        borderTop: "1px solid var(--color-hairline)",
        borderBottom: "1px solid var(--color-hairline)",
      }}
    >
      <div className="fx-centered" style={{ gap: "8px", minWidth: 0 }}>
        <Icon name="warning" size={15} />
        <p
          style={{
            margin: 0,
            fontSize: "0.8rem",
            fontWeight: 600,
            color: "var(--color-primary-text)",
          }}
        >
          {quota.noAccess
            ? "Quota exceeded"
            : remaining
              ? `Quota exceeded — renews in ${remaining}`
              : "Quota exceeded"}
        </p>
      </div>

      {showUpgrade && (
        <button
          onClick={onUpgrade}
          style={{
            background: "transparent",
            border: "none",
            padding: 0,
            color: "var(--color-primary-accent)",
            fontSize: "0.8rem",
            fontWeight: 700,
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          Upgrade
        </button>
      )}
    </div>
  );
}

export { formatTimeRemaining };
