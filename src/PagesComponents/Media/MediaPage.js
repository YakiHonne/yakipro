import Spinner from "@/Components/Spinner";
import Select from "@/Components/UI/Select";
import useBlossomManagement from "@/hooks/useBlossomManagement";
import { useState } from "react";
import BlobCard from "./BlobCard";
import UploadModal from "./UploadModal";
import Button from "@/Components/UI/Button";
import Input from "@/Components/UI/Input";
import Icon from "@/Components/LucideIcon";

export default function MediaPage() {
  const {
    userBlossomServers,
    allBlobs,
    blobs,
    isBlobsLoading,
    blossomColors,
    refreshLists,
  } = useBlossomManagement();

  const [selectedServer, setSelectedServer] = useState(null); // null = all
  const [showUpload, setShowUpload] = useState(false);
  const [search, setSearch] = useState("");

  const formatBytes = (bytes) => {
    if (!bytes) return "0 B";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024)
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const storageTitle = (() => {
    if (selectedServer === null) {
      const total = allBlobs.reduce((sum, b) => sum + (b.size || 0), 0);
      return (
        <div className="fx-centered fx-gap-h fx-start-h">
          <span className="p-secondary-c">Consumed storage</span>
          <span className="">{formatBytes(total)}</span>
        </div>
      );
    }
    const hostname = (() => {
      try {
        return new URL(selectedServer).hostname;
      } catch {
        return selectedServer;
      }
    })();
    const total = (blobs[selectedServer] || []).reduce(
      (sum, b) => sum + (b.size || 0),
      0,
    );
    return (
      <div className="fx-centered fx-gap-h fx-start-h">
        <span className="p-secondary-c">{hostname}</span>
        <span className="">{formatBytes(total)}</span>
      </div>
    );
  })();

  const displayedBlobs = (() => {
    let list =
      selectedServer !== null
        ? (blobs[selectedServer] || []).map((b) => ({
          ...b,
          seen: allBlobs.find((a) => a.sha256 === b.sha256)?.seen || [],
        }))
        : allBlobs;

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (b) =>
          b.sha256?.toLowerCase().includes(q) ||
          b.type?.toLowerCase().includes(q),
      );
    }
    return list;
  })();

  return (
    <>
      {showUpload && (
        <UploadModal
          servers={userBlossomServers}
          refreshLists={refreshLists}
          exit={() => setShowUpload(false)}
        />
      )}

      <div
        className="fit-container fx-col fx-start-v fx-start-h box-pad-h box-pad-v no-scrollbar"
        style={{ gap: "20px" }}
      >
        {/* Page header */}
        <div className="fit-container fx-scattered">
          <div>
            <h1 style={{ margin: 0 }}>Media uploads</h1>

          </div>
          <div className="fx-centered fx-gap-h">
            {userBlossomServers.length > 0 && (
              <Select
                value={selectedServer ?? "__all__"}
                onChange={(v) => setSelectedServer(v === "__all__" ? null : v)}
                options={[
                  {
                    value: "__all__",
                    display_name: (
                      <div
                        className="fx-centered fx-start-h"
                        style={{ gap: "8px" }}
                      >
                        <span>All</span>
                        <span className="border-all box-pad-h-xs p-medium round-corner bg-secondary-c">
                          {allBlobs.length}
                        </span>
                      </div>
                    ),
                  },
                  ...userBlossomServers.map((server, i) => ({
                    value: server,
                    display_name: (
                      <div
                        className="fx-centered fx-start-h"
                        style={{ gap: "8px" }}
                      >
                        <span
                          style={{
                            width: "10px",
                            height: "10px",
                            borderRadius: "50%",
                            background: blossomColors[i],
                            flexShrink: 0,
                            display: "inline-block",
                          }}
                        />
                        <span>{new URL(server).hostname}</span>
                        {(blobs[server] || []).length > 0 && (
                          <span className="border-all box-pad-h-xs p-medium round-corner bg-secondary-c">
                            {(blobs[server] || []).length}
                          </span>
                        )}
                      </div>
                    ),
                  })),
                ]}
              />
            )}
            <Button
              onClick={() => setShowUpload(true)}
              size="m"
              label="Upload"
              leftIcon={"plus"}
              disabled={userBlossomServers.length === 0}
            />
          </div>
        </div>

        {/* Server filter */}


        {/* Storage title + Search */}
        {allBlobs.length > 0 && (
          <div
            className="fit-container"
            style={{ display: "flex", flexDirection: "column", gap: "8px" }}
          >
            <h4 style={{ margin: 0 }}>{storageTitle}</h4>
            <Input
              placeholder={"Search by type or hash…"}
              value={search}
              onChange={(v) => setSearch(v)}
            />
          </div>
        )}

        {/* Content */}
        {isBlobsLoading ? (
          <div
            className="fx-centered fit-container"
            style={{ minHeight: "200px" }}
          >
            <Spinner size={36} />
          </div>
        ) : userBlossomServers.length === 0 ? (
          <div
            className="fx-centered fx-col fit-container"
            style={{
              minHeight: "300px",
              gap: "12px",
              border: "1px dashed var(--color-divider)",
              borderRadius: "var(--radius-xl)",
            }}
          >
            <Icon name="cloud_upload" size={48} />
            <p style={{ margin: 0, fontWeight: 600 }}>No Blossom servers</p>
            <p
              className="p-secondary-c"
              style={{
                margin: 0,
                fontSize: "0.85rem",
                textAlign: "center",
                maxWidth: "280px",
              }}
            >
              Add Blossom servers via your Nostr client by publishing a kind
              10063 event.
            </p>
          </div>
        ) : displayedBlobs.length === 0 ? (
          <div
            className="fx-centered fx-col fit-container"
            style={{ minHeight: "200px", gap: "10px" }}
          >
            <p className="p-secondary-c">
              {search
                ? "No results for your search."
                : "No files uploaded yet."}
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: "14px",
              width: "100%",
            }}
          >
            {displayedBlobs.map((blob) => (
              <BlobCard
                key={blob.sha256}
                blob={blob}
                servers={userBlossomServers}
                blossomColors={blossomColors}
                refreshLists={refreshLists}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
