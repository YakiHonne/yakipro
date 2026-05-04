import Spinner from "@/Components/Spinner";
import {
  generateAuthorizationHeaderForBlossomServer,
  getHashFromFile,
} from "@/Helpers/Helpers";
import axios from "axios";
import { useRef, useState } from "react";

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function UploadModal({ servers, refreshLists, exit }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [fileType, setFileType] = useState(null);
  const [selectedServers, setSelectedServers] = useState(servers.slice());
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

  return (
    <div
      className="fx-centered"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        zIndex: 1000,
        padding: "16px",
      }}
      onClick={exit}
    >
      <div
        style={{
          background: "var(--color-primary-bg)",
          borderRadius: "var(--radius-xl)",
          width: "100%",
          maxWidth: "520px",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
        className="border-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="fx-scattered fx-centered box-pad-h-m box-pad-v-s"
          style={{ borderBottom: "1px solid var(--color-divider)" }}
        >
          <h4 style={{ margin: 0 }}>Upload media</h4>
          <button
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "1.4rem",
              color: "var(--color-secondary-text)",
              lineHeight: 1,
            }}
            onClick={exit}
          >
            ×
          </button>
        </div>

        <div
          className="box-pad-h box-pad-v"
          style={{ display: "flex", flexDirection: "column", gap: "20px" }}
        >
          {/* Drop zone */}
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
            onClick={() => !file && inputRef.current?.click()}
            style={{
              border: `2px dashed ${isDragging ? "var(--color-primary-accent)" : "var(--color-divider)"}`,
              borderRadius: "var(--radius-lg)",
              background: isDragging
                ? "var(--color-primary-light)"
                : "var(--color-primary-bg-side)",
              minHeight: "180px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              cursor: file ? "default" : "pointer",
              transition: "all 0.15s",
              overflow: "hidden",
              position: "relative",
            }}
          >
            {!file ? (
              <>
                <span style={{ fontSize: "2rem" }}>☁️</span>
                <p style={{ margin: 0, fontWeight: 500 }}>
                  Drop a file or click to browse
                </p>
                <p
                  className="p-secondary-c"
                  style={{ margin: 0, fontSize: "0.82rem" }}
                >
                  Images and videos supported
                </p>
              </>
            ) : fileType === "image" ? (
              <img
                src={preview}
                alt=""
                style={{
                  width: "100%",
                  maxHeight: "240px",
                  objectFit: "contain",
                }}
              />
            ) : fileType === "video" ? (
              <video
                src={preview}
                controls
                style={{ width: "100%", maxHeight: "240px" }}
              />
            ) : (
              <div className="fx-centered fx-col" style={{ gap: "8px" }}>
                <span style={{ fontSize: "2.5rem" }}>📄</span>
                <span style={{ fontSize: "0.85rem" }}>{file.name}</span>
              </div>
            )}

            {file && (
              <button
                className="btn btn-gst btn-s"
                style={{
                  position: "absolute",
                  top: "8px",
                  right: "8px",
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                  setPreview(null);
                  setFileType(null);
                }}
              >
                Remove
              </button>
            )}
          </div>

          <input
            ref={inputRef}
            type="file"
            accept="image/*,video/*"
            style={{ display: "none" }}
            onChange={(e) => handleFile(e.target.files?.[0])}
          />

          {/* File info */}
          {file && (
            <div
              style={{
                background: "var(--color-primary-bg-side)",
                borderRadius: "var(--radius-md)",
                padding: "10px 14px",
                fontSize: "0.82rem",
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span className="p-secondary-c">{file.name}</span>
              <span className="p-secondary-c">{formatBytes(file.size)}</span>
            </div>
          )}

          {/* Server selection */}
          {servers.length > 0 ? (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "8px" }}
            >
              <p style={{ margin: 0, fontWeight: 600, fontSize: "0.88rem" }}>
                Upload to
              </p>
              {servers.map((server, i) => {
                const checked = selectedServers.includes(server);
                const pct = progress[server];
                return (
                  <div
                    key={server}
                    onClick={() => !isLoading && toggleServer(server)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "10px 14px",
                      borderRadius: "var(--radius-md)",
                      border: `1px solid ${checked ? "var(--color-primary-light)" : "var(--color-divider)"}`,
                      cursor: isLoading ? "default" : "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    <span
                      style={{
                        width: "10px",
                        height: "10px",
                        borderRadius: "50%",
                        background: `hsl(${i * 47}, 65%, 55%)`,
                        flexShrink: 0,
                        display: "inline-block",
                      }}
                    />
                    <span
                      style={{
                        flex: 1,
                        fontSize: "0.85rem",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {new URL(server).hostname}
                    </span>
                    {isLoading && pct !== undefined && (
                      <span
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--color-primary-accent)",
                          fontWeight: 600,
                        }}
                      >
                        {pct}%
                      </span>
                    )}
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {}}
                      style={{ accentColor: "var(--color-primary-accent)" }}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <p
              className="p-secondary-c"
              style={{ fontSize: "0.85rem", margin: 0 }}
            >
              No blossom servers configured. Add servers via your Nostr client.
            </p>
          )}

          {/* Actions */}
          <div className="fx-centered" style={{ gap: "10px" }}>
            <button className="btn btn-gst" style={{ flex: 1 }} onClick={exit}>
              Cancel
            </button>
            <button
              className="btn btn-normal"
              style={{ flex: 1 }}
              disabled={!file || selectedServers.length === 0 || isLoading}
              onClick={handleUpload}
            >
              {isLoading ? <Spinner size={18} color="#fff" /> : "Upload"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
