import React from "react";
import { getNoteTree } from "@/Components/NotePreview";

function formatDate(ts) {
  return new Date(ts * 1000).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function isPremium(tags) {
  if (!Array.isArray(tags)) return false;
  return tags.some((t) => Array.isArray(t) && t.includes("nip63"));
}

export default function NoteCard({ event }) {
  const premium = isPremium(event.tags);

  return (
    <div
      className="fit-container box-pad-h-m box-pad-v-m"
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-divider)",
        borderRadius: "var(--radius-lg)",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
      }}
    >
      <div
        className="fx-centered fx-start-h"
        style={{ gap: "8px", justifyContent: "space-between" }}
      >
        <span className="p-secondary-c" style={{ fontSize: "0.8rem" }}>
          {formatDate(event.created_at)}
        </span>
        {premium && (
          <span
            style={{
              fontSize: "0.7rem",
              fontWeight: 600,
              padding: "2px 10px",
              borderRadius: "var(--radius-full)",
              background: "var(--color-primary-accent)",
              color: "#fff",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            Premium
          </span>
        )}
      </div>

      <div
        style={{
          lineHeight: "1.6",
          wordBreak: "break-word",
          overflow: "hidden",
          display: "-webkit-box",
          WebkitLineClamp: 6,
          WebkitBoxOrient: "vertical",
        }}
        dir="auto"
      >
        {getNoteTree(event.content)}
      </div>
    </div>
  );
}
