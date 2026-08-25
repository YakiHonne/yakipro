import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import BrandIcon from "@/Components/Icon";
import Icon from "@/Components/LucideIcon";
import MobileDemo from "@/Components/MobileDemo";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
  const userKeys = useSelector((state) => state.userKeys);
  const isConnected = useSelector((state) => state.isConnected);
  const authed = !!(userKeys || isConnected);
  const [showDemo, setShowDemo] = useState(false);

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
          <BrandIcon
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
          {t("ALPg007")}
        </a>
        <a href="#ai-tools" className="lp-nav-link">
          {t("ALPg008")}
        </a>
        <a href="#monetize" className="lp-nav-link">
          {t("ALPg009")}
        </a>
        <Link href="/pricing" className="lp-nav-link">
          {t("ALog013")}
        </Link>
        <button
          type="button"
          className="lp-nav-link lp-nav-link-btn"
          onClick={() => setShowDemo(true)}
        >
          {t("AMob001")}
        </button>
      </div>
      <div className="lp-nav-actions">
        <button
          type="button"
          className="lp-nav-link lp-nav-link-btn lp-nav-download-compact"
          onClick={() => setShowDemo(true)}
        >
          {t("AMob001")}
        </button>
        <Link
          href={authed ? "/home" : "/login"}
          className="lp-btn lp-btn-outline lp-btn-sm"
        >
          {authed ? t("ALPg011") : t("ALPg010")}
        </Link>
        <Link
          href="/create-content"
          className="lp-btn lp-btn-primary lp-btn-sm"
        >
          {t("ALPg012")}
        </Link>
      </div>
      {showDemo && <MobileDemo exit={() => setShowDemo(false)} />}
    </nav>
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
        <div className="lp-browser-url">pro.yakihonne.com/create-content</div>
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
                display: "flex",
                alignItems: "center",
                gap: 4,
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
              <Icon name="check" v={2} size={10} className="lp-icon-white" />
              Accept all
            </button>
            <button
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
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
              <Icon name="close_md" v={2} size={10} />
              Reject all
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
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
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
                <Icon name="check" v={2} size={11} className="lp-icon-white" />
                Accept
              </button>
              <button
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
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
                <Icon name="close_md" v={2} size={11} />
                Reject
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

      <div
        style={{
          padding: "16px 20px",
          border: "1px solid var(--color-divider, #D1D5DB)",
          borderRadius: 12,
          background: "var(--color-surface, #fff)",
        }}
      >
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
            88 likes
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
            14 reposts
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
            42,100 sats
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Second Reader mockup — mirrors real SecondReaderPanel ActiveReader ───────
function SecondReaderMockup() {
  const ReactionCard = ({ para, text, severity, status }) => {
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
            Paragraph {para}
          </span>
        </div>
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
              Fix with AI
            </button>
            <button
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
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
              <Icon name="cancel" size={10} />
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
            Sent to AI for fixing
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
          <button
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
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
            <Icon name="trash" size={10} className="lp-icon-red" />
            Clear
          </button>
          <Icon name="cancel" size={14} opacity={0.5} />
        </div>
      </div>

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
          severity="critical"
          text="This claim needs a source. Readers won't take it on faith alone."
        />
        <ReactionCard
          para={4}
          severity="warning"
          text="The transition from section 3 to 4 feels abrupt. Consider a bridging sentence."
        />
        <ReactionCard
          para={1}
          text="Strong opening hook. Works well."
          status="fixed"
        />
      </div>

      <div
        style={{
          flexShrink: 0,
          position: "relative",
          paddingTop: 32,
          borderTop: "1px solid var(--color-surface-border, #D1D5DB)",
          background: "var(--color-surface, #fff)",
        }}
      >
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
        <Icon name="cancel" size={12} opacity={0.5} />
      </div>

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
              {s.label}
            </div>
          );
        })}
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
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px",
            borderTop: "1px solid var(--color-divider, #D1D5DB)",
          }}
        >
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
            <span
              style={{
                fontSize: "0.82rem",
                color: "var(--color-primary-text, #1E1F25)",
              }}
            >
              Premium content
            </span>
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
            Add subscriber
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
              <Icon name="trash" size={14} opacity={0.5} />
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
  const { t } = useTranslation();

  return (
    <div className="lp-root">
      <Nav />

      {/* ══ 1. Hero ══════════════════════════════════════════════════════════ */}
      <section className="lp-hero">
        <HeroCanvas />

        <div
          style={{
            position: "relative",
            zIndex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <h1 className="lp-hero-title">
            {t("ALPg001")}
            <br />
            <em>{t("ALPg002")}</em>
            <br />
            {t("ALPg003")}
          </h1>

          <p className="lp-hero-sub">{t("ALPg004")}</p>

          <div className="lp-hero-actions">
            <Link
              href="/create-content"
              className="lp-btn lp-btn-primary lp-btn-lg"
            >
              {t("ALPg005")}
            </Link>
            <Link href="/pricing" className="lp-btn lp-btn-outline lp-btn-lg">
              {t("ALPg006")}
            </Link>
          </div>
        </div>

        {/* Hero mockup */}
        <div className="lp-hero-mockup-wrap">
          <EditorMockup />
        </div>
      </section>

      {/* ══ 2. Analytics ══════════════════════════════════════════════════════ */}
      <section id="analytics" className="lp-section">
        <div className="lp-section-inner">
          <div className="lp-feature-row">
            <div className="lp-feature-copy">
              <div className="lp-reveal">
                <span className="lp-section-label">{t("ALPg013")}</span>
                <h2 className="lp-section-title">{t("ALPg014")}</h2>
                <p className="lp-section-sub">{t("ALPg015")}</p>
              </div>
              <ul className="lp-feature-list lp-reveal lp-reveal-delay-1">
                {[
                  t("ALPg016"),
                  t("ALPg017"),
                  t("ALPg018"),
                  t("ALPg019"),
                  t("ALPg020"),
                ].map((item) => (
                  <li key={item}>{item}</li>
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
      <section id="ai-tools" className="lp-section">
        <div className="lp-section-inner">
          <div className="lp-feature-row flip">
            <div className="lp-feature-copy">
              <div className="lp-reveal">
                <span className="lp-section-label">{t("ALPg021")}</span>
                <h2 className="lp-section-title">{t("ALPg022")}</h2>
                <p className="lp-section-sub">{t("ALPg023")}</p>
              </div>
              <ul className="lp-feature-list lp-reveal lp-reveal-delay-2">
                {[
                  t("ALPg024"),
                  t("ALPg025"),
                  t("ALPg026"),
                  t("ALPg027"),
                ].map((item) => (
                  <li key={item}>{item}</li>
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
      <section className="lp-section">
        <div className="lp-section-inner">
          <div className="lp-feature-row">
            <div className="lp-feature-copy">
              <div className="lp-reveal">
                <span className="lp-section-label">{t("ALPg028")}</span>
                <h2 className="lp-section-title">{t("ALPg029")}</h2>
                <p className="lp-section-sub">{t("ALPg030")}</p>
              </div>
              <ul className="lp-feature-list lp-reveal lp-reveal-delay-2">
                {[
                  t("ALPg024"),
                  t("ALPg031"),
                  t("ALPg032"),
                  t("ALPg033"),
                  t("ALPg034"),
                ].map((item) => (
                  <li key={item}>{item}</li>
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
      <section className="lp-section">
        <div className="lp-section-inner">
          <div className="lp-feature-row flip">
            <div className="lp-feature-copy">
              <div className="lp-reveal">
                <span className="lp-section-label">{t("ALPg035")}</span>
                <h2 className="lp-section-title">{t("ALPg036")}</h2>
                <p className="lp-section-sub">{t("ALPg037")}</p>
              </div>
              <ul className="lp-feature-list lp-reveal lp-reveal-delay-2">
                {[
                  t("ALPg038"),
                  t("ALPg039"),
                  t("ALPg040"),
                  t("ALPg041"),
                  t("ALPg042"),
                ].map((item) => (
                  <li key={item}>{item}</li>
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
      <section id="monetize" className="lp-section">
        <div className="lp-section-inner">
          <div className="lp-feature-row flip">
            <div className="lp-feature-copy">
              <div className="lp-reveal">
                <span className="lp-section-label">{t("ALPg043")}</span>
                <h2 className="lp-section-title">{t("ALPg044")}</h2>
                <p className="lp-section-sub">{t("ALPg045")}</p>
              </div>
              <ul className="lp-feature-list lp-reveal lp-reveal-delay-1">
                {[
                  t("ALPg046"),
                  t("ALPg047"),
                  t("ALPg048"),
                  t("ALPg049"),
                  t("ALPg050"),
                ].map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="lp-reveal lp-reveal-delay-2">
              <MonetizationMockup />
            </div>
          </div>
        </div>
      </section>

      {/* ══ Footer nav ════════════════════════════════════════════════════════ */}
      <footer className="lp-footer-nav">
        <div className="lp-footer-nav-inner">
          <span className="lp-footer-copy">
            © {new Date().getFullYear()} YakiPro.
          </span>
          <div className="lp-footer-nav-links">
            <Link href="/home" className="lp-footer-link">
              {t("ALPg051")}
            </Link>
            <Link href="/pricing" className="lp-footer-link">
              {t("ALog013")}
            </Link>
            <Link href="/privacy" className="lp-footer-link">
              {t("ALPg052")}
            </Link>
            <Link href="/terms" className="lp-footer-link">
              {t("ALPg053")}
            </Link>
            <Link href="/refund-policy" className="lp-footer-link">
              {t("Aby0Ea4")}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
