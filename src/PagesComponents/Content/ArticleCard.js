import { useRouter } from "next/router";
import { nip19 } from "nostr-tools";

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

export default function ArticleCard({ event }) {
  const router = useRouter();
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

  return (
    <div
      onClick={() => router.push(`/article/${naddr}`)}
      className="fit-container"
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-divider)",
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        cursor: "pointer",
      }}
    >
      {image && (
        <img
          src={image}
          alt=""
          loading="lazy"
          style={{
            width: "100%",
            height: "160px",
            objectFit: "cover",
          }}
        />
      )}

      <div
        className="box-pad-h-m box-pad-v-m"
        style={{ display: "flex", flexDirection: "column", gap: "8px" }}
      >
        <div
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}
        >
          <h4 style={{ margin: 0, fontWeight: 600, lineHeight: 1.3, flex: 1 }}>
            {title}
          </h4>
          {premium && (
            <span
              style={{
                flexShrink: 0,
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
  );
}
