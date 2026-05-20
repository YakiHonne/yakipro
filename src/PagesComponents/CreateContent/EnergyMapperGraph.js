import React, { useState } from "react";
import { createPortal } from "react-dom";
import { LineChart } from "@mui/x-charts/LineChart";

// ─── Energy bracket helpers ───────────────────────────────────────────────────

function energyColor(energy) {
  if (energy < 0.3) return "#ef4444";
  if (energy <= 0.6) return "#f59e0b";
  return "#10b981";
}

function chipStyle(energy) {
  if (energy < 0.3)
    return {
      background: "rgba(239,68,68,0.12)",
      borderColor: "rgba(239,68,68,0.35)",
      color: "#ef4444",
    };
  if (energy <= 0.6)
    return {
      background: "rgba(245,158,11,0.12)",
      borderColor: "rgba(245,158,11,0.35)",
      color: "#f59e0b",
    };
  return {
    background: "rgba(16,185,129,0.12)",
    borderColor: "rgba(16,185,129,0.35)",
    color: "#10b981",
  };
}

function dominantColor(sentences) {
  if (!sentences?.length) return "#10b981";
  const avg = sentences.reduce((s, x) => s + x.energy, 0) / sentences.length;
  return energyColor(avg);
}

// ─── Hover tooltip state via custom mark ─────────────────────────────────────

function ChartTooltipContent({ sentence }) {
  if (!sentence) return null;
  return (
    <div className="energy-tooltip slide-up">
      <div className="energy-tooltip-label">
        {sentence.label} · {sentence.energy.toFixed(2)}
      </div>
      <div className="energy-tooltip-text">{sentence.text}</div>
      {sentence.reason && (
        <div className="energy-tooltip-reason">{sentence.reason}</div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function EnergyMapperGraph({ data, isLoading, onClose }) {
  const [hoveredSentence, setHoveredSentence] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });

  if (!data && !isLoading) return null;

  const gradColor = data ? dominantColor(data.sentences) : "#10b981";

  // Build series data for MUI LineChart
  const xValues = data?.sentences.map((s) => s.index) ?? [];
  const yValues = data?.sentences.map((s) => s.energy) ?? [];

  return (
    <div className="energy-graph-wrap">
      {/* ── Header ── */}
      <div className="energy-graph-header">
        <span className="energy-graph-title">Energy Map</span>
        <span className="energy-graph-summary">{data?.summary ?? ""}</span>
        <div className="close" onClick={onClose}>
          <div></div>
        </div>
      </div>

      {isLoading ? (
        <>
          <div className="energy-skeleton energy-skeleton-chart" />
          <div className="energy-skeleton-chips">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="energy-skeleton energy-skeleton-chip" />
            ))}
          </div>
        </>
      ) : (
        <>
          {/* ── Chart ── */}
          <div className="energy-graph-chart" style={{ position: "relative" }}>
            <LineChart
              xAxis={[
                {
                  data: xValues,
                  scaleType: "linear",
                  tickLabelStyle: { display: "none" },
                  disableLine: true,
                  disableTicks: true,
                },
              ]}
              yAxis={[
                {
                  min: 0,
                  max: 1,
                  tickLabelStyle: { display: "none" },
                  disableLine: true,
                  disableTicks: true,
                },
              ]}
              series={[
                {
                  data: yValues,
                  color: gradColor,
                  curve: "monotoneX",
                  showMark: true,
                  area: true,
                  label: "Energy",
                },
              ]}
              height={120}
              margin={{ top: 10, right: 14, bottom: 4, left: 14 }}
              leftAxis={null}
              bottomAxis={null}
              tooltip={{ trigger: "none" }}
              sx={{
                width: "100%",
                "& .MuiLineElement-root": { strokeWidth: 2 },
                "& .MuiMarkElement-root": { display: "none" },
                "& .MuiChartsLegend-root": { display: "none" },
              }}
              onAxisClick={(_, data) => {
                if (data?.dataIndex != null) {
                  setHoveredSentence(
                    data.dataIndex < (data?.sentences?.length ?? 0)
                      ? data.sentences[data.dataIndex]
                      : null,
                  );
                }
              }}
            />

            {/* Custom colored dots overlaid via SVG-like absolute positioned divs */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                pointerEvents: "none",
                display: "flex",
                alignItems: "center",
                padding: "8px",
              }}
            >
              {/* Dots are rendered by MUI internally; we rely on the area fill */}
            </div>
          </div>

          {/* ── Sentence chips ── */}
          <div className="energy-chips-row">
            {data.sentences.map((s) => {
              const cs = chipStyle(s.energy);
              return (
                <div
                  key={s.index}
                  className="energy-chip"
                  style={{
                    background: cs.background,
                    borderColor: cs.borderColor,
                    color: cs.color,
                  }}
                  onMouseEnter={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setTooltipPos({ top: rect.bottom + 6, left: rect.left });
                    setHoveredSentence(s);
                  }}
                  onMouseLeave={() => setHoveredSentence(null)}
                >
                  <span className="energy-chip-label">S{s.index + 1}</span>
                </div>
              );
            })}
          </div>

          {/* ── Chip hover tooltip — portalled to body to escape any overflow clipping ── */}
          {hoveredSentence &&
            createPortal(
              <div
                className="energy-chip-detail"
                style={{
                  display: "block",
                  top: tooltipPos.top,
                  left: tooltipPos.left,
                }}
              >
                <div
                  className="energy-tooltip-label"
                  style={{ fontWeight: 700, marginBottom: 2 }}
                >
                  {hoveredSentence.label} · {hoveredSentence.energy.toFixed(2)}
                </div>
                <div>{hoveredSentence.text}</div>
                {hoveredSentence.reason && (
                  <div
                    style={{ marginTop: 3, fontStyle: "italic", opacity: 0.75 }}
                  >
                    {hoveredSentence.reason}
                  </div>
                )}
              </div>,
              document.body,
            )}
        </>
      )}
    </div>
  );
}
