import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useSelector } from "react-redux";
import { askArticleAI } from "@/Endpoionts/ArticleAI";
import aiChatDb from "@/lib/aiChatDb";
import Icon from "@/Components/LucideIcon";
import QuotaBanner from "@/Components/AI/QuotaBanner";
import useFeatureQuota, { QUOTA_FEATURES } from "@/hooks/useFeatureQuota";
import useAccountAccess from "@/hooks/useAccountAccess";
import useAccessFailure from "@/hooks/useAccessFailure";
import { scopedSessionId, purgeLegacyAiStorage } from "@/lib/accountStorage";

let msgIdCounter = 0;
const nextId = () => ++msgIdCounter;

const SESSION_BASE = "article-editor";

async function loadSession(sessionId) {
  try {
    const row = await aiChatDb.sessions.get(sessionId);
    return row?.messages ?? [];
  } catch {
    return [];
  }
}

async function saveSession(sessionId, messages) {
  try {
    await aiChatDb.sessions.put({
      sessionId,
      messages,
      updatedAt: Date.now(),
    });
  } catch {}
}

async function clearSession(sessionId) {
  try {
    await aiChatDb.sessions.delete(sessionId);
  } catch {}
}

function UserBubble({ text }) {
  return (
    <div className="ai-msg-user">
      <span>{text}</span>
    </div>
  );
}

function AISkeleton() {
  return (
    <div className="ai-msg-ai">
      <div className="ai-skeleton" />
      <div className="ai-skeleton" style={{ width: "70%", marginTop: 6 }} />
    </div>
  );
}

function AIBubble({ msg }) {
  return (
    <div className="ai-msg-ai">
      <div className="ai-msg-ai-header">
        <span className="ai-spark"><Icon name="sparkles" size={13} /></span>
        <span className="ai-msg-ai-text">{msg.text}</span>
      </div>
    </div>
  );
}

export default function ArticleAIPanel({
  isOpen,
  onClose,
  getMarkdown,
  onDiffReady,
  isAILoading,
  setIsAILoading,
  prefillMessage,
  onPrefillConsumed,
  resetSignal = 0,
}) {
  const pubkey = useSelector((state) => state.userKeys?.pub ?? null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const bottomRef = useRef(null);
  const panelRef = useRef(null);
  const textareaRef = useRef(null);
  const closeTimerRef = useRef(null);
  const prefillTimerRef = useRef(null);
  const consumedPrefillTokenRef = useRef(null);
  const resetSignalRef = useRef(resetSignal);
  const sendRef = useRef(null);

  const sessionId = scopedSessionId(SESSION_BASE, pubkey);
  // The save effect below must never write the incoming account's (empty) state
  // under the outgoing account's key while the reload is still in flight.
  const sessionIdRef = useRef(sessionId);

  const { isPremium } = useAccountAccess();
  const { handleAccessFailure, showPaymentSheet } = useAccessFailure();
  const { quotas, refresh } = useFeatureQuota([QUOTA_FEATURES.chatArticles]);
  const chatQuota = quotas[QUOTA_FEATURES.chatArticles];
  const exhausted = !!chatQuota?.exhausted;

  useEffect(() => {
    setMounted(true);
    purgeLegacyAiStorage();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const signalAtLoad = resetSignalRef.current;
    setSessionLoaded(false);
    setMessages([]);
    setInput("");

    loadSession(sessionId).then((saved) => {
      if (cancelled) return;
      if (resetSignalRef.current !== signalAtLoad) {
        sessionIdRef.current = sessionId;
        setSessionLoaded(true);
        return;
      }
      if (saved.length > 0) {
        const maxId = saved.reduce((m, msg) => Math.max(m, msg.id ?? 0), 0);
        if (maxId >= msgIdCounter) msgIdCounter = maxId + 1;
        setMessages(saved);
      }
      sessionIdRef.current = sessionId;
      setSessionLoaded(true);
    });

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  useEffect(() => {
    resetSignalRef.current = resetSignal;
    if (!resetSignal) return;
    setMessages([]);
    setInput("");
    clearSession(sessionId);
  }, [resetSignal, sessionId]);

  useEffect(
    () => () => {
      clearTimeout(closeTimerRef.current);
      clearTimeout(prefillTimerRef.current);
    },
    [],
  );

  useEffect(() => {
    if (!sessionLoaded) return;
    if (sessionIdRef.current !== sessionId) return;
    saveSession(sessionId, messages);
  }, [messages, sessionLoaded, sessionId]);

  useEffect(() => {
    if (!isOpen || !prefillMessage?.text || exhausted) return;
    const token = prefillMessage.token;
    if (consumedPrefillTokenRef.current === token) return;
    consumedPrefillTokenRef.current = token;

    setInput(prefillMessage.text);
    clearTimeout(prefillTimerRef.current);
    prefillTimerRef.current = setTimeout(() => {
      setInput((current) => {
        if (current.trim()) {
          setTimeout(() => {
            sendRef.current?.();
            onPrefillConsumed?.();
          }, 0);
        }
        return current;
      });
    }, 300);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, prefillMessage, exhausted]);

  useEffect(() => {
    if (!isOpen) return;
    const onMouseDown = (e) => {
      if (panelRef.current?.contains(e.target)) return;
      if (e.target.closest?.("[data-ai-panel-keep-open]")) return;
      onClose();
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isAILoading]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 104) + "px";
  }, [input]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isAILoading || exhausted) return;

    const userMsg = { id: nextId(), role: "user", text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsAILoading(true);

    try {
      const article = getMarkdown();
      const { explanation, content } = await askArticleAI(text, article);

      const aiMsg = { id: nextId(), role: "ai", text: explanation };
      setMessages((prev) => [...prev, aiMsg]);

      if (content) {
        closeTimerRef.current = setTimeout(() => {
          onDiffReady(content);
        }, 700);
      }
    } catch (err) {
      // The banner is the upgrade path here, so the sheet must not open by itself.
      handleAccessFailure(err, { source: "ai-assistant", autoOpen: false });
      const aiMsg = {
        id: nextId(),
        role: "ai",
        text: err.message || "Something went wrong. Please try again.",
      };
      setMessages((prev) => [...prev, aiMsg]);
    } finally {
      setIsAILoading(false);
      // Refreshed unconditionally so the banner appears the moment the last
      // allowance is consumed, not one request later.
      refresh();
    }
  }, [
    input,
    isAILoading,
    exhausted,
    getMarkdown,
    onDiffReady,
    setIsAILoading,
    handleAccessFailure,
    refresh,
  ]);

  sendRef.current = handleSend;

  const handleClear = useCallback(() => {
    setMessages([]);
    clearSession(sessionId);
  }, [sessionId]);

  // Enter sends, Shift+Enter newlines. isComposing guards CJK input methods,
  // where Enter commits the candidate rather than ending the message.
  const handleKeyDown = (e) => {
    if (e.key !== "Enter") return;
    if (e.shiftKey) return;
    if (e.nativeEvent?.isComposing) return;
    e.preventDefault();
    handleSend();
  };

  if (!mounted) return null;

  return createPortal(
    <>
      <div
        className="ai-panel-backdrop"
        style={{
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? "all" : "none",
        }}
      >
        <div
          ref={panelRef}
          className="ai-panel"
          style={{ transform: isOpen ? "translateY(0)" : "translateY(100%)" }}
          aria-hidden={!isOpen}
        >
          <div
            className="close pos-absolute pos-right-16 pos-top-16"
            onClick={onClose}
          >
            <div></div>
          </div>

          <div className="fit-container fx-centered box-pad-v-s">
            <h3>Ask YakiAI</h3>
          </div>

          <div className="ai-panel-messages">
            {messages.length === 0 && !isAILoading && (
              <div className="ai-empty-state">
                <span className="ai-spark ai-spark-lg">
                  <Icon name="sparkles" size={44} />
                </span>
                <p>
                  Ask me to improve your article, rewrite a section, add an
                  introduction, adjust tone, or anything else.
                </p>
              </div>
            )}

            {messages.map((msg) =>
              msg.role === "user" ? (
                <UserBubble key={msg.id} text={msg.text} />
              ) : (
                <AIBubble key={msg.id} msg={msg} />
              ),
            )}

            {isAILoading && <AISkeleton />}
            <div ref={bottomRef} />
          </div>

          <QuotaBanner
            quota={chatQuota}
            showUpgrade={!isPremium}
            onUpgrade={() => showPaymentSheet("ai-assistant")}
          />

          <div className="ai-panel-input-area">
            <textarea
              ref={textareaRef}
              className="ai-textarea no-scrollbar"
              placeholder={
                exhausted ? "Quota exceeded" : "Ask anything… (↵ to send)"
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isAILoading || exhausted}
              rows={1}
            />
            <button
              className="ai-send-btn"
              onClick={handleSend}
              disabled={isAILoading || exhausted || !input.trim()}
              aria-label="Send"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M2 21l21-9L2 3v7l15 2-15 2z" />
              </svg>
            </button>
            <button
              className="ai-clear-btn"
              onClick={handleClear}
              disabled={messages.length === 0 || isAILoading}
              aria-label="Clear conversation"
            >
              <Icon name="trash" size={16} />
            </button>
          </div>
        </div>
      </div>
    </>,
    document.getElementById("portal-root") || document.body,
  );
}
