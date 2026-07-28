import { useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { analyticsDb } from "@/lib/analyticsDb";
import {
  parseISO,
  format,
  endOfDay,
  endOfWeek,
  endOfMonth,
  getUnixTime,
  formatDistanceToNow,
  fromUnixTime,
} from "date-fns";
import { nip19 } from "nostr-tools";
import { getNoteTree } from "@/Components/NotePreview";
import { getSubData } from "@/Helpers/Helpers";
import Overlay from "@/Components/Overlay";
import Icon from "@/Components/LucideIcon";

export function intervalLabel(dateStr, bucket) {
  const d = parseISO(dateStr);
  if (bucket === "day") return format(d, "MMMM d, yyyy");
  if (bucket === "week") {
    const end = endOfWeek(d, { weekStartsOn: 1 });
    return `${format(d, "MMM d")} – ${format(end, "MMM d, yyyy")}`;
  }
  return format(d, "MMMM yyyy");
}

export function intervalBounds(dateStr, bucket) {
  const d = parseISO(dateStr);
  let end;
  if (bucket === "day")  end = endOfDay(d);
  else if (bucket === "week") end = endOfDay(endOfWeek(d, { weekStartsOn: 1 }));
  else end = endOfDay(endOfMonth(d));
  return [getUnixTime(d), getUnixTime(end)];
}

function eventLink(event) {
  try {
    if (event.kind === 30023 || event.kind === 30024) {
      const d = event.tags?.find((t) => t[0] === "d")?.[1] || "";
      return `https://yakihonne.com/${nip19.naddrEncode({ kind: event.kind, pubkey: event.pubkey, identifier: d })}`;
    }
    return `https://yakihonne.com/${nip19.neventEncode({ id: event.id, kind: event.kind, author: event.pubkey })}`;
  } catch {
    return null;
  }
}

const TYPE_META = {
  zaps:      { icon: "bolt-bold", color: "var(--color-primary-accent)", unit: "sats" },
  reactions: { icon: "heart",     color: "var(--color-primary-accent)", unit: "reactions" },
  notes:     { icon: "note-bold", color: "#6366f1", unit: "posts" },
};

async function fetchNDKEvents(eventIds) {
  if (!eventIds.length) return new Map();
  const { data } = await getSubData({
    filter: [{ ids: eventIds }],
    timeout: 3000,
    cacheUsage: "CACHE_FIRST",
  });
  const map = new Map();
  for (const e of data) map.set(e.id, e);
  return map;
}

function ContentCard({ row, ndkEvent, type }) {
  const effectiveKind = ndkEvent?.kind ?? row.kind;
  const isArticle = effectiveKind === 30023 || effectiveKind === 30024;
  const link = ndkEvent ? eventLink(ndkEvent) : null;

  const title =
    ndkEvent?.tags?.find((t) => t[0] === "title")?.[1] ||
    row.title ||
    null;

  const sinceLabel = formatDistanceToNow(fromUnixTime(ndkEvent?.created_at || row.publishedAt), {
    addSuffix: true,
  });

  const handleClick = () => {
    if (link) window.open(link, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      onClick={link ? handleClick : undefined}
      className="border-all round-corner"
      style={{
        padding: "0.875rem 1rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
        cursor: link ? "pointer" : "default",
        transition: "opacity 0.15s",
      }}
      onMouseEnter={(e) => { if (link) e.currentTarget.style.opacity = "0.8"; }}
      onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
        <span
          style={{
            fontSize: "0.7rem",
            fontWeight: 700,
            padding: "2px 8px",
            borderRadius: 4,
            background: isArticle ? "#8b5cf622" : "#3b82f622",
            color: isArticle ? "#8b5cf6" : "#3b82f6",
            letterSpacing: "0.03em",
            textTransform: "uppercase",
          }}
        >
          {isArticle ? "Article" : "Note"}
        </span>
        <span style={{ fontSize: "0.75rem" }} className="p-secondary-c">
          {sinceLabel}
        </span>
      </div>

      {isArticle && title ? (
        <p style={{ margin: 0, fontWeight: 600, fontSize: "0.9rem", lineHeight: 1.4 }} className="p-medium-c">
          {title}
        </p>
      ) : ndkEvent ? (
        <div
          style={{
            fontSize: "0.875rem",
            lineHeight: "1.55",
            wordBreak: "break-word",
            overflow: "hidden",
            display: "-webkit-box",
            WebkitLineClamp: 4,
            WebkitBoxOrient: "vertical",
          }}
          dir="auto"
          className="p-medium-c"
        >
          {getNoteTree(ndkEvent.content)}
        </div>
      ) : (
        <p style={{ margin: 0, fontSize: "0.875rem", lineHeight: 1.5 }} className="p-secondary-c">
          {row.summary || "(no content)"}
        </p>
      )}

      <div style={{ display: "flex", gap: "1rem", marginTop: "0.25rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <Icon name="heart" size={13} />
          <span
            style={{ fontSize: "0.78rem", fontWeight: type === "reactions" ? 700 : 400, color: type === "reactions" ? "var(--color-primary-accent)" : undefined }}
            className={type === "reactions" ? undefined : "p-secondary-c"}
          >
            {type === "reactions" && row._windowValue != null
              ? row._windowValue
              : (row.reactionsCount || 0)}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <Icon name="repost" size={13} />
          <span style={{ fontSize: "0.78rem" }} className="p-secondary-c">
            {row.repostsCount || 0}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <Icon name="bolt-bold" size={13} />
          <span
            style={{ fontSize: "0.78rem", fontWeight: type === "zaps" ? 700 : 400, color: type === "zaps" ? "var(--color-primary-accent)" : undefined }}
            className={type === "zaps" ? undefined : "p-secondary-c"}
          >
            {type === "zaps" && row._windowValue != null
              ? row._windowValue.toLocaleString()
              : (row.zapsSats ? row.zapsSats.toLocaleString() : 0)}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function BarDrillOverlay({ drill, pubkey, onClose }) {
  const { title, type, dateStr, bucket, value } = drill;
  const [since, until] = intervalBounds(dateStr, bucket);
  const [ndkEvents, setNdkEvents] = useState(new Map());

  const rows = useLiveQuery(async () => {
    if (!pubkey) return [];

    if (type === "notes") {
      const r = await analyticsDb.contentStats
        .where("authorPubkey").equals(pubkey)
        .filter((row) => row.publishedAt >= since && row.publishedAt <= until)
        .toArray();
      return r.sort((a, b) => b.publishedAt - a.publishedAt);
    }

    const statType = type === "reactions" ? "reaction" : "zap";

    const statRows = await analyticsDb.statEvents
      .where("[ownerPubkey+createdAt]")
      .between([pubkey, since], [pubkey, until], true, true)
      .filter((r) => r.statType === statType)
      .toArray();

    if (statRows.length === 0) return [];

    const totals = new Map();
    for (const r of statRows) {
      totals.set(r.contentEventId, (totals.get(r.contentEventId) || 0) + r.value);
    }

    const contentIds = Array.from(totals.keys());
    const contentRows = await analyticsDb.contentStats
      .where("eventId").anyOf(contentIds)
      .filter((r) => r.authorPubkey === pubkey)
      .toArray();

    // A stat can reference a note/article that hasn't been backfilled into contentStats yet
    // (e.g. the reaction/zap synced before the note itself did) — don't drop it from the list,
    // fall back to a stub row and let the NDK fetch below fill in the real content.
    const knownIds = new Set(contentRows.map((r) => r.eventId));
    const stubRows = contentIds
      .filter((id) => !knownIds.has(id))
      .map((id) => ({
        eventId: id,
        authorPubkey: pubkey,
        kind: 1,
        publishedAt: Math.floor(Date.now() / 1000),
        summary: "",
        reactionsCount: 0,
        repostsCount: 0,
        zapsCount: 0,
        zapsSats: 0,
      }));

    return [...contentRows, ...stubRows]
      .map((r) => ({ ...r, _windowValue: totals.get(r.eventId) || 0 }))
      .sort((a, b) => b._windowValue - a._windowValue);
  }, [pubkey, since, until, type]);

  useEffect(() => {
    if (!rows || rows.length === 0) return;
    const ids = rows.map((r) => r.eventId);
    fetchNDKEvents(ids).then(setNdkEvents);
  }, [rows]);

  const meta = TYPE_META[type];

  const subtitle = intervalLabel(dateStr, bucket);

  return (
    <Overlay exit={onClose} width={540}>
      <div
        className="border-bottom-p box-pad-h box-pad-v-m"
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: meta.color + "22",
              flexShrink: 0,
            }}
            className="fx-centered"
          >
            <Icon name={meta.icon} size={18} />
          </div>
          <div>
            <p style={{ margin: 0, fontWeight: 700, fontSize: "1rem" }} className="p-medium-c">
              {title}
            </p>
            <p style={{ margin: 0, fontSize: "0.8rem" }} className="p-secondary-c">
              {subtitle}
            </p>
          </div>
        </div>

        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <p style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700, color: meta.color, lineHeight: 1 }}>
            {value.toLocaleString()}
          </p>
          <p style={{ margin: 0, fontSize: "0.7rem" }} className="p-secondary-c">
            {meta.unit}
          </p>
        </div>
      </div>

      <div
        className="box-pad-h box-pad-v-m"
        style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
      >
        {rows === undefined && (
          <p className="p-secondary-c" style={{ textAlign: "center", padding: "1.5rem 0" }}>
            Loading…
          </p>
        )}
        {rows && rows.length === 0 && (
          <p className="p-secondary-c" style={{ textAlign: "center", padding: "1.5rem 0", fontSize: "0.875rem" }}>
            No content found for this period
          </p>
        )}
        {rows && rows.map((row) => (
          <ContentCard
            key={row.eventId}
            row={row}
            ndkEvent={ndkEvents.get(row.eventId)}
            type={type}
          />
        ))}
      </div>
    </Overlay>
  );
}
