"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { isDemoUser } from "@/lib/authApi";
import { useAuth } from "@/providers/AuthProvider";
import { useWorkspaceApp } from "@/providers/WorkspaceAppProvider";
import { ADMIN_API_TOKEN, API_BASE_URL } from "@/lib/api";
import { authHeaders } from "@/lib/authApi";
import { mapLineCharToChunkPosition } from "@/lib/bookAudioSession";
import { speechCleanText, type Book } from "@/components/workspace/domain";
import { BookCard } from "@/components/workspace/BookCard";
import { DeleteConfirmModal } from "@/components/workspace/DeleteConfirmModal";

function LibrarySkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="skeleton-shimmer overflow-hidden rounded-2xl border border-[var(--border)]"
          aria-hidden
        >
          <div className="h-28 w-full bg-[var(--surface-muted)]" />
          <div className="p-4 space-y-3">
            <div className="h-4 w-3/4 rounded-lg bg-[var(--surface-muted)]" />
            <div className="h-3 w-1/2 rounded-lg bg-[var(--surface-muted)]" />
            <div className="h-3 w-2/3 rounded-lg bg-[var(--surface-muted)]" />
          </div>
        </div>
      ))}
    </div>
  );
}

type Props = {
  onGoToIngestion?: () => void;
};

export function LibraryPanel({ onGoToIngestion }: Props) {
  const { user } = useAuth();
  const demo = isDemoUser(user);
  const {
    books,
    booksStatus,
    loadBooks,
    openBookPdf,
    deleteBook,
    startBookListen,
    stopAudioSession,
    isBookAudioActive,
    isBookAudioLoading,
    audioSession,
  } = useWorkspaceApp();

  // ── Search / sort ──────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "pages" | "chunks">("name");

  const filteredBooks = books
    .filter((b) =>
      search.trim() === "" ||
      b.filename.toLowerCase().includes(search.toLowerCase()) ||
      b.book_id.toLowerCase().includes(search.toLowerCase()),
    )
    .sort((a, b) => {
      if (sortBy === "pages") return b.pages - a.pages;
      if (sortBy === "chunks") return b.chunks - a.chunks;
      return a.filename.localeCompare(b.filename);
    });

  // ── Delete ─────────────────────────────────────────────────────────────────
  const [deleteError, setDeleteError] = useState("");
  const [deletingBookId, setDeletingBookId] = useState<string | null>(null);
  const [confirmDeleteBook, setConfirmDeleteBook] = useState<Book | null>(null);

  const handleDeleteBook = async (book: Book) => {
    setDeleteError("");
    setDeletingBookId(book.book_id);
    try {
      await deleteBook(book.book_id);
      if (isBookAudioActive(book.book_id)) stopAudioSession();
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : "Delete failed.");
    } finally {
      setDeletingBookId(null);
      setConfirmDeleteBook(null);
    }
  };

  const [listenError, setListenError] = useState("");
  const chunksCacheRef = useRef<Record<string, string[]>>({});

  const handleListen = async (book: Book) => {
    setListenError("");
    try {
      await startBookListen(book);
    } catch (error) {
      setListenError(error instanceof Error ? error.message : "Could not start audio.");
    }
  };

  const fetchBookChunks = async (bookId: string): Promise<string[]> => {
    const token = ADMIN_API_TOKEN;
    const limit = 200;
    let offset = 0;
    let total = Number.POSITIVE_INFINITY;
    const parts: string[] = [];
    const embProvider = books.find((b) => b.book_id === bookId)?.embedding_provider ?? "openai";
    while (offset < total) {
      const params = `offset=${offset}&limit=${limit}&embedding_provider=${embProvider}`;
      const endpoints = [
        `${API_BASE_URL}/admin/books/${encodeURIComponent(bookId)}/chunks?${params}`,
        `${API_BASE_URL}/books/${encodeURIComponent(bookId)}/chunks?${params}`,
      ];
      let response: Response | null = null;
      for (const endpoint of endpoints) {
        const headers = { ...(authHeaders() as Record<string, string>) };
        if (token) headers["X-Admin-Token"] = token;
        const res = await fetch(endpoint, { headers });
        if (res.status === 404) continue;
        response = res;
        break;
      }
      if (!response) {
        throw new Error(
          "This backend does not expose a chunks endpoint for whole-book audio.",
        );
      }
      if (!response.ok) {
        throw new Error(
          response.status === 401
            ? "Admin token required for whole-book audio. Set NEXT_PUBLIC_ADMIN_API_TOKEN."
            : `Could not load book chunks (HTTP ${response.status}).`,
        );
      }
      const data = (await response.json()) as {
        total: number;
        returned: number;
        chunks: Array<{ text?: string }>;
      };
      total = typeof data.total === "number" ? data.total : 0;
      const chunkTexts = (data.chunks ?? [])
        .map((c) => speechCleanText(c.text ?? ""))
        .filter(Boolean);
      parts.push(...chunkTexts);
      if (!data.returned || data.returned <= 0) break;
      offset += data.returned;
    }
    return parts;
  };

  const getOrFetchBookChunks = async (bookId: string): Promise<string[]> => {
    const cached = chunksCacheRef.current[bookId];
    if (cached && cached.length > 0) return cached;
    const loaded = await fetchBookChunks(bookId);
    chunksCacheRef.current[bookId] = loaded;
    return loaded;
  };

  // ── Start-from dialog ──────────────────────────────────────────────────────
  const [startDialogOpen, setStartDialogOpen] = useState(false);
  const [startDialogBook, setStartDialogBook] = useState<Book | null>(null);
  const [startDialogLoading, setStartDialogLoading] = useState(false);
  const [startDialogError, setStartDialogError] = useState("");
  const [startDialogChunks, setStartDialogChunks] = useState<string[]>([]);
  const [startLine, setStartLine] = useState(1);
  const [startChar, setStartChar] = useState(1);
  const [selectedPreviewStart, setSelectedPreviewStart] = useState<number | null>(null);
  const [selectedPreviewEnd, setSelectedPreviewEnd] = useState<number | null>(null);
  const previewTextRef = useRef<HTMLParagraphElement | null>(null);

  const dialogJoined = startDialogChunks.join("\n");
  const dialogLines = dialogJoined ? dialogJoined.split("\n") : [];
  const dialogLineCount = dialogLines.length;
  const clampedDialogLine = Math.max(1, Math.min(startLine, Math.max(1, dialogLineCount)));
  const currentDialogLineText = dialogLines[clampedDialogLine - 1] ?? "";
  const currentDialogLineMaxChar = Math.max(1, currentDialogLineText.length);

  const openStartDialog = async (book: Book) => {
    setStartDialogBook(book);
    setStartDialogOpen(true);
    setStartDialogLoading(true);
    setStartDialogError("");
    setStartDialogChunks([]);
    setStartLine(1);
    setStartChar(1);
    setSelectedPreviewStart(null);
    setSelectedPreviewEnd(null);
    try {
      const chunks = await getOrFetchBookChunks(book.book_id);
      setStartDialogChunks(chunks);
    } catch (error) {
      setStartDialogError(error instanceof Error ? error.message : "Could not load book text.");
    } finally {
      setStartDialogLoading(false);
    }
  };

  const startFromPosition = async (overrideChar?: number) => {
    if (!startDialogBook || startDialogChunks.length === 0) return;
    const line = Math.max(1, Math.min(startLine, dialogLineCount || 1));
    const char = Math.max(
      1,
      Math.min(
        overrideChar ?? startChar,
        Math.max(1, (dialogLines[line - 1] ?? "").length),
      ),
    );
    const pos = mapLineCharToChunkPosition(startDialogChunks, line, char);
    setStartDialogOpen(false);
    try {
      await startBookListen(startDialogBook, {
        chunks: startDialogChunks,
        startChunkIndex: pos.chunkIndex,
        startCharIndex: pos.charIndex,
      });
    } catch (error) {
      setListenError(error instanceof Error ? error.message : "Could not start audio.");
    }
  };

  const handlePreviewSelection = () => {
    const container = previewTextRef.current;
    if (!container) return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
      setSelectedPreviewStart(null);
      setSelectedPreviewEnd(null);
      return;
    }
    const range = sel.getRangeAt(0);
    if (!container.contains(range.commonAncestorContainer)) {
      setSelectedPreviewStart(null);
      setSelectedPreviewEnd(null);
      return;
    }
    const pre = range.cloneRange();
    pre.selectNodeContents(container);
    pre.setEnd(range.startContainer, range.startOffset);
    const start = pre.toString().length;
    const selectedText = range.toString();
    const end = start + selectedText.length;
    if (!selectedText.trim()) {
      setSelectedPreviewStart(null);
      setSelectedPreviewEnd(null);
      return;
    }
    setSelectedPreviewStart(Math.max(0, start));
    setSelectedPreviewEnd(Math.max(start, end));
  };

  useEffect(() => {
    setSelectedPreviewStart(null);
    setSelectedPreviewEnd(null);
  }, [startLine, currentDialogLineText]);

  useEffect(() => {
    if (!startDialogOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setStartDialogOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [startDialogOpen]);

  const goToDialogLine = (line: number) => {
    const next = Math.max(1, Math.min(line, Math.max(1, dialogLineCount)));
    setStartLine(next);
    const lineText = dialogLines[next - 1] ?? "";
    setStartChar((c) => Math.max(1, Math.min(c, Math.max(1, lineText.length))));
  };

  const caretRangeAtPoint = (x: number, y: number): Range | null => {
    if (document.caretRangeFromPoint) {
      return document.caretRangeFromPoint(x, y);
    }
    const pos = document.caretPositionFromPoint?.(x, y);
    if (!pos) return null;
    const range = document.createRange();
    range.setStart(pos.offsetNode, pos.offset);
    range.collapse(true);
    return range;
  };

  const handlePreviewClick = (e: MouseEvent<HTMLParagraphElement>) => {
    const container = previewTextRef.current;
    if (!container) return;
    const range = caretRangeAtPoint(e.clientX, e.clientY);
    if (!range || !container.contains(range.startContainer)) return;
    const pre = range.cloneRange();
    pre.selectNodeContents(container);
    pre.setEnd(range.startContainer, range.startOffset);
    const charIndex = pre.toString().length;
    setStartChar(Math.max(1, charIndex + 1));
    setSelectedPreviewStart(charIndex);
    setSelectedPreviewEnd(charIndex);
  };

  // ── Derived UI state ───────────────────────────────────────────────────────
  const showSkeleton = booksStatus === "loading" && books.length === 0;
  const showEmpty = books.length === 0 && booksStatus === "ready";
  const showError = booksStatus === "error" && books.length === 0;

  return (
    <div className="space-y-5">
      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--faint)]"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search books…"
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel)] py-2.5 pl-9 pr-4 text-sm text-[var(--text)] placeholder:text-[var(--faint)] transition-colors focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
          />
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          className="rounded-xl border border-[var(--border)] bg-[var(--panel)] px-3 py-2.5 text-sm text-[var(--muted)] transition-colors focus:border-[var(--accent)] focus:outline-none"
        >
          <option value="name">Sort: Name</option>
          <option value="pages">Sort: Pages</option>
          <option value="chunks">Sort: Chunks</option>
        </select>
        <button
          type="button"
          disabled={booksStatus === "loading"}
          onClick={() => void loadBooks()}
          className="flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--panel)] px-3.5 py-2.5 text-sm font-medium text-[var(--muted)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text)] disabled:opacity-50"
        >
          <svg
            className={`h-4 w-4 ${booksStatus === "loading" ? "animate-spin" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          {booksStatus === "loading" ? "Loading…" : "Refresh"}
        </button>
      </div>

      {/* Error / listen alerts */}
      {(listenError || (audioSession.error && audioSession.source === "library")) && (
        <p className="rounded-xl border border-[var(--warning)]/30 bg-[var(--warning-bg)] px-4 py-3 text-sm text-[var(--warning)]">
          {listenError || audioSession.error}
        </p>
      )}
      {deleteError && (
        <p className="rounded-xl border border-[var(--danger-border)]/30 bg-[var(--danger-bg)] px-4 py-3 text-sm text-[var(--danger)]">
          {deleteError}
        </p>
      )}

      {/* Book grid */}
      {showSkeleton ? (
        <LibrarySkeleton />
      ) : showError ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--panel)] py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--danger-bg)]">
            <svg className="h-6 w-6 text-[var(--danger)]" fill="none" viewBox="0 0 24 24">
              <path
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.75}
                d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
              />
            </svg>
          </div>
          <p className="text-sm font-medium text-[var(--text)]">Could not load library</p>
          <p className="max-w-xs text-xs text-[var(--muted)]">
            Check that the backend is running, then try refreshing.
          </p>
          <button
            type="button"
            onClick={() => void loadBooks()}
            className="mt-1 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white"
          >
            Retry
          </button>
        </div>
      ) : showEmpty ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--panel)] py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--surface-muted)]">
            <svg className="h-8 w-8 text-[var(--faint)]" fill="none" viewBox="0 0 24 24">
              <path
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
          </div>
          <div>
            <p className="text-base font-semibold text-[var(--text)]">No books yet</p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {demo
                ? "The sample book is not available. Ask your host to run the demo seed script."
                : "Upload a PDF in the Ingestion tab to get started."}
            </p>
          </div>
          {onGoToIngestion ? (
            <button
              type="button"
              onClick={onGoToIngestion}
              className="flex items-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24">
                <path
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              Go to Ingestion
            </button>
          ) : null}
        </div>
      ) : filteredBooks.length === 0 ? (
        <p className="py-8 text-center text-sm text-[var(--muted)]">
          No books match &ldquo;{search}&rdquo;.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredBooks.map((book) => (
            <BookCard
              key={book.book_id}
              book={book}
              isSpeaking={isBookAudioActive(book.book_id)}
              isPreparingListen={isBookAudioLoading(book.book_id)}
              isDeleting={deletingBookId === book.book_id}
              onReadBook={() => openBookPdf(book.book_id)}
              onListen={() => void handleListen(book)}
              onStartFrom={() => void openStartDialog(book)}
              onCancelListen={stopAudioSession}
              onStopAudio={stopAudioSession}
              onDelete={() => setConfirmDeleteBook(book)}
              showDelete={!demo}
            />
          ))}
        </div>
      )}

      {/* Delete confirm modal */}
      {confirmDeleteBook && (
        <DeleteConfirmModal
          bookName={confirmDeleteBook.filename}
          isLoading={deletingBookId === confirmDeleteBook.book_id}
          onConfirm={() => void handleDeleteBook(confirmDeleteBook)}
          onCancel={() => setConfirmDeleteBook(null)}
        />
      )}

      {/* Start-from dialog */}
      {startDialogOpen && (
        <div
          className="fixed inset-0 z-[190] flex items-end justify-center bg-black/65 p-0 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Start listening from a line"
          onClick={() => setStartDialogOpen(false)}
        >
          <div
            className="flex max-h-[min(92vh,720px)] w-full max-w-2xl flex-col rounded-t-2xl border border-[var(--border)] bg-[var(--panel)] shadow-2xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="shrink-0 border-b border-[var(--border)] px-5 py-4">
              <h3 className="font-display text-xl text-[var(--text)]">
                Start from a line
              </h3>
              <p className="mt-1 truncate text-xs text-[var(--muted)]">
                {startDialogBook?.filename ?? "Book"}
              </p>
              <p className="mt-2 text-[11px] leading-relaxed text-[var(--faint)]">
                Pick a line and character, click the text to place the cursor, or highlight a
                phrase. Press Esc to close.
              </p>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              {startDialogLoading ? (
                <div className="flex flex-col items-center gap-3 py-10 text-center">
                  <span className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
                  <p className="text-sm font-medium text-[var(--text)]">Loading book text…</p>
                  <p className="max-w-xs text-xs text-[var(--muted)]">
                    Fetching indexed chunks so you can choose where to begin.
                  </p>
                </div>
              ) : startDialogError ? (
                <p className="rounded-xl border border-[var(--warning)]/30 bg-[var(--warning-bg)] px-3 py-2 text-xs text-[var(--warning)]">
                  {startDialogError}
                </p>
              ) : (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={clampedDialogLine <= 1}
                        onClick={() => goToDialogLine(clampedDialogLine - 1)}
                        className="rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs font-medium text-[var(--text)] hover:bg-[var(--panel-soft)] disabled:opacity-40"
                        aria-label="Previous line"
                      >
                        ← Prev
                      </button>
                      <button
                        type="button"
                        disabled={clampedDialogLine >= dialogLineCount}
                        onClick={() => goToDialogLine(clampedDialogLine + 1)}
                        className="rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs font-medium text-[var(--text)] hover:bg-[var(--panel-soft)] disabled:opacity-40"
                        aria-label="Next line"
                      >
                        Next →
                      </button>
                    </div>
                    <p className="text-xs font-medium text-[var(--muted)]">
                      Line {clampedDialogLine} of {Math.max(1, dialogLineCount)}
                    </p>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <label className="text-xs font-medium text-[var(--muted)]">
                      Line number
                      <input
                        type="number"
                        min={1}
                        max={Math.max(1, dialogLineCount)}
                        value={startLine}
                        onChange={(e) => goToDialogLine(Math.max(1, Number(e.target.value) || 1))}
                        className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--chat-thread)] px-3 py-2 text-sm text-[var(--text)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
                      />
                    </label>
                    <label className="text-xs font-medium text-[var(--muted)]">
                      Character on line
                      <input
                        type="number"
                        min={1}
                        max={currentDialogLineMaxChar}
                        value={startChar}
                        onChange={(e) => setStartChar(Math.max(1, Number(e.target.value) || 1))}
                        className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--chat-thread)] px-3 py-2 text-sm text-[var(--text)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
                      />
                    </label>
                  </div>

                  <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--chat-thread)]">
                    <div className="flex items-center justify-between border-b border-[var(--border)] px-3 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--faint)]">
                        Line preview
                      </p>
                      <p className="text-[10px] text-[var(--faint)]">
                        Click to set · drag to highlight
                      </p>
                    </div>
                    <p
                      ref={previewTextRef}
                      role="textbox"
                      tabIndex={0}
                      onClick={handlePreviewClick}
                      onMouseUp={handlePreviewSelection}
                      onKeyUp={handlePreviewSelection}
                      className="max-h-40 cursor-text overflow-y-auto whitespace-pre-wrap px-3 py-3 text-sm leading-relaxed text-[var(--text)] selection:bg-[var(--accent)]/45 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--accent)]/25"
                    >
                      {currentDialogLineText ? (
                        <>
                          {currentDialogLineText.slice(0, Math.max(0, startChar - 1))}
                          <span className="border-b-2 border-[var(--accent)] bg-[var(--accent)]/20 font-medium text-[var(--accent)]">
                            {currentDialogLineText[startChar - 1] ?? "▏"}
                          </span>
                          {currentDialogLineText.slice(startChar)}
                        </>
                      ) : (
                        <span className="text-[var(--faint)]">(Empty line)</span>
                      )}
                    </p>
                    {selectedPreviewStart != null && selectedPreviewEnd != null && (
                      <p className="border-t border-[var(--border)] px-3 py-2 text-[11px] text-[var(--muted)]">
                        {selectedPreviewStart === selectedPreviewEnd
                          ? `Cursor at character ${selectedPreviewStart + 1}`
                          : `Selection: characters ${selectedPreviewStart + 1}–${selectedPreviewEnd}`}
                      </p>
                    )}
                  </div>

                  {clampedDialogLine > 1 && (
                    <p className="mt-3 line-clamp-2 text-[11px] text-[var(--faint)]">
                      <span className="font-medium text-[var(--muted)]">Previous: </span>
                      {dialogLines[clampedDialogLine - 2]}
                    </p>
                  )}
                  {clampedDialogLine < dialogLineCount && (
                    <p className="mt-1 line-clamp-2 text-[11px] text-[var(--faint)]">
                      <span className="font-medium text-[var(--muted)]">Next: </span>
                      {dialogLines[clampedDialogLine]}
                    </p>
                  )}
                </>
              )}
            </div>

            <div className="shrink-0 border-t border-[var(--border)] px-5 py-4">
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
                <button
                  type="button"
                  onClick={() => setStartDialogOpen(false)}
                  className="rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text)] transition-colors hover:bg-[var(--panel-soft)]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={startDialogLoading || !!startDialogError}
                  onClick={() => {
                    if (!startDialogBook) return;
                    setStartDialogOpen(false);
                    void handleListen(startDialogBook).catch(() => {
                      /* errors surfaced via listenError */
                    });
                  }}
                  className="rounded-xl border border-[var(--border)] bg-[var(--chat-thread)] px-4 py-2.5 text-sm font-medium text-[var(--text)] disabled:opacity-50"
                >
                  From beginning
                </button>
                <button
                  type="button"
                  disabled={
                    startDialogLoading ||
                    !!startDialogError ||
                    startDialogChunks.length === 0
                  }
                  onClick={() => void startFromPosition()}
                  className="rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
                >
                  Start at line {clampedDialogLine}
                </button>
                {selectedPreviewStart != null &&
                  selectedPreviewEnd != null &&
                  selectedPreviewStart !== selectedPreviewEnd && (
                    <button
                      type="button"
                      disabled={
                        startDialogLoading ||
                        !!startDialogError ||
                        startDialogChunks.length === 0
                      }
                      onClick={() =>
                        void startFromPosition(
                          selectedPreviewStart != null ? selectedPreviewStart + 1 : startChar,
                        )
                      }
                      className="rounded-xl border border-[var(--accent-muted)] bg-[var(--accent-subtle)] px-4 py-2.5 text-sm font-medium text-[var(--accent)] disabled:opacity-50"
                    >
                      Start from selection
                    </button>
                  )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
