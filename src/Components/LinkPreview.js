import React, { useEffect, useState, memo } from "react";
import axios from "axios";
import { urlCache } from "@/Helpers/previewCache";

const NOT_FOUND = "NOT_FOUND";

async function fetchLinkMeta(url) {
  try {
    const res = await Promise.race([
      axios.get(
        "https://api.yakihonne.com/link-preview?url=" +
          encodeURIComponent(url),
        { timeout: 5000 },
      ),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 5500),
      ),
    ]);
    if (res?.data) {
      return { ...res.data, domain: new URL(url).hostname };
    }
    return null;
  } catch {
    return null;
  }
}

function SkeletonCard() {
  return (
    <div
      style={{
        height: 90,
        borderRadius: 10,
        background: "var(--color-primary-bg-side)",
        border: "1px solid var(--color-divider)",
        margin: "6px 0",
        overflow: "hidden",
        display: "flex",
        animation: "lp-pulse 1.4s ease-in-out infinite",
      }}
    >
      <div style={{ width: 90, background: "var(--color-primary-bg-side2)", flexShrink: 0 }} />
      <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
        <div style={{ height: 10, width: "40%", borderRadius: 6, background: "var(--color-primary-bg-side2)" }} />
        <div style={{ height: 13, width: "80%", borderRadius: 6, background: "var(--color-primary-bg-side2)" }} />
        <div style={{ height: 10, width: "60%", borderRadius: 6, background: "var(--color-primary-bg-side2)" }} />
      </div>
    </div>
  );
}

function LinkPreview({ url }) {
  const [meta, setMeta] = useState(() => {
    const cached = urlCache.get(url);
    return cached || null;
  });
  const [loading, setLoading] = useState(!urlCache.has(url));

  useEffect(() => {
    if (urlCache.has(url)) {
      setMeta(urlCache.get(url));
      setLoading(false);
      return;
    }

    let cancelled = false;
    fetchLinkMeta(url).then((data) => {
      if (cancelled) return;
      const result = data || NOT_FOUND;
      urlCache.set(url, result);
      setMeta(result);
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [url]);

  if (loading) return <SkeletonCard />;

  // No metadata or failed → plain link
  if (!meta || meta === NOT_FOUND) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        style={{
          color: "var(--color-primary-accent)",
          wordBreak: "break-all",
          textDecoration: "underline",
          fontSize: "0.9rem",
        }}
      >
        {url}
      </a>
    );
  }

  const coverImage = meta.image || meta.ogImage || "";
  const favicon = meta.favicon || "";
  const title = meta.title || meta.ogTitle || "Untitled";
  const description = meta.description || meta.ogDescription || "";

  return (
    <>
      <style>{`
        @keyframes lp-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.55; }
        }
        .lp-card:hover { border-color: var(--color-primary-accent) !important; }
      `}</style>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="lp-card"
        style={{
          display: "flex",
          borderRadius: 10,
          border: "1px solid var(--color-divider)",
          background: "var(--color-primary-bg-side)",
          margin: "6px 0",
          overflow: "hidden",
          textDecoration: "none",
          color: "var(--color-text)",
          transition: "border-color 0.15s",
          maxWidth: "100%",
        }}
      >
        {/* Thumbnail */}
        {coverImage ? (
          <div
            style={{
              width: 90,
              minWidth: 90,
              backgroundImage: `url(${coverImage})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundColor: "var(--color-primary-bg-side2)",
              flexShrink: 0,
            }}
          />
        ) : (
          <div
            style={{
              width: 90,
              minWidth: 90,
              background: "var(--color-primary-bg-side2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.6rem",
              flexShrink: 0,
            }}
          >
            🔗
          </div>
        )}

        {/* Text section */}
        <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 4, minWidth: 0, flex: 1 }}>
          {/* Domain + favicon */}
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            {favicon && (
              <img
                src={favicon}
                alt=""
                style={{ width: 14, height: 14, borderRadius: 3, objectFit: "contain" }}
              />
            )}
            <span style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              {meta.domain}
            </span>
          </div>

          {/* Title */}
          <span style={{
            fontSize: "0.88rem", fontWeight: 600,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            color: "var(--color-text)",
          }}>
            {title}
          </span>

          {/* Description */}
          {description && (
            <span style={{
              fontSize: "0.78rem", color: "var(--color-text-secondary)",
              display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
            }}>
              {description}
            </span>
          )}
        </div>
      </a>
    </>
  );
}

const areEqual = (prev, next) => prev.url === next.url;
export default memo(LinkPreview, areEqual);
