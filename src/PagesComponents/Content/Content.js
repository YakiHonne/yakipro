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

const EMPTY_LABELS = {
  "notes-published": "notes",
  "notes-paid": "paid notes",
  "notes-premium": "premium notes",
  "articles-published": "published articles",
  "articles-drafts": "drafts",
  "articles-premium": "premium articles",
};

const NOTE_FILTER_OPTIONS = [
  { value: "published", display_name: "Published" },
  { value: "scheduled", display_name: "Scheduled" },
  { value: "paid", display_name: "Paid notes" },
  { value: "premium", display_name: "Premium" },
];

// Each article filter maps to the kind it lists plus the hook's tag variant.
const ARTICLE_FILTERS = {
  published: { kind: 30023, variant: "all" },
  drafts: { kind: 30024, variant: "all" },
  premium: { kind: 30023, variant: "premium" },
};

export default function Content() {
  const { t } = useTranslation();
  const router = useRouter();
  const [selectedTab, setSelectedTab] = useState(0);
  const [articleFilter, setArticleFilter] = useState("published");
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

  const articleKind = ARTICLE_FILTERS[articleFilter].kind;
  const contentVariant =
    selectedTab === 0
      ? ["paid", "premium"].includes(noteFilter)
        ? noteFilter
        : "all"
      : ARTICLE_FILTERS[articleFilter].variant;
  const { events, loading, hasMore, sentinelRef, refresh } = useUserContent(
    selectedTab,
    articleKind,
    contentVariant,
  );
  const { scheduledEvents, loading: scheduledLoading } = useScheduledEvents();
  const [deletedIds, setDeletedIds] = useState(new Set());
  const [cancelledJobIds, setCancelledJobIds] = useState(new Set());

  const articleFilterOptions = [
    { value: "published", display_name: t("ACnt001") },
    { value: "drafts", display_name: t("ACnt002") },
    { value: "premium", display_name: "Premium" },
  ];

  const handleTabChange = (tab) => {
    setSelectedTab(tab);
    // Reset to published when switching back to the articles tab
    if (tab === 1) setArticleFilter("published");
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
            options={articleFilterOptions}
            value={articleFilter}
            onChange={setArticleFilter}
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
                No {EMPTY_LABELS[selectedTab === 0 ? `notes-${noteFilter}` : `articles-${articleFilter}`]} found.
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
