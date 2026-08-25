import React from "react";
import Overlay from "@/Components/Overlay";
import SubTourCard from "./SubTourCard";

/**
 * The Sub-management tour, in the app's standard overlay.
 *
 * The padding lives here rather than on Overlay (which adds none) because the
 * card's illustration bleeds edge to edge: it cancels this padding through the
 * --tour-pad-* variables, and rounds its top corners to --tour-sheet-radius so
 * it sits flush inside the sheet's own corners.
 */
export default function SubTourOverlay({ onClose }) {
  return (
    <Overlay width={560} exit={onClose}>
      <div
        style={{
          padding: "20px",
          "--tour-pad-x": "20px",
          "--tour-pad-top": "20px",
          // Overlay drops its radius on mobile, where the sheet is full-bleed.
          "--tour-sheet-radius":
            typeof window !== "undefined" && window.innerWidth <= 800
              ? "0px"
              : "20px",
        }}
      >
        <SubTourCard onDone={onClose} onSkip={onClose} />
      </div>
    </Overlay>
  );
}
