import { SelectTabs } from "@/Components/SelectTabs";
import Select from "@/Components/UI/Select";
import Spinner from "@/Components/Spinner";
import useUserContent from "@/hooks/useUserContent";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import ArticleCard from "./ArticleCard";
import NoteCard from "./NoteCard";

export default function Content() {
  const { t } = useTranslation();
  const [selectedTab, setSelectedTab] = useState(0);
  const [articleKind, setArticleKind] = useState(30023);
  const { events, loading, hasMore, sentinelRef, refresh } = useUserContent(selectedTab, articleKind);
  const [deletedIds, setDeletedIds] = useState(new Set());

  const articleKindOptions = [
    { value: 30023, display_name: t("ACnt001") },
    { value: 30024, display_name: t("ACnt002") },
  ];

  const handleTabChange = (tab) => {
    setSelectedTab(tab);
    // Reset to published when switching back to the articles tab
    if (tab === 1) setArticleKind(30023);
  };

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

      <div className="fit-container fx-scattered">
        <SelectTabs
          tabs={["Notes", "Articles"]}
          selectedTab={selectedTab}
          setSelectedTab={handleTabChange}
        />
        {selectedTab === 1 && (
          <Select
            options={articleKindOptions}
            value={articleKind}
            onChange={(val) => setArticleKind(Number(val))}
          />
        )}
      </div>

      <div className="fit-container fx-col fx-start-v" style={{ gap: "12px" }}>
        {visible.length === 0 && !loading && (
          <p className="p-secondary-c" style={{ textAlign: "center", padding: "32px 0" }}>
            No {selectedTab === 0 ? "notes" : articleKind === 30023 ? "published articles" : "drafts"} found.
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
