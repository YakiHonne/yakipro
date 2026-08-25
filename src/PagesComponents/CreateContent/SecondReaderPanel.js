import React, { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  analyzeFullArticle,
  analyzeParagraph,
} from "@/Endpoionts/SecondReaderAI";
import Icon from "@/Components/LucideIcon";
import { PERSONAS } from "@/Content/SecondReaderPersonas";
import aiChatDb from "@/lib/aiChatDb";
import { setToast } from "@/Store/Slices/Extras";
import QuotaBanner from "@/Components/AI/QuotaBanner";
import useFeatureQuota, { QUOTA_FEATURES } from "@/hooks/useFeatureQuota";
import useAccountAccess from "@/hooks/useAccountAccess";
import useAccessFailure from "@/hooks/useAccessFailure";
import { scopedKey, purgeLegacyAiStorage } from "@/lib/accountStorage";

let reactionIdCounter = 0;

// The AI endpoint occasionally returns reactions with missing/misnamed
// fields. Normalize them so rendering never crashes (e.g. reading `comment`
// or slicing it) and every reaction has a stable key.
function normalizeReaction(r, fallbackIndex = 0) {
  if (!r || typeof r !== "object") return null;
  const paragraphIndex = Number.isInteger(r.paragraphIndex)
    ? r.paragraphIndex
    : fallbackIndex;
  const comment =
    typeof r.comment === "string"
      ? r.comment
      : typeof r.text === "string"
        ? r.text
        : "";
  if (!comment.trim()) return null;
  return {
    ...r,
    paragraphIndex,
    comment,
    sentiment: r.sentiment ?? "neutral",
    status: r.status ?? null,
    id: r.id || `sr-${paragraphIndex}-${Date.now()}-${reactionIdCounter++}`,
  };
}

function normalizeReactions(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map((r, i) => normalizeReaction(r, i))
    .filter(Boolean);
}

function hashString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return String(h);
}

async function loadStoredReactions(personaId, pubkey) {
  try {
    const row = await aiChatDb.secondReaderReactions.get(
      scopedKey(personaId, pubkey),
    );
    if (!row) return null;
    return {
      reactions: normalizeReactions(row.reactions),
      contentHash: row.contentHash,
    };
  } catch {
    return null;
  }
}

async function saveStoredReactions(personaId, pubkey, reactions, contentHash) {
  try {
    await aiChatDb.secondReaderReactions.put({
      personaId: scopedKey(personaId, pubkey),
      reactions,
      contentHash,
      updatedAt: Date.now(),
    });
  } catch {}
}

async function deleteStoredReactions(personaId, pubkey) {
  try {
    await aiChatDb.secondReaderReactions.delete(scopedKey(personaId, pubkey));
  } catch {}
}

const lastPersonaKey = (pubkey) => scopedKey("sr-last-persona", pubkey);

function PersonaPicker({
  onSelect,
  isAnalyzing,
  onClose,
  lastUsedPersonaId,
  quota,
  showUpgrade,
  onUpgrade,
}) {
  const exhausted = !!quota?.exhausted;
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

      <QuotaBanner
        quota={quota}
        showUpgrade={showUpgrade}
        onUpgrade={onUpgrade}
      />

      <div style={{ position: "relative", flex: 1, overflow: "hidden" }}>
        <div
          className="fx-centered fx-col fx-start-h fit-container fx-gap-v-m box-pad-h-m box-pad-v-m"
          style={{ overflowY: "auto", height: "100%" }}
        >
          {PERSONAS.map((p) => {
            const isLastUsed = p.id === lastUsedPersonaId;
            const locked = isAnalyzing || exhausted;
            return (
              <div
                key={p.id}
                className="pointer fx-centered fx-start-v  fx-gap-h-l fit-container border-all round-corner-m bg-hover box-pad-h-m box-pad-v-m"
                onClick={() => !locked && onSelect(p)}
                style={{
                  opacity: locked ? 0.5 : 1,
                  cursor: locked ? "not-allowed" : "pointer",
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

function SentimentIcon({ sentiment }) {
  if (sentiment === "positive") return <span>👍</span>;
  if (sentiment === "negative") return <span>👎</span>;
  return <span>💬</span>;
}

function ReactionCard({ reaction, onFocus, onFix, onIgnore, aiExhausted }) {
  const isIgnored = reaction.status === "ignored";
  const isFixed = reaction.status === "fixed";
  const isSuperseded = reaction.status === "superseded";
  const isResolved = isIgnored || isFixed || isSuperseded;

  const severityClass =
    reaction.severity === "warning"
      ? " severity-warning"
      : reaction.severity === "critical"
        ? " severity-critical"
        : "";

  const isPositive = reaction.sentiment === "positive";
  const showFixButton = !isPositive;
  const fixLabel =
    reaction.sentiment === "negative" ? "Fix with AI →" : "Improve with AI →";

  const resolvedClass = isFixed
    ? " sr-reaction-treated"
    : isResolved
      ? " sr-reaction-ignored"
      : "";

  return (
    <div
      className={`sr-reaction-card${severityClass}${resolvedClass}`}
      onClick={() => !isResolved && onFocus(reaction.paragraphIndex)}
    >
      <div className="sr-reaction-meta">
        <span className="sr-para-label">¶{reaction.paragraphIndex + 1}</span>
        <SentimentIcon sentiment={reaction.sentiment} />
      </div>
      <p
        className={`sr-reaction-text${isResolved ? " sr-reaction-text-done" : ""}`}
      >
        {reaction.comment}
      </p>

      {!isResolved && (
        <div className="sr-reaction-actions">
          {showFixButton && (
            <button
              className="sr-fix-btn"
              disabled={aiExhausted}
              style={
                aiExhausted
                  ? {
                      color: "var(--c1)",
                      cursor: "not-allowed",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                    }
                  : undefined
              }
              onClick={(e) => {
                e.stopPropagation();
                if (aiExhausted) return;
                onFix(reaction);
              }}
            >
              {aiExhausted ? (
                <>
                  <Icon name="warning" size={12} /> Limit reached
                </>
              ) : (
                fixLabel
              )}
            </button>
          )}
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

      {isFixed && (
        <p className="sr-treated-label">
          <Icon name="checkmark" size={12} /> Treated
        </p>
      )}
      {isIgnored && <p className="sr-ignored-label">Marked as read</p>}
      {isSuperseded && (
        <p className="sr-ignored-label">Earlier thought · re-read since</p>
      )}
    </div>
  );
}

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
  aiExhausted,
  readerQuota,
  showUpgrade,
  onUpgrade,
}) {
  const activeReactions = reactions.filter((r) => !r.status);
  const resolvedReactions = reactions.filter(
    (r) =>
      r.status === "ignored" ||
      r.status === "fixed" ||
      r.status === "superseded",
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

      {!reduced && (
        <QuotaBanner
          quota={readerQuota}
          showUpgrade={showUpgrade}
          onUpgrade={onUpgrade}
        />
      )}

      {!reduced && (
        <div className="sr-reactions">
          {activeReactions.length === 0 && resolvedReactions.length === 0 ? (
            <div className="sr-empty-state">
              Your reader has no notes yet. Keep writing.
            </div>
          ) : (
            <>
              {activeReactions.map((r) => (
                <ReactionCard
                  key={r.id || `${r.paragraphIndex}-active`}
                  reaction={r}
                  onFocus={onFocus}
                  onFix={onFix}
                  onIgnore={onIgnore}
                  aiExhausted={aiExhausted}
                />
              ))}

              {resolvedReactions.length > 0 && (
                <>
                  <p
                    style={{ fontSize: "0.68rem", margin: "8px 0 4px" }}
                    className="p-secondary-c"
                  >
                    History ({resolvedReactions.length})
                  </p>
                  {resolvedReactions.map((r) => (
                    <ReactionCard
                      key={`resolved-${r.id || r.paragraphIndex}`}
                      reaction={r}
                      onFocus={onFocus}
                      onFix={onFix}
                      onIgnore={onIgnore}
                      aiExhausted={aiExhausted}
                    />
                  ))}
                </>
              )}
            </>
          )}
        </div>
      )}

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
  resetSignal = 0,
  reanalyzeOnReset = false,
}) {
  const dispatch = useDispatch();
  const pubkey = useSelector((state) => state.userKeys?.pub ?? null);
  const [view, setView] = useState("picker");
  const [reduced, setReduced] = useState(false);
  const [mounted, setMounted] = useState(false);

  const { isPremium } = useAccountAccess();
  const { handleAccessFailure, showPaymentSheet } = useAccessFailure();
  // "Fix with AI" spends the chat-articles allowance, not second-reader's, so
  // both have to be tracked to render each control honestly.
  const { quotas, refresh: refreshUsage } = useFeatureQuota([
    QUOTA_FEATURES.secondReader,
    QUOTA_FEATURES.chatArticles,
  ]);
  const readerQuota = quotas[QUOTA_FEATURES.secondReader];
  const chatQuota = quotas[QUOTA_FEATURES.chatArticles];
  const readerExhausted = !!readerQuota?.exhausted;
  const chatExhausted = !!chatQuota?.exhausted;

  useEffect(() => {
    setMounted(true);
    purgeLegacyAiStorage();
  }, []);
  const [activePersona, setActivePersona] = useState(null);
  const [reactions, setReactions] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAnalyzingParagraph, setIsAnalyzingParagraph] = useState(false);
  const reactionsCache = useRef({});
  const baseMarkdownRef = useRef(null);
  const invalidateTimerRef = useRef(null);
  // Guards the reaction-save effect: while an account switch is resolving it
  // still points at the outgoing account, and saving then would overwrite that
  // account's stored reactions with the incoming account's empty state.
  const storageScopeRef = useRef(pubkey);
  const resetSignalRef = useRef(resetSignal);

  useEffect(() => {
    let cancelled = false;

    setActivePersona(null);
    setReactions([]);
    setView("picker");
    reactionsCache.current = {};

    const signalAtRestore = resetSignalRef.current;

    const restore = async () => {
      let personaId = null;
      try {
        personaId = localStorage.getItem(lastPersonaKey(pubkey));
      } catch {}
      const persona = PERSONAS.find((p) => p.id === personaId) ?? null;
      if (cancelled) return;

      storageScopeRef.current = pubkey;
      if (!persona) return;

      const stored = await loadStoredReactions(persona.id, pubkey);
      if (cancelled) return;
      if (resetSignalRef.current !== signalAtRestore) return;

      setActivePersona(persona);
      if (stored && stored.reactions.length > 0) {
        reactionsCache.current[persona.id] = stored.reactions;
        setReactions(stored.reactions);
        setView("active");
      }
    };

    restore();

    return () => {
      cancelled = true;
    };
  }, [pubkey]);

  useEffect(() => {
    if (!editor) return;

    // Track the latest markdown so saved reactions carry an up-to-date
    // content hash. We deliberately do NOT clear reactions on edit: the
    // per-paragraph analysis effect below re-reads changed paragraphs and
    // appends fresh thoughts while keeping the existing conversation/history.
    const handleUpdate = () => {
      const md = getMarkdown();
      if (!md.trim()) return;

      if (suppressInvalidationRef?.current) {
        suppressInvalidationRef.current = false;
      }

      baseMarkdownRef.current = md;
    };

    editor.on("update", handleUpdate);
    return () => {
      editor.off("update", handleUpdate);
      clearTimeout(invalidateTimerRef.current);
    };
  }, [editor, getMarkdown, suppressInvalidationRef]);

  const reanalyzeOnResetRef = useRef(reanalyzeOnReset);
  reanalyzeOnResetRef.current = reanalyzeOnReset;
  resetSignalRef.current = resetSignal;
  const selectPersonaRef = useRef(null);

  useEffect(() => {
    if (!resetSignal) return;
    let cancelled = false;

    const persona = activePersona;
    const cachedIds = Object.keys(reactionsCache.current);
    const ids = new Set([...cachedIds, ...(persona ? [persona.id] : [])]);

    reactionsCache.current = {};
    setReactions([]);

    (async () => {
      await Promise.all(
        [...ids].map((id) => deleteStoredReactions(id, pubkey)),
      );
      if (cancelled) return;

      if (reanalyzeOnResetRef.current && persona) {
        selectPersonaRef.current?.(persona);
      } else {
        setActivePersona(null);
        setView("picker");
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetSignal]);

  const handleSelectPersona = useCallback(
    async (persona) => {
      const persistPersona = (p) => {
        try {
          localStorage.setItem(lastPersonaKey(pubkey), p.id);
        } catch {}
      };

      if (reactionsCache.current[persona.id]) {
        persistPersona(persona);
        setActivePersona(persona);
        setReactions(reactionsCache.current[persona.id]);
        setView("active");
        return;
      }

      const stored = await loadStoredReactions(persona.id, pubkey);
      if (stored && stored.reactions.length > 0) {
        reactionsCache.current[persona.id] = stored.reactions;
        persistPersona(persona);
        setActivePersona(persona);
        setReactions(stored.reactions);
        setView("active");
        return;
      }

      // Only a fresh read costs quota; restoring stored reactions above does not.
      if (readerExhausted) return;

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
        const loaded = normalizeReactions(result?.reactions).map((r) => ({
          ...r,
          status: null,
        }));
        reactionsCache.current[persona.id] = loaded;
        await saveStoredReactions(
          persona.id,
          pubkey,
          loaded,
          hashString(article),
        );
        persistPersona(persona);
        setActivePersona(persona);
        setReactions(loaded);
        setView("active");
      } catch (err) {
        if (
          !handleAccessFailure(err, {
            source: "second-reader",
            autoOpen: false,
          })
        ) {
          console.error("[SecondReader] full analysis failed", err);
          dispatch(
            setToast({
              type: 2,
              desc: err?.message || "Second reader failed. Please try again.",
            }),
          );
        }
      } finally {
        setIsAnalyzing(false);
        refreshUsage();
      }
    },
    [
      getMarkdown,
      dispatch,
      pubkey,
      readerExhausted,
      handleAccessFailure,
      refreshUsage,
    ],
  );

  selectPersonaRef.current = handleSelectPersona;

  const activePersonaRef = useRef(null);
  activePersonaRef.current = activePersona;

  useEffect(() => {
    const persona = activePersonaRef.current;
    if (!persona) return;
    if (storageScopeRef.current !== pubkey) return;
    reactionsCache.current[persona.id] = reactions;
    saveStoredReactions(
      persona.id,
      pubkey,
      reactions,
      hashString(baseMarkdownRef.current || ""),
    );
  }, [reactions, pubkey]);

  useEffect(() => {
    if (!activePersona || !lastEditedParagraph) return;
    // Without this the effect keeps firing on every keystroke once the quota is
    // spent, burning a rejected request per edit.
    if (readerExhausted) return;
    const { index, text, before, after } = lastEditedParagraph;
    if (!text.trim()) return;

    let cancelled = false;
    setIsAnalyzingParagraph(true);

    analyzeParagraph(text, before, after, activePersona.id)
      .then((result) => {
        if (cancelled) return;
        setReactions((prev) => {
          const normalized = normalizeReaction(result?.reaction, index);
          if (!normalized) return prev;
          normalized.paragraphIndex = index;

          const newComment = normalized.comment.trim();
          // Skip if the newest thought for this paragraph is identical, so
          // re-reads on trivial edits don't spam duplicate notes.
          const latestForPara = [...prev]
            .reverse()
            .find((r) => r.paragraphIndex === index);
          if (latestForPara && latestForPara.comment?.trim() === newComment) {
            return prev;
          }

          // Keep prior thoughts for this paragraph as history: demote any
          // still-active note to "superseded" instead of removing it.
          const withHistory = prev.map((r) =>
            r.paragraphIndex === index && !r.status
              ? { ...r, status: "superseded" }
              : r,
          );

          return [...withHistory, { ...normalized, status: null }];
        });
      })
      .catch((err) => {
        if (cancelled) return;
        if (
          !handleAccessFailure(err, {
            source: "second-reader",
            autoOpen: false,
          })
        )
          console.error("[SecondReader] paragraph analysis failed", err);
      })
      .finally(() => {
        if (!cancelled) setIsAnalyzingParagraph(false);
        refreshUsage();
      });

    return () => {
      cancelled = true;
      setIsAnalyzingParagraph(false);
    };
  }, [
    lastEditedParagraph,
    activePersona,
    readerExhausted,
    handleAccessFailure,
    refreshUsage,
  ]);

  const handleFix = useCallback(
    (reaction) => {
      const msg = `Fix paragraph ${reaction.paragraphIndex + 1}: ${reaction.comment}`;
      setReactions((prev) =>
        prev.map((r) => (r === reaction ? { ...r, status: "fixed" } : r)),
      );
      onClose();
      onOpenAIChat(msg);
    },
    [onClose, onOpenAIChat],
  );

  const handleIgnore = useCallback((reaction) => {
    setReactions((prev) =>
      prev.map((r) => (r === reaction ? { ...r, status: "ignored" } : r)),
    );
  }, []);

  const handleSwitch = useCallback(() => setView("picker"), []);

  const handleClear = useCallback(() => {
    if (!activePersona) return;
    delete reactionsCache.current[activePersona.id];
    deleteStoredReactions(activePersona.id, pubkey);
    setReactions([]);
  }, [activePersona, pubkey]);

  if (!mounted) return null;

  return createPortal(
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
          quota={readerQuota}
          showUpgrade={!isPremium}
          onUpgrade={() => showPaymentSheet("second-reader")}
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
          aiExhausted={chatExhausted}
          readerQuota={readerQuota}
          showUpgrade={!isPremium}
          onUpgrade={() => showPaymentSheet("second-reader")}
        />
      )}
    </div>,
    document.getElementById("portal-root") || document.body,
  );
}
