"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useWorkspaceApp } from "@/providers/WorkspaceAppProvider";
import {
  isSummaryIntent,
  parseSummarySections,
  splitIntroFromSummary,
  stripMarkdownEmphasis,
} from "@/components/workspace/domain";

function scrollBehavior(): ScrollBehavior {
  if (typeof window === "undefined") return "smooth";
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
}

/** Auto-resize a textarea to fit its content. */
function useAutoResize(ref: React.RefObject<HTMLTextAreaElement | null>, value: string) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value, ref]);
}

function UserAvatar() {
  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--surface-muted)] text-[10px] font-bold text-[var(--muted)]">
      U
    </div>
  );
}

function AiAvatar() {
  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--accent)] to-[#9333ea] shadow-sm">
      <svg className="h-3.5 w-3.5 text-white" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2l2.09 6.26L20 9.27l-4.91 4.15L16.18 20 12 16.77 7.82 20l1.09-6.58L4 9.27l5.91-1.01L12 2z" />
      </svg>
    </div>
  );
}

export function ChatThreadPanel() {
  const {
    activeSessionId,
    activeSession,
    isAsking,
    question,
    setQuestion,
    k,
    setK,
    handleAsk,
    selectedBookId,
    sessionBookId,
    speakingMessageId,
    stopSpeaking,
    speakText,
    openSourceInBook,
    recognitionSupported,
    isListening,
    handleDictation,
  } = useWorkspaceApp();

  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pinnedRef = useRef(true);
  const formRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showJumpLatest, setShowJumpLatest] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showKControl, setShowKControl] = useState(false);

  const messageCount = activeSession?.messages.length ?? 0;

  useAutoResize(textareaRef, question);

  const updatePinnedFromScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 140;
    pinnedRef.current = nearBottom;
    setShowJumpLatest(!nearBottom && messageCount > 0);
  }, [messageCount]);

  useEffect(() => {
    pinnedRef.current = true;
    setShowJumpLatest(false);
  }, [activeSessionId]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", updatePinnedFromScroll, { passive: true });
    return () => el.removeEventListener("scroll", updatePinnedFromScroll);
  }, [updatePinnedFromScroll]);

  useLayoutEffect(() => {
    if (!pinnedRef.current) return;
    bottomRef.current?.scrollIntoView({ block: "end", behavior: scrollBehavior() });
  }, [messageCount, isAsking, activeSessionId]);

  const jumpToLatest = () => {
    pinnedRef.current = true;
    setShowJumpLatest(false);
    bottomRef.current?.scrollIntoView({ block: "end", behavior: scrollBehavior() });
  };

  const onComposerSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    pinnedRef.current = true;
    setShowJumpLatest(false);
    void handleAsk(e);
  };

  const copyMessage = async (id: string, text: string) => {
    const cleaned = text.replace(/\r/g, "");
    try {
      await navigator.clipboard.writeText(cleaned);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId((x) => (x === id ? null : x)), 2000);
    } catch {
      setCopiedId(null);
    }
  };

  const canSend = !!selectedBookId && !!activeSessionId;
  const composerDisabledReason =
    !selectedBookId && !activeSessionId
      ? "Create a chat thread first using the New button in the sidebar."
      : !selectedBookId
        ? "Create a chat and choose a book first."
        : !activeSessionId
          ? "Select a thread from the sidebar or start a new chat."
          : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Message area */}
      <div className="relative min-h-0 flex-1">
        <div
          ref={scrollRef}
          className="h-full overflow-y-auto px-4 py-6 sm:px-6"
        >
          {/* Empty states */}
          {!activeSessionId && (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--surface-muted)]">
                <svg className="h-7 w-7 text-[var(--faint)]" fill="none" viewBox="0 0 24 24">
                  <path
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <p className="max-w-xs text-sm text-[var(--muted)]">
                Select a thread from the sidebar or create a new one to start chatting.
              </p>
            </div>
          )}

          {activeSessionId && activeSession && activeSession.messages.length === 0 && !isAsking && (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--accent)] to-[#9333ea] shadow-md">
                <svg className="h-7 w-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l2.09 6.26L20 9.27l-4.91 4.15L16.18 20 12 16.77 7.82 20l1.09-6.58L4 9.27l5.91-1.01L12 2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--text)]">
                  Chat with{" "}
                  <span className="text-[var(--accent)]">{activeSession.bookLabel}</span>
                </p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  Ask anything — summaries, quotes, character analysis…
                </p>
              </div>
              {/* Starter prompts */}
              <div className="mt-2 flex flex-wrap justify-center gap-2">
                {["Summarise the book", "Who are the main characters?", "What are the key themes?"].map(
                  (prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => setQuestion(prompt)}
                      className="rounded-xl border border-[var(--border)] bg-[var(--panel)] px-3 py-1.5 text-xs font-medium text-[var(--muted)] transition-colors hover:border-[var(--accent)]/40 hover:text-[var(--text)]"
                    >
                      {prompt}
                    </button>
                  ),
                )}
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="space-y-6">
            {activeSession?.messages.map((m) => {
              const isUser = m.role === "user";
              const isError =
                m.role === "assistant" && m.content.trimStart().startsWith("Error:");

              return (
                <div
                  key={m.id}
                  className={`group flex items-start gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
                >
                  {/* Avatar */}
                  {isUser ? <UserAvatar /> : <AiAvatar />}

                  {/* Bubble */}
                  <div
                    className={`relative flex max-w-[min(100%,44rem)] flex-col gap-2 ${isUser ? "items-end" : "items-start"}`}
                  >
                    {/* Role label */}
                    <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--faint)]">
                      {isUser ? "You" : "BookChat AI"}
                    </p>

                    <div
                      className={`relative w-full rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                        isUser
                          ? "rounded-tr-sm bg-[var(--chat-user)] text-[var(--text)] ring-1 ring-[var(--border)]"
                          : isError
                            ? "rounded-tl-sm border border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--text)]"
                            : "rounded-tl-sm border border-[var(--border)] bg-[var(--chat-assistant)] text-[var(--text)]"
                      }`}
                    >
                      {/* AI left accent bar */}
                      {!isUser && !isError && (
                        <span className="absolute left-0 top-3 h-5 w-0.5 rounded-r-full bg-[var(--accent)]" />
                      )}

                      {/* Message content */}
                      {m.role === "assistant" && isSummaryIntent(m.classification) ? (
                        (() => {
                          const { intro, body } = splitIntroFromSummary(m.content);
                          const sections = parseSummarySections(body);
                          if (sections.length === 0) {
                            return <p className="whitespace-pre-wrap">{m.content}</p>;
                          }
                          return (
                            <div className="space-y-3">
                              {intro ? (
                                <div className="rounded-xl border border-[var(--accent)]/30 bg-[var(--accent-subtle)] px-3 py-2.5">
                                  <p className="text-[13px] font-medium leading-relaxed text-[var(--text)]">
                                    {stripMarkdownEmphasis(intro)}
                                  </p>
                                </div>
                              ) : null}
                              {sections.map((section, idx) => (
                                <section
                                  key={`${m.id}-summary-${idx}`}
                                  className="rounded-xl border border-[var(--border)]/70 bg-[var(--panel)]/70 p-3.5"
                                >
                                  <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--accent-warm)]">
                                    {section.title}
                                  </h4>
                                  {section.body.split("\n").some((ln) => ln.trim().startsWith("*")) ? (
                                    <ul className="space-y-1.5 pl-4 text-[14px] leading-relaxed text-[var(--text)] marker:text-[var(--accent)]">
                                      {section.body
                                        .split("\n")
                                        .map((ln) => ln.trim())
                                        .filter(Boolean)
                                        .map((ln, i) => (
                                          <li key={`${m.id}-summary-${idx}-li-${i}`}>
                                            {stripMarkdownEmphasis(ln.replace(/^\*\s*/, ""))}
                                          </li>
                                        ))}
                                    </ul>
                                  ) : (
                                    <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-[var(--text)]">
                                      {section.body}
                                    </p>
                                  )}
                                </section>
                              ))}
                            </div>
                          );
                        })()
                      ) : (
                        <p className="whitespace-pre-wrap">{m.content}</p>
                      )}

                      {/* Sources accordion */}
                      {m.role === "assistant" &&
                        (m.classification || (m.sources?.length ?? 0) > 0) ? (
                        <details className="group/details mt-3 rounded-xl border border-[var(--border)]/70 bg-[var(--chat-thread)]/60 px-3 py-2 text-left">
                          <summary className="flex cursor-pointer list-none items-center gap-2 text-[11px] font-medium text-[var(--muted)] hover:text-[var(--text)] [&::-webkit-details-marker]:hidden">
                            <svg
                              className="h-3.5 w-3.5 transition-transform group-open/details:rotate-90"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <path
                                stroke="currentColor"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5l7 7-7 7"
                              />
                            </svg>
                            <span>Sources & intent</span>
                            {m.sources?.length ? (
                              <span className="rounded-full bg-[var(--accent-subtle)] px-1.5 py-0.5 text-[9px] font-bold text-[var(--accent)]">
                                {m.sources.length}
                              </span>
                            ) : null}
                          </summary>
                          <div className="mt-3 space-y-3 border-t border-[var(--border)]/60 pt-3">
                            {m.classification && (
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--faint)]">
                                  Intent
                                </span>
                                <span className="rounded-full bg-[var(--accent-subtle)] px-2 py-0.5 text-[10px] font-semibold text-[var(--accent)]">
                                  {m.classification}
                                </span>
                              </div>
                            )}
                            {m.sources?.length ? (
                              <div className="space-y-2">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--faint)]">
                                  Sources
                                </p>
                                {m.sources.map((source, idx) => (
                                  <div
                                    key={`${m.id}-src-${idx}`}
                                    className="rounded-xl border border-[var(--border)] bg-[var(--panel)] px-3 py-2.5"
                                  >
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                      <div className="flex items-center gap-1.5">
                                        <span className="rounded-md bg-[var(--surface-muted)] px-1.5 py-0.5 text-[9px] font-medium text-[var(--muted)]">
                                          p.{source.page ?? "?"}
                                        </span>
                                        {source.chapter && (
                                          <span className="text-[10px] text-[var(--muted)]">
                                            {source.chapter}
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-1.5">
                                        <button
                                          type="button"
                                          disabled={
                                            !sessionBookId ||
                                            source.page == null ||
                                            source.page < 1
                                          }
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            openSourceInBook(
                                              sessionBookId,
                                              source.page,
                                              source.preview,
                                            );
                                          }}
                                          className="flex items-center gap-1 rounded-lg border border-[var(--accent-muted)]/50 bg-[var(--panel-soft)] px-2 py-1 text-[10px] font-medium text-[var(--accent)] transition-colors hover:bg-[var(--panel)] disabled:opacity-40"
                                        >
                                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24">
                                            <path
                                              stroke="currentColor"
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                              strokeWidth={2}
                                              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                            />
                                          </svg>
                                          Open
                                        </button>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            speakText(
                                              source.preview ??
                                                `Page ${source.page ?? "unknown"} ${source.chapter ?? ""}`,
                                            );
                                          }}
                                          className="flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--panel-soft)] px-2 py-1 text-[10px] text-[var(--muted)] transition-colors hover:text-[var(--text)]"
                                        >
                                          <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M8 5v14l11-7z" />
                                          </svg>
                                          Hear
                                        </button>
                                      </div>
                                    </div>
                                    {source.preview && (
                                      <p className="mt-2 text-[11px] leading-snug text-[var(--text)]/80">
                                        &ldquo;{source.preview}&rdquo;
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        </details>
                      ) : null}
                    </div>

                    {/* Hover action buttons */}
                    <div
                      className={`flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 ${isUser ? "flex-row-reverse" : "flex-row"}`}
                    >
                      <button
                        type="button"
                        onClick={() => void copyMessage(m.id, m.content)}
                        title={copiedId === m.id ? "Copied!" : "Copy message"}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--panel)] text-[var(--faint)] transition-colors hover:text-[var(--text)]"
                      >
                        {copiedId === m.id ? (
                          <svg className="h-3.5 w-3.5 text-[var(--success)]" fill="none" viewBox="0 0 24 24">
                            <path
                              stroke="currentColor"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2.5}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        ) : (
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                            <path
                              stroke="currentColor"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.75}
                              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                            />
                          </svg>
                        )}
                      </button>
                      {!isUser && (
                        <button
                          type="button"
                          onClick={() =>
                            speakingMessageId === m.id
                              ? stopSpeaking()
                              : speakText(m.content, m.id)
                          }
                          title={speakingMessageId === m.id ? "Stop audio" : "Play audio"}
                          className={`flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--panel)] transition-colors hover:text-[var(--text)] ${speakingMessageId === m.id ? "text-[var(--accent)]" : "text-[var(--faint)]"}`}
                        >
                          {speakingMessageId === m.id ? (
                            <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                              <rect x="6" y="6" width="12" height="12" rx="2" />
                            </svg>
                          ) : (
                            <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Thinking indicator */}
          {isAsking && (
            <div className="mt-6 flex items-start gap-3">
              <AiAvatar />
              <div className="flex flex-col gap-2">
                <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--faint)]">
                  BookChat AI
                </p>
                <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm border border-[var(--border)] bg-[var(--chat-assistant)] px-4 py-3">
                  <span className="chat-thinking-dot h-2 w-2 rounded-full bg-[var(--accent)]" />
                  <span className="chat-thinking-dot h-2 w-2 rounded-full bg-[var(--accent)]" />
                  <span className="chat-thinking-dot h-2 w-2 rounded-full bg-[var(--accent)]" />
                  <span className="ml-2 text-xs text-[var(--muted)]">Retrieving context…</span>
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} className="h-4 w-full shrink-0" aria-hidden />
        </div>

        {/* Jump to latest */}
        {showJumpLatest && (
          <div className="pointer-events-none absolute bottom-3 left-1/2 z-10 -translate-x-1/2">
            <button
              type="button"
              onClick={jumpToLatest}
              className="pointer-events-auto flex items-center gap-2 rounded-full border border-[var(--border-strong)] bg-[var(--panel)] px-4 py-2 text-xs font-medium text-[var(--text)] shadow-lg transition-colors hover:bg-[var(--panel-soft)]"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                <path
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
              Jump to latest
            </button>
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="shrink-0 border-t border-[var(--border)] bg-[var(--panel)] px-4 pb-4 pt-3 sm:px-6">
        {/* Listening indicator */}
        {isListening && (
          <div className="mb-3 flex items-center gap-2 rounded-xl border border-[var(--accent)]/40 bg-[var(--accent-subtle)] px-3 py-2">
            <span className="voice-orb relative inline-flex h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--accent)]" />
            <div className="voice-bars" aria-hidden>
              <span /><span /><span /><span /><span />
            </div>
            <p className="text-xs font-medium text-[var(--text)]">Listening… speak naturally.</p>
          </div>
        )}

        {/* Disabled reason */}
        {composerDisabledReason && (
          <p className="mb-3 text-xs leading-relaxed text-[var(--muted)]">{composerDisabledReason}</p>
        )}

        {/* K control (collapsible) */}
        {showKControl && (
          <div className="mb-3 flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2">
            <label htmlFor="k-chat" className="text-xs font-medium text-[var(--muted)]">
              Top K chunks
            </label>
            <input
              id="k-chat"
              type="number"
              min={1}
              max={20}
              value={k}
              onChange={(e) => setK(Math.max(1, Math.min(20, Number(e.target.value) || 8)))}
              className="w-20 rounded-lg border border-[var(--border)] bg-[var(--chat-thread)] px-2.5 py-1.5 text-sm text-[var(--text)] focus:border-[var(--accent)] focus:outline-none"
            />
            <p className="text-[10px] text-[var(--faint)]">
              Number of context chunks retrieved per query
            </p>
          </div>
        )}

        <form ref={formRef} onSubmit={onComposerSubmit}>
          <div className="relative flex items-end gap-2 rounded-2xl border border-[var(--border)] bg-[var(--chat-thread)] px-3 py-2.5 transition-colors focus-within:border-[var(--accent)] focus-within:ring-2 focus-within:ring-[var(--accent)]/15">
            <textarea
              ref={textareaRef}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={
                canSend ? "Message about this book…" : "Select a book in the library first"
              }
              disabled={!canSend}
              rows={1}
              onKeyDown={(e) => {
                if (e.key !== "Enter" || e.shiftKey) return;
                e.preventDefault();
                if (isAsking || !canSend || !question.trim()) return;
                formRef.current?.requestSubmit();
              }}
              className="max-h-40 min-h-[1.5rem] flex-1 resize-none bg-transparent text-sm text-[var(--text)] placeholder:text-[var(--faint)] focus:outline-none disabled:opacity-50"
            />

            {/* Right-side action buttons */}
            <div className="flex shrink-0 items-center gap-1.5 pb-0.5">
              {/* Settings/K toggle */}
              <button
                type="button"
                onClick={() => setShowKControl((v) => !v)}
                title="Retrieval settings"
                className={`flex h-7 w-7 items-center justify-center rounded-lg border transition-colors ${
                  showKControl
                    ? "border-[var(--accent)]/50 bg-[var(--accent-subtle)] text-[var(--accent)]"
                    : "border-[var(--border)] text-[var(--faint)] hover:text-[var(--muted)]"
                }`}
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                  <path
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.75}
                    d="M12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"
                  />
                </svg>
              </button>

              {/* Mic */}
              {recognitionSupported && (
                <button
                  type="button"
                  onClick={handleDictation}
                  title={isListening ? "Stop recording" : "Dictate message"}
                  className={`flex h-7 w-7 items-center justify-center rounded-lg border transition-all ${
                    isListening
                      ? "voice-recording border-[var(--accent)] bg-[var(--accent-subtle)] text-[var(--accent)]"
                      : "border-[var(--border)] text-[var(--faint)] hover:text-[var(--muted)]"
                  }`}
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                    <path
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.75}
                      d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4M12 15V3m0 0a3 3 0 00-3 3v4a3 3 0 006 0V6a3 3 0 00-3-3z"
                    />
                  </svg>
                </button>
              )}

              {/* Send */}
              <button
                type="submit"
                disabled={isAsking || !canSend || !question.trim()}
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent)] text-white shadow-sm transition-all hover:bg-[var(--accent-hover)] disabled:opacity-40"
                title="Send message (Enter)"
              >
                {isAsking ? (
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                    <path
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M5 12h14m-7-7l7 7-7 7"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Composer hint */}
          {canSend && (
            <p className="mt-2 text-[10px] text-[var(--faint)]">
              <kbd className="rounded border border-[var(--border)] bg-[var(--panel-soft)] px-1 py-0.5 font-mono text-[9px]">
                Enter
              </kbd>{" "}
              send ·{" "}
              <kbd className="rounded border border-[var(--border)] bg-[var(--panel-soft)] px-1 py-0.5 font-mono text-[9px]">
                Shift+Enter
              </kbd>{" "}
              newline · K={k}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
