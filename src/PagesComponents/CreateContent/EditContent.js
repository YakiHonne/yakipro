import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { nip19 } from "nostr-tools";
import { getSubData } from "@/Helpers/Helpers";
import ArticleEditorV2 from "./ArticleEditorV2";
import Spinner from "@/Components/Spinner";

export default function EditContent() {
  const router = useRouter();
  const { naddr } = router.query;

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!naddr) return;

    let decoded;
    try {
      decoded = nip19.decode(naddr);
    } catch {
      setError("Invalid article identifier.");
      setLoading(false);
      return;
    }

    if (decoded.type !== "naddr") {
      setError("Invalid article identifier.");
      setLoading(false);
      return;
    }

    const { kind, pubkey, identifier } = decoded.data;

    getSubData({
      filter: [{ kinds: [kind], authors: [pubkey], "#d": [identifier] }],
      timeout: 100,
      cacheUsage: "CACHE_FIRST",
    })
      .then(({ data }) => {
        if (!data || data.length === 0) {
          setError("Article not found.");
          return;
        }
        // Pick the most recent version
        const sorted = [...data].sort((a, b) => b.created_at - a.created_at);
        setEvent(sorted[0]);
      })
      .catch(() => setError("Failed to load article."))
      .finally(() => setLoading(false));
  }, [naddr]);

  if (loading) {
    return (
      <div
        className="fit-container box-pad-h-m box-pad-v-m fx-col no-scrollbar"
        style={{ height: "100dvh", overflow: "scroll", gap: "1.5rem" }}
      >
        <div>
          <h1>Edit article</h1>
          <p className="gray-c">Loading article…</p>
        </div>
        <div className="fit-container fx-centered" style={{ flex: 1 }}>
          <Spinner />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="fit-container box-pad-h-m box-pad-v-m fx-col no-scrollbar"
        style={{ height: "100dvh", overflow: "scroll", gap: "1.5rem" }}
      >
        <div>
          <h1>Edit article</h1>
          <p className="gray-c">Something went wrong</p>
        </div>
        <div className="fit-container fx-centered" style={{ flex: 1 }}>
          <p className="p-secondary-c">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fit-container box-pad-h-m box-pad-v-m fx-col no-scrollbar"
      style={{ height: "100dvh", overflow: "scroll", gap: "1.5rem" }}
    >
      <div>
        <h1>Edit article</h1>
        <p className="gray-c">Make changes and republish.</p>
      </div>
      <ArticleEditorV2 editEvent={event} />
    </div>
  );
}
