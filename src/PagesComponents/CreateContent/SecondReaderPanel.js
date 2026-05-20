import React, { useState, useEffect, useCallback, useRef } from "react";
import { useDispatch } from "react-redux";
import {
  analyzeFullArticle,
  analyzeParagraph,
} from "@/Endpoionts/SecondReaderAI";
import { PERSONAS } from "@/Content/SecondReaderPersonas";
import aiChatDb from "@/lib/aiChatDb";
import { setToast } from "@/Store/Slices/Extras";

// ─── Simple hash to detect article changes ────────────────────────────────────

function hashString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return String(h);
}

// ─── Persistence helpers ──────────────────────────────────────────────────────

// Load without hash validation — invalidation is handled separately
// once the editor has fully restored its content.
async function loadStoredReactions(personaId) {
  try {
    const row = await aiChatDb.secondReaderReactions.get(personaId);
    if (!row) return null;
    return { reactions: row.reactions ?? [], contentHash: row.contentHash };
  } catch {
    return null;
  }
}

async function saveStoredReactions(personaId, reactions, contentHash) {
  try {
    await aiChatDb.secondReaderReactions.put({
      personaId,
      reactions,
      contentHash,
      updatedAt: Date.now(),
    });
  } catch {}
}

async function deleteStoredReactions(personaId) {
  try {
    await aiChatDb.secondReaderReactions.delete(personaId);
  } catch {}
}

// ─── Persona Picker ───────────────────────────────────────────────────────────

function PersonaPicker({ onSelect, isAnalyzing, onClose, lastUsedPersonaId }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        overflow: "hidden",
      }}
      className="border-all round-corner-l bg-main-c pos-relative"
    >
      <div
        className="close pos-absolute pos-right-16 pos-top-16"
        onClick={onClose}
        style={{ zIndex: 1 }}
      >
        <div></div>
      </div>
      <div style={{ padding: "16px 16px 0" }}>
        <h3>Second reader</h3>
        <p>Choose your Second Reader</p>
        <p className="p-secondary-c p-medium">
          An AI persona that reacts to your writing as you type
        </p>
      </div>

      <div style={{ position: "relative", flex: 1, overflow: "hidden" }}>
        <div
          className="fx-centered fx-col fx-start-h fit-container fx-gap-v-m box-pad-h-m box-pad-v-m"
          style={{ overflowY: "auto", height: "100%" }}
        >
          {PERSONAS.map((p) => {
            const isLastUsed = p.id === lastUsedPersonaId;
            return (
              <div
                key={p.id}
                className="pointer fx-centered fx-start-v  fx-gap-h-l fit-container border-all round-corner-m bg-hover box-pad-h-m box-pad-v-m"
                onClick={() => !isAnalyzing && onSelect(p)}
                style={{
                  opacity: isAnalyzing ? 0.5 : 1,
                  cursor: isAnalyzing ? "not-allowed" : "pointer",
                  borderColor: isLastUsed
                    ? "var(--color-primary-accent)"
                    : undefined,
                  position: "relative",
                }}
              >
                <div
                  className="round-corner-xl bg-img bg-cover"
                  style={{
                    backgroundImage: `url(${p.image})`,
                    minWidth: "58px",
                    minHeight: "58px",
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p className="p-caps-s">{p.name}</p>
                  <p className="p-medium p-primary-c">{p.role}</p>
                  <p className="p-medium p-secondary-c">{p.description}</p>
                </div>
                {isLastUsed && (
                  <span className="sr-switch-btn" style={{ cursor: "default" }}>
                    Last used
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {isAnalyzing && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "var(--color-background)",
              opacity: 0.88,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
            }}
          >
            <div
              className="sr-analyzing-dot"
              style={{ width: 10, height: 10 }}
            />
            <p style={{ fontSize: "0.82rem" }} className="p-secondary-c">
              Reading your article…
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sentiment icon ───────────────────────────────────────────────────────────

function SentimentIcon({ sentiment }) {
  if (sentiment === "positive") return <span>👍</span>;
  if (sentiment === "negative") return <span>👎</span>;
  return <span>💬</span>;
}

// ─── Single reaction card ─────────────────────────────────────────────────────

function ReactionCard({ reaction, onFocus, onFix, onIgnore }) {
  const isIgnored = reaction.status === "ignored";
  const isFixed = reaction.status === "fixed";
  const isResolved = isIgnored || isFixed;

  const severityClass =
    reaction.severity === "warning"
      ? " severity-warning"
      : reaction.severity === "critical"
        ? " severity-critical"
        : "";

  return (
    <div
      className={`sr-reaction-card${severityClass}${isResolved ? " sr-reaction-ignored" : ""}`}
      onClick={() => !isResolved && onFocus(reaction.paragraphIndex)}
    >
      <div className="sr-reaction-meta">
        <span className="sr-para-label">¶{reaction.paragraphIndex + 1}</span>
        <SentimentIcon sentiment={reaction.sentiment} />
      </div>
      <p className="sr-reaction-text">{reaction.comment}</p>

      {!isResolved && (
        <div className="sr-reaction-actions">
          <button
            className="sr-fix-btn"
            onClick={(e) => {
              e.stopPropagation();
              onFix(reaction);
            }}
          >
            Fix with AI →
          </button>
          <button
            className="sr-ignore-btn"
            onClick={(e) => {
              e.stopPropagation();
              onIgnore(reaction);
            }}
          >
            Ignore
          </button>
        </div>
      )}

      {isFixed && <p className="sr-ignored-label">✓ Sent to AI for fixing</p>}
      {isIgnored && <p className="sr-ignored-label">Marked as read</p>}
    </div>
  );
}

// ─── Active Reader ────────────────────────────────────────────────────────────

function ActiveReader({
  persona,
  reactions,
  isAnalyzingParagraph,
  onSwitch,
  onFocus,
  onFix,
  onIgnore,
  onClose,
  onClear,
  reduced,
  onToggleReduced,
}) {
  const activeReactions = reactions.filter((r) => !r.status);
  const resolvedReactions = reactions.filter(
    (r) => r.status === "ignored" || r.status === "fixed",
  );

  return (
    <div
      className="border-all round-corner-l bg-main-c"
      style={{
        display: "flex",
        flexDirection: "column",
        flex: reduced ? "0 0 auto" : 1,
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* ── Top header bar ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 14px",
          borderBottom: "1px solid var(--color-surface-border)",
          flexShrink: 0,
        }}
      >
        {!reduced && <h4>Second reader</h4>}
        {reduced && <div></div>}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {/* Clear reactions */}
          {reactions.length > 0 && (
            <button
              className="sr-switch-btn"
              onClick={onClear}
              title="Clear all reactions"
              style={{
                borderColor: "var(--color-red-side)",
                backgroundColor: "var(--color-red-side)",
                color: "var(--color-red-main)",
              }}
            >
              Clear
            </button>
          )}

          {/* Reduce / expand toggle */}
          <div
            className={reduced ? "enlarge" : "reduce"}
            onClick={onToggleReduced}
            title={reduced ? "Expand" : "Minimise"}
          >
            <div></div>
          </div>

          <div
            className="close"
            onClick={onClose}
            style={{ position: "static" }}
          >
            <div></div>
          </div>
        </div>
      </div>

      {/* ── Reactions list — hidden when reduced ── */}
      {!reduced && (
        <div className="sr-reactions">
          {activeReactions.length === 0 && resolvedReactions.length === 0 ? (
            <div className="sr-empty-state">
              ✦ Your reader has no notes yet. Keep writing.
            </div>
          ) : (
            <>
              {activeReactions.map((r) => (
                <ReactionCard
                  key={`${r.paragraphIndex}-${r.id || r.comment.slice(0, 10)}`}
                  reaction={r}
                  onFocus={onFocus}
                  onFix={onFix}
                  onIgnore={onIgnore}
                />
              ))}

              {resolvedReactions.length > 0 && (
                <>
                  <p
                    style={{ fontSize: "0.68rem", margin: "8px 0 4px" }}
                    className="p-secondary-c"
                  >
                    Resolved ({resolvedReactions.length})
                  </p>
                  {resolvedReactions.map((r) => (
                    <ReactionCard
                      key={`resolved-${r.paragraphIndex}-${r.id || r.comment.slice(0, 10)}`}
                      reaction={r}
                      onFocus={onFocus}
                      onFix={onFix}
                      onIgnore={onIgnore}
                    />
                  ))}
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Persona footer — always visible ── */}
      <div className="sr-active-footer">
        <div className="sr-active-avatar-wrap">
          <div
            className="sr-active-avatar bg-img bg-cover round-corner-xl"
            style={{ backgroundImage: `url(${persona.image})` }}
          />
        </div>

        <div className="sr-active-footer-body">
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <div>
              {/* Name + live analyzing indicator side by side */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <p className="p-caps-s" style={{ margin: 0 }}>
                  {persona.name}
                </p>
                {isAnalyzingParagraph && (
                  <span className="sr-analyzing-indicator">
                    <span className="sr-analyzing-dot" />
                    Reading…
                  </span>
                )}
              </div>
              <p className="p-medium p-primary-c">{persona.role}</p>
              <p className="p-medium p-secondary-c" style={{ marginTop: 2 }}>
                {persona.description}
              </p>
            </div>
            <button className="sr-switch-btn" onClick={onSwitch}>
              Switch
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export default function SecondReaderPanel({
  isOpen,
  onClose,
  editor,
  getMarkdown,
  getParagraphs,
  onParagraphFocus,
  onOpenAIChat,
  lastEditedParagraph,
  suppressInvalidationRef,
}) {
  const dispatch = useDispatch();
  const [view, setView] = useState("picker");
  const [reduced, setReduced] = useState(false);
  const [activePersona, setActivePersona] = useState(() => {
    try {
      const id = localStorage.getItem("sr-last-persona");
      return PERSONAS.find((p) => p.id === id) ?? null;
    } catch {
      return null;
    }
  });
  const [reactions, setReactions] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAnalyzingParagraph, setIsAnalyzingParagraph] = useState(false);
  // In-memory cache so switching personas doesn't re-fetch
  const reactionsCache = useRef({});
  // Snapshot of article content taken when reactions were last generated.
  // Used ONLY to detect deliberate user edits — never on page load.
  const baseMarkdownRef = useRef(null);
  // Debounce timer for edit-based invalidation
  const invalidateTimerRef = useRef(null);

  // On mount: load stored reactions for the restored persona immediately.
  useEffect(() => {
    if (!activePersona) return;
    loadStoredReactions(activePersona.id).then((stored) => {
      if (stored && stored.reactions.length > 0) {
        reactionsCache.current[activePersona.id] = stored.reactions;
        setReactions(stored.reactions);
        setView("active");
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // once on mount only

  // Listen to the editor's update event directly — reliable, fires on every
  // content change whether from user input or programmatic setContent.
  useEffect(() => {
    if (!editor) return;

    const handleUpdate = () => {
      const md = getMarkdown();
      if (!md.trim()) return;

      // Capture baseline on first non-empty content (editor restored from draft)
      if (baseMarkdownRef.current === null) {
        baseMarkdownRef.current = md;
        return;
      }

      // Suppress if this update came from an accepted AI diff — clear flag,
      // update baseline, do NOT start the invalidation timer.
      if (suppressInvalidationRef?.current) {
        suppressInvalidationRef.current = false;
        baseMarkdownRef.current = md;
        clearTimeout(invalidateTimerRef.current);
        return;
      }

      // Content changed since baseline → debounce invalidation
      if (md !== baseMarkdownRef.current) {
        clearTimeout(invalidateTimerRef.current);
        invalidateTimerRef.current = setTimeout(() => {
          baseMarkdownRef.current = md;
          reactionsCache.current = {};
          PERSONAS.forEach((p) => deleteStoredReactions(p.id));
          setReactions([]);
          setView("picker");
        }, 3000);
      } else {
        clearTimeout(invalidateTimerRef.current);
      }
    };

    editor.on("update", handleUpdate);
    return () => {
      editor.off("update", handleUpdate);
      clearTimeout(invalidateTimerRef.current);
    };
  }, [editor, getMarkdown, suppressInvalidationRef]);

  // ── Select persona ────────────────────────────────────────────────────
  const handleSelectPersona = useCallback(
    async (persona) => {
      const persistPersona = (p) => {
        try {
          localStorage.setItem("sr-last-persona", p.id);
        } catch {}
      };

      // 1. Check in-memory cache first
      if (reactionsCache.current[persona.id]) {
        persistPersona(persona);
        setActivePersona(persona);
        setReactions(reactionsCache.current[persona.id]);
        setView("active");
        return;
      }

      // 2. Check IndexedDB — always trust stored reactions; invalidation
      //    is handled by the edit-detection effect, not here.
      const stored = await loadStoredReactions(persona.id);
      if (stored && stored.reactions.length > 0) {
        reactionsCache.current[persona.id] = stored.reactions;
        persistPersona(persona);
        setActivePersona(persona);
        setReactions(stored.reactions);
        setView("active");
        return;
      }

      // 3. Full analysis — guard: need at least 50 words
      const article = getMarkdown();
      const wordCount = article.trim().split(/\s+/).filter(Boolean).length;
      if (wordCount < 50) {
        dispatch(
          setToast({
            type: 2,
            desc: "At least 50 words are required to start a reader.",
          }),
        );
        return;
      }

      setIsAnalyzing(true);
      try {
        const result = await analyzeFullArticle(article, persona.id);
        const loaded = (result.reactions ?? []).map((r) => ({
          ...r,
          status: null,
        }));
        reactionsCache.current[persona.id] = loaded;
        // Store with a snapshot of the current markdown (informational only)
        await saveStoredReactions(persona.id, loaded, hashString(article));
        persistPersona(persona);
        setActivePersona(persona);
        setReactions(loaded);
        setView("active");
      } catch (err) {
        console.error("[SecondReader] full analysis failed", err);
      } finally {
        setIsAnalyzing(false);
      }
    },
    [getMarkdown],
  );

  // Keep a ref to activePersona so the persist effect always sees the latest
  // value without needing it in the dependency array.
  const activePersonaRef = useRef(null);
  activePersonaRef.current = activePersona;

  // ── Persist reactions whenever they change ────────────────────────────
  useEffect(() => {
    const persona = activePersonaRef.current;
    if (!persona) return;
    reactionsCache.current[persona.id] = reactions;
    saveStoredReactions(
      persona.id,
      reactions,
      hashString(baseMarkdownRef.current || ""),
    );
  }, [reactions]);

  // ── Incremental paragraph analysis ───────────────────────────────────
  useEffect(() => {
    if (!activePersona || !lastEditedParagraph) return;
    const { index, text, before, after } = lastEditedParagraph;
    if (!text.trim()) return;

    let cancelled = false;
    setIsAnalyzingParagraph(true);

    analyzeParagraph(text, before, after, activePersona.id)
      .then((result) => {
        if (cancelled) return;
        setReactions((prev) => {
          const without = prev.filter((r) => r.paragraphIndex !== index);
          const updated = result.reaction
            ? [
                ...without,
                { ...result.reaction, paragraphIndex: index, status: null },
              ]
            : without;
          return updated;
        });
      })
      .catch((err) => {
        if (!cancelled)
          console.error("[SecondReader] paragraph analysis failed", err);
      })
      .finally(() => {
        if (!cancelled) setIsAnalyzingParagraph(false);
      });

    return () => {
      cancelled = true;
      setIsAnalyzingParagraph(false);
    };
  }, [lastEditedParagraph, activePersona]);

  // ── Fix: mark as fixed (keep in list), open AI chat ─────────────────
  const handleFix = useCallback(
    (reaction) => {
      const msg = `Fix paragraph ${reaction.paragraphIndex + 1}: ${reaction.comment}`;
      // Mark as fixed so it stays in the list — do NOT remove it
      setReactions((prev) =>
        prev.map((r) => (r === reaction ? { ...r, status: "fixed" } : r)),
      );
      onClose();
      onOpenAIChat(msg);
    },
    [onClose, onOpenAIChat],
  );

  // ── Ignore: mark as read ─────────────────────────────────────────────
  const handleIgnore = useCallback((reaction) => {
    setReactions((prev) =>
      prev.map((r) => (r === reaction ? { ...r, status: "ignored" } : r)),
    );
  }, []);

  const handleSwitch = useCallback(() => setView("picker"), []);

  const handleClear = useCallback(() => {
    if (!activePersona) return;
    delete reactionsCache.current[activePersona.id];
    deleteStoredReactions(activePersona.id);
    setReactions([]);
  }, [activePersona]);

  return (
    <div
      className={`sr-panel${isOpen ? " is-open" : ""}`}
      style={{
        justifyContent:
          reduced && view === "active" && activePersona
            ? "flex-end"
            : "flex-start",
      }}
    >
      {view === "picker" || !activePersona ? (
        <PersonaPicker
          onSelect={handleSelectPersona}
          isAnalyzing={isAnalyzing}
          onClose={onClose}
          lastUsedPersonaId={activePersona?.id ?? null}
        />
      ) : (
        <ActiveReader
          persona={activePersona}
          reactions={reactions}
          isAnalyzingParagraph={isAnalyzingParagraph}
          onSwitch={handleSwitch}
          onFocus={onParagraphFocus}
          onFix={handleFix}
          onIgnore={handleIgnore}
          onClose={onClose}
          onClear={handleClear}
          reduced={reduced}
          onToggleReduced={() => setReduced((r) => !r)}
        />
      )}
    </div>
  );
}
