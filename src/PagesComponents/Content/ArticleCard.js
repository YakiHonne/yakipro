import { useRouter } from "next/router";
import { useDispatch } from "react-redux";
import { nip19 } from "nostr-tools";
import React, { useState } from "react";
import DropDown from "@/Components/UI/DropDown";
import Icon from "@/Components/Icon";
import DeleteWarning from "@/Components/DeleteWarning";
import RawEventDisplay from "@/Components/RawEventDisplay";
import { setToast } from "@/Store/Slices/Extras";
import { InitEvent } from "@/Helpers/Encryptions";
import { publishEvent, removeEventFromCache } from "@/Helpers/Helpers";
import { updateNoteDraft } from "@/Helpers/NoteHelpers";

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

function getTag(tags, name) {
  const tag = tags?.find((t) => t[0] === name);
  return tag ? tag[1] : null;
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
      className="pointer fx-centered fx-start-h fit-container box-pad-h-s box-pad-v-s option-no-scale"
      onClick={onClick}
    >
      <Icon name={icon} size={24} isColored={danger} />
      <p className={danger ? "p-red-c" : ""}>{label}</p>
    </div>
  );
}

export default function ArticleCard({ event, onDelete }) {
  const router = useRouter();
  const dispatch = useDispatch();
  const [showDelete, setShowDelete] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  const tags = event.tags || [];
  const premium = isPremium(tags);
  const title = getTag(tags, "title") || "Untitled";
  const image = getTag(tags, "image");
  const summary = getTag(tags, "summary");
  const identifier = getTag(tags, "d") || "";

  const naddr = nip19.naddrEncode({
    kind: event.kind,
    pubkey: event.pubkey,
    identifier,
  });
  const link = `https://yakihonne.com/article/${naddr}`;

  const copy = (text, label) => {
    navigator.clipboard.writeText(text);
    dispatch(setToast({ type: 1, desc: `${label} copied` }));
  };

  const handlePostInNote = () => {
    updateNoteDraft(`nostr:${naddr}`);
    router.push("/create-content");
    dispatch(setToast({ type: 1, desc: "Article link added to note editor" }));
  };

  const isDraft = event.kind === 30024;

  const handleEdit = () => router.push(`/edit-content/${naddr}`);

  const handleDelete = async () => {
    setShowDelete(false);
    try {
      const signed = await InitEvent({
        kind: 5,
        content: "",
        tags: [["a", `${event.kind}:${event.pubkey}:${identifier}`]],
      });
      if (!signed) return;
      await publishEvent(signed);
      await removeEventFromCache(event);
      dispatch(setToast({ type: 1, desc: isDraft ? "Draft deleted" : "Article deleted" }));
      onDelete?.(event.id);
    } catch {
      dispatch(setToast({ type: 2, desc: isDraft ? "Failed to delete draft" : "Failed to delete article" }));
    }
  };

  const menuOptions = isDraft
    ? [
        <OptionItem
          key="copy-cnt"
          icon="copy"
          label="Copy content"
          onClick={(e) => { e.stopPropagation(); copy(event.content, "Content"); }}
        />,
        <OptionItem
          key="raw"
          icon="code"
          label="Show raw event"
          onClick={(e) => { e.stopPropagation(); setShowRaw(true); }}
        />,
        <OptionItem
          key="edit"
          icon="edit"
          label="Edit draft"
          onClick={(e) => { e.stopPropagation(); handleEdit(); }}
        />,
        <OptionItem
          key="delete"
          icon="trash"
          label="Delete draft"
          danger
          onClick={(e) => { e.stopPropagation(); setShowDelete(true); }}
        />,
      ]
    : [
        <OptionItem
          key="copy-id"
          icon="copy"
          label="Copy ID"
          onClick={(e) => { e.stopPropagation(); copy(naddr, "ID"); }}
        />,
        <OptionItem
          key="copy-cnt"
          icon="copy"
          label="Copy content"
          onClick={(e) => { e.stopPropagation(); copy(event.content, "Content"); }}
        />,
        <OptionItem
          key="copy-link"
          icon="link"
          label="Copy link"
          onClick={(e) => { e.stopPropagation(); copy(link, "Link"); }}
        />,
        <OptionItem
          key="raw"
          icon="code"
          label="Show raw event"
          onClick={(e) => { e.stopPropagation(); setShowRaw(true); }}
        />,
        <OptionItem
          key="note"
          icon="add-note"
          label="Post in a note"
          onClick={(e) => { e.stopPropagation(); handlePostInNote(); }}
        />,
        <OptionItem
          key="edit"
          icon="edit"
          label="Edit article"
          onClick={(e) => { e.stopPropagation(); handleEdit(); }}
        />,
        <OptionItem
          key="delete"
          icon="trash"
          label="Delete article"
          danger
          onClick={(e) => { e.stopPropagation(); setShowDelete(true); }}
        />,
      ];

  return (
    <>
      {showRaw && (
        <RawEventDisplay event={event} exit={() => setShowRaw(false)} />
      )}
      {showDelete && (
        <DeleteWarning
          title={isDraft ? "Delete draft?" : "Delete article?"}
          description={
            isDraft
              ? "This will publish a deletion event. The draft may still appear on some relays."
              : "This will publish a deletion event. The article may still appear on some relays."
          }
          exit={() => setShowDelete(false)}
          handleDelete={handleDelete}
          actionButtonLabel="Delete"
        />
      )}

      <div
        className="fit-container"
        style={{
          // background: "var(--color-surface)",
          border: "1px solid var(--color-divider)",
          borderRadius: "var(--radius-lg)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          cursor: "pointer",
        }}
        onClick={() => router.push(`/article/${naddr}`)}
      >
        {image && (
          <img
            src={image}
            alt=""
            loading="lazy"
            style={{ width: "100%", height: "160px", objectFit: "cover" }}
          />
        )}

        <div
          className="box-pad-h-m box-pad-v-m"
          style={{ display: "flex", flexDirection: "column", gap: "8px" }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: "8px",
            }}
          >
            <h4
              style={{ margin: 0, fontWeight: 600, lineHeight: 1.3, flex: 1 }}
            >
              {title}
            </h4>
            <div
              className="fx-centered"
              style={{ gap: 6, flexShrink: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
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

          {summary && (
            <p
              className="p-secondary-c"
              style={{
                margin: 0,
                fontSize: "0.875rem",
                lineHeight: 1.5,
                display: "-webkit-box",
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {summary}
            </p>
          )}

          <span className="p-secondary-c" style={{ fontSize: "0.78rem" }}>
            {formatDate(event.created_at)}
          </span>
        </div>
      </div>
    </>
  );
}
