import React, { useCallback, useEffect, useRef, useState } from "react";
import { useEditor, EditorContent, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import Superscript from "@tiptap/extension-superscript";
import Subscript from "@tiptap/extension-subscript";
import { Markdown } from "tiptap-markdown";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { all, createLowlight } from "lowlight";
import Mathematics from "tiptap-math";
import katex from "katex";
import "katex/dist/katex.min.css";
import NostrEntityExtension from "@/Extensions/NostrEntityExtension";
import { useSelector } from "react-redux";
import { FileUpload } from "@/Helpers/FileUpload";
import ArticlePublishModalV2 from "./ArticlePublishModalV2";

// ─── Draft helpers (per-user key) ────────────────────────────────────
const draftKey = (pub) => `yp-article-draft-v2-${pub || "anon"}`;
const getDraft = (pub) => {
  try {
    return JSON.parse(localStorage.getItem(draftKey(pub)) || "{}");
  } catch {
    return {};
  }
};
const saveDraft = (pub, t, c) => {
  try {
    localStorage.setItem(
      draftKey(pub),
      JSON.stringify({ title: t, content: c, savedAt: Date.now() }),
    );
  } catch {}
};
const clearDraft = (pub) => {
  try {
    localStorage.removeItem(draftKey(pub));
  } catch {}
};

// ─── SVG icons (16×16, stroke-based) ─────────────────────────────────
const ic = (children, extra = {}) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...extra}
  >
    {children}
  </svg>
);

const I = {
  undo: ic(
    <>
      <path d="M3 7v6h6" />
      <path d="M21 17A9 9 0 0 0 3 13" />
    </>,
  ),
  redo: ic(
    <>
      <path d="M21 7v6h-6" />
      <path d="M3 17a9 9 0 0 1 18-4" />
    </>,
  ),
  bold: ic(
    <>
      <path d="M6 4h8a4 4 0 0 1 0 8H6z" />
      <path d="M6 12h9a4 4 0 0 1 0 8H6z" />
    </>,
  ),
  italic: ic(
    <>
      <line x1="19" y1="4" x2="10" y2="4" />
      <line x1="14" y1="20" x2="5" y2="20" />
      <line x1="15" y1="4" x2="9" y2="20" />
    </>,
  ),
  under: ic(
    <>
      <path d="M6 3v7a6 6 0 0 0 12 0V3" />
      <line x1="4" y1="21" x2="20" y2="21" />
    </>,
  ),
  strike: ic(
    <>
      <line x1="5" y1="12" x2="19" y2="12" />
      <path d="M16 6c0 0-1.5-2-4-2s-6 1-6 4c0 1.5 1 2.5 2.5 3" />
      <path d="M8 18c0 0 1.5 2 4 2s6-1 6-4c0-1.5-1-2.5-2.5-3" />
    </>,
  ),
  code: ic(
    <>
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </>,
  ),
  hi: ic(
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />
    </>,
  ),
  link: ic(
    <>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </>,
  ),
  unlink: ic(
    <>
      <path d="M18.84 12.25l1.72-1.71a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M5.17 11.75l-1.71 1.71a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      <line x1="8" y1="2" x2="8" y2="5" />
      <line x1="2" y1="8" x2="5" y2="8" />
      <line x1="16" y1="19" x2="16" y2="22" />
      <line x1="19" y1="16" x2="22" y2="16" />
    </>,
  ),
  ul: ic(
    <>
      <line x1="9" y1="6" x2="20" y2="6" />
      <line x1="9" y1="12" x2="20" y2="12" />
      <line x1="9" y1="18" x2="20" y2="18" />
      <circle cx="4" cy="6" r="1" fill="currentColor" stroke="none" />
      <circle cx="4" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="4" cy="18" r="1" fill="currentColor" stroke="none" />
    </>,
  ),
  ol: ic(
    <>
      <line x1="10" y1="6" x2="21" y2="6" />
      <line x1="10" y1="12" x2="21" y2="12" />
      <line x1="10" y1="18" x2="21" y2="18" />
      <path d="M4 6h1v4" />
      <path d="M4 10h2" />
      <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" />
    </>,
  ),
  quote: ic(
    <>
      <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" />
      <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" />
    </>,
  ),
  cb: ic(
    <>
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
      <line x1="12" y1="2" x2="12" y2="22" strokeDasharray="3 3" />
    </>,
  ),
  img: ic(
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </>,
  ),
  hr: ic(
    <>
      <line x1="4" y1="12" x2="20" y2="12" strokeWidth="2.5" />
    </>,
  ),
  alL: ic(
    <>
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="15" y2="12" />
      <line x1="3" y1="18" x2="18" y2="18" />
    </>,
  ),
  alC: ic(
    <>
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="6" y1="12" x2="18" y2="12" />
      <line x1="4" y1="18" x2="20" y2="18" />
    </>,
  ),
  alR: ic(
    <>
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="9" y1="12" x2="21" y2="12" />
      <line x1="6" y1="18" x2="21" y2="18" />
    </>,
  ),
  alJ: ic(
    <>
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </>,
  ),
  plus: ic(
    <>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </>,
  ),
  sup: ic(
    <>
      <path d="M4 19l8-8M12 19L4 11" />
      <path d="M20 12h-4c0-1.5.442-2 1.5-2.5S20 8.33 20 7c0-.47-.17-.93-.484-1.29a2.1 2.1 0 0 0-2.617-.436c-.42.24-.738.614-.899 1.06" />
    </>,
  ),
  sub: ic(
    <>
      <path d="M4 5l8 8M12 5L4 13" />
      <path d="M20 21h-4c0-1.5.442-2 1.5-2.5S20 17.33 20 16c0-.47-.17-.93-.484-1.29a2.1 2.1 0 0 0-2.617-.436c-.42.24-.738.614-.899 1.06" />
    </>,
  ),
  math: ic(<path d="M18 7H6l6 5-6 5h12" />),
  nostr: ic(
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </>,
  ),
  chevron: ic(<polyline points="6 9 12 15 18 9" />),
};

// ─── Single toolbar button ────────────────────────────────────────────
function Tb({ icon, onClick, active, disabled, title }) {
  return (
    <button
      className={`tiptap-tb${active ? " is-active" : ""}`}
      onMouseDown={(e) => {
        e.preventDefault();
        if (!disabled) onClick();
      }}
      title={title}
      disabled={!!disabled}
    >
      {icon}
    </button>
  );
}

const Sep = () => <span className="tiptap-toolbar-sep" />;

// ─── Toolbar ──────────────────────────────────────────────────────────
function Toolbar({ editor, onImageUpload, isUploading }) {
  const [showLink, setShowLink] = useState(false);
  const [linkVal, setLinkVal] = useState("");
  const [showInsert, setShowInsert] = useState(false);
  const [showHeadings, setShowHeadings] = useState(false);
  const [showNostr, setShowNostr] = useState(false);
  const [nostrVal, setNostrVal] = useState("");
  const insertRef = useRef(null);
  const headingsRef = useRef(null);
  const nostrRef = useRef(null);

  // ── Subscribe to editor state (reactive active/disabled states) ──────
  const s = useEditorState({
    editor,
    selector: (ctx) => {
      const e = ctx.editor;
      if (!e)
        return {
          bold: false,
          italic: false,
          underline: false,
          strike: false,
          code: false,
          highlight: false,
          link: false,
          bulletList: false,
          orderedList: false,
          blockquote: false,
          codeBlock: false,
          superscript: false,
          subscript: false,
          alL: false,
          alC: false,
          alR: false,
          alJ: false,
          hlevel: 0,
          linkHref: "",
          canUndo: false,
          canRedo: false,
        };
      return {
        bold: e.isActive("bold"),
        italic: e.isActive("italic"),
        underline: e.isActive("underline"),
        strike: e.isActive("strike"),
        code: e.isActive("code"),
        highlight: e.isActive("highlight"),
        link: e.isActive("link"),
        bulletList: e.isActive("bulletList"),
        orderedList: e.isActive("orderedList"),
        blockquote: e.isActive("blockquote"),
        codeBlock: e.isActive("codeBlock"),
        superscript: e.isActive("superscript"),
        subscript: e.isActive("subscript"),
        alL: e.isActive({ textAlign: "left" }),
        alC: e.isActive({ textAlign: "center" }),
        alR: e.isActive({ textAlign: "right" }),
        alJ: e.isActive({ textAlign: "justify" }),
        hlevel:
          [1, 2, 3, 4, 5, 6].find((l) => e.isActive("heading", { level: l })) ??
          0,
        linkHref: e.getAttributes("link").href ?? "",
        canUndo: e.can().undo(),
        canRedo: e.can().redo(),
      };
    },
  });

  // Close insert / headings / nostr dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (insertRef.current && !insertRef.current.contains(e.target))
        setShowInsert(false);
      if (headingsRef.current && !headingsRef.current.contains(e.target))
        setShowHeadings(false);
      if (nostrRef.current && !nostrRef.current.contains(e.target)) {
        setShowNostr(false);
        setNostrVal("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const applyNostrEntity = () => {
    const clean = nostrVal
      .trim()
      .replace(/^nostr:/, "")
      .replace(/[,.:;@?!]+$/, "");
    const nostrRe = /^(naddr1|note1|nevent1|npub1|nprofile1)[a-zA-Z0-9]+$/;
    if (!nostrRe.test(clean)) return;
    editor.chain().focus().insertNostrEntity({ addr: clean }).run();
    setShowNostr(false);
    setNostrVal("");
  };

  if (!editor) return null;

  const applyLink = () => {
    if (!linkVal.trim()) editor.chain().focus().unsetLink().run();
    else editor.chain().focus().setLink({ href: linkVal.trim() }).run();
    setShowLink(false);
    setLinkVal("");
  };

  return (
    <div className="tiptap-toolbar">
      {/* History */}
      <Tb
        icon={I.undo}
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!s.canUndo}
        title="Undo (⌘Z)"
      />
      <Tb
        icon={I.redo}
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!s.canRedo}
        title="Redo (⌘⇧Z)"
      />
      <Sep />

      {/* Block type */}
      <div className="tiptap-insert-wrap" ref={headingsRef}>
        <button
          className={`tiptap-insert-btn${showHeadings ? " is-open" : ""}`}
          onMouseDown={(e) => {
            e.preventDefault();
            setShowHeadings((v) => !v);
          }}
          title="Block type"
          style={{ minWidth: "100px" }}
        >
          {s.hlevel === 0 ? "Paragraph" : `Heading ${s.hlevel}`}
          <span style={{ marginLeft: "auto", display: "flex" }}>
            {I.chevron}
          </span>
        </button>
        {showHeadings && (
          <div className="tiptap-insert-dropdown">
            {[0, 1, 2, 3, 4, 5, 6].map((l) => (
              <button
                key={l}
                className="tiptap-insert-item"
                onMouseDown={(e) => {
                  e.preventDefault();
                  if (l === 0) editor.chain().focus().setParagraph().run();
                  else editor.chain().focus().toggleHeading({ level: l }).run();
                  setShowHeadings(false);
                }}
                style={{
                  fontWeight: s.hlevel === l ? "700" : "400",
                  backgroundColor:
                    s.hlevel === l ? "var(--color-surface-hover)" : "",
                }}
              >
                {l === 0 ? "Paragraph" : `Heading ${l}`}
              </button>
            ))}
          </div>
        )}
      </div>
      <Sep />

      {/* Lists */}
      <Tb
        icon={I.ul}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={s.bulletList}
        title="Bullet list"
      />
      <Tb
        icon={I.ol}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={s.orderedList}
        title="Numbered list"
      />
      <Sep />

      {/* Inline formatting */}
      <Tb
        icon={I.bold}
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={s.bold}
        title="Bold (⌘B)"
      />
      <Tb
        icon={I.italic}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={s.italic}
        title="Italic (⌘I)"
      />
      <Tb
        icon={I.strike}
        onClick={() => editor.chain().focus().toggleStrike().run()}
        active={s.strike}
        title="Strikethrough"
      />
      <Tb
        icon={I.code}
        onClick={() => editor.chain().focus().toggleCode().run()}
        active={s.code}
        title="Inline code"
      />
      <Tb
        icon={I.under}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        active={s.underline}
        title="Underline (⌘U)"
      />
      <Tb
        icon={I.hi}
        onClick={() => editor.chain().focus().toggleHighlight().run()}
        active={s.highlight}
        title="Highlight"
      />
      <Sep />

      {/* Super / subscript */}
      <Tb
        icon={I.sup}
        onClick={() => editor.chain().focus().toggleSuperscript().run()}
        active={s.superscript}
        title="Superscript"
      />
      <Tb
        icon={I.sub}
        onClick={() => editor.chain().focus().toggleSubscript().run()}
        active={s.subscript}
        title="Subscript"
      />

      <Sep />

      {/* Link */}
      <Tb
        icon={s.link ? I.unlink : I.link}
        active={s.link}
        title={s.link ? "Remove link" : "Add link"}
        onClick={() => {
          if (s.link) {
            editor.chain().focus().unsetLink().run();
            setShowLink(false);
          } else {
            setLinkVal(s.linkHref);
            setShowLink((v) => !v);
          }
        }}
      />
      <Sep />

      {/* Alignment */}
      <Tb
        icon={I.alL}
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
        active={s.alL}
        title="Align left"
      />
      <Tb
        icon={I.alC}
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
        active={s.alC}
        title="Align center"
      />
      <Tb
        icon={I.alR}
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
        active={s.alR}
        title="Align right"
      />
      <Tb
        icon={I.alJ}
        onClick={() => editor.chain().focus().setTextAlign("justify").run()}
        active={s.alJ}
        title="Justify"
      />

      {/* Insert */}
      <div className="tiptap-insert-wrap" ref={insertRef}>
        <button
          className={`tiptap-insert-btn${showInsert ? " is-open" : ""}`}
          onMouseDown={(e) => {
            e.preventDefault();
            setShowInsert((v) => !v);
          }}
          title="Insert block"
        >
          {I.plus}
          Add
          {I.chevron}
        </button>
        {showInsert && (
          <div className="tiptap-insert-dropdown">
            <button
              className="tiptap-insert-item"
              onMouseDown={(e) => {
                e.preventDefault();
                onImageUpload();
                setShowInsert(false);
              }}
            >
              {I.img}
              Image
              {isUploading && (
                <span
                  style={{
                    marginLeft: "auto",
                    fontSize: "0.72rem",
                    opacity: 0.5,
                  }}
                >
                  uploading…
                </span>
              )}
            </button>
            <button
              className="tiptap-insert-item"
              onMouseDown={(e) => {
                e.preventDefault();
                editor.chain().focus().toggleBlockquote().run();
                setShowInsert(false);
              }}
            >
              {I.quote} Blockquote
            </button>
            <button
              className="tiptap-insert-item"
              onMouseDown={(e) => {
                e.preventDefault();
                editor.chain().focus().toggleCodeBlock().run();
                setShowInsert(false);
              }}
            >
              {I.cb} Code block
            </button>
            <button
              className="tiptap-insert-item"
              onMouseDown={(e) => {
                e.preventDefault();
                editor
                  .chain()
                  .focus()
                  .insertContent({
                    type: "math",
                    content: [
                      {
                        type: "text",
                        text: "E = mc^2",
                      },
                    ],
                  })
                  .run();
                setShowInsert(false);
              }}
            >
              {I.math} Math block
            </button>
            <button
              className="tiptap-insert-item"
              onMouseDown={(e) => {
                e.preventDefault();
                editor.chain().focus().setHorizontalRule().run();
                setShowInsert(false);
              }}
            >
              {I.hr} Divider
            </button>
          </div>
        )}
      </div>

      {/* Link URL input */}
      {showLink && (
        <div className="tiptap-link-row">
          <input
            autoFocus
            className="tiptap-link-input if if-full"
            style={{ height: "40px" }}
            type="url"
            placeholder="https://..."
            value={linkVal}
            onChange={(e) => setLinkVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") applyLink();
              if (e.key === "Escape") {
                setShowLink(false);
                setLinkVal("");
              }
            }}
          />
          <button
            className="btn btn-normal btn-small"
            onMouseDown={(e) => {
              e.preventDefault();
              applyLink();
            }}
          >
            Apply
          </button>
          <button
            className="btn btn-gst btn-small"
            onMouseDown={(e) => {
              e.preventDefault();
              setShowLink(false);
              setLinkVal("");
            }}
          >
            Cancel
          </button>
        </div>
      )}

      {/* Nostr entity address input */}
      {showNostr && (
        <div className="tiptap-link-row" ref={nostrRef}>
          <input
            autoFocus
            className="tiptap-link-input if if-full"
            style={{ height: "40px" }}
            type="text"
            placeholder="npub1… / naddr1… / note1… / nevent1… / nprofile1…"
            value={nostrVal}
            onChange={(e) => setNostrVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") applyNostrEntity();
              if (e.key === "Escape") {
                setShowNostr(false);
                setNostrVal("");
              }
            }}
          />
          <button
            className="btn btn-normal btn-small"
            onMouseDown={(e) => {
              e.preventDefault();
              applyNostrEntity();
            }}
          >
            Embed
          </button>
          <button
            className="btn btn-gst btn-small"
            onMouseDown={(e) => {
              e.preventDefault();
              setShowNostr(false);
              setNostrVal("");
            }}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Code highlighting ───────────────────────────────────────────────
const lowlight = createLowlight(all);

// ─── Main component ───────────────────────────────────────────────────
export default function ArticleEditorV2() {
  const userKeys = useSelector((state) => state.userKeys);
  const pub = userKeys?.pub ?? "anon";

  // Capture initial draft once (stable across re-renders)
  const initialDraft = useRef(null);
  if (initialDraft.current === null) initialDraft.current = getDraft(pub);
  const draft = initialDraft.current;

  const [imetas, setImetas] = useState([]);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  // "idle" | "saving" | "saved"
  const [saveStatus, setSaveStatus] = useState("idle");
  // Show restore banner when a non-empty draft was found on mount
  const [showRestored, setShowRestored] = useState(
    !!(draft.title || draft.content),
  );
  const saveTimer = useRef(null);
  const savedTimer = useRef(null);

  // Debounced persist — waits 1 s after last change before writing
  const scheduleSave = useCallback(
    (t, c) => {
      setSaveStatus("saving");
      clearTimeout(saveTimer.current);
      clearTimeout(savedTimer.current);
      saveTimer.current = setTimeout(() => {
        saveDraft(pub, t, c);
        setSaveStatus("saved");
        savedTimer.current = setTimeout(() => setSaveStatus("idle"), 3000);
      }, 1000);
    },
    [pub],
  );

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4, 5, 6] },
        codeBlock: false,
      }),
      CodeBlockLowlight.configure({ lowlight }),
      Mathematics.configure({ evaluation: true }),
      NostrEntityExtension,
      Markdown.configure({
        html: false,
        linkify: true,
        transformPastedText: true,
        transformCopiedText: true,
      }),
      Image.configure({ inline: false, allowBase64: false }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" },
      }),
      Placeholder.configure({ placeholder: "Start writing your article…" }),
      Underline,
      Highlight.configure({ multicolor: false }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Superscript,
      Subscript,
    ],
    editorProps: { attributes: { class: "tiptap-content" } },
    content: "",
  });

  // Restore draft content into editor once it's ready
  useEffect(() => {
    if (!editor || !draft.content) return;
    editor.commands.setContent(draft.content);
  }, [editor]);

  // Auto-dismiss restore banner after 4 s
  useEffect(() => {
    if (!showRestored) return;
    const t = setTimeout(() => setShowRestored(false), 4000);
    return () => clearTimeout(t);
  }, [showRestored]);

  // Debounced save on editor content change
  useEffect(() => {
    if (!editor) return;
    const fn = () => scheduleSave("", editor.storage.markdown.getMarkdown());
    editor.on("update", fn);
    return () => editor.off("update", fn);
  }, [editor, scheduleSave]);

  // Cleanup timers on unmount
  useEffect(
    () => () => {
      clearTimeout(saveTimer.current);
      clearTimeout(savedTimer.current);
    },
    [],
  );

  // Image upload
  const uploadImage = useCallback(
    async (file) => {
      setIsUploading(true);
      const result = await FileUpload({ file, userKeys, includeImeta: true });
      setIsUploading(false);
      if (!result) return;
      if (result.imeta) setImetas((p) => [...p, result.imeta]);
      editor?.chain().focus().setImage({ src: result.url }).run();
    },
    [editor, userKeys],
  );

  const triggerImageUpload = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e) => {
      const f = e.target.files?.[0];
      if (f) uploadImage(f);
    };
    input.click();
  }, [uploadImage]);

  // Paste image → upload
  useEffect(() => {
    const fn = (e) => {
      const item = Array.from(e.clipboardData?.items ?? []).find((i) =>
        i.type.startsWith("image/"),
      );
      if (!item) return;
      e.preventDefault();
      uploadImage(item.getAsFile());
    };
    document.addEventListener("paste", fn);
    return () => document.removeEventListener("paste", fn);
  }, [uploadImage]);

  const getMarkdown = () => editor?.storage.markdown.getMarkdown() ?? "";
  const canPublish = !!getMarkdown().trim();

  const handleClear = () => {
    editor?.commands.setContent("");
    setImetas([]);
    clearDraft(pub);
    setSaveStatus("idle");
    setShowRestored(false);
  };

  return (
    <>
      {showPublishModal && (
        <ArticlePublishModalV2
          exit={() => {
            setShowPublishModal(false);
            clearDraft(pub);
            editor?.commands.setContent("");
            setImetas([]);
            setSaveStatus("idle");
          }}
          initialTitle={draft.title || ""}
          postContent={getMarkdown()}
          imetas={imetas}
        />
      )}

      <div className="fit-container fx-col" style={{ gap: "1rem" }}>
        {/* Draft restored banner */}
        {showRestored && (
          <div
            className="fit-container fx-scattered fx-centered slide-right"
            style={{
              padding: "8px 14px",
              borderRadius: "8px",
              border: "1px solid var(--color-surface-border)",

              fontSize: "0.82rem",
              gap: "8px",
            }}
          >
            <span style={{ color: "var(--color-text-secondary)" }}>
              ✦ Draft restored from your last session
            </span>

            <button
              style={{
                border: "none",
                background: "transparent",
                cursor: "pointer",
                color: "var(--color-text-muted)",
                fontSize: "1rem",
                lineHeight: 1,
                padding: "0 2px",
              }}
              onClick={() => setShowRestored(false)}
            >
              ×
            </button>
          </div>
        )}

        {/* Top bar */}
        <div
          className="fit-container fx-scattered fx-wrap"
          style={{ gap: "8px" }}
        >
          <div className="fx-centered" style={{ gap: "10px" }}>
            {getMarkdown() && (
              <button className="btn btn-gst btn-small" onClick={handleClear}>
                Clear
              </button>
            )}
            {/* Save status indicator */}
            {saveStatus === "saving" && (
              <span
                style={{
                  fontSize: "0.78rem",
                  color: "var(--color-text-muted)",
                }}
              >
                Saving…
              </span>
            )}
            {saveStatus === "saved" && (
              <span
                style={{ fontSize: "0.78rem", color: "var(--color-success)" }}
              >
                ✓ Saved
              </span>
            )}
          </div>
          <button
            className={`btn btn-small ${canPublish ? "btn-normal" : "btn-disabled"}`}
            disabled={!canPublish}
            onClick={() => setShowPublishModal(true)}
          >
            Publish article
          </button>
        </div>

        {/* Editor shell with sticky toolbar */}
        <div className="tiptap-shell fit-container">
          <Toolbar
            editor={editor}
            onImageUpload={triggerImageUpload}
            isUploading={isUploading}
          />
          <EditorContent editor={editor} />
        </div>
      </div>
    </>
  );
}
