import React, { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setToPublish, setToast } from "@/Store/Slices/Publishers";
import {
  extractNip19,
  getNoteDraft,
  updateNoteDraft,
} from "@/Helpers/NoteHelpers";
import Overlay from "./Overlay";
import Icon from "./Icon";
import TextArea from "./UI/TextArea";

const CLIENT_TAG = [
  "client",
  "Yakihonne",
  "31990:20986fb83e775d96d188ca5c9df10ce6d613e0eb7e5768a0f0b12b37cdac21b3:1700732875747",
];

export default function WriteNote({ exit }) {
  const dispatch = useDispatch();
  const userKeys = useSelector((state) => state.userKeys);
  const userMetadata = useSelector((state) => state.userMetadata);

  const [note, setNote] = useState(() => getNoteDraft());
  const [isLoading, setIsLoading] = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    updateNoteDraft(note);
  }, [note]);

  useEffect(() => {
    adjustHeight();
  }, [note]);

  const adjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  const publishNote = async () => {
    if (isLoading || !userKeys) return;
    if (!note.trim()) {
      dispatch(
        setToast({
          type: 2,
          desc: "Please write something before publishing.",
        }),
      );
      return;
    }

    setIsLoading(true);

    const { content, tags: contentTags } = extractNip19(note);
    const tags = [CLIENT_TAG, ...contentTags];

    dispatch(setToPublish({ kind: 1, content, tags }));
    updateNoteDraft("");

    setTimeout(() => {
      setIsLoading(false);
      exit();
    }, 1000);
  };

  const handleKeyDown = useCallback(
    (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        publishNote();
      }
    },
    [note, userKeys, isLoading],
  );

  const displayName =
    userMetadata?.display_name || userMetadata?.name || "Anonymous";
  const username = userMetadata?.name;

  return (
    <Overlay exit={exit} width={600}>
      <div
        className="fx-centered fx-col bg-main-c fit-container box-pad-h box-pad-v"
        style={{ gap: "1rem" }}
      >
        {/* Header */}
        <div className="fit-container fx-scattered">
          <div className="fx-centered" style={{ gap: "12px" }}>
            <div
              className="fx-centered bg bg-cover"
              style={{
                backgroundImage: userMetadata?.picture
                  ? `url(${userMetadata.picture})`
                  : "none",
                width: "40px",
                height: "40px",
                minWidth: "40px",
                borderRadius: "50%",
                backgroundColor: "var(--dim-gray)",
                overflow: "hidden",
              }}
            >
              {!userMetadata?.picture && <Icon name="user" size={22} />}
            </div>
            <div>
              <p className="p-bold">{displayName}</p>
              {username && <p className="gray-c p-medium">@{username}</p>}
            </div>
          </div>
          {/* <div
            onClick={exit}
            className="pointer fx-centered"
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              backgroundColor: "var(--very-dim-gray)",
            }}
          >
            <Icon name="crossmark-tt" size={14} />
          </div> */}
        </div>

        {/* Textarea */}
        <div className="fit-container" style={{ minHeight: "120px" }}>
          <TextArea
            ref={textareaRef}
            value={note}
            onChange={(value) => setNote(value)}
            placeholder="What's on your mind? Use #hashtags or paste nostr: identifiers."
          />
        </div>

        {/* Footer */}
        <div
          className="fit-container fx-scattered"
          style={{
            borderTop: "1px solid var(--pale-gray)",
            paddingTop: "12px",
          }}
        >
          <p
            className="gray-c p-medium"
            style={{ fontSize: "0.8rem", opacity: note.length > 0 ? 1 : 0 }}
          >
            {note.length} chars
          </p>
          <div className="fx-centered" style={{ gap: "12px" }}>
            <p className="gray-c p-medium" style={{ fontSize: "0.75rem" }}>
              ⌘+Enter
            </p>
            <button
              className="btn btn-normal btn-small"
              onClick={publishNote}
              disabled={isLoading || !note.trim()}
            >
              {isLoading ? "Publishing..." : "Publish"}
            </button>
          </div>
        </div>
      </div>
    </Overlay>
  );
}
