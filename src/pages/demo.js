import React, { useState } from "react";
import Head from "next/head";
import SubTourCard from "@/PagesComponents/SubManagement/SubTourCard";
import {
  ILLUSTRATION_STYLES,
  STYLE_KEYS,
} from "@/PagesComponents/SubManagement/tourIllustrations";
import { SLIDES } from "@/PagesComponents/SubManagement/tourSlides";

/**
 * Preview page for the Sub-management tour illustrations.
 *
 * Not linked from anywhere — it exists so the animated illustration styles can
 * be compared before one is wired into the real overlay.
 */
export default function DemoPage() {
  const [mode, setMode] = useState("grid");

  return (
    <>
      <Head>
        <meta name="robots" content="noindex, nofollow" />
        <title>Tour illustrations — demo</title>
      </Head>

      <div
        style={{
          minHeight: "100vh",
          background: "var(--color-primary-bg)",
          padding: "32px 24px 80px",
        }}
      >
        <div style={{ maxWidth: "1240px", margin: "0 auto" }}>
          <header className="fx-col" style={{ gap: ".4rem", marginBottom: "1.5rem" }}>
            <h1 style={{ margin: 0 }}>Sub-management tour</h1>
            <p className="p-secondary-c" style={{ margin: 0, maxWidth: "70ch" }}>
              Six slides that mirror the real Manage subs screen and the
              editors&rsquo; premium toggle. Inline SVG,
              animated on a loop, themed from the app&rsquo;s own CSS variables.
              Not wired into Manage subs yet.
            </p>
          </header>

          {/* Mode switch */}
          <div className="fx-centered fx-start-h" style={{ gap: ".5rem", marginBottom: "1.75rem" }}>
            {[
              { k: "grid", label: "All slides" },
              { k: "card", label: "Interactive card" },
            ].map((m) => (
              <button
                key={m.k}
                className={`btn btn-small ${mode === m.k ? "btn-normal" : "btn-gst"}`}
                onClick={() => setMode(m.k)}
              >
                {m.label}
              </button>
            ))}
          </div>

          {mode === "card" ? <CardMode /> : <GridMode />}
        </div>
      </div>
    </>
  );
}

/* Interactive: the card at the exact width the real Overlay will render it,
   inside the same glass sheet, so this is literally what the user will see. */
function CardMode() {
  return (
    <div className="fx-col" style={{ gap: "1rem", alignItems: "flex-start" }}>
      <p className="p-secondary-c" style={{ margin: 0, fontSize: ".82rem" }}>
        Shown at the real overlay width (560px) inside the same glass sheet the
        Overlay component uses.
      </p>
      {STYLE_KEYS.map((key) => (
        <div
          key={key}
          style={{
            width: "min(100%, 560px)",
            background: "rgba(20,20,20,0.7)",
            boxShadow:
              "0 0 0 1px rgba(255,255,255,0.12), 0 4px 6px rgba(0,0,0,0.25), 0 12px 24px rgba(0,0,0,0.4), 0 32px 48px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderRadius: "20px",
            padding: "20px 20px 20px",
            // Told to the card so the illustration can bleed past this padding.
            "--tour-pad-x": "20px",
            "--tour-pad-top": "20px",
            "--tour-sheet-radius": "20px",
            overflow: "hidden",
          }}
        >
          <SubTourCard styleKey={key} onDone={() => {}} onSkip={() => {}} />
        </div>
      ))}
    </div>
  );
}

/* Grid: every slide of every style at once, for scanning consistency. */
function GridMode() {
  return (
    <div className="fx-col" style={{ gap: "2.5rem" }}>
      {STYLE_KEYS.map((key) => {
        const style = ILLUSTRATION_STYLES[key];
        return (
          <section key={key}>
            <StyleHeading k={key} />
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                gap: "1rem",
              }}
            >
              {SLIDES.map((s) => (
                <figure key={s.id} style={{ margin: 0 }}>
                  <div
                    style={{
                      aspectRatio: "16 / 9",
                      borderBottom: "1px solid var(--color-divider)",
                      overflow: "hidden",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "10px 0",
                    }}
                  >
                    {style.set[s.id]}
                  </div>
                  <figcaption
                    className="p-secondary-c"
                    style={{ fontSize: ".76rem", marginTop: ".5rem", lineHeight: 1.4 }}
                  >
                    <span style={{ color: "var(--color-primary-text)" }}>
                      {s.title}
                    </span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function StyleHeading({ k }) {
  const style = ILLUSTRATION_STYLES[k];
  return (
    <div
      className="fx-centered fx-start-h"
      style={{ gap: ".6rem", marginBottom: ".85rem", flexWrap: "wrap" }}
    >
      <span
        style={{
          fontSize: ".7rem",
          letterSpacing: ".08em",
          textTransform: "uppercase",
          color: "var(--color-primary-accent)",
          border: "1px solid var(--color-primary-accent)",
          borderRadius: "999px",
          padding: "2px 10px",
        }}
      >
        {k}
      </span>
      <strong style={{ fontSize: ".95rem" }}>{style.label}</strong>
      <span className="p-secondary-c" style={{ fontSize: ".82rem" }}>
        {style.hint}
      </span>
    </div>
  );
}
