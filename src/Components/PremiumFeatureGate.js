import React from "react";
import { useRouter } from "next/router";
import Overlay from "./Overlay";
import Icon from "@/Components/LucideIcon";

const FEATURE_META = {
  ai: {
    label: "AI Writing Tools",
    description: "The AI Writing Assistant, Second Reader personas, and Energy Mapper are exclusive to the Pro plan. Get AI-powered feedback, per-paragraph analysis, and emotional pacing insights.",
    perks: ["AI Writing Assistant — unlimited use", "Second Reader — 5 reader personas", "Energy Mapper — per-sentence emotion graph", "Inline diff viewer — accept / reject changes"],
  },
  analytics_period: {
    label: "Extended Analytics History",
    description: "Viewing analytics beyond 3 months requires the Pro plan. Unlock up to 3 years of historical data to understand long-term trends in your content performance.",
    perks: ["Analytics history up to 3 years", "All time-range filters (6m, 1y, 2y, 3y)", "Long-term follower growth trends", "Historical zaps and engagement data"],
  },
  analytics_drill: {
    label: "Content Drill-Down",
    description: "Click-through bar analysis lets you see exactly which notes and articles drove your stats on any given day. This in-depth view is available on the Pro plan.",
    perks: ["Per-day content breakdown", "Click any chart bar to inspect posts", "See zaps and reactions per note/article", "Identify your best-performing content"],
  },
};

export default function PremiumFeatureGate({ feature, onClose }) {
  const router = useRouter();
  const meta = FEATURE_META[feature] || FEATURE_META.ai;

  const handleUpgrade = () => {
    onClose();
    router.push("/sub-and-usage");
  };

  return (
    <Overlay exit={onClose} width={460}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "2rem 1.75rem",
          rowGap: "24px",
          textAlign: "center",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", rowGap: "10px", alignItems: "center" }}>
          <span
            style={{
              fontSize: "0.68rem",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--color-primary-accent)",
              background: "var(--color-primary-light)",
              border: "1px solid rgba(247,88,22,0.2)",
              borderRadius: "999px",
              padding: "3px 12px",
            }}
          >
            Pro plan
          </span>
          <h3 style={{ margin: 0 }}>{meta.label}</h3>
          <p
            className="p-secondary-c"
            style={{ margin: 0, fontSize: "0.875rem", lineHeight: 1.65, maxWidth: "360px" }}
          >
            {meta.description}
          </p>
        </div>

        <div
          className="fit-container"
          style={{
            display: "flex",
            flexDirection: "column",
            rowGap: "10px",
            textAlign: "left",
          }}
        >
          {meta.perks.map((perk) => (
            <div key={perk} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span
                style={{
                  width: "18px",
                  height: "18px",
                  borderRadius: "50%",
                  background: "var(--color-primary-light)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  color: "var(--color-primary-accent)",
                }}
              >
                <Icon name="checkmark" size={11} />
              </span>
              <p style={{ margin: 0, fontSize: "0.84rem", color: "var(--color-primary-text)" }}>
                {perk}
              </p>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", width: "100%", rowGap: "10px" }}>
          <button
            className="btn btn-normal"
            style={{ width: "100%", fontWeight: 700 }}
            onClick={handleUpgrade}
          >
            Upgrade to Pro
          </button>
          <button
            className="btn"
            style={{
              width: "100%",
              background: "transparent",
              border: "1px solid var(--color-divider)",
              color: "var(--color-secondary-text)",
            }}
            onClick={onClose}
          >
            Maybe later
          </button>
        </div>
      </div>
    </Overlay>
  );
}
