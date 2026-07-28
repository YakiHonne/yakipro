import { Skeleton } from "@mui/material";
import Icon from "@/Components/LucideIcon";

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
          color: "var(--color-text-secondary)",
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
            // `--color-text-primary` was never defined — the fallback meant this
            // rendered white in light mode too.
            color: "var(--color-primary-text)",
            lineHeight: 1,
          }}
        >
          {/* A brand-new account genuinely has 0 of everything; "—" made a real,
              known-empty result look like missing data. */}
          {value ?? 0}
        </span>
      )}

      {trend != null && !loading && (
        <span
          style={{
            fontSize: "0.75rem",
            color: trend >= 0 ? "var(--color-green-main)" : "var(--color-red-main)",
            fontWeight: 500,
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <Icon name={trend >= 0 ? "trend_up" : "trend_down"} size={13} />
          {Math.abs(trend)} vs 30d ago
        </span>
      )}
    </div>
  );
}
