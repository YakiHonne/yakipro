import { useState } from "react";
import { useSelector } from "react-redux";
import StatCard from "./StatCard";
import TopContentTable from "./TopContentTable";
import BarDrillOverlay from "./BarDrillOverlay";
import ZapsOverTimeChart from "./charts/ZapsOverTimeChart";
import EngagementOverTimeChart from "./charts/EngagementOverTimeChart";
import FollowerGrowthChart from "./charts/FollowerGrowthChart";
import PublishingFrequencyChart from "./charts/PublishingFrequencyChart";
import { useProfileStats } from "@/hooks/analytics/useProfileStats";
import PremiumFeatureGate from "@/Components/PremiumFeatureGate";

const PERIOD_OPTIONS = [
  { days: 7,    label: "7d" },
  { days: 30,   label: "1m" },
  { days: 90,   label: "3m" },
  { days: 180,  label: "6m" },
  { days: 365,  label: "1y" },
  { days: 730,  label: "2y" },
  { days: 1095, label: "3y" },
];

const BASIC_MAX_DAYS = 90;

function PeriodTabs({ value, onChange, isPremiumPlan, onGate }) {
  return (
    <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap" }}>
      {PERIOD_OPTIONS.map(({ days, label }) => {
        const locked = !isPremiumPlan && days > BASIC_MAX_DAYS;
        const active = value === days;
        return (
          <div
            key={days}
            className="yp-chart-col"
            style={{ height: "auto", justifyContent: "center" }}
          >
            <button
              onClick={() => locked ? onGate() : onChange(days)}
              style={{
                padding: "4px 10px",
                borderRadius: 6,
                border: locked ? "1px dashed var(--color-divider)" : "none",
                cursor: "pointer",
                fontSize: "0.75rem",
                fontWeight: 600,
                background: active ? "#f59e0b" : "var(--color-bg-surface, #222)",
                color: active ? "#000" : locked ? "var(--color-placeholder-text)" : "var(--color-text-secondary, #aaa)",
                transition: "all 0.15s",
                opacity: locked ? 0.5 : 1,
                position: "relative",
              }}
            >
              {label}
              {locked && (
                <span style={{ fontSize: "0.55rem", marginLeft: "3px", verticalAlign: "super" }}>✦</span>
              )}
            </button>

            {locked && (
              <div
                className="yp-chart-tooltip"
                style={{ bottom: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)" }}
              >
                <p style={{ margin: 0, fontSize: "0.75rem", fontWeight: 600, color: "var(--color-primary-accent)" }}>
                  Pro plan
                </p>
                <p style={{ margin: 0, fontSize: "0.72rem", color: "var(--color-secondary-text)" }}>
                  Upgrade to unlock
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function SectionHeader({ title, children }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: "0.75rem",
      }}
    >
      <h3
        style={{
          margin: 0,
          fontSize: "1rem",
          fontWeight: 600,
          color: "var(--color-text-primary, #fff)",
        }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}

export default function DashboardLayout({ pubkey }) {
  const subscription = useSelector((state) => state.subscription);
  const isPremiumPlan = subscription?.status?.plan === "premium" && subscription?.status?.active;

  const [zapDays, setZapDays] = useState(30);
  const [engageDays, setEngageDays] = useState(30);
  const [publishDays, setPublishDays] = useState(30);
  const [followerDays, setFollowerDays] = useState(365);
  const [drill, setDrill] = useState(null);
  const [gatePeriod, setGatePeriod] = useState(false);
  const [gateDrill, setGateDrill] = useState(false);

  const CHART_TITLES = {
    zaps:      "Sats Earned",
    reactions: "Engagement",
    notes:     "Publishing Frequency",
  };

  const handleBarClick = (payload) => {
    if (!isPremiumPlan) { setGateDrill(true); return; }
    setDrill({ ...payload, title: CHART_TITLES[payload.type] });
  };

  const stats = useProfileStats(pubkey);
  const loading = stats === undefined;

  const formatSats = (n) => (n || 0).toLocaleString();

  return (
    <div
      style={{
        padding: "1.5rem",
        height: "100vh",
        overflowY: "scroll",
        maxWidth: 1200,
        margin: "0 auto",
      }}
      className="no-scrollbar"
    >
      <h1
        style={{
          margin: "0 0 1.5rem",

          fontWeight: 700,
          color: "var(--color-text-primary, #fff)",
        }}
      >
        Creator Analytics
      </h1>

      {/* Stat Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "1rem",
          marginBottom: "2rem",
        }}
      >
        <StatCard
          label="Total Notes"
          value={stats?.notesCount ?? 0}
          loading={loading}
        />
        <StatCard
          label="Total Articles"
          value={stats?.articlesCount ?? 0}
          loading={loading}
        />
        <StatCard
          label="Sats Earned"
          value={formatSats(stats?.zapsReceivedSats)}
          loading={loading}
        />
        <StatCard
          label="Reactions"
          value={stats?.reactionsReceived ?? 0}
          loading={loading}
        />
      </div>

      {/* Charts grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(480px, 1fr))",
          gap: "1.5rem",
          marginBottom: "2rem",
        }}
      >
        {/* Earnings Chart */}
        <div
          style={{
            padding: "1.25rem",
          }}
          className="border-all round-corner"
        >
          <SectionHeader title="Sats Earned">
            <PeriodTabs value={zapDays} onChange={setZapDays} isPremiumPlan={isPremiumPlan} onGate={() => setGatePeriod(true)} />
          </SectionHeader>
          <ZapsOverTimeChart pubkey={pubkey} days={zapDays} onBarClick={handleBarClick} />
        </div>

        {/* Engagement Chart */}
        <div
          style={{
            padding: "1.25rem",
          }}
          className="border-all round-corner"
        >
          <SectionHeader title="Engagement">
            <PeriodTabs value={engageDays} onChange={setEngageDays} isPremiumPlan={isPremiumPlan} onGate={() => setGatePeriod(true)} />
          </SectionHeader>
          <EngagementOverTimeChart pubkey={pubkey} days={engageDays} onBarClick={handleBarClick} />
        </div>

        {/* Follower Growth */}
        <div
          style={{
            padding: "1.25rem",
          }}
          className="border-all round-corner"
        >
          <SectionHeader title="Follower Growth">
            <PeriodTabs value={followerDays} onChange={setFollowerDays} isPremiumPlan={isPremiumPlan} onGate={() => setGatePeriod(true)} />
          </SectionHeader>
          <FollowerGrowthChart pubkey={pubkey} days={followerDays} />
        </div>

        {/* Publishing Frequency */}
        <div
          style={{
            padding: "1.25rem",
          }}
          className="border-all round-corner"
        >
          <SectionHeader title="Publishing Frequency">
            <PeriodTabs value={publishDays} onChange={setPublishDays} isPremiumPlan={isPremiumPlan} onGate={() => setGatePeriod(true)} />
          </SectionHeader>
          <PublishingFrequencyChart pubkey={pubkey} days={publishDays} onBarClick={handleBarClick} />
        </div>
      </div>

      {/* Top Content Table */}
      <div
        style={{
          padding: "1.25rem",
          marginBottom: "2rem",
        }}
        className="border-all round-corner"
      >
        <SectionHeader title="Top Content" />
        <TopContentTable pubkey={pubkey} />
      </div>

      {drill && (
        <BarDrillOverlay
          drill={drill}
          pubkey={pubkey}
          onClose={() => setDrill(null)}
        />
      )}

      {gatePeriod && (
        <PremiumFeatureGate feature="analytics_period" onClose={() => setGatePeriod(false)} />
      )}

      {gateDrill && (
        <PremiumFeatureGate feature="analytics_drill" onClose={() => setGateDrill(false)} />
      )}
    </div>
  );
}
