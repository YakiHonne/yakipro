import React, { useState } from "react";
import { nip19 } from "nostr-tools";
import { useDispatch } from "react-redux";
import { getNoteTree } from "@/Components/NotePreview";
import DropDown from "@/Components/UI/DropDown";
import Icon from "@/Components/Icon";
import DeleteWarning from "@/Components/DeleteWarning";
import RawEventDisplay from "@/Components/RawEventDisplay";
import { setToast } from "@/Store/Slices/Extras";
import { InitEvent } from "@/Helpers/Encryptions";
import { publishEvent } from "@/Helpers/Helpers";

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

const ThreeDots = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="5" cy="12" r="2" />
    <circle cx="12" cy="12" r="2" />
    <circle cx="19" cy="12" r="2" />
  </svg>
);

function OptionItem({ icon, label, danger, onClick }) {
  return (
    <div
      className="fx-centered fx-start-h fx-gap-h-s box-pad-h-s box-pad-v-s round-corner pointer bg-hover"
      style={{ color: danger ? "var(--color-red-main)" : "inherit", gap: 10 }}
      onClick={onClick}
    >
      <Icon name={icon} size={16} />
      <span style={{ fontSize: "0.875rem" }}>{label}</span>
    </div>
  );
}

export default function NoteCard({ event, onDelete }) {
  const dispatch = useDispatch();
  const premium = isPremium(event.tags);
  const [showRaw, setShowRaw] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const nevent = nip19.neventEncode({
    id: event.id,
    kind: event.kind,
    author: event.pubkey,
  });
  const link = `https://yakihonne.com/note/${nevent}`;

  const copy = (text, label) => {
    navigator.clipboard.writeText(text);
    dispatch(setToast({ type: 1, desc: `${label} copied` }));
  };

  const handleDelete = async () => {
    setShowDelete(false);
    try {
      const signed = await InitEvent({
        kind: 5,
        content: "",
        tags: [["e", event.id]],
      });
      if (!signed) return;
      await publishEvent(signed);
      dispatch(setToast({ type: 1, desc: "Note deleted" }));
      onDelete?.(event.id);
    } catch {
      dispatch(setToast({ type: 2, desc: "Failed to delete note" }));
    }
  };

  const menuOptions = [
    <OptionItem
      key="copy-id"
      icon="copy"
      label="Copy ID"
      onClick={() => copy(nevent, "ID")}
    />,
    <OptionItem
      key="copy-cnt"
      icon="copy"
      label="Copy content"
      onClick={() => copy(event.content, "Content")}
    />,
    <OptionItem
      key="copy-link"
      icon="link"
      label="Copy link"
      onClick={() => copy(link, "Link")}
    />,
    <OptionItem
      key="raw"
      icon="code"
      label="Show raw event"
      onClick={() => setShowRaw(true)}
    />,
    <OptionItem
      key="delete"
      icon="trash"
      label="Delete note"
      danger
      onClick={() => setShowDelete(true)}
    />,
  ];

  return (
    <>
      {showRaw && (
        <RawEventDisplay event={event} exit={() => setShowRaw(false)} />
      )}
      {showDelete && (
        <DeleteWarning
          title="Delete note?"
          description="This will publish a deletion event. The note may still appear on some relays."
          exit={() => setShowDelete(false)}
          handleDelete={handleDelete}
          actionButtonLabel="Delete"
        />
      )}

      <div
        className="fit-container box-pad-h-m box-pad-v-m"
        style={{
          // background: "var(--color-surface)",
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
          <div className="fx-centered" style={{ gap: 6 }}>
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
            <DropDown options={menuOptions}>
              <div className="round-icon-small pointer fx-centered">
                <ThreeDots />
              </div>
            </DropDown>
          </div>
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
    </>
  );
}
