import { Skeleton } from "@mui/material";
import { BarChart } from "@mui/x-charts/BarChart";
import { useNoteTimeSeries, bucketFor } from "@/hooks/analytics/useTimeSeries";

export default function PublishingFrequencyChart({ pubkey, days = 30, onBarClick }) {
  const data = useNoteTimeSeries(pubkey, days);
  const bucket = bucketFor(days);

  if (data === undefined)
    return <Skeleton variant="rectangular" height={260} sx={{ borderRadius: 2 }} />;

  if (data.length === 0)
    return (
      <div style={{ height: 260, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-secondary)", fontSize: "0.9rem" }}>
        No publishing data yet
      </div>
    );

  return (
    <BarChart
      dataset={data}
      xAxis={[{ scaleType: "band", dataKey: "date", tickLabelStyle: { fill: "var(--color-text-secondary)", fontSize: 11 } }]}
      yAxis={[{ tickLabelStyle: { fill: "var(--color-text-secondary)", fontSize: 11 } }]}
      series={[{ dataKey: "count", label: "Notes", color: "#6366f1", stack: "publish" }]}
      height={260}
      margin={{ top: 16, right: 16, bottom: 40, left: 48 }}
      tooltip={{ trigger: "item" }}
      onAxisClick={(_, axisData) => {
        const entry = data[axisData?.dataIndex];
        if (entry && onBarClick)
          onBarClick({ dateStr: entry.date, bucket, value: entry.count || 0, type: "notes" });
      }}
      sx={{
        width: "100%",
        cursor: "pointer",
        "& .MuiChartsLegend-label": {
          color: "var(--color-text-secondary)",
        },
      }}
    />
  );
}
