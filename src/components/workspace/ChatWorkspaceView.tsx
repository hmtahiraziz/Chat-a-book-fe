"use client";

import { useState } from "react";
import Link from "next/link";
import { ApiConnectionBanner } from "@/components/ApiConnectionBanner";
import { useWorkspaceApp } from "@/providers/WorkspaceAppProvider";
import { ChatThreadPanel } from "@/components/workspace/ChatThreadPanel";

function formatRelativeTime(ms: number): string {
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function ChatWorkspaceView() {
  const {
    books,
    activeSession,
    selectedBook,
    selectedBookId,
    booksStatus,
    sortedSessions,
    activeSessionId,
    createNewChatSession,
    selectSession,
    deleteSession,
  } = useWorkspaceApp();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newChatBookId, setNewChatBookId] = useState("");

  const openCreateDialog = () => {
    if (books.length === 0) return;
    setNewChatBookId(books[0]?.book_id ?? "");
    setIsCreateOpen(true);
  };

  const handleCreateNew = () => {
    if (!newChatBookId) return;
    createNewChatSession(newChatBookId);
    setIsCreateOpen(false);
  };

  const activeBookLabel =
    activeSession?.bookLabel ??
    selectedBook?.filename ??
    (selectedBookId ? selectedBookId : null);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ApiConnectionBanner />

      {/* Top header */}
      <header className="shrink-0 border-b border-[var(--border)] bg-[var(--panel)] px-4 py-3.5 lg:px-6">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-subtle)]">
              <svg className="h-4 w-4 text-[var(--accent)]" fill="none" viewBox="0 0 24 24">
                <path
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <div>
              <h1 className="font-display text-lg font-semibold leading-tight tracking-tight text-[var(--text)]">
                Chat
              </h1>
              <p className="text-[10px] text-[var(--faint)]">
                RAG conversation ·{" "}
                <Link
                  href="/workspace"
                  className="text-[var(--accent)] hover:underline"
                >
                  Manage books
                </Link>
              </p>
            </div>
          </div>

          {/* Active book chip */}
          {activeBookLabel ? (
            <div className="hidden items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] px-3 py-2 sm:flex">
              <div className="h-2 w-2 shrink-0 rounded-full bg-[var(--success)]" />
              <div className="min-w-0">
                <p className="text-[9px] font-semibold uppercase tracking-wider text-[var(--faint)]">
                  Active book
                </p>
                <p className="max-w-[18rem] truncate text-xs font-semibold text-[var(--text)]">
                  {activeBookLabel}
                </p>
              </div>
            </div>
          ) : (
            <Link
              href="/workspace"
              className="hidden items-center gap-2 rounded-xl border border-dashed border-[var(--border-strong)] px-3 py-2 text-xs text-[var(--muted)] transition-colors hover:border-[var(--accent)]/40 hover:text-[var(--text)] sm:flex"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                <path
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Add a book first
            </Link>
          )}
        </div>
      </header>

      {/* Layout */}
      <div className="mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 flex-col md:flex-row">

        {/* Threads sidebar */}
        <aside className="flex max-h-[38vh] shrink-0 flex-col border-b border-[var(--border)] bg-[var(--panel)] md:max-h-none md:w-72 md:border-b-0 md:border-r">
          {/* Sidebar header */}
          <div className="shrink-0 border-b border-[var(--border)] px-3 py-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <svg className="h-3.5 w-3.5 text-[var(--muted)]" fill="none" viewBox="0 0 24 24">
                  <path
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                  />
                </svg>
                <span className="text-xs font-semibold text-[var(--text)]">Threads</span>
                {sortedSessions.length > 0 && (
                  <span className="rounded-full bg-[var(--surface-muted)] px-1.5 py-0.5 text-[9px] font-bold text-[var(--muted)]">
                    {sortedSessions.length}
                  </span>
                )}
              </div>
              <button
                type="button"
                disabled={books.length === 0}
                onClick={openCreateDialog}
                className="flex items-center gap-1 rounded-lg bg-[var(--accent)] px-2.5 py-1.5 text-[11px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24">
                  <path
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                New
              </button>
            </div>
          </div>

          {/* Thread list */}
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {sortedSessions.length === 0 ? (
              <div className="flex flex-col items-center gap-3 px-3 py-8 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--surface-muted)]">
                  <svg className="h-5 w-5 text-[var(--faint)]" fill="none" viewBox="0 0 24 24">
                    <path
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.75}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                </div>
                <p className="text-xs leading-relaxed text-[var(--muted)]">
                  {booksStatus === "error"
                    ? "API unreachable. Fix the connection, then pick a book."
                    : "No threads yet. Create one to start chatting."}
                </p>
                {books.length > 0 && (
                  <button
                    type="button"
                    onClick={openCreateDialog}
                    className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-white"
                  >
                    Start a thread
                  </button>
                )}
              </div>
            ) : (
              <ul className="space-y-1">
                {sortedSessions.map((s) => {
                  const isActive = activeSessionId === s.id;
                  return (
                    <li key={s.id}>
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => selectSession(s.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            selectSession(s.id);
                          }
                        }}
                        className={`group relative flex w-full cursor-pointer flex-col gap-1 rounded-xl px-3 py-2.5 text-left transition-all duration-150 ${
                          isActive
                            ? "bg-[var(--accent-subtle)] ring-1 ring-[var(--accent)]/40"
                            : "hover:bg-[var(--panel-soft)]"
                        }`}
                      >
                        {/* Active left bar */}
                        {isActive && (
                          <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-[var(--accent)]" />
                        )}

                        <div className="flex items-start justify-between gap-1.5">
                          <p className="line-clamp-1 flex-1 text-xs font-semibold text-[var(--text)]">
                            {s.title}
                          </p>
                          {/* Delete button — only on hover */}
                          <button
                            type="button"
                            aria-label="Delete thread"
                            onClick={(ev) => deleteSession(s.id, ev)}
                            className="shrink-0 rounded-md p-0.5 text-[var(--faint)] opacity-0 transition-all hover:bg-[var(--danger-bg)] hover:text-[var(--danger)] group-hover:opacity-100"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                              <path
                                stroke="currentColor"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        </div>

                        <div className="flex items-center justify-between gap-1">
                          <p className="line-clamp-1 text-[10px] text-[var(--muted)]">
                            {s.bookLabel}
                          </p>
                          <p className="shrink-0 text-[9px] text-[var(--faint)]">
                            {formatRelativeTime(s.updatedAt)}
                          </p>
                        </div>

                        <p className="text-[9px] font-medium uppercase tracking-wider text-[var(--faint)]">
                          {s.messages.length} msg{s.messages.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>

        {/* Chat area */}
        <main className="flex min-h-0 min-w-0 flex-1 flex-col">
          <ChatThreadPanel />
        </main>
      </div>

      {/* New chat dialog */}
      {isCreateOpen && (
        <div
          className="fixed inset-0 z-[160] flex items-center justify-center bg-black/65 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Create new chat"
          onClick={() => setIsCreateOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-subtle)]">
                <svg className="h-5 w-5 text-[var(--accent)]" fill="none" viewBox="0 0 24 24">
                  <path
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-display text-lg font-semibold text-[var(--text)]">
                  New chat thread
                </h3>
                <p className="text-xs text-[var(--muted)]">
                  Choose the book this conversation will use.
                </p>
              </div>
            </div>

            <div className="mt-5">
              <label
                htmlFor="new-chat-book"
                className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[var(--muted)]"
              >
                Book
              </label>
              <select
                id="new-chat-book"
                value={newChatBookId}
                onChange={(e) => setNewChatBookId(e.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--chat-thread)] px-3.5 py-2.5 text-sm text-[var(--text)] transition-colors focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
              >
                {books.map((book) => (
                  <option key={book.book_id} value={book.book_id}>
                    {book.filename}
                  </option>
                ))}
              </select>
              {/* Book meta preview */}
              {(() => {
                const selected = books.find((b) => b.book_id === newChatBookId);
                if (!selected) return null;
                return (
                  <div className="mt-2 flex gap-2">
                    <span className="rounded-md bg-[var(--surface-muted)] px-2 py-0.5 text-[10px] text-[var(--muted)]">
                      {selected.pages} pages
                    </span>
                    <span className="rounded-md bg-[var(--surface-muted)] px-2 py-0.5 text-[10px] text-[var(--muted)]">
                      {selected.chunks} chunks
                    </span>
                  </div>
                );
              })()}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text)] transition-colors hover:bg-[var(--panel-soft)]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!newChatBookId}
                onClick={handleCreateNew}
                className="rounded-xl bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                Create thread
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
