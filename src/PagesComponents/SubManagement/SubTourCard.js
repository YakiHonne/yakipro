import React, { useCallback, useEffect, useMemo, useState } from "react";
import { SLIDES } from "./tourSlides";
import { ILLUSTRATION_STYLES, STYLE_KEYS } from "./tourIllustrations";

// Whatever style is defined first, so removing or renaming a style can never
// leave this pointing at a key that no longer exists.
const DEFAULT_STYLE = STYLE_KEYS[0];

/**
 * The tour card itself — illustration, title, body, dots, and the
 * Skip / Previous / Next controls. Rendered inside an Overlay in the app, and
 * bare on /demo so the styles can be compared side by side.
 */
export default function SubTourCard({
  styleKey = DEFAULT_STYLE,
  onDone,
  onSkip,
  compact = false,
}) {
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);
  const slides = SLIDES;
  const isLast = index === slides.length - 1;
  const isFirst = index === 0;

  const set =
    ILLUSTRATION_STYLES[styleKey]?.set || ILLUSTRATION_STYLES[DEFAULT_STYLE].set;
  const slide = slides[index];
  const art = set[slide.id];

  const next = useCallback(() => {
    setDir(1);
    if (isLast) onDone?.();
    else setIndex((i) => i + 1);
  }, [isLast, onDone]);

  const prev = useCallback(() => {
    setDir(-1);
    setIndex((i) => Math.max(0, i - 1));
  }, []);

  // Arrow keys and Escape, so the card is usable without the mouse.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "Escape") onSkip?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, onSkip]);

  const artKey = `${styleKey}-${slide.id}`;

  return (
    <div
      className="sub-tour-card fx-col fit-container"
      style={{ gap: compact ? ".9rem" : "1.15rem" }}
    >
      {/* Illustration — bleeds to the full width of the overlay sheet, with a
          single bottom rule separating it from the copy. The negative margins
          cancel the card's own padding, which the host sets on --tour-pad. */}
      <div
        style={{
          position: "relative",
          width: "auto",
          marginInline: "calc(var(--tour-pad-x, 0px) * -1)",
          marginTop: "calc(var(--tour-pad-top, 0px) * -1)",
          aspectRatio: "16 / 9",
          borderBottom: "1px solid var(--color-divider)",
          // Follows the sheet's own top corners, since it now sits flush in them.
          borderTopLeftRadius: "var(--tour-sheet-radius, 0px)",
          borderTopRightRadius: "var(--tour-sheet-radius, 0px)",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "14px 16px",
        }}
      >
        <div
          key={artKey}
          style={{
            width: "100%",
            height: "100%",
            animation: `tourArtIn .42s cubic-bezier(.22,1,.36,1) both`,
          }}
        >
          {art}
        </div>
      </div>

      {/* Dots */}
      <div className="fx-centered" style={{ gap: "6px" }}>
        {slides.map((s, i) => (
          <button
            key={s.id}
            aria-label={`Go to slide ${i + 1}`}
            onClick={() => {
              setDir(i > index ? 1 : -1);
              setIndex(i);
            }}
            style={{
              width: i === index ? "20px" : "6px",
              height: "6px",
              borderRadius: "999px",
              border: "none",
              padding: 0,
              cursor: "pointer",
              background:
                i === index
                  ? "var(--color-primary-accent)"
                  : "var(--color-divider)",
              transition: "width .28s cubic-bezier(.22,1,.36,1), background .2s",
            }}
          />
        ))}
      </div>

      {/* Copy */}
      <div
        key={`copy-${artKey}`}
        className="fx-col fx-centered"
        style={{
          gap: ".45rem",
          textAlign: "center",
          minHeight: compact ? "auto" : "62px",
          animation: `tourCopyIn .34s ease both`,
        }}
      >
        <h3 style={{ margin: 0, fontSize: compact ? ".98rem" : "1.08rem" }}>
          {slide.title}
        </h3>
        <p
          className="p-secondary-c"
          style={{
            margin: 0,
            fontSize: compact ? ".82rem" : ".88rem",
            lineHeight: 1.55,
            maxWidth: "46ch",
          }}
        >
          {slide.body}
        </p>
      </div>

      {/* Controls */}
      <div className="fit-container fx-scattered" style={{ gap: ".5rem" }}>
        <button
          className="btn btn-text-gray"
          onClick={onSkip}
          style={{ fontSize: ".85rem" }}
        >
          Skip
        </button>
        <div className="fx-centered" style={{ gap: ".5rem" }}>
          <button
            className={`btn btn-gst btn-small ${isFirst ? "btn-disabled" : ""}`}
            onClick={prev}
            disabled={isFirst}
          >
            Previous
          </button>
          <button className="btn btn-normal btn-small" onClick={next}>
            {isLast ? "Got it" : "Next"}
          </button>
        </div>
      </div>

    </div>
  );
}
