import React from "react";

function renderText(md) {
  if (!md) return "";
  return md
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`{3}[\s\S]*?`{3}/g, (m) => m)
    .replace(/`(.+?)`/g, "$1")
    .replace(/\[(.+?)\]\(.+?\)/g, "$1")
    .trim();
}

function ActionRow({ hunk, onAccept, onReject }) {
  if (hunk.status === "accepted") {
    return <p className="ai-diff-status-label">✓ Accepted</p>;
  }
  if (hunk.status === "rejected") {
    return <p className="ai-diff-status-label">✕ Rejected</p>;
  }
  const acceptLabel =
    hunk.type === "removed" ? "✓ Accept removal" : "✓ Accept";
  return (
    <div className="ai-diff-actions">
      <button
        className="ai-diff-btn ai-diff-btn-accept"
        onClick={() => onAccept(hunk.id)}
      >
        {acceptLabel}
      </button>
      <button
        className="ai-diff-btn ai-diff-btn-reject"
        onClick={() => onReject(hunk.id)}
      >
        ✕ Reject
      </button>
    </div>
  );
}

function HunkBlock({ hunk, onAccept, onReject }) {
  const resolved = hunk.status !== null;

  switch (hunk.type) {
    case "unchanged":
      return (
        <div className="ai-diff-block ai-diff-unchanged">
          {renderText(hunk.original)}
        </div>
      );

    case "removed":
      return (
        <div
          className={`ai-diff-block ai-diff-removed${resolved ? " ai-diff-resolved" : ""}`}
        >
          {renderText(hunk.original)}
          <ActionRow hunk={hunk} onAccept={onAccept} onReject={onReject} />
        </div>
      );

    case "added":
      return (
        <div
          className={`ai-diff-block ai-diff-added${resolved ? " ai-diff-resolved" : ""}`}
        >
          {renderText(hunk.proposed)}
          <ActionRow hunk={hunk} onAccept={onAccept} onReject={onReject} />
        </div>
      );

    case "changed":
      return (
        <>
          <div
            className={`ai-diff-block ai-diff-removed${resolved ? " ai-diff-resolved" : ""}`}
          >
            {renderText(hunk.original)}
          </div>
          <div
            className={`ai-diff-block ai-diff-added${resolved ? " ai-diff-resolved" : ""}`}
          >
            {renderText(hunk.proposed)}
            <ActionRow hunk={hunk} onAccept={onAccept} onReject={onReject} />
          </div>
        </>
      );

    default:
      return null;
  }
}

export default function AIDiffViewer({ hunks, onAccept, onReject }) {
  const pending = hunks.filter(
    (h) => h.type !== "unchanged" && h.status === null,
  ).length;

  const actionableIds = hunks
    .filter((h) => h.type !== "unchanged" && h.status === null)
    .map((h) => h.id);

  return (
    <div className="ai-diff-viewer">
      <div className="ai-diff-summary">
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span className="ai-spark">✦</span>
          <span>
            {pending > 0
              ? `${pending} change${pending === 1 ? "" : "s"} to review`
              : "All changes resolved"}
          </span>
        </div>
        {pending > 0 && (
          <div style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
            <button
              className="ai-diff-btn ai-diff-btn-accept"
              style={{ padding: "2px 10px", fontSize: "0.72rem" }}
              onClick={() => actionableIds.forEach((id) => onAccept(id))}
            >
              ✓ Accept all
            </button>
            <button
              className="ai-diff-btn ai-diff-btn-reject"
              style={{ padding: "2px 10px", fontSize: "0.72rem" }}
              onClick={() => actionableIds.forEach((id) => onReject(id))}
            >
              ✕ Reject all
            </button>
          </div>
        )}
      </div>

      {hunks.map((hunk) => (
        <HunkBlock
          key={hunk.id}
          hunk={hunk}
          onAccept={onAccept}
          onReject={onReject}
        />
      ))}
    </div>
  );
}
