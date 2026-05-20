import { Skeleton } from "@mui/material";
import { BarChart } from "@mui/x-charts/BarChart";
import { useReactionsTimeSeries, bucketFor } from "@/hooks/analytics/useTimeSeries";

export default function EngagementOverTimeChart({ pubkey, days = 30, onBarClick }) {
  const reactions = useReactionsTimeSeries(pubkey, days);
  const bucket = bucketFor(days);

  if (reactions === undefined)
    return <Skeleton variant="rectangular" height={260} sx={{ borderRadius: 2 }} />;

  if (reactions.length === 0)
    return (
      <div style={{ height: 260, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-secondary, #aaa)", fontSize: "0.9rem" }}>
        No engagement data yet
      </div>
    );

  return (
    <BarChart
      dataset={reactions}
      xAxis={[{ scaleType: "band", dataKey: "date", tickLabelStyle: { fill: "var(--color-text-secondary, #aaa)", fontSize: 11 } }]}
      yAxis={[{ tickLabelStyle: { fill: "var(--color-text-secondary, #aaa)", fontSize: 11 } }]}
      series={[{ dataKey: "count", label: "Reactions", color: "#f59e0b" }]}
      height={260}
      margin={{ top: 16, right: 16, bottom: 40, left: 48 }}
      tooltip={{ trigger: "item" }}
      onAxisClick={(_, axisData) => {
        const entry = reactions[axisData?.dataIndex];
        if (entry && onBarClick)
          onBarClick({ dateStr: entry.date, bucket, value: entry.count || 0, type: "reactions" });
      }}
      sx={{ width: "100%", cursor: "pointer" }}
    />
  );
}
