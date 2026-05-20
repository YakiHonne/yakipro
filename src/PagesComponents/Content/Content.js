import { SelectTabs } from "@/Components/SelectTabs";
import Spinner from "@/Components/Spinner";
import useUserContent from "@/hooks/useUserContent";
import React, { useState } from "react";
import ArticleCard from "./ArticleCard";
import NoteCard from "./NoteCard";

export default function Content() {
  const [selectedTab, setSelectedTab] = useState(0);
  const { events, loading, hasMore, sentinelRef, refresh } = useUserContent(selectedTab);
  const [deletedIds, setDeletedIds] = useState(new Set());

  const handleDelete = (id) => {
    setDeletedIds((prev) => new Set([...prev, id]));
  };

  const visible = events.filter((e) => !deletedIds.has(e.id));

  return (
    <div
      className="fit-container fx-centered fx-start-v fx-col fx-start-h box-pad-h box-pad-v"
      style={{ gap: "16px", height: "100vh", overflow: "scroll" }}
    >
      <h3>My published content</h3>
      <p className="p-secondary-c">Manage your published content</p>

      <SelectTabs
        tabs={["Notes", "Articles"]}
        selectedTab={selectedTab}
        setSelectedTab={setSelectedTab}
      />

      <div className="fit-container fx-col fx-start-v" style={{ gap: "12px" }}>
        {visible.length === 0 && !loading && (
          <p className="p-secondary-c" style={{ textAlign: "center", padding: "32px 0" }}>
            No {selectedTab === 0 ? "notes" : "articles"} found.
          </p>
        )}

        {visible.map((event) =>
          selectedTab === 0 ? (
            <NoteCard key={event.id} event={event} onDelete={handleDelete} />
          ) : (
            <ArticleCard key={event.id} event={event} onDelete={handleDelete} />
          ),
        )}

        <div ref={sentinelRef} className="fx-centered box-pad-v fit-container">
          {loading && <Spinner />}
          {!loading && !hasMore && visible.length > 0 && (
            <span className="p-secondary-c" style={{ fontSize: "0.85rem" }}>
              All content loaded
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
