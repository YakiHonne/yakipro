import { useState } from "react";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import Icon from "@/Components/LucideIcon";
import StatCard from "./StatCard";
import TopContentTable from "./TopContentTable";
import BarDrillOverlay from "./BarDrillOverlay";
import FollowerDrillOverlay from "./FollowerDrillOverlay";
import FollowersListOverlay from "./FollowersListOverlay";
import ZapsOverTimeChart from "./charts/ZapsOverTimeChart";
import EngagementOverTimeChart from "./charts/EngagementOverTimeChart";
import FollowerGrowthChart from "./charts/FollowerGrowthChart";
import PublishingFrequencyChart from "./charts/PublishingFrequencyChart";
import { useProfileStats } from "@/hooks/analytics/useProfileStats";
import PremiumFeatureGate from "@/Components/PremiumFeatureGate";
import DeleteWarning from "@/Components/DeleteWarning";
import Button from "@/Components/UI/Button";
import { useAnalyticsSync } from "./AnalyticsProvider";

const PERIOD_OPTIONS = [
  { days: 7, label: "7d" },
  { days: 30, label: "1m" },
  { days: 90, label: "3m" },
  { days: 180, label: "6m" },
  { days: 365, label: "1y" },
  { days: 730, label: "2y" },
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
                // `--color-bg-surface` was never a real token, so the fallback
                // pinned these pills to #222 in light mode too.
                background: active
                  ? "var(--color-primary-accent)"
                  : "var(--color-background-secondary)",
                color: active
                  ? "var(--color-on-accent)"
                  : locked
                    ? "var(--color-placeholder-text)"
                    : "var(--color-text-secondary)",
                transition: "all 0.15s",
                opacity: locked ? 0.5 : 1,
                position: "relative",
              }}
            >
              {label}
              {locked && (
                <span style={{ marginLeft: "3px", display: "inline-flex", verticalAlign: "super" }}>
                  <Icon name="sparkles" size={9} />
                </span>
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
          color: "var(--color-text-primary)",
        }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}

export default function DashboardLayout({ pubkey }) {
  const { t } = useTranslation();
  const subscription = useSelector((state) => state.subscription);
  const isPremiumPlan = subscription?.status?.plan === "premium" && subscription?.status?.active;

  const [zapDays, setZapDays] = useState(30);
  const [engageDays, setEngageDays] = useState(30);
  const [publishDays, setPublishDays] = useState(30);
  const [followerDays, setFollowerDays] = useState(365);
  const [drill, setDrill] = useState(null);
  const [gatePeriod, setGatePeriod] = useState(false);
  const [gateDrill, setGateDrill] = useState(false);
  const [showFollowersList, setShowFollowersList] = useState(false);
  const [confirmResync, setConfirmResync] = useState(false);
  const { resync } = useAnalyticsSync();

  const CHART_TITLES = {
    zaps: "Sats Earned",
    reactions: "Engagement",
    notes: "Publishing Frequency",
    followers: t("AcqUGhB"),
  };

  const handleBarClick = (payload) => {
    if (!isPremiumPlan) { setGateDrill(true); return; }
    setDrill({ ...payload, title: CHART_TITLES[payload.type] });
  };

  const handleFollowersListClick = () => {
    if (!isPremiumPlan) { setGateDrill(true); return; }
    setShowFollowersList(true);
  };

  const stats = useProfileStats(pubkey);
  const loading = stats === undefined;

  // A synced account that has genuinely published and received nothing. Distinct
  // from `loading` — the row exists, it's just all zeros — so we can say "nothing
  // yet" instead of leaving a wall of zeroed cards with no explanation.
  const isEmpty =
    !loading &&
    !stats?.notesCount &&
    !stats?.articlesCount &&
    !stats?.zapsReceivedSats &&
    !stats?.reactionsReceived &&
    !stats?.followersCount;

  const formatSats = (n) => (n || 0).toLocaleString();

  return (
    <div
      style={{
        padding: "1.5rem",
        // height: "100vh",
        // overflowY: "scroll",
        maxWidth: 1200,
        margin: "0 auto",
      }}
      className="no-scrollbar"
    >
      <div
        className="fx-scattered fx-wrap"
        style={{ gap: "0.75rem" }}
      >
        <h1 className="box-pad-v-m">Creator Analytics</h1>
        <Button
          label="Resync"
          type="primary"
          size="s"
          leftIcon="refresh"
          onClick={() => setConfirmResync(true)}
        />
      </div>

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

      {isEmpty && (
        <div
          className="border-all round-corner fx-centered fx-col box-pad-v-m box-pad-h-m"
          style={{ gap: "0.35rem", marginBottom: "2rem", textAlign: "center" }}
        >
          <p style={{ margin: 0, fontWeight: 600 }}>{t("AyWVBDx")}</p>
          <p className="p-secondary-c" style={{ margin: 0, fontSize: "0.9rem" }}>
            {t("AavUrQj")}
          </p>
        </div>
      )}

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
          <FollowerGrowthChart pubkey={pubkey} days={followerDays} onBarClick={handleBarClick} />
          {(stats?.followersCount ?? 0) > 0 && (
            <div style={{ display: "flex", justifyContent: "center", marginTop: "1rem" }}>
              <button className="btn" onClick={handleFollowersListClick}>
                {t("AI11KEH", { count: stats?.followersCount ?? 0 })}
              </button>
            </div>
          )}
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

      {drill && drill.type === "followers" && (
        <FollowerDrillOverlay
          drill={drill}
          pubkey={pubkey}
          onClose={() => setDrill(null)}
        />
      )}

      {drill && drill.type !== "followers" && (
        <BarDrillOverlay
          drill={drill}
          pubkey={pubkey}
          onClose={() => setDrill(null)}
        />
      )}

      {showFollowersList && (
        <FollowersListOverlay
          pubkey={pubkey}
          onClose={() => setShowFollowersList(false)}
        />
      )}

      {gatePeriod && (
        <PremiumFeatureGate feature="analytics_period" onClose={() => setGatePeriod(false)} />
      )}

      {gateDrill && (
        <PremiumFeatureGate feature="analytics_drill" onClose={() => setGateDrill(false)} />
      )}

      {confirmResync && (
        <DeleteWarning
          title="Resync your analytics?"
          description="All analytics data collected so far will be deleted and rebuilt from scratch by re-fetching your history from the relays. This can take a few minutes."
          actionButtonLabel="Resync"
          exit={() => setConfirmResync(false)}
          handleDelete={() => {
            setConfirmResync(false);
            resync();
          }}
        />
      )}
    </div>
  );
}
