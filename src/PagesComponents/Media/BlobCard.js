import { useState } from "react";
import FileViewer from "./FileViewer";
import OpsModal from "./OpsModal";
import Button from "@/Components/UI/Button";

function formatBytes(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(ts) {
  return new Date(ts * 1000).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function copyText(text) {
  navigator.clipboard.writeText(text).catch(() => {});
}

function MediaPreview({ blob, style }) {
  const type = blob.type || "";
  if (type.startsWith("image/")) {
    return (
      <img
        src={blob.url}
        alt=""
        loading="lazy"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
          ...style,
        }}
      />
    );
  }
  if (type.startsWith("video/")) {
    return (
      <video
        src={blob.url}
        muted
        loop
        playsInline
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
          ...style,
        }}
      />
    );
  }
  return (
    <div
      className="fx-centered fx-col"
      style={{
        width: "100%",
        height: "100%",
        background: "var(--color-primary-bg-side2)",
        ...style,
      }}
    >
      <span style={{ fontSize: "2rem" }}>📄</span>
      <span
        className="p-secondary-c"
        style={{ fontSize: "0.7rem", marginTop: "4px" }}
      >
        {blob.type?.split("/")[1]?.toUpperCase() || "FILE"}
      </span>
    </div>
  );
}

export default function BlobCard({
  blob,
  servers,
  blossomColors,
  refreshLists,
}) {
  const [ops, setOps] = useState(null); // "mirror" | "delete" | null
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  const copy = (value, key) => {
    copyText(value);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

  const canMirror = blob.seen?.length < servers.length;

  return (
    <>
      {showPreview && (
        <FileViewer blob={blob} exit={() => setShowPreview(false)} />
      )}
      {ops && (
        <OpsModal
          ops={ops}
          blob={blob}
          servers={servers}
          blossomColors={blossomColors}
          refreshLists={refreshLists}
          exit={() => setOps(null)}
        />
      )}

      <div
        style={{
          background: "var(--color-surface, var(--color-primary-bg-side))",
          border: "1px solid var(--color-divider)",
          borderRadius: "var(--radius-lg)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          position: "relative",
        }}
      >
        {/* Thumbnail */}
        <div
          onClick={() => setShowPreview(true)}
          style={{
            height: "160px",
            position: "relative",
            overflow: "hidden",
            cursor: "pointer",
          }}
        >
          <MediaPreview blob={blob} />

          {/* Server dots */}
          <div
            style={{
              position: "absolute",
              bottom: "6px",
              left: "6px",
              display: "flex",
              gap: "4px",
            }}
          >
            {(blob.seen || []).map((serverIndex) => (
              <div
                key={serverIndex}
                title={servers[serverIndex]}
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: blossomColors[serverIndex] || "#aaa",
                  border: "1.5px solid rgba(255,255,255,0.8)",
                }}
              />
            ))}
          </div>

          {/* Video badge */}
          {blob.type?.startsWith("video/") && (
            <div
              style={{
                position: "absolute",
                top: "6px",
                right: "6px",
                background: "rgba(0,0,0,0.6)",
                color: "#fff",
                fontSize: "0.65rem",
                fontWeight: 700,
                padding: "2px 6px",
                borderRadius: "4px",
                letterSpacing: "0.04em",
              }}
            >
              VIDEO
            </div>
          )}
        </div>

        {/* Info row */}
        <div
          style={{
            padding: "10px 12px",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span className="p-secondary-c" style={{ fontSize: "0.75rem" }}>
              {formatDate(blob.uploaded)}
            </span>
            <span className="p-secondary-c" style={{ fontSize: "0.75rem" }}>
              {formatBytes(blob.size)}
            </span>
          </div>

          <span
            style={{
              fontSize: "0.7rem",
              color: "var(--color-placeholder-text)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {blob.sha256?.slice(0, 16)}…
          </span>
        </div>

        {/* Actions */}
        <div className="fit-container fx-scattered box-pad-h-s box-pad-v-s">
          <Button
            onClick={() => copy(blob.url, "url")}
            label={copied === "url" ? "Copied!" : "Copy URL"}
            size="s"
            rightIcon={"copy"}
            type="gray"
          />

          <div style={{ position: "relative" }}>
            <div onClick={() => setMenuOpen((v) => !v)}>•••</div>
            {menuOpen && (
              <div
                style={{
                  position: "absolute",
                  bottom: "calc(100% + 4px)",
                  right: 0,
                  background: "var(--color-primary-bg)",
                  border: "1px solid var(--color-divider)",
                  borderRadius: "var(--radius-md)",
                  boxShadow: "0 8px 24px var(--color-shadow-strong)",
                  zIndex: 10,
                  minWidth: "150px",
                  overflow: "hidden",
                }}
                onMouseLeave={() => setMenuOpen(false)}
              >
                {[
                  {
                    label: "Open",
                    action: () => {
                      setShowPreview(true);
                      setMenuOpen(false);
                    },
                  },
                  {
                    label: "Download",
                    action: () => {
                      const a = document.createElement("a");
                      a.href = blob.url;
                      a.download = blob.sha256;
                      a.click();
                    },
                  },
                  {
                    label: copied === "sha" ? "Copied!" : "Copy SHA-256",
                    action: () => copy(blob.sha256, "sha"),
                  },
                  ...(canMirror
                    ? [
                        {
                          label: "Mirror",
                          action: () => {
                            setOps("mirror");
                            setMenuOpen(false);
                          },
                        },
                      ]
                    : []),
                  {
                    label: "Delete",
                    action: () => {
                      setOps("delete");
                      setMenuOpen(false);
                    },
                    danger: true,
                  },
                ].map(({ label, action, danger }) => (
                  <button
                    key={label}
                    onClick={action}
                    style={{
                      display: "block",
                      width: "100%",
                      padding: "9px 14px",
                      textAlign: "left",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "0.83rem",
                      color: danger
                        ? "var(--color-red-main)"
                        : "var(--color-text)",
                      transition: "background 0.1s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background =
                        "var(--color-surface-hover)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "none")
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
