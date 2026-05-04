import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setToPublish, setToast } from "@/Store/Slices/Publishers";
import { nanoid } from "nanoid";
import { extractNip19 } from "@/Helpers/NoteHelpers";
import Overlay from "@/Components/Overlay";
import UploadFile from "@/Components/UploadFile";
import Icon from "@/Components/Icon";

const CLIENT_TAG = [
  "client",
  "Yakihonne",
  "31990:20986fb83e775d96d188ca5c9df10ce6d613e0eb7e5768a0f0b12b37cdac21b3:1700732875747",
];

export default function ArticlePublishModal({
  exit,
  postTitle,
  postContent,
  imetas = [],
  editId = "",
  editPublishedAt,
}) {
  const dispatch = useDispatch();
  const userKeys = useSelector((state) => state.userKeys);

  const [summary, setSummary] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const publish = async (kind = 30023) => {
    if (!postTitle?.trim() || !postContent?.trim()) {
      dispatch(setToast({ type: 2, desc: "Title and content are required." }));
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

    const tags = [
      CLIENT_TAG,
      ["published_at", editPublishedAt ? String(editPublishedAt) : String(created_at)],
      ["d", dTag],
      ["image", coverUrl],
      ["title", postTitle],
      ["summary", summary],
      ...userTags,
      ...processedContent.tags.filter((t) => t[0] !== "t"),
      ...imetas,
    ];

    dispatch(setToPublish({ kind, content: eventContent, tags }));

    setTimeout(() => {
      setIsLoading(false);
      dispatch(setToast({ type: 1, desc: kind === 30024 ? "Draft saved!" : "Article published!" }));
      exit();
    }, 1000);
  };

  return (
    <Overlay exit={exit} width={560}>
      <div
        className="fx-centered fx-col fit-container box-pad-h box-pad-v"
        style={{ gap: "1.2rem" }}
      >
        <h4>Publish Article</h4>

        {/* Cover image */}
        <div className="fit-container fx-col" style={{ gap: "8px" }}>
          <p className="p-bold">Cover image</p>
          <div className="fx-centered" style={{ gap: "12px" }}>
            <div
              className="pointer fx-centered"
              title="Upload cover image"
            >
              <UploadFile
                kind="image/*"
                setImageURL={(url) => setCoverUrl(url.trim())}
              />
            </div>
            <input
              type="text"
              className="if ifs-full"
              placeholder="Or paste image URL..."
              value={coverUrl}
              onChange={(e) => setCoverUrl(e.target.value)}
            />
          </div>
          {coverUrl && (
            <div
              style={{
                height: "120px",
                backgroundImage: `url(${coverUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                borderRadius: "8px",
                border: "1px solid var(--pale-gray)",
              }}
            />
          )}
        </div>

        {/* Summary */}
        <div className="fit-container fx-col" style={{ gap: "8px" }}>
          <p className="p-bold">Summary</p>
          <textarea
            className="if ifs-full"
            placeholder="A short description of your article..."
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={3}
            style={{ resize: "vertical", minHeight: "72px" }}
          />
        </div>

        {/* Tags */}
        <div className="fit-container fx-col" style={{ gap: "8px" }}>
          <p className="p-bold">Tags</p>
          <input
            type="text"
            className="if ifs-full"
            placeholder="nostr, bitcoin, tech (comma-separated)"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
          />
        </div>

        {/* Actions */}
        <div className="fit-container fx-scattered">
          <button
            className="btn btn-gst"
            onClick={() => publish(30024)}
            disabled={isLoading}
          >
            Save draft
          </button>
          <button
            className="btn btn-normal"
            onClick={() => publish(30023)}
            disabled={isLoading}
          >
            {isLoading ? "Publishing..." : "Publish"}
          </button>
        </div>
      </div>
    </Overlay>
  );
}
