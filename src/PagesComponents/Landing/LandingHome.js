import React, { useEffect, useRef } from "react";
import Link from "next/link";
import Icon from "@/Components/Icon";
import { useSelector } from "react-redux";

// ─── Scroll-reveal hook ───────────────────────────────────────────────────────
function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll(".lp-reveal");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

// ─── Animated particle canvas ─────────────────────────────────────────────────
function HeroCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // Nodes
    const NODE_COUNT = 48;
    const nodes = Array.from({ length: NODE_COUNT }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      r: Math.random() * 1.5 + 0.5,
    }));

    const CONNECT_DIST = 160;
    let raf;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Move
      nodes.forEach((n) => {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > canvas.width) n.vx *= -1;
        if (n.y < 0 || n.y > canvas.height) n.vy *= -1;
      });

      // Edges
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONNECT_DIST) {
            const alpha = (1 - dist / CONNECT_DIST) * 0.18;
            ctx.beginPath();
            ctx.strokeStyle = `rgba(247,88,22,${alpha})`;
            ctx.lineWidth = 0.8;
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }

      // Dots
      nodes.forEach((n) => {
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(247,88,22,0.35)";
        ctx.fill();
      });

      raf = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="lp-hero-canvas"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      aria-hidden="true"
    />
  );
}

// ─── Nav ──────────────────────────────────────────────────────────────────────
function Nav() {
  const userKeys = useSelector((state) => state.userKeys);
  const isConnected = useSelector((state) => state.isConnected);
  const authed = !!(userKeys || isConnected);

  return (
    <nav className="lp-nav">
      <Link
        href={authed ? "/home" : "/"}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          textDecoration: "none",
        }}
      >
        <div className="fx-centered fx-start-h fx-gap-h fit-container box-pad-v-s">
          <Icon
            name="yakihonne-logo"
            width={100}
            height={64}
            className="pointer"
          />
          <div className="round-corner border-all box-pad-h-xs p-primary-c">
            pro
          </div>
        </div>
      </Link>
      <div className="lp-nav-links">
        <a href="#analytics" className="lp-nav-link">
          Analytics
        </a>
        <a href="#ai-tools" className="lp-nav-link">
          AI Tools
        </a>
        <a href="#monetize" className="lp-nav-link">
          Monetize
        </a>
        <Link href="/pricing" className="lp-nav-link">
          Pricing
        </Link>
      </div>
      <div className="lp-nav-actions">
        <Link
          href={authed ? "/home" : "/login"}
          className="lp-btn lp-btn-outline lp-btn-sm"
        >
          {authed ? "Dashboard" : "Sign in"}
        </Link>
        <Link
          href="/create-content"
          className="lp-btn lp-btn-primary lp-btn-sm"
        >
          Start writing
        </Link>
      </div>
    </nav>
  );
}

// ─── Feature ticker ───────────────────────────────────────────────────────────
const TICKER_ITEMS = [
  { icon: "✦", label: "AI Writing Assistant" },
  { icon: "✦", label: "Second Reader AI — 5 personas" },
  { icon: "⚡", label: "Energy Mapper — note emotion graph" },
  { icon: "📊", label: "Creator Analytics" },
  { icon: "⚡", label: "Lightning Monetization" },
  { icon: "🔑", label: "Nostr-native identity" },
  { icon: "📰", label: "Articles & Notes" },
  { icon: "☁️", label: "Blossom Media Storage" },
  { icon: "👥", label: "Subscriber Management" },
  { icon: "🛡️", label: "Censorship-resistant publishing" },
  { icon: "₿", label: "Bitcoin-native payments" },
];

function Ticker() {
  const doubled = [...TICKER_ITEMS, ...TICKER_ITEMS];
  return (
    <div className="lp-ticker-wrap">
      <div className="lp-ticker">
        {doubled.map((item, i) => (
          <div key={i} className="lp-ticker-item">
            <span className="lp-ticker-item-icon">{item.icon}</span>
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Editor + AI Diff mockup — mirrors real tiptap-shell / ai-diff-viewer ────
function EditorMockup() {
  return (
    <div className="lp-browser-frame">
      <div className="lp-browser-bar">
        <div className="lp-browser-dot" style={{ background: "#E5533D" }} />
        <div className="lp-browser-dot" style={{ background: "#F0B429" }} />
        <div className="lp-browser-dot" style={{ background: "#2FBF71" }} />
        <div className="lp-browser-url">yakipro.com/create-content</div>
      </div>

      {/* Mirrors .tiptap-shell layout */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          background: "var(--color-primary-bg, #F5F6F8)",
        }}
      >
        {/* Mirrors .ai-diff-summary bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 14px",
            background: "var(--color-background, #F5F6F8)",
            borderBottom: "1px solid #f97316",
            gap: 8,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: "#f97316" }}>✦</span>
            <span
              style={{
                fontSize: "0.72rem",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "#f97316",
              }}
            >
              2 changes to review
            </span>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              style={{
                padding: "2px 10px",
                borderRadius: 4,
                fontSize: "0.68rem",
                fontWeight: 600,
                background: "#f97316",
                color: "#fff",
                border: "1px solid #f97316",
                cursor: "default",
                fontFamily: "inherit",
              }}
            >
              ✓ Accept all
            </button>
            <button
              style={{
                padding: "2px 10px",
                borderRadius: 4,
                fontSize: "0.68rem",
                fontWeight: 600,
                background: "transparent",
                color: "#9A9A9A",
                border: "1px solid #D1D5DB",
                cursor: "default",
                fontFamily: "inherit",
              }}
            >
              ✕ Reject all
            </button>
          </div>
        </div>

        {/* Mirrors .ai-diff-viewer */}
        <div
          style={{
            padding: "12px 14px",
            display: "flex",
            flexDirection: "column",
            gap: 2,
            background: "var(--color-primary-bg, #F5F6F8)",
          }}
        >
          {/* unchanged block */}
          <div
            style={{
              padding: "8px 12px",
              borderRadius: 4,
              fontSize: "0.82rem",
              lineHeight: 1.7,
              color: "var(--color-text, #1E1F25)",
            }}
          >
            Publishing on Nostr means your content lives on the protocol — not
            on a company's servers.
          </div>

          {/* removed block — mirrors .ai-diff-removed */}
          <div
            style={{
              padding: "8px 12px",
              borderRadius: 4,
              fontSize: "0.82rem",
              lineHeight: 1.7,
              background: "rgba(239,68,68,0.10)",
              borderLeft: "3px solid #ef4444",
              color: "var(--color-text, #1E1F25)",
              textDecoration: "line-through",
              opacity: 0.75,
            }}
          >
            The protocol enables censorship-resistant publishing at scale.
          </div>

          {/* added block — mirrors .ai-diff-added */}
          <div
            style={{
              padding: "8px 12px",
              borderRadius: 4,
              fontSize: "0.82rem",
              lineHeight: 1.7,
              background: "rgba(16,185,129,0.10)",
              borderLeft: "3px solid #10b981",
              color: "var(--color-text, #1E1F25)",
            }}
          >
            Nostr lets writers publish directly to a global relay network — no
            platform, no gatekeeping, no takedowns.
            {/* mirrors .ai-diff-actions */}
            <div
              style={{
                display: "flex",
                gap: 8,
                marginTop: 8,
                paddingTop: 8,
                borderTop: "1px solid rgba(128,128,128,0.12)",
              }}
            >
              <button
                style={{
                  padding: "3px 12px",
                  borderRadius: 4,
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  background: "#f97316",
                  color: "#fff",
                  border: "1px solid #f97316",
                  cursor: "default",
                  fontFamily: "inherit",
                }}
              >
                ✓ Accept
              </button>
              <button
                style={{
                  padding: "3px 12px",
                  borderRadius: 4,
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  background: "transparent",
                  color: "#9A9A9A",
                  border: "1px solid #D1D5DB",
                  cursor: "default",
                  fontFamily: "inherit",
                }}
              >
                ✕ Reject
              </button>
            </div>
          </div>

          {/* another unchanged */}
          <div
            style={{
              padding: "8px 12px",
              borderRadius: 4,
              fontSize: "0.82rem",
              lineHeight: 1.7,
              color: "var(--color-text, #1E1F25)",
              opacity: 0.5,
            }}
          >
            Every article you publish is a signed event with your private key…
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Analytics mockup — mirrors real DashboardLayout + StatCard + BarChart ────
function AnalyticsMockup() {
  const bars = [
    { z: 45, r: 70, n: 30 },
    { z: 60, r: 85, n: 50 },
    { z: 35, r: 55, n: 25 },
    { z: 80, r: 95, n: 65 },
    { z: 55, r: 72, n: 40 },
    { z: 90, r: 108, n: 70 },
    { z: 70, r: 88, n: 55 },
  ];
  const maxV = 120;
  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  // Mirrors real StatCard: border-all round-corner, label uppercase, value 2rem bold
  const StatCard = ({ label, value }) => (
    <div
      style={{
        borderRadius: 12,
        padding: "16px 20px",
        border: "1px solid var(--color-divider, #D1D5DB)",
        background: "var(--color-surface, #fff)",
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <span
        style={{
          fontSize: "0.7rem",
          color: "#9A9A9A",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          fontWeight: 600,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: "1.6rem",
          fontWeight: 700,
          color: "var(--color-primary-text, #1E1F25)",
          lineHeight: 1,
        }}
      >
        {value}
      </span>
    </div>
  );

  // Mirrors PeriodTabs exactly: amber active, dark bg inactive
  const PeriodTab = ({ label, active }) => (
    <button
      style={{
        padding: "4px 10px",
        borderRadius: 6,
        border: "none",
        cursor: "default",
        fontSize: "0.75rem",
        fontWeight: 600,
        fontFamily: "inherit",
        background: active
          ? "#f59e0b"
          : "var(--color-background-secondary, #ECEFF4)",
        color: active ? "#000" : "var(--color-text-secondary, #9A9A9A)",
      }}
    >
      {label}
    </button>
  );

  return (
    <div
      className="lp-analytics-mock"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        background: "transparent",
        border: "none",
        boxShadow: "none",
        borderRadius: 0,
      }}
    >
      {/* Stat cards row — mirrors grid auto-fit minmax(180px,1fr) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: 12,
        }}
      >
        <StatCard label="Total Notes" value="142" />
        <StatCard label="Total Articles" value="38" />
        <StatCard label="Sats Earned" value="84,210" />
        <StatCard label="Reactions" value="2,047" />
      </div>

      {/* Sats Earned chart card — mirrors border-all round-corner + padding 1.25rem */}
      <div
        style={{
          padding: "16px 20px",
          border: "1px solid var(--color-divider, #D1D5DB)",
          borderRadius: 12,
          background: "var(--color-surface, #fff)",
        }}
      >
        {/* SectionHeader: title + PeriodTabs */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: "1rem",
              fontWeight: 600,
              color: "var(--color-primary-text, #1E1F25)",
            }}
          >
            Sats Earned
          </h3>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {["7d", "1m", "3m", "6m", "1y", "2y", "3y"].map((t, i) => (
              <PeriodTab key={t} label={t} active={i === 2} />
            ))}
          </div>
        </div>

        {/* BarChart replica */}
        <div style={{ display: "flex", gap: 4 }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              height: 130,
              paddingRight: 6,
              paddingBottom: 18,
            }}
          >
            {[120, 80, 40, 0].map((v) => (
              <span
                key={v}
                style={{ fontSize: "0.6rem", color: "#B6BCCB", lineHeight: 1 }}
              >
                {v}
              </span>
            ))}
          </div>
          <div style={{ flex: 1 }}>
            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                gap: 5,
                height: 130,
                marginBottom: 6,
              }}
            >
              {bars.map((b, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "flex-end",
                    gap: 2,
                  }}
                >
                  <div
                    style={{
                      flex: 1,
                      borderRadius: "3px 3px 0 0",
                      background: "#f59e0b",
                      height: `${(b.z / maxV) * 100}%`,
                    }}
                  />
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 5 }}>
              {labels.map((l) => (
                <div
                  key={l}
                  style={{
                    flex: 1,
                    textAlign: "center",
                    fontSize: "0.58rem",
                    color: "#B6BCCB",
                  }}
                >
                  {l}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Drill-down overlay card — mirrors BarDrillOverlay ContentCard */}
      <div
        style={{
          padding: "14px 16px",
          border: "1px solid var(--color-divider, #D1D5DB)",
          borderRadius: 12,
          background: "var(--color-surface, #fff)",
          display: "flex",
          flexDirection: "column",
          gap: 6,
          cursor: "default",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <span
            style={{
              fontSize: "0.7rem",
              fontWeight: 700,
              padding: "2px 8px",
              borderRadius: 4,
              background: "#8b5cf622",
              color: "#8b5cf6",
              textTransform: "uppercase",
            }}
          >
            Article
          </span>
          <span style={{ fontSize: "0.75rem", color: "#9A9A9A" }}>
            3 days ago
          </span>
        </div>
        <p
          style={{
            margin: 0,
            fontWeight: 600,
            fontSize: "0.875rem",
            lineHeight: 1.4,
            color: "var(--color-primary-text, #1E1F25)",
          }}
        >
          Why Nostr is the future of decentralized publishing
        </p>
        <div style={{ display: "flex", gap: 16, marginTop: 4 }}>
          <span
            style={{
              fontSize: "0.75rem",
              color: "#9A9A9A",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            ❤️ 88
          </span>
          <span
            style={{
              fontSize: "0.75rem",
              color: "#9A9A9A",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            🔁 14
          </span>
          <span
            style={{
              fontSize: "0.75rem",
              color: "#f59e0b",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            ⚡ 42,100 sats
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Energy Mapper mockup — mirrors real EnergyMapperGraph ───────────────────
function EnergyMapperMockup() {
  const sentences = [
    { label: "S1", energy: 0.82, color: "#10b981" },
    { label: "S2", energy: 0.55, color: "#f59e0b" },
    { label: "S3", energy: 0.38, color: "#f59e0b" },
    { label: "S4", energy: 0.71, color: "#10b981" },
    { label: "S5", energy: 0.48, color: "#f59e0b" },
    { label: "S6", energy: 0.25, color: "#ef4444" },
    { label: "S7", energy: 0.9, color: "#10b981" },
  ];
  const W = 600;
  const H = 80;
  const pts = sentences.map((s, i) => {
    const x = (i / (sentences.length - 1)) * W;
    const y = H - s.energy * H;
    return { x, y, ...s };
  });
  const linePoints = pts.map((p) => `${p.x},${p.y}`).join(" ");
  const areaPoints = `${linePoints} ${W},${H} 0,${H}`;

  const chipColor = (energy) => {
    if (energy < 0.3)
      return {
        bg: "rgba(239,68,68,0.12)",
        border: "rgba(239,68,68,0.35)",
        c: "#ef4444",
      };
    if (energy <= 0.6)
      return {
        bg: "rgba(245,158,11,0.12)",
        border: "rgba(245,158,11,0.35)",
        c: "#f59e0b",
      };
    return {
      bg: "rgba(16,185,129,0.12)",
      border: "rgba(16,185,129,0.35)",
      c: "#10b981",
    };
  };

  return (
    <div
      style={{
        border: "1px solid var(--color-divider, #D1D5DB)",
        borderRadius: 10,
        background: "var(--color-surface, #fff)",
        overflow: "hidden",
      }}
    >
      {/* Header — mirrors .energy-graph-header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 14px",
          borderBottom: "1px solid var(--color-divider, #D1D5DB)",
          gap: 12,
        }}
      >
        <span
          style={{
            fontSize: "0.72rem",
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "#10b981",
            whiteSpace: "nowrap",
          }}
        >
          Energy Map
        </span>
        <span
          style={{
            fontSize: "0.75rem",
            color: "var(--color-text-muted, #B6BCCB)",
            flex: 1,
            textAlign: "center",
          }}
        >
          Starts punchy, dips mid-note, peaks at the close.
        </span>
        <span
          style={{
            color: "var(--color-text-muted, #B6BCCB)",
            fontSize: "1rem",
            cursor: "default",
          }}
        >
          ×
        </span>
      </div>

      {/* Chart — SVG area sparkline */}
      <div style={{ padding: "10px 14px 4px" }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ width: "100%", height: 80, display: "block" }}
        >
          <defs>
            <linearGradient id="em-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </linearGradient>
          </defs>
          <polygon points={areaPoints} fill="url(#em-grad)" />
          <polyline
            points={linePoints}
            fill="none"
            stroke="#10b981"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {pts.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r="5"
              fill={p.color}
              stroke="var(--color-surface, #fff)"
              strokeWidth="1.5"
            />
          ))}
        </svg>
      </div>

      {/* Chips row — mirrors .energy-chips-row */}
      <div
        style={{
          display: "flex",
          gap: 6,
          padding: "6px 14px 12px",
          overflowX: "auto",
        }}
      >
        {sentences.map((s, i) => {
          const cs = chipColor(s.energy);
          const isPeak =
            s.energy === Math.max(...sentences.map((x) => x.energy));
          const isFlatline = s.energy < 0.3;
          return (
            <div
              key={i}
              style={{
                flexShrink: 0,
                borderRadius: 6,
                border: `1px solid ${cs.border}`,
                background: cs.bg,
                color: cs.c,
                padding: "4px 8px",
                fontSize: "0.68rem",
                fontWeight: 700,
                fontFamily: "monospace",
                position: "relative",
              }}
            >
              {isPeak && (
                <span
                  style={{
                    position: "absolute",
                    top: -8,
                    right: -4,
                    fontSize: "0.65rem",
                  }}
                >
                  ⚡
                </span>
              )}
              {isFlatline && (
                <span
                  style={{
                    position: "absolute",
                    top: -8,
                    right: -4,
                    fontSize: "0.65rem",
                  }}
                >
                  💤
                </span>
              )}
              {s.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Second Reader mockup — mirrors real SecondReaderPanel ActiveReader ───────
function SecondReaderMockup() {
  // Mirrors .sr-reaction-card with border-left: 3px solid #6366f1
  const ReactionCard = ({ para, sentiment, text, severity, status }) => {
    const borderColor =
      severity === "critical"
        ? "#ef4444"
        : severity === "warning"
          ? "#f59e0b"
          : "#6366f1";
    const isResolved = status === "fixed" || status === "ignored";
    return (
      <div
        style={{
          padding: "10px 12px",
          borderRadius: 6,
          background: "var(--color-surface, #fff)",
          borderLeft: `3px solid ${borderColor}`,
          opacity: isResolved ? 0.4 : 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* .sr-reaction-meta */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 5,
          }}
        >
          <span
            style={{
              fontSize: "0.68rem",
              color: "var(--color-text-muted, #B6BCCB)",
              fontFamily: "monospace",
            }}
          >
            ¶{para}
          </span>
          <span style={{ fontSize: "0.85rem" }}>{sentiment}</span>
        </div>
        {/* .sr-reaction-text */}
        <p
          style={{
            fontSize: "0.82rem",
            color: "var(--color-text, #1E1F25)",
            lineHeight: 1.5,
            margin: 0,
          }}
        >
          {text}
        </p>
        {/* .sr-reaction-actions */}
        {!isResolved && (
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            <button
              style={{
                fontSize: "0.72rem",
                background: "transparent",
                border: "1px solid var(--color-surface-border, #D1D5DB)",
                borderRadius: 4,
                padding: "2px 8px",
                cursor: "default",
                color: "var(--color-text-secondary, #5F667A)",
                fontFamily: "inherit",
              }}
            >
              Fix with AI →
            </button>
            <button
              style={{
                fontSize: "0.72rem",
                background: "transparent",
                border: "1px solid var(--color-surface-border, #D1D5DB)",
                borderRadius: 4,
                padding: "2px 8px",
                cursor: "default",
                color: "var(--color-text-secondary, #5F667A)",
                fontFamily: "inherit",
              }}
            >
              Ignore
            </button>
          </div>
        )}
        {status === "fixed" && (
          <p
            style={{
              fontSize: "0.68rem",
              color: "var(--color-text-muted, #B6BCCB)",
              margin: "6px 0 0",
              fontStyle: "italic",
            }}
          >
            ✓ Sent to AI for fixing
          </p>
        )}
        {status === "ignored" && (
          <p
            style={{
              fontSize: "0.68rem",
              color: "var(--color-text-muted, #B6BCCB)",
              margin: "6px 0 0",
              fontStyle: "italic",
            }}
          >
            Marked as read
          </p>
        )}
      </div>
    );
  };

  return (
    // Mirrors .border-all .round-corner-l .bg-main-c — the ActiveReader container
    <div
      className="lp-sr-mock-root"
      style={{
        border: "1px solid var(--color-divider, #D1D5DB)",
        borderRadius: 12,
        background: "var(--color-primary-bg, #F5F6F8)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Top header bar — matches ActiveReader header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 14px",
          borderBottom: "1px solid var(--color-surface-border, #D1D5DB)",
          flexShrink: 0,
        }}
      >
        <h4
          style={{
            margin: 0,
            fontSize: "1rem",
            fontWeight: 700,
            color: "var(--color-primary-text, #1E1F25)",
          }}
        >
          Second reader
        </h4>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {/* Clear button — sr-switch-btn red variant */}
          <button
            style={{
              background: "rgba(229,57,53,0.15)",
              border: "1px solid rgba(229,57,53,0.15)",
              borderRadius: 4,
              padding: "2px 8px",
              fontSize: "0.72rem",
              color: "#E53935",
              cursor: "default",
              fontFamily: "inherit",
            }}
          >
            Clear
          </button>
          {/* reduce icon placeholder */}
          <div
            style={{
              width: 16,
              height: 16,
              borderRadius: 3,
              border: "1.5px solid var(--color-text-muted, #B6BCCB)",
              cursor: "default",
            }}
          />
          {/* close */}
          <div
            style={{
              width: 16,
              height: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "default",
              color: "var(--color-text-muted, #B6BCCB)",
              fontSize: "0.9rem",
            }}
          >
            ✕
          </div>
        </div>
      </div>

      {/* .sr-reactions scrollable list */}
      <div
        style={{
          padding: 12,
          display: "flex",
          flexDirection: "column",
          gap: 10,
          flex: 1,
        }}
      >
        <ReactionCard
          para={2}
          sentiment="👎"
          severity="critical"
          text="This claim needs a source. Readers won't take it on faith alone."
        />
        <ReactionCard
          para={4}
          sentiment="💬"
          severity="warning"
          text="The transition from section 3 to 4 feels abrupt. Consider a bridging sentence."
        />
        <ReactionCard
          para={1}
          sentiment="👍"
          text="Strong opening hook. Works well."
          status="fixed"
        />
      </div>

      {/* .sr-active-footer — persona card pinned at bottom with avatar overflowing up */}
      <div
        style={{
          flexShrink: 0,
          position: "relative",
          paddingTop: 32,
          borderTop: "1px solid var(--color-surface-border, #D1D5DB)",
          background: "var(--color-surface, #fff)",
        }}
      >
        {/* .sr-active-avatar-wrap: position absolute top -30px */}
        <div style={{ position: "absolute", top: -30, left: 16, zIndex: 1 }}>
          <div
            style={{
              width: 58,
              height: 58,
              borderRadius: "50%",
              border: "2px solid var(--color-surface-border, #D1D5DB)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
              background: "linear-gradient(135deg, #F75816 0%, #8b5cf6 100%)",
              backgroundImage: `url(https://yakihonne.s3.ap-east-1.amazonaws.com/media/images/Layla.png`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
        </div>
        {/* .sr-active-footer-body */}
        <div style={{ padding: "0 16px 16px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.92rem",
                    fontWeight: 700,
                    color: "var(--color-primary-text, #1E1F25)",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  Layla
                </p>
                <span
                  style={{
                    fontSize: "0.65rem",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    color: "#9A9A9A",
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "#6366f1",
                      display: "inline-block",
                    }}
                  />
                  Reading…
                </span>
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: "0.75rem",
                  color: "#6366f1",
                  fontWeight: 500,
                }}
              >
                The Skeptic Reader
              </p>
              <p
                style={{
                  margin: "2px 0 0",
                  fontSize: "0.72rem",
                  color: "var(--color-text-muted, #B6BCCB)",
                }}
              >
                Critical reader, demands sources
              </p>
            </div>
            {/* .sr-switch-btn */}
            <button
              style={{
                background: "rgba(247,88,22,0.15)",
                border: "1px solid rgba(247,88,22,0.15)",
                borderRadius: 4,
                padding: "2px 8px",
                fontSize: "0.72rem",
                cursor: "default",
                color: "#F75816",
                fontFamily: "inherit",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              Switch
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Monetization mockup — mirrors ArticlePublishModalV2 + SubscribersList ────
function MonetizationMockup() {
  const subs = [
    { name: "Alex Kim", handle: "alex_k", color: "#F75816" },
    { name: "Marcus R.", handle: "m_rabbit", color: "#8b5cf6" },
    { name: "Satoshi N.", handle: "satoshi_n", color: "#2FBF71" },
    { name: "Jane Doe", handle: "jdoe_btc", color: "#F0B429" },
  ];

  return (
    <div
      className="lp-mono-mock-root"
      style={{ display: "flex", flexDirection: "column", gap: 16 }}
    >
      {/* Publish modal premium toggle — mirrors ArticlePublishModalV2 actions row */}
      <div
        style={{
          border: "1px solid var(--color-divider, #D1D5DB)",
          borderRadius: 12,
          background: "var(--color-surface, #fff)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "14px 16px",
            borderBottom: "1px solid var(--color-divider, #D1D5DB)",
          }}
        >
          <h4
            style={{
              margin: 0,
              fontWeight: 700,
              color: "var(--color-primary-text, #1E1F25)",
            }}
          >
            Publish article
          </h4>
          <p
            style={{ margin: "4px 0 0", fontSize: "0.82rem", color: "#9A9A9A" }}
          >
            <span style={{ color: "#F75816", fontWeight: 600 }}>1,240</span>{" "}
            words &nbsp;~&nbsp;
            <span style={{ color: "#F75816", fontWeight: 600 }}>6</span> min
            read
          </p>
        </div>
        {/* mirrors .fx-scattered .box-pad-h-m bottom row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px",
            borderTop: "1px solid var(--color-divider, #D1D5DB)",
          }}
        >
          {/* crown + Premium content + Toggle — matches actual layout */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              border: "1px solid var(--color-divider, #D1D5DB)",
              borderRadius: 8,
              padding: "6px 10px",
            }}
          >
            <span style={{ fontSize: "1rem" }}>♛</span>
            <span
              style={{
                fontSize: "0.82rem",
                color: "var(--color-primary-text, #1E1F25)",
              }}
            >
              Premium content
            </span>
            {/* Toggle on */}
            <div
              style={{
                width: 32,
                height: 18,
                borderRadius: 9999,
                background: "#F75816",
                position: "relative",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  right: 3,
                  top: 3,
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  background: "#fff",
                }}
              />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              style={{
                padding: "7px 16px",
                borderRadius: 6,
                border: "1px solid var(--color-divider, #D1D5DB)",
                background: "transparent",
                color: "var(--color-text-secondary, #5F667A)",
                fontSize: "0.82rem",
                fontWeight: 600,
                cursor: "default",
                fontFamily: "inherit",
              }}
            >
              Save draft
            </button>
            <button
              style={{
                padding: "7px 16px",
                borderRadius: 6,
                border: "none",
                background: "#F75816",
                color: "#fff",
                fontSize: "0.82rem",
                fontWeight: 600,
                cursor: "default",
                fontFamily: "inherit",
              }}
            >
              Publish
            </button>
          </div>
        </div>
      </div>

      {/* Subscribers list — mirrors SubscribersList SubscriberRow */}
      <div
        style={{
          border: "1px solid var(--color-divider, #D1D5DB)",
          borderRadius: 12,
          background: "var(--color-surface, #fff)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "12px 16px",
            borderBottom: "1px solid var(--color-divider, #D1D5DB)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <h4
            style={{
              margin: 0,
              fontWeight: 700,
              fontSize: "1rem",
              color: "var(--color-primary-text, #1E1F25)",
            }}
          >
            Subscriber Management
          </h4>
          <button
            style={{
              padding: "5px 12px",
              borderRadius: 6,
              border: "none",
              background: "#F75816",
              color: "#fff",
              fontSize: "0.75rem",
              fontWeight: 700,
              cursor: "default",
              display: "flex",
              alignItems: "center",
              gap: 5,
              fontFamily: "inherit",
            }}
          >
            + Add subscriber
          </button>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            padding: "8px 12px",
            gap: 6,
          }}
        >
          {subs.map((s) => (
            // mirrors .fit-container .round-corner-m .border-all .box-pad-h-m .box-pad-v-s .fx-scattered
            <div
              key={s.handle}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                border: "1px solid var(--color-divider, #D1D5DB)",
                borderRadius: 8,
                padding: "8px 12px",
                background: "var(--color-primary-bg, #F5F6F8)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {/* avatar — mirrors bg-cover circle with picture */}
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: "50%",
                    background: s.color,
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: "0.82rem",
                  }}
                >
                  {s.name[0]}
                </div>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 0 }}
                >
                  <p
                    style={{
                      margin: 0,
                      fontWeight: 700,
                      fontSize: "0.875rem",
                      color: "var(--color-primary-text, #1E1F25)",
                    }}
                  >
                    {s.name}
                  </p>
                  <p
                    style={{ margin: 0, fontSize: "0.75rem", color: "#9A9A9A" }}
                  >
                    @{s.handle}
                  </p>
                </div>
              </div>
              {/* trash icon placeholder */}
              <span
                style={{
                  fontSize: "0.8rem",
                  color: "#B6BCCB",
                  cursor: "default",
                }}
              >
                🗑
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function LandingHome() {
  useReveal();

  return (
    <div className="lp-root">
      <Nav />

      {/* ══ 1. Hero ══════════════════════════════════════════════════════════ */}
      <section className="lp-hero">
        <HeroCanvas />
        {/* Glow under hero content */}
        <div
          style={{
            position: "absolute",
            bottom: -80,
            left: "50%",
            transform: "translateX(-50%)",
            width: 700,
            height: 400,
            background:
              "radial-gradient(ellipse at 50% 100%, rgba(247,88,22,0.14) 0%, transparent 65%)",
            pointerEvents: "none",
          }}
        />

        <div
          style={{
            position: "relative",
            zIndex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div className="lp-hero-pill-row">
            <span className="lp-pill">✦ Built on Nostr</span>
            <span className="lp-pill-white lp-pill">
              ⚡ Powered by Bitcoin Lightning
            </span>
          </div>

          <h1 className="lp-hero-title">
            Your writing.
            <br />
            <em>Your keys.</em>
            <br />
            Your audience.
          </h1>

          <p className="lp-hero-sub">
            Publish articles and notes on a decentralized protocol. Earn in
            sats. Get AI feedback before anyone else reads it. No algorithm. No
            middleman.
          </p>

          <div className="lp-hero-actions">
            <Link
              href="/create-content"
              className="lp-btn lp-btn-primary lp-btn-lg"
            >
              Start writing free
            </Link>
            <Link href="/pricing" className="lp-btn lp-btn-outline lp-btn-lg">
              View pricing
            </Link>
          </div>

          <div className="lp-hero-proof">
            {[
              "No lock-in",
              "Censorship-resistant",
              "Lightning payments",
              "Relay-redundant",
            ].map((t) => (
              <span key={t} className="lp-hero-proof-item">
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* Hero mockup */}
        <div className="lp-hero-mockup-wrap">
          <EditorMockup />
        </div>
      </section>

      {/* ══ Feature ticker ════════════════════════════════════════════════════ */}
      <Ticker />

      {/* ══ 2. Analytics ══════════════════════════════════════════════════════ */}
      <section
        id="analytics"
        className="lp-section"
        style={{ background: "#0D1117" }}
      >
        {/* Indigo glow top-right */}
        <div
          className="lp-glow-indigo"
          style={{ width: 500, height: 500, top: -100, right: -100 }}
        />
        <div className="lp-section-inner">
          <div className="lp-feature-row">
            <div className="lp-feature-copy">
              <div className="lp-reveal">
                <span className="lp-section-label">Creator Analytics</span>
                <h2 className="lp-section-title" style={{ color: "#E6EDF3" }}>
                  Know your audience.
                  <br />
                  Track what lands.
                </h2>
                <p className="lp-section-sub">
                  Real-time sync from Nostr relays. See reactions, zaps, and
                  follower growth across configurable time windows. Click any
                  bar to drill into which article or note drove that spike.
                </p>
              </div>
              <ul className="lp-feature-list lp-reveal lp-reveal-delay-1">
                {[
                  "Up to 3 years of history on Pro",
                  "Click any bar to see the exact note or article",
                  "Zaps, reactions, reposts — all in one view",
                  "Live event feed syncing from your relays",
                  "3-month view on Creator plan",
                ].map((item) => (
                  <li key={item}>
                    <span className="check">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="lp-reveal lp-reveal-delay-2">
              <AnalyticsMockup />
            </div>
          </div>
        </div>
      </section>

      <div className="lp-divider-line" />

      {/* ══ 3. AI Writing Assistant ═══════════════════════════════════════════ */}
      <section
        id="ai-tools"
        className="lp-section"
        style={{ background: "#0D1117" }}
      >
        <div
          className="lp-glow-orange"
          style={{ width: 500, height: 500, bottom: -100, right: -80 }}
        />
        <div className="lp-section-inner">
          <div className="lp-feature-row flip">
            <div className="lp-feature-copy">
              <div className="lp-reveal">
                <span className="lp-section-label">AI Writing Assistant</span>
                <h2 className="lp-section-title" style={{ color: "#E6EDF3" }}>
                  An AI that rewrites with you,
                  <br />
                  not over you.
                </h2>
                <p className="lp-section-sub">
                  Ask the AI to improve any section. It proposes a diff inline —
                  every removed line in red, every addition in green. You accept
                  or reject each change individually. Nothing changes without
                  your approval.
                </p>
              </div>
              <div className="lp-feature-tags lp-reveal lp-reveal-delay-1">
                <span className="lp-pill">Inline diff viewer</span>
                <span className="lp-pill-indigo lp-pill">
                  Accept / Reject per change
                </span>
                <span className="lp-pill-green lp-pill">
                  Context-aware rewrites
                </span>
              </div>
              <ul className="lp-feature-list lp-reveal lp-reveal-delay-2">
                {[
                  "Pro plan exclusive feature",
                  "Chat history persisted across sessions",
                  "Propose full-article or paragraph rewrites",
                  "AI sees your full article as context",
                ].map((item) => (
                  <li key={item}>
                    <span className="check">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="lp-reveal lp-reveal-delay-1">
              <EditorMockup />
            </div>
          </div>
        </div>
      </section>

      <div className="lp-divider-line" />

      {/* ══ 4. Second Reader ══════════════════════════════════════════════════ */}
      <section className="lp-section" style={{ background: "#0D1117" }}>
        <div
          className="lp-glow-indigo"
          style={{ width: 480, height: 480, bottom: -80, left: -80 }}
        />
        <div className="lp-section-inner">
          <div className="lp-feature-row">
            <div className="lp-feature-copy">
              <div className="lp-reveal">
                <span className="lp-section-label">Second Reader AI</span>
                <h2 className="lp-section-title" style={{ color: "#E6EDF3" }}>
                  A reader who gives feedback
                  <br />
                  before anyone else does.
                </h2>
                <p className="lp-section-sub">
                  Choose a persona — skeptic, editor, casual reader, investor,
                  or viral strategist — and get paragraph-level reactions as you
                  write. Each note points to the exact paragraph that needs
                  work.
                </p>
              </div>
              <div className="lp-feature-tags lp-reveal lp-reveal-delay-1">
                <span className="lp-pill">5 distinct personas</span>
                <span className="lp-pill-indigo lp-pill">
                  Per-paragraph reactions
                </span>
                <span className="lp-pill-green lp-pill">
                  Fix with AI in one click
                </span>
              </div>
              <ul className="lp-feature-list lp-reveal lp-reveal-delay-2">
                {[
                  "Pro plan exclusive feature",
                  "Reactions persist across sessions",
                  "Live re-analysis as you edit",
                  "Send any reaction directly to AI chat",
                  "Clear or switch personas anytime",
                ].map((item) => (
                  <li key={item}>
                    <span className="check">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="lp-reveal lp-reveal-delay-2">
              <SecondReaderMockup />
            </div>
          </div>
        </div>
      </section>

      <div className="lp-divider-line" />

      {/* ══ 4c. Energy Mapper ════════════════════════════════════════════════ */}
      <section className="lp-section" style={{ background: "#0D1117" }}>
        <div
          className="lp-glow-orange"
          style={{ width: 420, height: 420, top: -80, right: -60 }}
        />
        <div className="lp-section-inner">
          <div className="lp-feature-row flip">
            <div className="lp-feature-copy">
              <div className="lp-reveal">
                <span className="lp-section-label">Energy Mapper</span>
                <h2 className="lp-section-title" style={{ color: "#E6EDF3" }}>
                  See the emotional arc
                  <br />
                  of every note.
                </h2>
                <p className="lp-section-sub">
                  One click maps the emotional energy of each sentence in your
                  note — high energy, flat spots, and peak moments — as an
                  interactive sparkline graph. Know where your note loses
                  momentum before your readers do.
                </p>
              </div>
              <div className="lp-feature-tags lp-reveal lp-reveal-delay-1">
                <span className="lp-pill">Per-sentence energy score</span>
                <span className="lp-pill-green lp-pill">
                  Peak & flatline detection
                </span>
                <span className="lp-pill-indigo lp-pill">
                  Pro plan exclusive
                </span>
              </div>
              <ul className="lp-feature-list lp-reveal lp-reveal-delay-2">
                {[
                  "Sparkline chart with color-coded brackets",
                  "Green · Amber · Red energy levels per sentence",
                  "Hover any sentence chip for the full text & reason",
                  "Peak sentence and flatlines flagged automatically",
                  "Re-run anytime as you edit your note",
                ].map((item) => (
                  <li key={item}>
                    <span className="check">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="lp-reveal lp-reveal-delay-2">
              <EnergyMapperMockup />
            </div>
          </div>
        </div>
      </section>

      <div className="lp-divider-line" />

      {/* ══ 5. Monetization ═══════════════════════════════════════════════════ */}
      <section
        id="monetize"
        className="lp-section"
        style={{ background: "#0D1117" }}
      >
        <div
          className="lp-glow-orange"
          style={{
            width: 600,
            height: 400,
            top: "50%",
            right: -120,
            transform: "translateY(-50%)",
          }}
        />
        <div className="lp-section-inner">
          <div className="lp-feature-row flip">
            <div className="lp-feature-copy">
              <div className="lp-reveal">
                <span className="lp-section-label">Monetization</span>
                <h2 className="lp-section-title" style={{ color: "#E6EDF3" }}>
                  Publish premium.
                  <br />
                  Earn in sats.
                </h2>
                <p className="lp-section-sub">
                  Gate content to paying subscribers. Accept Lightning payments
                  directly. Manage your subscriber list without a middleman —
                  available on both Creator and Pro plans.
                </p>
              </div>
              <ul className="lp-feature-list lp-reveal lp-reveal-delay-1">
                {[
                  "Available on Creator and Pro plans",
                  "Gate articles with NIP-63 premium flag",
                  "Add / remove subscribers directly",
                  "No platform commission — ever",
                  "Lightning payments go straight to you",
                ].map((item) => (
                  <li key={item}>
                    <span className="check">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="lp-reveal lp-reveal-delay-2">
              <MonetizationMockup />
            </div>
          </div>
        </div>
      </section>

      <div className="lp-divider-line" />

      {/* ══ 6. Nostr Identity ═════════════════════════════════════════════════ */}
      <section className="lp-nostr-section lp-section">
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%,-50%)",
            width: 700,
            height: 400,
            background:
              "radial-gradient(ellipse at center, rgba(105,123,216,0.1) 0%, transparent 65%)",
            pointerEvents: "none",
          }}
        />
        <div className="lp-nostr-inner">
          <span className="lp-pill lp-pill-indigo lp-reveal">
            🔑 Nostr-native
          </span>
          <h2
            className="lp-section-title lp-reveal lp-reveal-delay-1"
            style={{ color: "#E6EDF3", textAlign: "center" }}
          >
            Your content lives on the protocol,
            <br />
            not on our servers.
          </h2>
          <p
            className="lp-section-sub lp-reveal lp-reveal-delay-2"
            style={{ textAlign: "center" }}
          >
            Every article is a signed Nostr event stored across relays you
            choose. Portable, verifiable, and impossible to deplatform.
          </p>
          <div className="lp-code-pill lp-reveal lp-reveal-delay-2">
            naddr1qqxnzdesxqmnxvpex5unsvfkqgsph3c2q9yt8uckmgelu0yf7glruudvfluesqn7cuab78a2k99dahrqxpqqqp65w…
          </div>
          <div className="lp-nostr-points lp-reveal lp-reveal-delay-3">
            <div className="lp-nostr-point">
              <div className="lp-nostr-point-icon">🔑</div>
              <h4>Portable identity</h4>
              <p>
                Your npub is your login. Take your content anywhere that speaks
                Nostr.
              </p>
            </div>
            <div className="lp-nostr-point">
              <div className="lp-nostr-point-icon">🛡️</div>
              <h4>Censorship-resistant</h4>
              <p>
                No bans, no takedowns. Your signed events live on relays you
                control.
              </p>
            </div>
            <div className="lp-nostr-point">
              <div className="lp-nostr-point-icon">🌐</div>
              <h4>Relay-redundant</h4>
              <p>
                Publish to multiple relays simultaneously. No single point of
                failure.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ══ 7. Footer CTA ═════════════════════════════════════════════════════ */}
      <section className="lp-footer-cta">
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%,-50%)",
            width: 700,
            height: 350,
            background:
              "radial-gradient(ellipse at center, rgba(247,88,22,0.14) 0%, transparent 65%)",
            pointerEvents: "none",
          }}
        />
        <div className="lp-footer-cta-inner">
          <h2
            className="lp-reveal"
            style={{
              color: "#E6EDF3",
              fontSize: "clamp(2rem,5vw,3rem)",
              margin: 0,
              letterSpacing: "-0.03em",
              fontWeight: 900,
            }}
          >
            Ready to own
            <br />
            your writing?
          </h2>
          <p
            className="lp-reveal lp-reveal-delay-1"
            style={{ color: "rgba(139,148,158,0.8)", margin: 0 }}
          >
            Join writers publishing on Nostr and earning with Bitcoin Lightning.
          </p>
          <div
            className="lp-reveal lp-reveal-delay-2"
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            <Link
              href="/create-content"
              className="lp-btn lp-btn-primary lp-btn-lg"
            >
              Create your first article
            </Link>
            <Link href="/pricing" className="lp-btn lp-btn-outline lp-btn-lg">
              See pricing
            </Link>
          </div>
          <div className="lp-footer-links lp-reveal lp-reveal-delay-3">
            <Link href="/pricing" className="lp-footer-link">
              Pricing
            </Link>
            <a href="#" className="lp-footer-link">
              GitHub
            </a>
            <a href="#" className="lp-footer-link">
              Nostr
            </a>
            <a href="#" className="lp-footer-link">
              ⚡ Support
            </a>
          </div>
        </div>
      </section>

      {/* ══ Footer nav ════════════════════════════════════════════════════════ */}
      <footer className="lp-footer-nav">
        <div className="lp-footer-nav-inner">
          <span className="lp-footer-copy">
            © {new Date().getFullYear()} YakiPro. Built on Nostr.
          </span>
          <div className="lp-footer-nav-links">
            <Link href="/home" className="lp-footer-link">
              Home
            </Link>
            <Link href="/pricing" className="lp-footer-link">
              Pricing
            </Link>
            <a href="#" className="lp-footer-link">
              Privacy
            </a>
            <a href="#" className="lp-footer-link">
              Terms
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
