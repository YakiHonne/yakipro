import { LinearProgress } from "@mui/material";
import { useSyncState } from "@/hooks/analytics/useSyncState";

export default function OnboardingSync() {
  const { syncPhase, syncProgress, syncMessage, isFirstRun } = useSyncState();

  // Only show on first run while actively syncing
  const isVisible =
    isFirstRun && (syncPhase === "backfill" || syncPhase === "delta");

  // Don't mount at all until first run starts
  if (!isFirstRun && syncPhase === "idle") return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backdropFilter: "blur(8px)",
        backgroundColor: "rgba(0,0,0,0.55)",
        opacity: isVisible ? 1 : 0,
        pointerEvents: isVisible ? "all" : "none",
        transition: "opacity 0.6s ease",
      }}
    >
      <div
        style={{
          maxWidth: 480,
          width: "90%",
          borderRadius: 16,
          padding: "2rem",
          textAlign: "center",
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        }}
        className="bg-main-c border-all"
      >
        <div
          style={{
            fontSize: 48,
            marginBottom: "1rem",
            animation: "anim-pulse 2s infinite",
          }}
        >
          ⚡
        </div>

        <h2
          style={{
            margin: "0 0 0.5rem",
            fontSize: "1.4rem",
          }}
          className="p-medium-c"
        >
          Syncing your Nostr history
        </h2>

        <p
          style={{ margin: "0 0 1.5rem", fontSize: "0.95rem" }}
          className="p-secondary-c"
        >
          This only happens once. Grab a coffee ☕
        </p>

        <LinearProgress
          variant={syncProgress > 0 ? "determinate" : "indeterminate"}
          value={syncProgress}
          sx={{
            height: 8,
            borderRadius: 4,
            mb: 2,
            backgroundColor: "rgba(245,158,11,0.2)",
            "& .MuiLinearProgress-bar": {
              backgroundColor: "#f59e0b",
              borderRadius: 4,
            },
          }}
        />

        {syncMessage && (
          <p
            style={{ fontSize: "0.85rem", margin: "0 0 0.5rem" }}
            className="p-secondary-c"
          >
            {syncMessage}
          </p>
        )}
      </div>

      <style>{`
        @keyframes anim-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.15); opacity: 0.7; }
        }
      `}</style>
    </div>
  );
}
