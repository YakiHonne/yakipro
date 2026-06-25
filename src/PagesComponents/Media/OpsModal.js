import Spinner from "@/Components/Spinner";
import Icon from "@/Components/Icon";
import {
  deleteBlossomFile,
  generateAuthorizationHeaderForBlossomServer,
  mirrorBlossomServerFileUpload,
} from "@/Helpers/Helpers";
import { useState } from "react";
import Overlay from "@/Components/Overlay";

export default function OpsModal({
  ops,
  blob,
  servers,
  blossomColors,
  refreshLists,
  exit,
}) {
  const seenIndexes = blob.seen || [];

  // mirror → servers that DON'T have the blob; delete → servers that DO
  const eligible = servers.filter((_, i) =>
    ops === "mirror" ? !seenIndexes.includes(i) : seenIndexes.includes(i),
  );

  const [selected, setSelected] = useState(eligible.map((_, i) => i));
  const [isLoading, setIsLoading] = useState(false);

  const toggleIndex = (i) =>
    setSelected((prev) =>
      prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i],
    );

  const handleConfirm = async () => {
    const targets = eligible.filter((_, i) => selected.includes(i));
    if (targets.length === 0) return;
    setIsLoading(true);

    try {
      const token = await generateAuthorizationHeaderForBlossomServer({
        servers: targets,
        tTag: ops === "mirror" ? "upload" : "delete",
        sha256: blob.sha256,
      });

      if (ops === "mirror") {
        await mirrorBlossomServerFileUpload({
          isMirror: true,
          serversList: targets,
          eventHash: token,
          fileUrl: blob.url,
          excludeFirst: false,
        });
      } else {
        await deleteBlossomFile({
          sha256: blob.sha256,
          serversList: targets,
          eventHash: token,
        });
      }

      refreshLists();
      exit();
    } catch (err) {
      console.error("[OpsModal]", err);
    } finally {
      setIsLoading(false);
    }
  };

  const isDelete = ops === "delete";
  const label = isDelete ? "Delete" : "Mirror";

  return (
    <Overlay exit={exit} width={420}>
      <div>
        {/* Header */}
        <div
          className="fx-scattered fx-centered box-pad-h-s box-pad-v-s"
          style={{ borderBottom: "1px solid var(--color-divider)" }}
        >
          <h4 style={{ margin: 0 }}>{label} file</h4>
          <div className="close" onClick={exit}>
            <div />
          </div>
        </div>

        <div
          className="box-pad-h box-pad-v"
          style={{ display: "flex", flexDirection: "column", gap: "16px" }}
        >
          <p
            className="p-secondary-c"
            style={{ margin: 0, fontSize: "0.85rem" }}
          >
            {isDelete
              ? "Select the servers to delete this file from."
              : "Select the servers to mirror this file to."}
          </p>

          {eligible.length === 0 ? (
            <p
              className="p-secondary-c"
              style={{ margin: 0, fontSize: "0.85rem" }}
            >
              {isDelete
                ? "This file is not on any tracked server."
                : "This file is already on all your servers."}
            </p>
          ) : (
            eligible.map((serverUrl, i) => {
              const globalIndex = servers.indexOf(serverUrl);
              const checked = selected.includes(i);
              return (
                <div
                  key={serverUrl}
                  onClick={() => !isLoading && toggleIndex(i)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "10px 14px",
                    borderRadius: "var(--radius-md)",
                    border: `1px solid ${checked ? (isDelete ? "var(--color-red-main)" : "var(--color-primary-accent)") : "var(--color-divider)"}`,

                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  <div
                    style={{
                      width: "10px",
                      height: "10px",
                      borderRadius: "50%",
                      background: blossomColors[globalIndex] || "#888",
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      flex: 1,
                      fontSize: "0.82rem",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {new URL(serverUrl).hostname}
                  </span>
                  <div
                    style={{
                      width: "18px",
                      height: "18px",
                      flexShrink: 0,
                      borderRadius: "4px",
                      border: `1.5px solid ${checked ? (isDelete ? "var(--color-red-main)" : "var(--color-primary-accent)") : "var(--color-divider)"}`,
                      background: checked
                        ? isDelete
                          ? "var(--color-red-main)"
                          : "var(--color-primary-accent)"
                        : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "all 0.15s",
                    }}
                  >
                    {checked && (
                      <Icon
                        name="check"
                        v={2}
                        size={12}
                        isColored
                        className="checkbox-check-icon"
                      />
                    )}
                  </div>
                </div>
              );
            })
          )}

          <div className="fx-centered" style={{ gap: "10px" }}>
            <button className="btn btn-gst" style={{ flex: 1 }} onClick={exit}>
              Cancel
            </button>
            {eligible.length > 0 && (
              <button
                className={`btn ${isDelete ? "btn-red" : "btn-normal"}`}
                style={{ flex: 1 }}
                disabled={selected.length === 0 || isLoading}
                onClick={handleConfirm}
              >
                {isLoading ? <Spinner size={18} color="#fff" /> : label}
              </button>
            )}
          </div>
        </div>
      </div>
    </Overlay>
  );
}
