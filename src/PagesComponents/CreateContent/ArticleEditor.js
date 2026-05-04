import React, { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useTheme } from "next-themes";
import MDEditorWrapper from "@/Components/MDEditorWrapper";
import ArticlePublishModal from "./ArticlePublishModal";
import { FileUpload } from "@/Helpers/FileUpload";
import Icon from "@/Components/Icon";

const DRAFT_KEY = "yp-article-draft";

function getDraft() {
  try {
    return JSON.parse(localStorage.getItem(DRAFT_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveDraft(title, content) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ title, content }));
  } catch {}
}

function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {}
}

export default function ArticleEditor() {
  const userKeys = useSelector((state) => state.userKeys);
  const { resolvedTheme } = useTheme();
  const isDarkMode = ["dark", "gray"].includes(resolvedTheme);

  const draft = getDraft();
  const [title, setTitle] = useState(draft.title || "");
  const [content, setContent] = useState(draft.content || "");
  const [imetas, setImetas] = useState([]);
  const [isPreview, setIsPreview] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const titleRef = useRef(null);

  useEffect(() => {
    saveDraft(title, content);
  }, [title, content]);

  const autoResizeTitle = (e) => {
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
    setTitle(el.value);
  };

  const execute = (file) =>
    new Promise(async (resolve) => {
      if (file) {
        setIsUploading(true);
        const result = await FileUpload({ file, userKeys, includeImeta: true });
        setIsUploading(false);
        if (result) {
          if (result.imeta) setImetas((prev) => [...prev, result.imeta]);
          resolve(result.url);
        } else {
          resolve(false);
        }
      } else {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*,video/*";
        input.click();
        input.onchange = async (e) => {
          const f = e.target.files?.[0];
          if (!f) { resolve(false); return; }
          setIsUploading(true);
          const result = await FileUpload({ file: f, userKeys, includeImeta: true });
          setIsUploading(false);
          if (result) {
            if (result.imeta) setImetas((prev) => [...prev, result.imeta]);
            resolve(result.url);
          } else {
            resolve(false);
          }
        };
      }
    });

  const handleClear = () => {
    setTitle("");
    setContent("");
    clearDraft();
  };

  return (
    <>
      {showPublishModal && (
        <ArticlePublishModal
          exit={() => {
            setShowPublishModal(false);
            clearDraft();
            setTitle("");
            setContent("");
            setImetas([]);
          }}
          postTitle={title}
          postContent={content}
          imetas={imetas}
        />
      )}

      <div className="fit-container fx-col" style={{ gap: "1rem" }}>
        {/* Toolbar */}
        <div className="fit-container fx-scattered fx-wrap" style={{ gap: "8px" }}>
          <div className="fx-centered" style={{ gap: "8px" }}>
            <button
              className="btn btn-normal btn-small"
              onClick={() => setIsPreview(!isPreview)}
            >
              {isPreview ? "Edit" : "Preview"}
            </button>
            {(title || content) && (
              <button className="btn btn-gst btn-small" onClick={handleClear}>
                Clear
              </button>
            )}
          </div>

          <button
            className={`btn btn-small ${title && content ? "btn-normal" : "btn-disabled"}`}
            disabled={!title || !content}
            onClick={() => setShowPublishModal(true)}
          >
            {isUploading ? "Uploading..." : "Publish article"}
          </button>
        </div>

        {/* Title */}
        <textarea
          ref={titleRef}
          className="fit-container if if-no-border"
          placeholder="Article title..."
          value={title}
          onChange={autoResizeTitle}
          style={{
            fontSize: "1.8rem",
            fontWeight: 700,
            resize: "none",
            overflow: "hidden",
            minHeight: "48px",
            lineHeight: "1.3",
            padding: "4px 0",
            borderBottom: "1px solid var(--pale-gray)",
            borderRadius: 0,
          }}
          dir="auto"
        />

        {/* MDEditor */}
        <div className="fit-container article" style={{ position: "relative" }}>
          <MDEditorWrapper
            dataColorMode={isDarkMode ? "dark" : "light"}
            preview={isPreview ? "preview" : "live"}
            height="75vh"
            width="100%"
            value={content}
            onChange={setContent}
            execute={execute}
          />
        </div>
      </div>
    </>
  );
}
