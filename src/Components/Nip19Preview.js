import React, { useEffect, useState, memo } from "react";
import { nip19 } from "nostr-tools";
import { ndkInstance } from "@/Helpers/NDKInstance";
import { getParsedAuthor } from "@/Helpers/Encryptions";
import { eventCache, authorCache } from "@/Helpers/previewCache";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function cacheKey(addr) {
  return addr.replace(/[,.:;@?!]+/g, "").trim();
}

function buildFilter(addr) {
  try {
    const clean = cacheKey(addr);
    if (clean.startsWith("naddr")) {
      const { data } = nip19.decode(clean);
      return {
        filter: [{ kinds: [data.kind], "#d": [data.identifier], authors: [data.pubkey] }],
        relays: data.relays || [],
        type: "naddr",
        kind: data.kind,
        pubkey: data.pubkey,
        href: buildHref(clean, data.kind),
      };
    }
    if (clean.startsWith("nprofile")) {
      const { data } = nip19.decode(clean);
      return {
        filter: [{ kinds: [0], authors: [data.pubkey] }],
        relays: data.relays || [],
        type: "nprofile",
        pubkey: data.pubkey,
        href: `/profile/${clean}`,
      };
    }
    if (clean.startsWith("npub")) {
      const { data } = nip19.decode(clean);
      const pubkey = typeof data === "string" ? data : data.pubkey;
      return {
        filter: [{ kinds: [0], authors: [pubkey] }],
        relays: [],
        type: "npub",
        pubkey,
        href: `/profile/${clean}`,
      };
    }
    if (clean.startsWith("nevent")) {
      const { data } = nip19.decode(clean);
      return {
        filter: [{ ids: [data.id] }],
        relays: data.relays || [],
        type: "nevent",
        pubkey: data.author || null,
        href: `/note/${clean}`,
      };
    }
    if (clean.startsWith("note1")) {
      const { data } = nip19.decode(clean);
      const id = typeof data === "string" ? data : data.id;
      return {
        filter: [{ ids: [id] }],
        relays: [],
        type: "note",
        pubkey: null,
        href: `/note/${clean}`,
      };
    }
    return null;
  } catch {
    return null;
  }
}

function buildHref(clean, kind) {
  if (kind === 30023) return `/article/${clean}`;
  if ([30004, 30005].includes(kind)) return `/curation/${clean}`;
  if ([34235, 21, 22, 20].includes(kind)) return `/video/${clean}`;
  return `/${clean}`;
}

function parseRawEvent(rawEvent) {
  if (rawEvent.kind === 0) return getParsedAuthor(rawEvent);
  if (rawEvent.kind === 1) return { ...rawEvent, _type: "note" };
  const tags = rawEvent.tags || [];
  const get = (name) => tags.find((t) => t[0] === name)?.[1] || "";
  return {
    ...rawEvent,
    _type: "article",
    title: get("title") || get("subject") || "Untitled",
    image: get("image") || get("thumb") || "",
    summary: get("summary") || "",
  };
}

// ─── Author fetching (with cache) ─────────────────────────────────────────────

function fetchAuthor(pubkey, onResult) {
  if (!pubkey) return;
  if (authorCache.has(pubkey)) {
    onResult(authorCache.get(pubkey));
    return;
  }
  const sub = ndkInstance.subscribe(
    [{ kinds: [0], authors: [pubkey] }],
    { cacheUsage: "CACHE_FIRST", groupable: false, subId: `author-${pubkey.slice(0, 8)}` },
  );
  sub.on("event", (ev) => {
    const parsed = getParsedAuthor(ev.rawEvent ? ev.rawEvent() : ev);
    authorCache.set(pubkey, parsed);
    onResult(parsed);
    sub.stop();
  });
  const timer = setTimeout(() => sub.stop(), 4000);
  sub.on("close", () => clearTimeout(timer));
}

// ─── UI atoms ─────────────────────────────────────────────────────────────────

const S = {
  card: {
    display: "block",
    borderRadius: "10px",
    border: "1px solid var(--color-divider)",
    background: "var(--color-primary-bg-side)",
    margin: "6px 0",
    textDecoration: "none",
    color: "var(--color-text)",
    overflow: "hidden",
    maxWidth: "100%",
    cursor: "pointer",
    transition: "border-color 0.15s",
  },
  label: {
    fontSize: "0.72rem",
    color: "var(--color-text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    fontWeight: 600,
    marginBottom: "4px",
    display: "block",
  },
  pill: {
    display: "inline-flex",
    alignItems: "center",
    verticalAlign: "middle",
    gap: "6px",
    padding: "2px 8px 2px 4px",
    borderRadius: "999px",
    border: "1px solid var(--color-divider)",
    background: "var(--color-primary-bg-side)",
    textDecoration: "none",
    color: "var(--color-text)",
    fontSize: "0.83rem",
    fontWeight: 500,
    maxWidth: "fit-content",
    flexShrink: 0,
    lineHeight: 1,
  },
};

function Avatar({ picture, name, size = 24 }) {
  if (picture)
    return (
      <img
        src={picture}
        alt=""
        style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
      />
    );
  return (
    <span
      style={{
        width: size, height: size, borderRadius: "50%",
        background: "var(--color-primary-accent)",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        color: "#fff", fontSize: size * 0.42, fontWeight: 700, flexShrink: 0,
      }}
    >
      {(name || "?")[0].toUpperCase()}
    </span>
  );
}

function AuthorLine({ author }) {
  if (!author) return null;
  const name = author.display_name || author.name || author.pubkey?.slice(0, 12);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
      <Avatar picture={author.picture} name={name} size={20} />
      <span style={{ fontSize: "0.78rem", color: "var(--color-text-secondary)", fontWeight: 500 }}>
        {name}
      </span>
    </div>
  );
}

function Skeleton() {
  return (
    <span
      style={{
        display: "inline-block", width: 100, height: 14, borderRadius: 6,
        background: "var(--color-primary-bg-side2)",
        verticalAlign: "middle",
      }}
    />
  );
}

function FallbackPill({ addr, href }) {
  const label = addr.slice(0, 12) + "…";
  return (
    <a href={href || `/${addr}`} target="_blank" rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      style={{ color: "var(--color-primary-accent)", fontWeight: 500, textDecoration: "none" }}>
      @{label}
    </a>
  );
}

// ─── Card variants ────────────────────────────────────────────────────────────

function UserCard({ event, href }) {
  const name = event.display_name || event.name || event.pubkey?.slice(0, 12);
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()} style={S.pill}>
      <Avatar picture={event.picture} name={name} size={22} />
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        @{name}
      </span>
    </a>
  );
}

function NoteCard({ event, author, href }) {
  const content = event.content || "";
  const preview = content.length > 200 ? content.slice(0, 200) + "…" : content;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      style={{ ...S.card, padding: "10px 14px" }}>
      <span style={S.label}>Nostr note ↗</span>
      <AuthorLine author={author} />
      <span style={{ fontSize: "0.88rem", lineHeight: 1.55, wordBreak: "break-word", display: "block" }}>
        {preview}
      </span>
    </a>
  );
}

function ArticleCard({ event, author, href }) {
  const { title, image, summary } = event;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      style={{ ...S.card, display: "flex", gap: 12 }}>
      {image && (
        <img src={image} alt="" style={{
          width: 80, minWidth: 80, objectFit: "cover",
          alignSelf: "stretch", borderRadius: "10px 0 0 10px",
        }} />
      )}
      <div style={{ padding: "10px 14px 10px 0", minWidth: 0, flex: 1 }}>
        <span style={S.label}>
          {[30004, 30005].includes(event.kind) ? "Curation ↗"
            : [34235, 21, 22].includes(event.kind) ? "Video ↗"
              : "Article ↗"}
        </span>
        <AuthorLine author={author} />
        <strong style={{
          fontSize: "0.9rem", display: "block",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {title}
        </strong>
        {summary && (
          <span style={{
            fontSize: "0.8rem", color: "var(--color-text-secondary)",
            display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
          }}>
            {summary}
          </span>
        )}
      </div>
    </a>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

function Nip19Preview({ addr }) {
  const key = cacheKey(addr);
  const [event, setEvent] = useState(() => eventCache.get(key) || null);
  const [author, setAuthor] = useState(() => {
    const ev = eventCache.get(key);
    return ev?.pubkey ? authorCache.get(ev.pubkey) || null : null;
  });
  const [loading, setLoading] = useState(!eventCache.has(key));
  const [meta, setMeta] = useState(null);

  // Fetch event if not cached
  useEffect(() => {
    if (eventCache.has(key)) {
      const cached = eventCache.get(key);
      setEvent(cached);
      if (cached?.pubkey) fetchAuthor(cached.pubkey, setAuthor);
      setLoading(false);
      return;
    }

    const parsed = buildFilter(addr);
    if (!parsed) { setLoading(false); return; }
    setMeta({ href: parsed.href, type: parsed.type });

    // Pre-fetch author from hint if available
    if (parsed.pubkey) fetchAuthor(parsed.pubkey, setAuthor);

    const sub = ndkInstance.subscribe(parsed.filter, {
      cacheUsage: "CACHE_FIRST",
      groupable: false,
      subId: `nip19-${key.slice(0, 12)}`,
      relayUrls: parsed.relays?.length > 0 ? parsed.relays : ndkInstance.explicitRelayUrls,
    });

    sub.on("event", (ev) => {
      if (!ev.id) return;
      const raw = ev.rawEvent ? ev.rawEvent() : ev;
      const parsed_ = parseRawEvent(raw);
      eventCache.set(key, parsed_);
      setEvent(parsed_);
      setLoading(false);

      // Fetch / cache author
      const pubkey = raw.pubkey;
      if (pubkey) {
        if (authorCache.has(pubkey)) {
          setAuthor(authorCache.get(pubkey));
        } else {
          fetchAuthor(pubkey, (a) => {
            authorCache.set(pubkey, a);
            setAuthor(a);
          });
        }
      }
      sub.stop();
    });

    const timer = setTimeout(() => { setLoading(false); sub.stop(); }, 4000);
    return () => { sub.stop(); clearTimeout(timer); };
  }, [key]);

  // Determine link href
  const href = meta?.href || (() => {
    const parsed = buildFilter(addr);
    return parsed?.href || `/${addr}`;
  })();

  if (loading) return <Skeleton />;
  if (!event) return <FallbackPill addr={addr} href={href} />;

  if (event.kind === 0) return <UserCard event={event} href={href} />;
  if (event.kind === 1) return <NoteCard event={event} author={author} href={href} />;
  if ([30023, 30004, 30005, 34235, 21, 22, 20].includes(event.kind))
    return <ArticleCard event={event} author={author} href={href} />;

  return <FallbackPill addr={addr} href={href} />;
}

const areEqual = (prev, next) => prev.addr === next.addr;
export default memo(Nip19Preview, areEqual);
