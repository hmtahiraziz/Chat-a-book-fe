"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  PLAYBACK_SPEEDS,
  readAudioPlayerPosition,
  writeAudioPlayerPosition,
  type BookAudioSession,
} from "@/lib/bookAudioSession";
import { HighlightedText } from "@/components/audio/HighlightedText";

type Props = {
  session: BookAudioSession;
  playbackSpeed: number;
  onTogglePause: () => void;
  onStop: () => void;
  onSkipChunk: (delta: number) => void;
  onSetSpeed: (speed: number) => void;
  onOpenBook?: () => void;
};

const DEFAULT_WIDTH = 320;
const DEFAULT_HEIGHT_MINI = 120;
const COLLAPSED_PILL_SIZE = 48;
const VIEWPORT_PAD = 16;
/** Gap from the right and bottom viewport edges when snapping to the corner. */
const BOTTOM_RIGHT_INSET = { right: 24, bottom: 24 };

function clampPosition(x: number, y: number, width: number, height: number) {
  if (typeof window === "undefined") return { x, y };
  const maxX = Math.max(VIEWPORT_PAD, window.innerWidth - width - VIEWPORT_PAD);
  const maxY = Math.max(VIEWPORT_PAD, window.innerHeight - height - VIEWPORT_PAD);
  return {
    x: Math.max(VIEWPORT_PAD, Math.min(x, maxX)),
    y: Math.max(VIEWPORT_PAD, Math.min(y, maxY)),
  };
}

function snapToBottomRight(width: number, height: number) {
  if (typeof window === "undefined") return { x: VIEWPORT_PAD, y: VIEWPORT_PAD };
  return clampPosition(
    window.innerWidth - width - BOTTOM_RIGHT_INSET.right,
    window.innerHeight - height - BOTTOM_RIGHT_INSET.bottom,
    width,
    height,
  );
}

function measurePanel(el: HTMLElement | null) {
  if (!el) return { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT_MINI };
  return { width: el.offsetWidth, height: el.offsetHeight };
}

export function FloatingAudioPlayer({
  session,
  playbackSpeed,
  onTogglePause,
  onStop,
  onSkipChunk,
  onSetSpeed,
  onOpenBook,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const activeChunkRef = useRef<HTMLDivElement | null>(null);
  const prevExpandedRef = useRef<boolean | null>(null);
  const prevCollapsedRef = useRef<boolean | null>(null);
  const resizeSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isActive =
    session.status === "playing" || session.status === "paused" || session.status === "loading";
  const isPlaying = session.status === "playing";
  const isPaused = session.status === "paused";
  const isLoading = session.status === "loading";
  const hasChunks = session.chunks.length > 0;
  const currentChunk = session.chunks[session.chunkIndex] ?? "";

  const applyPosition = useCallback(
    (next: { x: number; y: number }, persist = true) => {
      setPos(next);
      if (persist) writeAudioPlayerPosition(next);
    },
    [],
  );

  useEffect(() => {
    if (!isActive) {
      prevExpandedRef.current = null;
      prevCollapsedRef.current = null;
      return;
    }
    const saved = readAudioPlayerPosition();
    if (saved) {
      setPos(clampPosition(saved.x, saved.y, DEFAULT_WIDTH, DEFAULT_HEIGHT_MINI));
    } else {
      setPos(snapToBottomRight(DEFAULT_WIDTH, DEFAULT_HEIGHT_MINI));
    }
  }, [isActive]);

  /** After expand/collapse, keep the panel on-screen or snap to the bottom-right corner. */
  useLayoutEffect(() => {
    if (!isActive || !pos) return;

    if (collapsed) {
      const { width, height } = { width: COLLAPSED_PILL_SIZE, height: COLLAPSED_PILL_SIZE };
      const wasCollapsed = prevCollapsedRef.current;
      prevCollapsedRef.current = true;
      if (wasCollapsed === true) return;
      applyPosition(snapToBottomRight(width, height));
      return;
    }

    prevCollapsedRef.current = false;
    const el = panelRef.current;
    if (!el) return;

    const { width, height } = measurePanel(el);
    const prevExpanded = prevExpandedRef.current;
    prevExpandedRef.current = expanded;

    if (prevExpanded === null) {
      const clamped = clampPosition(pos.x, pos.y, width, height);
      if (clamped.x !== pos.x || clamped.y !== pos.y) applyPosition(clamped);
      return;
    }

    if (prevExpanded === false && expanded === true) {
      applyPosition(clampPosition(pos.x, pos.y, width, height));
      return;
    }

    if (prevExpanded === true && expanded === false) {
      window.setTimeout(() => {
        const measured = measurePanel(panelRef.current);
        applyPosition(snapToBottomRight(measured.width, measured.height));
      }, 300);
    }
  }, [applyPosition, collapsed, expanded, isActive, pos]);

  /** Re-clamp when the panel or window changes size. */
  useEffect(() => {
    if (!isActive || collapsed || typeof window === "undefined") return;
    const el = panelRef.current;
    if (!el) return;

    const sync = () => {
      if (resizeSyncTimerRef.current) clearTimeout(resizeSyncTimerRef.current);
      const delay = expanded ? 0 : 300;
      resizeSyncTimerRef.current = setTimeout(() => {
        const { width, height } = measurePanel(el);
        setPos((current) => {
          if (!current) return current;
          const next = expanded
            ? clampPosition(current.x, current.y, width, height)
            : snapToBottomRight(width, height);
          if (next.x === current.x && next.y === current.y) return current;
          writeAudioPlayerPosition(next);
          return next;
        });
      }, delay);
    };

    const ro = new ResizeObserver(() => sync());
    ro.observe(el);
    window.addEventListener("resize", sync);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", sync);
      if (resizeSyncTimerRef.current) clearTimeout(resizeSyncTimerRef.current);
    };
  }, [collapsed, expanded, isActive]);

  useEffect(() => {
    if (!isActive || !activeChunkRef.current) return;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    activeChunkRef.current.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" });
  }, [isActive, session.chunkIndex, session.wordStart]);

  useEffect(() => {
    if (!isActive) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        onTogglePause();
      } else if (e.key === "Escape") {
        onStop();
      } else if (e.key === "ArrowLeft") {
        onSkipChunk(-1);
      } else if (e.key === "ArrowRight") {
        onSkipChunk(1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isActive, onSkipChunk, onStop, onTogglePause]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if ((e.target as HTMLElement).closest("button, select, input")) return;
      if (!pos) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      dragRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        originX: pos.x,
        originY: pos.y,
      };
    },
    [pos],
  );

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    const height = panelRef.current?.offsetHeight ?? DEFAULT_HEIGHT_MINI;
    const width = panelRef.current?.offsetWidth ?? DEFAULT_WIDTH;
    const next = clampPosition(
      d.originX + (e.clientX - d.startX),
      d.originY + (e.clientY - d.startY),
      width,
      height,
    );
    setPos(next);
  }, []);

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      const d = dragRef.current;
      if (!d || d.pointerId !== e.pointerId) return;
      dragRef.current = null;
      if (pos) writeAudioPlayerPosition(pos);
    },
    [pos],
  );

  if (!isActive || !pos) return null;

  const showMiniPreview = hasChunks && !expanded && (isPlaying || isPaused || isLoading);

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        className="audio-player-pill fixed z-[300] flex h-12 w-12 items-center justify-center rounded-full border border-[var(--accent-muted)] bg-[var(--panel)] shadow-xl"
        style={{ left: pos.x, top: pos.y }}
        aria-label="Expand audio player"
        title={session.title}
      >
        <span className="voice-bars text-[var(--accent)]">
          <span />
          <span />
          <span />
        </span>
      </button>
    );
  }

  const progress =
    hasChunks && session.chunks.length > 0
      ? ((session.chunkIndex + 1) / session.chunks.length) * 100
      : 0;

  return (
    <div
      ref={panelRef}
      role="region"
      aria-label="Audio player"
      className={`audio-player-shell fixed z-[300] flex flex-col overflow-hidden rounded-2xl border border-[var(--border-strong)] bg-[var(--panel)] shadow-2xl ${
        expanded ? "audio-player-shell--expanded" : "audio-player-shell--mini"
      }`}
      style={{ left: pos.x, top: pos.y }}
    >
      <div
        className="flex cursor-grab items-center gap-2 border-b border-[var(--border)] bg-[var(--panel-soft)] px-3 py-2 active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <span className="text-[var(--faint)]" aria-hidden>
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="9" cy="6" r="1.5" />
            <circle cx="15" cy="6" r="1.5" />
            <circle cx="9" cy="12" r="1.5" />
            <circle cx="15" cy="12" r="1.5" />
            <circle cx="9" cy="18" r="1.5" />
            <circle cx="15" cy="18" r="1.5" />
          </svg>
        </span>
        <p className="min-w-0 flex-1 truncate text-xs font-medium text-[var(--text)]" title={session.title}>
          {session.title || "Audio"}
        </p>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          className="rounded p-1 text-[var(--faint)] hover:bg-[var(--chat-thread)] hover:text-[var(--text)]"
          aria-label="Collapse player"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => {
            setExpanded((v) => !v);
          }}
          className="rounded p-1 text-[var(--faint)] hover:bg-[var(--chat-thread)] hover:text-[var(--text)]"
          aria-label={expanded ? "Collapse text view" : "Expand text view"}
        >
          <svg
            className={`audio-player-chevron h-3.5 w-3.5 ${expanded ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {session.error ? (
        <p className="border-b border-[var(--border)] px-3 py-2 text-[11px] text-[var(--warning)]">
          {session.error}
        </p>
      ) : null}

      {hasChunks ? (
        <div
          className={`audio-player-reveal border-[var(--border)] ${expanded ? "audio-player-reveal--open border-b" : ""}`}
          aria-hidden={!expanded}
        >
          <div className="audio-player-reveal__inner max-h-44 space-y-2 overflow-y-auto px-3 py-2">
            {session.chunks
              .slice(
                Math.max(0, session.chunkIndex - 2),
                Math.min(session.chunks.length, session.chunkIndex + 3),
              )
              .map((chunk, i) => {
                const absoluteIndex = Math.max(0, session.chunkIndex - 2) + i;
                const active = absoluteIndex === session.chunkIndex;
                return (
                  <div
                    key={`${absoluteIndex}-${chunk.slice(0, 20)}`}
                    ref={active ? (el) => { activeChunkRef.current = el; } : undefined}
                    className={`rounded-lg border px-2.5 py-2 text-xs leading-relaxed ${
                      active
                        ? "border-[var(--accent)] bg-[var(--accent-subtle)] text-[var(--text)]"
                        : "border-[var(--border)] bg-[var(--chat-thread)] text-[var(--muted)]"
                    }`}
                  >
                    <p className="mb-1 text-[10px] uppercase tracking-wider text-[var(--faint)]">
                      {active ? "Speaking now" : `Chunk ${absoluteIndex + 1}`}
                    </p>
                    {active ? (
                      <HighlightedText
                        text={chunk}
                        start={session.wordStart}
                        end={session.wordEnd}
                      />
                    ) : (
                      <p className="whitespace-pre-wrap break-words">{chunk}</p>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      ) : null}

      {hasChunks ? (
        <div
          className={`audio-player-reveal border-[var(--border)] ${showMiniPreview ? "audio-player-reveal--open border-b" : ""}`}
          aria-hidden={!showMiniPreview}
        >
          <div className="audio-player-reveal__inner max-h-16 overflow-y-auto px-3 py-2">
            <p className="text-[10px] uppercase tracking-wider text-[var(--faint)]">
              Chunk {session.chunkIndex + 1}/{session.chunks.length}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-[var(--text)]">
              <HighlightedText text={currentChunk} start={session.wordStart} end={session.wordEnd} />
            </p>
          </div>
        </div>
      ) : null}

      {isLoading ? (
        <p className="px-3 py-2 text-xs text-[var(--muted)]">Preparing audio…</p>
      ) : null}

      <div className="h-1 bg-[var(--surface-muted)]">
        <div
          className="h-full bg-[var(--accent)] transition-[width] duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 px-3 py-2.5">
        <button
          type="button"
          disabled={isLoading || !hasChunks}
          onClick={onSkipChunk.bind(null, -1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--muted)] hover:bg-[var(--chat-thread)] disabled:opacity-40"
          aria-label="Previous chunk"
        >
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" />
          </svg>
        </button>

        <button
          type="button"
          disabled={isLoading || (!hasChunks && !isLoading)}
          onClick={onTogglePause}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--bg)] disabled:opacity-40"
          aria-label={isPaused ? "Resume" : isPlaying ? "Pause" : "Play"}
        >
          {isLoading ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--bg)] border-t-transparent" />
          ) : isPaused ? (
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          ) : (
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
          )}
        </button>

        <button
          type="button"
          disabled={isLoading || !hasChunks}
          onClick={onSkipChunk.bind(null, 1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--muted)] hover:bg-[var(--chat-thread)] disabled:opacity-40"
          aria-label="Next chunk"
        >
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 18l8.5-6L6 6v12zm10-12v12h2V6h-2z" />
          </svg>
        </button>

        <span className="text-[10px] tabular-nums text-[var(--muted)]">
          {hasChunks ? `${session.chunkIndex + 1}/${session.chunks.length}` : "—"}
        </span>

        <select
          value={playbackSpeed}
          onChange={(e) => onSetSpeed(Number(e.target.value))}
          className="ml-auto rounded-lg border border-[var(--border)] bg-[var(--chat-thread)] px-2 py-1 text-[10px] text-[var(--text)]"
          aria-label="Playback speed"
        >
          {PLAYBACK_SPEEDS.map((s) => (
            <option key={s} value={s}>
              {s}×
            </option>
          ))}
        </select>

        {onOpenBook && session.bookId ? (
          <button
            type="button"
            onClick={onOpenBook}
            className="rounded-lg border border-[var(--border)] px-2 py-1 text-[10px] font-medium text-[var(--text)] hover:bg-[var(--chat-thread)]"
          >
            Open book
          </button>
        ) : null}

        <button
          type="button"
          onClick={onStop}
          className="rounded-lg border border-[var(--danger-border)] bg-[var(--danger-bg)] px-2 py-1 text-[10px] font-medium text-[var(--danger)]"
          aria-label="Stop audio"
        >
          Stop
        </button>
      </div>
    </div>
  );
}
