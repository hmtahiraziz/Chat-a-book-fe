"use client";

import { useRef, useState } from "react";
import { useWorkspaceApp } from "@/providers/WorkspaceAppProvider";

function StepIndicator({
  step,
  label,
  status,
}: {
  step: number;
  label: string;
  status: "done" | "active" | "pending";
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all ${
          status === "done"
            ? "bg-[var(--success)] text-white"
            : status === "active"
              ? "bg-[var(--accent)] text-white ring-4 ring-[var(--accent)]/20"
              : "bg-[var(--surface-muted)] text-[var(--faint)]"
        }`}
      >
        {status === "done" ? (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24">
            <path
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M5 13l4 4L19 7"
            />
          </svg>
        ) : status === "active" ? (
          <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
        ) : (
          step
        )}
      </div>
      <div className="flex-1">
        <span
          className={`text-sm font-medium ${
            status === "done"
              ? "text-[var(--success)]"
              : status === "active"
                ? "text-[var(--text)]"
                : "text-[var(--faint)]"
          }`}
        >
          {label}
        </span>
      </div>
      {status === "active" && (
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--accent)]" />
      )}
    </div>
  );
}

function getIngestStep(progress: number, status: string): 1 | 2 | 3 | 4 {
  if (status === "completed") return 4;
  if (progress >= 66) return 4;
  if (progress >= 33) return 3;
  if (progress >= 1) return 2;
  return 1;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const STATUS_COLOR: Record<string, string> = {
  running: "text-[var(--accent)]",
  paused: "text-[var(--warning)]",
  "rate-limited-wait": "text-[var(--warning)]",
  completed: "text-[var(--success)]",
  failed: "text-[var(--danger)]",
  stopped: "text-[var(--muted)]",
};

export function IngestionPanel() {
  const {
    file,
    setFile,
    isIndexing,
    indexMessage,
    elapsedSeconds,
    liveIngestStatus,
    isControllingIngest,
    ingestDisplayName,
    setIngestDisplayName,
    handleIngest,
    handleIngestControl,
  } = useWorkspaceApp();

  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped?.type === "application/pdf" || dropped?.name.endsWith(".pdf")) {
      setFile(dropped);
    }
  };

  const progress = liveIngestStatus?.progress_percent ?? 0;
  const ingestStatus = liveIngestStatus?.status ?? "";
  const currentStep = isIndexing ? getIngestStep(progress, ingestStatus) : 0;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <form onSubmit={handleIngest} className="space-y-4">
        {/* Drop zone */}
        <div
          className={`relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-10 text-center transition-all duration-200 ${
            isDragging
              ? "border-[var(--accent)] bg-[var(--accent-subtle)] scale-[1.01]"
              : file
                ? "border-[var(--accent)]/60 bg-[var(--accent-subtle)]/30"
                : "border-[var(--border-strong)] bg-[var(--panel)] hover:border-[var(--accent)]/60 hover:bg-[var(--accent-subtle)]/20"
          } ${isIndexing ? "pointer-events-none opacity-70" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => !isIndexing && fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
          }}
          aria-label="Upload PDF file"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            className="sr-only"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            disabled={isIndexing}
          />

          {file ? (
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-subtle)] text-[var(--accent)]">
                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24">
                  <path
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.75}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <div className="min-w-0 text-left">
                <p className="truncate text-sm font-semibold text-[var(--text)]" title={file.name}>
                  {file.name}
                </p>
                <p className="mt-0.5 text-xs text-[var(--muted)]">{formatBytes(file.size)}</p>
              </div>
              {!isIndexing && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                  }}
                  className="ml-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[var(--faint)] transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--text)]"
                  aria-label="Remove file"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <path
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--surface-muted)]">
                <svg
                  className="h-8 w-8 text-[var(--muted)]"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--text)]">
                  Drop your PDF here, or{" "}
                  <span className="text-[var(--accent)] underline-offset-2 hover:underline">
                    click to browse
                  </span>
                </p>
                <p className="mt-1 text-xs text-[var(--muted)]">Accepts .pdf files</p>
              </div>
            </>
          )}
        </div>

        {/* Options + submit */}
        <div className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5">
          <div>
            <label
              htmlFor="ingest-display-name"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--muted)]"
            >
              Library name{" "}
              <span className="font-normal normal-case text-[var(--faint)]">(optional)</span>
            </label>
            <input
              id="ingest-display-name"
              type="text"
              value={ingestDisplayName}
              onChange={(e) => setIngestDisplayName(e.target.value)}
              placeholder="e.g. Animal Farm"
              maxLength={240}
              disabled={isIndexing}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--chat-thread)] px-3.5 py-2.5 text-sm text-[var(--text)] placeholder:text-[var(--faint)] transition-colors focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 disabled:opacity-60"
            />
            <p className="mt-1.5 text-[10px] text-[var(--faint)]">
              Shown in the library. Leave blank to use the PDF filename.
            </p>
          </div>

          <button
            type="submit"
            disabled={isIndexing || !file}
            className="w-full rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[var(--accent-hover)] active:bg-[var(--accent-press)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isIndexing ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Indexing…
              </span>
            ) : (
              "Upload and index"
            )}
          </button>
        </div>
      </form>

      {/* Progress panel */}
      {isIndexing && (
        <div className="space-y-5 rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--text)]">Indexing progress</h3>
            <div className="flex items-center gap-3">
              <span
                className={`rounded-full bg-[var(--surface-muted)] px-2.5 py-0.5 text-xs font-medium ${STATUS_COLOR[ingestStatus] ?? "text-[var(--muted)]"}`}
              >
                {ingestStatus || "starting…"}
              </span>
              <span className="text-xs text-[var(--faint)]">
                {(liveIngestStatus?.elapsed_seconds ?? elapsedSeconds).toFixed(1)}s
              </span>
            </div>
          </div>

          {/* Step tracker */}
          <div className="space-y-3.5">
            {(
              [
                { step: 1, label: "Uploading file" },
                { step: 2, label: "Extracting text" },
                { step: 3, label: "Generating embeddings" },
                { step: 4, label: "Storing in vector DB" },
              ] as const
            ).map(({ step, label }) => (
              <StepIndicator
                key={step}
                step={step}
                label={label}
                status={
                  ingestStatus === "completed"
                    ? "done"
                    : currentStep > step
                      ? "done"
                      : currentStep === step
                        ? "active"
                        : "pending"
                }
              />
            ))}
          </div>

          {/* Progress bar */}
          {liveIngestStatus && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-[var(--muted)]">
                <span>
                  {liveIngestStatus.processed_chunks ?? 0} /{" "}
                  {liveIngestStatus.total_chunks ?? "?"} chunks
                </span>
                <span className="font-mono font-medium">{Math.round(progress)}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-muted)]">
                <div
                  className="h-full rounded-full bg-[var(--accent)] transition-all duration-500"
                  style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
                />
              </div>
            </div>
          )}

          {liveIngestStatus?.message && (
            <p className="text-xs text-[var(--muted)]">{liveIngestStatus.message}</p>
          )}

          {liveIngestStatus?.retry_in_seconds != null &&
            ingestStatus === "rate-limited-wait" && (
              <p className="rounded-xl bg-[var(--warning-bg)] px-3 py-2.5 text-xs text-[var(--warning)]">
                Rate limited. Retrying in ~{liveIngestStatus.retry_in_seconds}s…
              </p>
            )}

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-4">
            <span className="mr-1 text-xs font-semibold uppercase tracking-wider text-[var(--faint)]">
              Controls
            </span>
            <button
              type="button"
              disabled={isControllingIngest || liveIngestStatus?.status === "paused"}
              onClick={() => void handleIngestControl("pause")}
              className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--muted)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text)] disabled:opacity-40"
            >
              <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
              Pause
            </button>
            <button
              type="button"
              disabled={isControllingIngest || liveIngestStatus?.status !== "paused"}
              onClick={() => void handleIngestControl("resume")}
              className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--muted)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text)] disabled:opacity-40"
            >
              <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              Resume
            </button>
            <button
              type="button"
              disabled={isControllingIngest}
              onClick={() => void handleIngestControl("stop")}
              className="flex items-center gap-1.5 rounded-lg border border-[var(--danger-border)] bg-[var(--danger-bg)] px-3 py-1.5 text-xs font-medium text-[var(--danger)] transition-opacity hover:opacity-80 disabled:opacity-40"
            >
              <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
              Stop
            </button>
          </div>
        </div>
      )}

      {/* Result message */}
      {indexMessage && !isIndexing && (
        <div
          className={`rounded-2xl border px-4 py-3.5 text-sm leading-relaxed ${
            indexMessage.toLowerCase().includes("error") ||
            indexMessage.toLowerCase().includes("fail") ||
            indexMessage.toLowerCase().includes("stopped")
              ? "border-[var(--warning)]/30 bg-[var(--warning-bg)] text-[var(--warning)]"
              : "border-[var(--success)]/30 bg-[var(--success)]/10 text-[var(--success)]"
          }`}
        >
          {indexMessage}
        </div>
      )}
    </div>
  );
}
