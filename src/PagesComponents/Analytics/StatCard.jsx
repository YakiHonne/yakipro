import { Skeleton } from "@mui/material";

export default function StatCard({ label, value, loading, trend }) {
  return (
    <div
      style={{
        borderRadius: 12,
        padding: "1.25rem 1.5rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
      }}
      className="border-all round-corner"
    >
      <span
        style={{
          fontSize: "0.8rem",
          color: "var(--color-text-secondary, #aaa)",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        {label}
      </span>

      {loading ? (
        <Skeleton variant="text" width={80} height={40} />
      ) : (
        <span
          style={{
            fontSize: "2rem",
            fontWeight: 700,
            color: "var(--color-text-primary, #fff)",
            lineHeight: 1,
          }}
        >
          {value ?? "—"}
        </span>
      )}

      {trend != null && !loading && (
        <span
          style={{
            fontSize: "0.75rem",
            color: trend >= 0 ? "#4ade80" : "#f87171",
            fontWeight: 500,
          }}
        >
          {trend >= 0 ? "▲" : "▼"} {Math.abs(trend)} vs 30d ago
        </span>
      )}
    </div>
  );
}
