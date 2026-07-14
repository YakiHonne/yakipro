import React, { useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setToPublish, setToast } from "@/Store/Slices/Publishers";
import { nanoid } from "nanoid";
import { extractNip19 } from "@/Helpers/NoteHelpers";
import { FileUpload } from "@/Helpers/FileUpload";
import Overlay from "@/Components/Overlay";
import Spinner from "@/Components/Spinner";
import Icon from "@/Components/LucideIcon";
import Toggle from "@/Components/Toggle";
import Button from "@/Components/UI/Button";
import { InitEvent } from "@/Helpers/Encryptions";
import { publishEvent } from "@/Helpers/Helpers";
import { getRelayMetadata } from "@/Cache/relayMetadataCache";

const CLIENT_TAG = [
  "client",
  "Yakihonne",
  "31990:20986fb83e775d96d188ca5c9df10ce6d613e0eb7e5768a0f0b12b37cdac21b3:1700732875747",
];

function wordCount(str) {
  return str.trim() ? str.trim().split(/\s+/).length : 0;
}
function readTime(str) {
  return Math.max(1, Math.round(wordCount(str) / 200));
}

const ImgIcon = () => (
  <svg
    width="48"
    height="48"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ color: "var(--color-text-muted)" }}
  >
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
);

export default function ArticlePublishModalV2({
  exit,
  initialTitle = "",
  initialSummary = "",
  initialCoverUrl = "",
  postContent,
  imetas = [],
  editId = "",
  editPublishedAt,
}) {
  const dispatch = useDispatch();
  const userKeys = useSelector((state) => state.userKeys);
  const userRelays = useSelector((state) => state.userRelays);

  const [title, setTitle] = useState(initialTitle);
  const [summary, setSummary] = useState(initialSummary);
  const [coverUrl, setCoverUrl] = useState(initialCoverUrl);
  const [tagsInput, setTagsInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCoverUploading, setIsCoverUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const coverInputRef = useRef(null);

  const words = wordCount(postContent);
  const mins = readTime(postContent);

  const uploadCover = async (file) => {
    if (!file?.type.startsWith("image/")) return;
    setIsCoverUploading(true);
    const result = await FileUpload({ file, userKeys, includeImeta: false });
    setIsCoverUploading(false);
    if (result?.url) setCoverUrl(result.url);
    else dispatch(setToast({ type: 2, desc: "Cover image upload failed." }));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadCover(file);
  };

  const publish = async (kind = 30023) => {
    if (!title?.trim()) {
      dispatch(setToast({ type: 2, desc: "Title is required." }));
      return;
    }
    if (!postContent?.trim()) {
      dispatch(setToast({ type: 2, desc: "Article content is empty." }));
      return;
    }
    setIsLoading(true);

    const created_at = Math.floor(Date.now() / 1000);
    const dTag = editId || nanoid();

    const userTags = tagsInput
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean)
      .map((t) => ["t", t]);

    const processedContent = extractNip19(postContent);
    const imageRegex =
      /(?<!\!\[image\]\()https?:\/\/\S+\.(?:jpg|jpeg|png|gif|webp|bmp|svg)(?!\))/g;
    const eventContent = processedContent.content.replace(
      imageRegex,
      "![image]($&)",
    );

    const cloneTag = (t) => (Array.isArray(t) ? t.map(String) : t);

    const tags = [
      CLIENT_TAG.slice(),
      [
        "published_at",
        editPublishedAt ? String(editPublishedAt) : String(created_at),
      ],
      ["d", dTag],
      ["image", coverUrl],
      ["title", title],
      ["summary", summary],
      ...(isPremium ? [["-"], ["nip63"]] : []),
      ...userTags,
      ...processedContent.tags.filter((t) => t[0] !== "t").map(cloneTag),
      ...imetas.map(cloneTag),
    ];

    const eventInitEx = await InitEvent({ kind, content: eventContent, tags });
    if (!eventInitEx) {
      return;
    }

    const premiumRelays = userRelays
      .filter((r) => {
        const metadata = getRelayMetadata(r.url);
        return metadata?.supported_nips?.includes(63) && (r.read || r.write);
      })
      .map((r) => r.url);

    const relaysToPublish = isPremium ? premiumRelays : [];
    const success = await publishEvent(eventInitEx, relaysToPublish);

    setIsLoading(false);
    dispatch(
      setToast({
        type: 1,
        desc: kind === 30024 ? "Draft saved!" : "Article published!",
      }),
    );
    exit();
  };

  const parsedTags = tagsInput
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);

  return (
    <Overlay exit={exit} width={600}>
      <div className="fx-centered fx-col fit-container fx-gap-v-l">
        <div className="fit-container box-pad-h-m box-pad-v-m ">
          <h2 style={{ margin: 0 }}>Publish article</h2>
          <p>
            <span className="p-primary-c">{words.toLocaleString()}</span>{" "}
            <span className="p-secondary-c">words</span>
            {" ~ "}
            <span className="p-primary-c">{mins}</span>{" "}
            <span className="p-secondary-c">min read</span>
          </p>
        </div>

        <div className="fit-container fx-col box-pad-h-m">
          <input
            type="text"
            className="if ifs-full "
            placeholder="Article title…"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{
              border: "none",
              fontSize: "2rem",
              fontWeight: 600,
              borderRadius: 0,
              paddingLeft: 0,
            }}
            autoFocus
          />
        </div>

        <div
          className="fit-container fx-col box-pad-h-m"
          style={{ gap: "8px" }}
        >
          <p className="p-secondary-c">Cover image</p>

          {coverUrl ? (
            <div style={{ position: "relative" }}>
              <div
                style={{
                  height: "180px",
                  backgroundImage: `url(${coverUrl})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  borderRadius: "10px",
                  border: "1px solid var(--color-surface-border)",
                }}
              />
              <button
                onClick={() => setCoverUrl("")}
                style={{
                  position: "absolute",
                  top: "8px",
                  right: "8px",
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  border: "none",
                  background: "rgba(0,0,0,0.55)",
                  color: "#fff",
                  fontSize: "1rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>
          ) : (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => coverInputRef.current?.click()}
              style={{
                border: `2px dashed ${isDragging ? "var(--color-primary-accent)" : "var(--color-surface-border)"}`,
                borderRadius: "10px",
                padding: "2.5rem 1rem",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",

                cursor: "pointer",
                transition: "border-color 0.15s",
                backgroundColor: isDragging
                  ? "var(--color-primary-light)"
                  : "transparent",
              }}
            >
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadCover(f);
                }}
              />
              {isCoverUploading ? (
                <Spinner size={32} />
              ) : (
                <>
                  <ImgIcon />
                  <p style={{ margin: 0 }}>Select an image to upload</p>
                  <p className="p-secondary-c" style={{ margin: 0 }}>
                    or drag and drop a file
                  </p>
                  <Button
                    label="Select a file"
                    size="s"
                    style={{ marginTop: "4px" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      coverInputRef.current?.click();
                    }}
                  />
                </>
              )}
            </div>
          )}
        </div>

        <div
          className="fit-container fx-col box-pad-h-m"
          style={{ gap: "6px" }}
        >
          <p className="p-secondary-c">Summary</p>
          <textarea
            placeholder="A short description of your article…"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            style={{
              width: "100%",
              resize: "vertical",

              border: "none",
              borderLeft: "3px solid var(--color-primary-accent)",
              borderRadius: 0,
              background: "transparent",
              paddingLeft: "12px",
              paddingTop: "4px",
              paddingBottom: "4px",
              outline: "none",
              fontSize: "0.95rem",
              lineHeight: 1.6,
              color: "var(--color-text)",
              fontFamily: "inherit",
            }}
          />
        </div>

        <div
          className="fit-container fx-col box-pad-h-m "
          style={{ gap: "8px" }}
        >
          <p className="p-secondary-c">Tags</p>
          <input
            type="text"
            className="if ifs-full"
            placeholder="nostr, bitcoin, tech (comma-separated)"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
          />
          {parsedTags.length > 0 && (
            <div
              className="fx-centered fx-start-h fx-wrap"
              style={{ gap: "6px" }}
            >
              {parsedTags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "4px 12px",
                    borderRadius: "20px",
                    fontSize: "0.8rem",
                    fontWeight: 500,
                    backgroundColor: "var(--color-primary-light)",
                    color: "var(--color-primary-accent)",
                    border: "1px solid var(--color-primary-accent)",
                  }}
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <div
          className="fit-container fx-scattered box-pad-h-m box-pad-v-m "
          style={{
            borderTop: "1px solid var(--color-divider)",
            paddingTop: "12px",
          }}
        >
          <div className="fx-centered fx-gap-h border-all round-corner box-pad-h-s box-pad-v-xs">
            <Icon name={"crown"} />
            <p>Premium content</p>
            <Toggle
              small
              status={isPremium}
              setStatus={(val) => setIsPremium(val)}
            />
          </div>
          <div className="fx-centered fx-gap-h">
            <Button
              label="Save draft"
              type="gst"
              onClick={() => publish(30024)}
              disabled={isLoading}
            />
            <Button
              label={isLoading ? "Publishing…" : "Publish"}
              onClick={() => publish(30023)}
              disabled={isLoading}
              loading={isLoading}
            />
          </div>
        </div>
      </div>
    </Overlay>
  );
}
