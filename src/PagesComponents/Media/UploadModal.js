import Spinner from "@/Components/Spinner";
import Icon from "@/Components/LucideIcon";
import {
  generateAuthorizationHeaderForBlossomServer,
  getHashFromFile,
} from "@/Helpers/Helpers";
import axios from "axios";
import { useRef, useState } from "react";
import Overlay from "@/Components/Overlay";

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function UploadModal({ servers, refreshLists, exit }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [fileType, setFileType] = useState(null);
  const [selectedServers, setSelectedServers] = useState([]);
  const [progress, setProgress] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef(null);

  const handleFile = (f) => {
    if (!f) return;
    setFile(f);
    const url = URL.createObjectURL(f);
    setPreview(url);
    setFileType(
      f.type.startsWith("image/")
        ? "image"
        : f.type.startsWith("video/")
          ? "video"
          : "other",
    );
  };

  const toggleServer = (url) =>
    setSelectedServers((prev) =>
      prev.includes(url) ? prev.filter((s) => s !== url) : [...prev, url],
    );

  const handleUpload = async () => {
    if (!file || selectedServers.length === 0) return;
    setIsLoading(true);
    try {
      const { x: sha256, blob } = await getHashFromFile(file);
      const token = await generateAuthorizationHeaderForBlossomServer({
        servers: selectedServers,
        tTag: "upload",
        sha256,
      });

      const initialProgress = {};
      selectedServers.forEach((s) => (initialProgress[s] = 0));
      setProgress(initialProgress);

      await Promise.allSettled(
        selectedServers.map((server) =>
          axios.put(`${server}/upload`, blob, {
            headers: {
              "Content-Type": file.type,
              Authorization: `Nostr ${token}`,
            },
            onUploadProgress: (e) => {
              if (e.total) {
                setProgress((prev) => ({
                  ...prev,
                  [server]: Math.round((e.loaded * 100) / e.total),
                }));
              }
            },
          }),
        ),
      );

      refreshLists();
      exit();
    } catch (err) {
      console.error("[UploadModal]", err);
    } finally {
      setIsLoading(false);
    }
  };

  const canUpload = !!file && selectedServers.length > 0 && !isLoading;

  return (
    <Overlay exit={exit} width={480}>
      <div
        className="fx-col box-pad-h box-pad-v fit-container"
        style={{ gap: "1rem" }}
      >
        <style>{`
          .upload-modal-icon svg { stroke-width: 1.5; }
        `}</style>
        {/* Drop zone — the whole panel is the target, matching the reference:
            icon, title, subtitle, then the action button inside the panel. */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            handleFile(e.dataTransfer.files[0]);
          }}
          className="fit-container fx-col fx-centered"
          style={{
            border: `1px dashed ${
              isDragging
                ? "var(--color-primary-accent)"
                : "var(--color-divider)"
            }`,
            borderRadius: "var(--radius-xl)",
            background: isDragging
              ? "var(--color-primary-bg-side)"
              : "transparent",
            padding: "2.5rem 1.5rem",
            gap: "1rem",
            transition: "all .15s",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {!file ? (
            <>
              <span className="upload-modal-icon">
                <Icon name="clapperboard" size={36} />
              </span>
              <div className="fx-col fx-centered" style={{ gap: ".4rem" }}>
                <p style={{ margin: 0, fontWeight: 400, fontSize: "1rem" }}>
                  Upload file
                </p>
                <p
                  className="p-secondary-c"
                  style={{ margin: 0, fontSize: ".9rem" }}
                >
                  Drag and drop or select a file
                </p>
              </div>
              <button
                className="btn btn-normal"
                style={{ marginTop: ".35rem" }}
                onClick={() => inputRef.current?.click()}
              >
                Upload file
              </button>
            </>
          ) : (
            <>
              {fileType === "image" ? (
                <img
                  src={preview}
                  alt=""
                  style={{
                    width: "100%",
                    maxHeight: "220px",
                    objectFit: "contain",
                    borderRadius: "var(--radius-md)",
                  }}
                />
              ) : fileType === "video" ? (
                <video
                  src={preview}
                  controls
                  style={{
                    width: "100%",
                    maxHeight: "220px",
                    borderRadius: "var(--radius-md)",
                  }}
                />
              ) : (
                <div className="fx-centered fx-col" style={{ gap: ".5rem" }}>
                  <Icon name="clapperboard" size={40} />
                  <span style={{ fontSize: ".85rem" }}>{file.name}</span>
                </div>
              )}
              <div
                className="fit-container fx-scattered"
                style={{ fontSize: ".82rem" }}
              >
                <span className="p-secondary-c p-one-line">{file.name}</span>
                <span className="p-secondary-c" style={{ flexShrink: 0 }}>
                  {formatBytes(file.size)}
                </span>
              </div>
              <button
                className="btn btn-gst btn-small"
                style={{ position: "absolute", top: "10px", right: "10px" }}
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                  setPreview(null);
                  setFileType(null);
                }}
              >
                Remove
              </button>
            </>
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/*,video/*"
          style={{ display: "none" }}
          onChange={(e) => handleFile(e.target.files?.[0])}
        />

        {/* Servers — a plain checkbox on the LEFT of each row, per the reference. */}
        {servers.length > 0 ? (
          <div className="fx-col fit-container" style={{ gap: ".5rem" }}>
            <p style={{ margin: 0, fontWeight: 400, fontSize: ".95rem" }}>
              Servers
            </p>
            {servers.map((server) => {
              const checked = selectedServers.includes(server);
              const pct = progress[server];
              return (
                <div
                  key={server}
                  onClick={() => !isLoading && toggleServer(server)}
                  className="fit-container fx-centered fx-start-h"
                  style={{
                    gap: ".75rem",
                    padding: ".5rem .85rem",
                    borderRadius: "var(--radius-full)",
                    backgroundColor: "transparent",
                    border: "1px solid var(--color-divider)",
                    cursor: isLoading ? "default" : "pointer",
                    transition: "border-color .15s",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    readOnly
                    style={{
                      width: "16px",
                      height: "16px",
                      flexShrink: 0,
                      pointerEvents: "none",
                    }}
                  />
                  <span
                    className="p-one-line"
                    style={{ flex: 1, fontSize: ".92rem" }}
                  >
                    {server}
                  </span>
                  {isLoading && pct !== undefined && (
                    <span
                      style={{
                        fontSize: ".75rem",
                        color: "var(--color-primary-accent)",
                        fontWeight: 600,
                        flexShrink: 0,
                      }}
                    >
                      {pct}%
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="p-secondary-c" style={{ fontSize: ".85rem", margin: 0 }}>
            No blossom servers configured. Add servers via your Nostr client.
          </p>
        )}

        {/* Single full-width action, as in the reference. */}
        <button
          className={`btn btn-full ${canUpload ? "btn-normal" : "btn-disabled"}`}
          disabled={!canUpload}
          onClick={handleUpload}
        >
          {isLoading ? <Spinner size={18} color="#fff" /> : "Upload file"}
        </button>
      </div>
    </Overlay>
  );
}
