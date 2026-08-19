import { SelectTabs } from "@/Components/SelectTabs";
import Select from "@/Components/UI/Select";
import Spinner from "@/Components/Spinner";
import useUserContent from "@/hooks/useUserContent";
import useScheduledEvents from "@/hooks/useScheduledEvents";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useTranslation } from "react-i18next";
import ArticleCard from "./ArticleCard";
import NoteCard from "./NoteCard";
import ScheduledNoteCard from "./ScheduledNoteCard";

const TAB_LABELS = ["Notes", "Articles"];

const NOTE_FILTER_OPTIONS = [
  { value: "published", display_name: "Published" },
  { value: "scheduled", display_name: "Scheduled" },
];

export default function Content() {
  const { t } = useTranslation();
  const router = useRouter();
  const [selectedTab, setSelectedTab] = useState(0);
  const [articleKind, setArticleKind] = useState(30023);
  const [noteFilter, setNoteFilter] = useState("published");
  // Landing here from the publish overlay carries ?tab=, so the author sees the
  // list their content actually went into. Read on router readiness rather than
  // on mount: query is empty during the first render of a client-side nav.
  useEffect(() => {
    if (!router.isReady) return;
    const tab = router.query.tab;
    if (tab === "articles") setSelectedTab(1);
    else if (tab === "notes") setSelectedTab(0);
  }, [router.isReady, router.query.tab]);

  const { events, loading, hasMore, sentinelRef, refresh } = useUserContent(selectedTab, articleKind);
  const { scheduledEvents, loading: scheduledLoading } = useScheduledEvents();
  const [deletedIds, setDeletedIds] = useState(new Set());
  const [cancelledJobIds, setCancelledJobIds] = useState(new Set());

  const articleKindOptions = [
    { value: 30023, display_name: t("ACnt001") },
    { value: 30024, display_name: t("ACnt002") },
  ];

  const handleTabChange = (tab) => {
    setSelectedTab(tab);
    // Reset to published when switching back to the articles tab
    if (tab === 1) setArticleKind(30023);
    if (tab === 0) setNoteFilter("published");
  };

  const handleDelete = (id) => {
    setDeletedIds((prev) => new Set([...prev, id]));
  };

  const handleCancelScheduled = (jobId) => {
    setCancelledJobIds((prev) => new Set([...prev, jobId]));
  };

  const visible = events.filter((e) => !deletedIds.has(e.id));
  const visibleScheduled = scheduledEvents.filter(
    (job) => !cancelledJobIds.has(job.jobId),
  );
  const showScheduled = selectedTab === 0 && noteFilter === "scheduled";

  return (
    <div
      className="fit-container fx-centered fx-start-v fx-col fx-start-h box-pad-h box-pad-v"

    >
      <h1 className="box-pad-v-m">My published content</h1>

      <div className="fit-container fx-scattered box-marg-s">
        <div>
          <SelectTabs
            tabs={TAB_LABELS}
            selectedTab={selectedTab}
            setSelectedTab={handleTabChange}
          />
        </div>
        {selectedTab === 1 && (
          <Select
            options={articleKindOptions}
            value={articleKind}
            onChange={(val) => setArticleKind(Number(val))}
          />
        )}
        {selectedTab === 0 && (
          <Select
            options={NOTE_FILTER_OPTIONS}
            value={noteFilter}
            onChange={setNoteFilter}
          />
        )}
      </div>

      <div className="fit-container fx-col fx-start-v" style={{ gap: "12px" }}>
        {showScheduled ? (
          <>
            {visibleScheduled.length === 0 && !scheduledLoading && (
              <p className="p-secondary-c" style={{ textAlign: "center", padding: "32px 0" }}>
                No scheduled notes found.
              </p>
            )}
            {visibleScheduled.map((job) => (
              <ScheduledNoteCard
                key={job.jobId}
                job={job}
                onCancelled={handleCancelScheduled}
              />
            ))}
            {scheduledLoading && (
              <div className="fx-centered box-pad-v fit-container">
                <Spinner />
              </div>
            )}
          </>
        ) : (
          <>
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

            <div
              ref={sentinelRef}
              className="fx-centered box-pad-v fit-container"
              style={{ minHeight: "60px" }}
            >
              {loading && <Spinner />}
              {!loading && !hasMore && visible.length > 0 && (
                <span className="p-secondary-c" style={{ fontSize: "0.85rem" }}>
                  All content loaded
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
