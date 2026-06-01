"use client";

import type { Book } from "@/components/workspace/domain";

function hashBookId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (Math.imul(31, h) + id.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

const GRADIENT_PALETTES: [string, string][] = [
  ["#571fe9", "#9333ea"],
  ["#1d4ed8", "#6366f1"],
  ["#0ea5e9", "#3b82f6"],
  ["#10b981", "#0ea5e9"],
  ["#f59e0b", "#ef4444"],
  ["#8b5cf6", "#ec4899"],
  ["#06b6d4", "#3b82f6"],
  ["#e94b35", "#e91e8c"],
  ["#16a34a", "#3b82f6"],
  ["#dc2626", "#9333ea"],
];

function getBookGradient(bookId: string): string {
  const hash = hashBookId(bookId);
  const palette = GRADIENT_PALETTES[hash % GRADIENT_PALETTES.length]!;
  return `linear-gradient(135deg, ${palette[0]} 0%, ${palette[1]} 100%)`;
}

type Props = {
  book: Book;
  isSpeaking: boolean;
  isPreparingListen: boolean;
  isDeleting: boolean;
  onReadBook: () => void;
  onListen: () => void;
  onStartFrom: () => void;
  onCancelListen: () => void;
  onStopAudio: () => void;
  onDelete: () => void;
};

export function BookCard({
  book,
  isSpeaking,
  isPreparingListen,
  isDeleting,
  onReadBook,
  onListen,
  onStartFrom,
  onCancelListen,
  onStopAudio,
  onDelete,
}: Props) {
  const gradient = getBookGradient(book.book_id);

  const indexedDate = book.indexed_at
    ? new Date(book.indexed_at * 1000).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--panel)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--border-strong)] hover:shadow-lg">
      {/* Gradient cover */}
      <div
        className="relative h-28 w-full shrink-0"
        style={{ background: gradient }}
        aria-hidden
      >
        <div className="absolute inset-0 flex items-center justify-center opacity-15">
          <svg className="h-16 w-16 text-white" fill="none" viewBox="0 0 24 24">
            <path
              stroke="white"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
        </div>
        {/* Audio status badge */}
        {isPreparingListen && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1.5 rounded-full bg-black/50 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur-sm">
            <span className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            Preparing
          </div>
        )}
        {isSpeaking && !isPreparingListen && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1.5 rounded-full bg-black/50 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur-sm">
            <span className="voice-bars">
              <span />
              <span />
              <span />
            </span>
            Playing
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-4">
        <p
          className="line-clamp-2 text-sm font-semibold leading-snug text-[var(--text)]"
          title={book.filename}
        >
          {book.filename}
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center rounded-md bg-[var(--surface-muted)] px-2 py-0.5 text-[10px] font-medium text-[var(--muted)]">
            {book.pages} pages
          </span>
          <span className="inline-flex items-center rounded-md bg-[var(--surface-muted)] px-2 py-0.5 text-[10px] font-medium text-[var(--muted)]">
            {book.chunks} chunks
          </span>
        </div>

        {indexedDate && (
          <p className="mt-1.5 text-[10px] text-[var(--faint)]">Indexed {indexedDate}</p>
        )}
        <p className="mt-0.5 truncate font-mono text-[9px] text-[var(--faint)]" title={book.book_id}>
          {book.book_id}
        </p>

        {/* Actions */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-[var(--border)] pt-3">
          <button
            type="button"
            onClick={onReadBook}
            className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--chat-thread)] px-2.5 py-1.5 text-xs font-medium text-[var(--text)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--panel-soft)]"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
              <path
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
            Read
          </button>

          {isPreparingListen ? (
            <button
              type="button"
              onClick={onCancelListen}
              className="flex items-center gap-1.5 rounded-lg border border-[var(--danger-border)] bg-[var(--danger-bg)] px-2.5 py-1.5 text-xs font-medium text-[var(--danger)]"
            >
              <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
              Cancel
            </button>
          ) : isSpeaking ? (
            <button
              type="button"
              onClick={onStopAudio}
              className="flex items-center gap-1.5 rounded-lg border border-[var(--danger-border)] bg-[var(--danger-bg)] px-2.5 py-1.5 text-xs font-medium text-[var(--danger)]"
            >
              <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
              Stop
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onListen}
                title="Listen from the beginning"
                className="flex items-center gap-1.5 rounded-lg border border-[var(--accent-muted)] bg-[var(--accent-subtle)] px-2.5 py-1.5 text-xs font-medium text-[var(--accent)] transition-colors hover:opacity-80"
              >
                <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Listen
              </button>
              <button
                type="button"
                onClick={onStartFrom}
                title="Choose a line or highlight text to start"
                className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--chat-thread)] px-2.5 py-1.5 text-xs font-medium text-[var(--text)] transition-colors hover:bg-[var(--panel-soft)]"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                  <path
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                From line…
              </button>
            </>
          )}

          <button
            type="button"
            disabled={isDeleting}
            onClick={onDelete}
            className="ml-auto flex items-center gap-1.5 rounded-lg border border-transparent px-2.5 py-1.5 text-xs font-medium text-[var(--faint)] transition-colors hover:border-[var(--danger-border)] hover:bg-[var(--danger-bg)] hover:text-[var(--danger)] disabled:opacity-50"
          >
            {isDeleting ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[var(--danger)] border-t-transparent" />
            ) : (
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                <path
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.75}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            )}
            {isDeleting ? "…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
