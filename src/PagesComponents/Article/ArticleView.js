import ArticlePreviewer from "@/Components/ArticlePreviewer";
import Spinner from "@/Components/Spinner";
import { getSubData } from "@/Helpers/Helpers";
import { nip19 } from "nostr-tools";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

function getTag(tags, name) {
  const tag = tags?.find((t) => t[0] === name);
  return tag ? tag[1] : null;
}

function isPremium(tags) {
  if (!Array.isArray(tags)) return false;
  return tags.some((t) => Array.isArray(t) && t.includes("nip63"));
}

function formatDate(ts) {
  return new Date(ts * 1000).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function ArticleView({ naddr }) {
  const router = useRouter();
  const [event, setEvent] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!naddr) return;

    let decoded;
    try {
      decoded = nip19.decode(naddr);
    } catch {
      setError("Invalid article address.");
      setLoading(false);
      return;
    }

    if (decoded.type !== "naddr") {
      setError("Address is not a valid article reference.");
      setLoading(false);
      return;
    }

    const { kind, pubkey, identifier } = decoded.data;

    getSubData({
      filter: [
        {
          kinds: [kind],
          authors: [pubkey],
          "#d": [identifier],
          limit: 1,
        },
      ],
      timeout: 100,
    })
      .then(({ data }) => {
        if (data.length === 0) {
          setError("Article not found.");
        } else {
          setEvent(data[0]);
        }
      })
      .catch(() => setError("Failed to load article."))
      .finally(() => setLoading(false));
  }, [naddr]);

  if (loading) {
    return (
      <div className="fit-container fx-centered" style={{ minHeight: "60vh" }}>
        <Spinner size={36} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="fit-container fx-centered" style={{ minHeight: "60vh" }}>
        <p className="p-secondary-c">{error}</p>
      </div>
    );
  }

  const tags = event.tags || [];
  const title = getTag(tags, "title") || "Untitled";
  const image = getTag(tags, "image");
  const summary = getTag(tags, "summary");
  const premium = isPremium(tags);

  return (
    <div
      className="fx-centered fx-start-v fx-start-h box-pad-v-m box-pad-h no-scrollbar"
      style={{ width: "100%", height: "100vh", overflow: "scroll" }}
    >
      <div style={{ width: "100%" }}>
        <button
          className="btn btn-gst btn-s"
          style={{ marginBottom: "20px" }}
          onClick={() => router.back()}
        >
          ← Back
        </button>

        {/* Cover image */}
        {image && (
          <img
            src={image}
            alt=""
            style={{
              width: "100%",
              maxHeight: "360px",
              objectFit: "cover",
              borderRadius: "var(--radius-lg)",
              marginBottom: "28px",
              display: "block",
            }}
          />
        )}

        {/* Header */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            marginBottom: "28px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >
            <h1
              style={{ margin: 0, fontWeight: 700, lineHeight: 1.25, flex: 1 }}
            >
              {title}
            </h1>
            {premium && (
              <span
                style={{
                  flexShrink: 0,
                  fontSize: "0.72rem",
                  fontWeight: 600,
                  padding: "3px 12px",
                  borderRadius: "var(--radius-full)",
                  background: "var(--color-primary-accent)",
                  color: "#fff",
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                }}
              >
                Premium
              </span>
            )}
          </div>

          {summary && (
            <p
              className="p-secondary-c"
              style={{ margin: 0, fontSize: "1rem", lineHeight: 1.6 }}
            >
              {summary}
            </p>
          )}

          <span className="p-secondary-c" style={{ fontSize: "0.85rem" }}>
            {formatDate(event.created_at)}
          </span>
        </div>
        {/* Body */}
        <ArticlePreviewer content={event.content} />
      </div>
    </div>
  );
}
