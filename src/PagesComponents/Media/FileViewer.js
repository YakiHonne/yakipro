import Overlay from "@/Components/Overlay";

function formatBytes(bytes) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(ts) {
  return new Date(ts * 1000).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function shortenHash(hash, len = 10) {
  if (!hash) return "—";
  return `${hash.slice(0, len)}…${hash.slice(-6)}`;
}

export default function FileViewer({ blob, exit }) {
  const type = blob.type || "";
  const blobType = type.startsWith("image/")
    ? "image"
    : type.startsWith("video/")
      ? "video"
      : "other";

  const download = () => {
    const a = document.createElement("a");
    a.href = blob.url;
    a.download = blob.sha256 || "file";
    a.click();
  };

  return (
    <Overlay exit={exit} width={800}>
      <div
        className="box-pad-h box-pad-v fx-centered fx-col fx-start-h"
        style={{ gap: "16px" }}
      >
        {/* Meta strip */}
        <div
          className="fit-container fx-scattered"
          style={{
            background: "var(--color-primary-bg-side)",
            borderRadius: "var(--radius-lg)",
            padding: "12px 18px",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div className="fx-centered fx-col" style={{ gap: "2px", alignItems: "flex-start" }}>
            <span className="p-secondary-c" style={{ fontSize: "0.75rem" }}>Type</span>
            <span style={{ fontSize: "0.88rem", fontWeight: 500 }}>{type || "—"}</span>
          </div>
          <div className="fx-centered fx-col" style={{ gap: "2px", alignItems: "flex-start" }}>
            <span className="p-secondary-c" style={{ fontSize: "0.75rem" }}>SHA-256</span>
            <span style={{ fontSize: "0.88rem", fontWeight: 500, fontFamily: "monospace" }}>
              {shortenHash(blob.sha256)}
            </span>
          </div>
          <div className="fx-centered fx-col" style={{ gap: "2px", alignItems: "flex-start" }}>
            <span className="p-secondary-c" style={{ fontSize: "0.75rem" }}>Uploaded</span>
            <span style={{ fontSize: "0.88rem", fontWeight: 500 }}>{formatDate(blob.uploaded)}</span>
          </div>
          <div className="fx-centered fx-col" style={{ gap: "2px", alignItems: "flex-start" }}>
            <span className="p-secondary-c" style={{ fontSize: "0.75rem" }}>Size</span>
            <span style={{ fontSize: "0.88rem", fontWeight: 500 }}>{formatBytes(blob.size)}</span>
          </div>
        </div>

        {/* Media */}
        {blobType === "video" && (
          <video
            controls
            src={blob.url}
            className="fit-container"
            style={{ aspectRatio: "16/9", borderRadius: "var(--radius-lg)", background: "#000" }}
          />
        )}
        {blobType === "image" && (
          <img
            src={blob.url}
            alt={blob.sha256}
            className="fit-container"
            style={{ aspectRatio: "16/9", objectFit: "contain", borderRadius: "var(--radius-lg)", background: "var(--color-primary-bg-side)" }}
          />
        )}
        {blobType === "other" && (
          <div
            className="fit-container fx-centered fx-col"
            style={{
              aspectRatio: "16/9",
              borderRadius: "var(--radius-lg)",
              background: "var(--color-primary-bg-side)",
              gap: "10px",
            }}
          >
            <span style={{ fontSize: "3.5rem" }}>📄</span>
            <span className="p-secondary-c" style={{ fontSize: "0.85rem" }}>{type || "Unknown file"}</span>
            <span style={{ fontSize: "0.78rem", fontFamily: "monospace", color: "var(--color-placeholder-text)" }}>
              {shortenHash(blob.url, 30)}
            </span>
          </div>
        )}

        {/* Download */}
        <button className="btn btn-normal fit-container" onClick={download}>
          Download
        </button>
      </div>
    </Overlay>
  );
}
