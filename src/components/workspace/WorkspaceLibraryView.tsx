"use client";

import { useState } from "react";
import Link from "next/link";
import { ApiConnectionBanner } from "@/components/ApiConnectionBanner";
import { useWorkspaceApp } from "@/providers/WorkspaceAppProvider";
import { IngestionPanel } from "@/components/workspace/IngestionPanel";
import { LibraryPanel } from "@/components/workspace/LibraryPanel";

type ActiveTab = "ingestion" | "library";

export function WorkspaceLibraryView() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("ingestion");
  const { books, isIndexing } = useWorkspaceApp();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
      <ApiConnectionBanner />

      {/* Page header */}
      <header className="mb-7">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--accent-warm)]">
          Workspace
        </p>
        <h1 className="font-display mt-1 text-3xl font-semibold tracking-tight text-[var(--text)] md:text-[2rem]">
          Book Manager
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">
          Upload and index PDFs, then manage your library. Chat with your books on the{" "}
          <Link
            href="/chat"
            className="font-medium text-[var(--accent)] underline-offset-2 hover:underline"
          >
            Chat
          </Link>{" "}
          screen.
        </p>
      </header>

      {/* Tab bar */}
      <div className="mb-8 flex items-center gap-1 rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-1 shadow-sm">
        <button
          type="button"
          onClick={() => setActiveTab("ingestion")}
          className={`relative flex flex-1 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-medium transition-all duration-150 ${
            activeTab === "ingestion"
              ? "bg-[var(--accent)] text-white shadow-sm"
              : "text-[var(--muted)] hover:bg-[var(--panel-soft)] hover:text-[var(--text)]"
          }`}
        >
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24">
            <path
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.75}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          Ingestion
          {isIndexing && (
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current opacity-80" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("library")}
          className={`relative flex flex-1 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-medium transition-all duration-150 ${
            activeTab === "library"
              ? "bg-[var(--accent)] text-white shadow-sm"
              : "text-[var(--muted)] hover:bg-[var(--panel-soft)] hover:text-[var(--text)]"
          }`}
        >
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24">
            <path
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.75}
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
          Library
          {books.length > 0 && (
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
                activeTab === "library"
                  ? "bg-white/25 text-white"
                  : "bg-[var(--accent-subtle)] text-[var(--accent)]"
              }`}
            >
              {books.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab content */}
      {activeTab === "ingestion" ? (
        <IngestionPanel />
      ) : (
        <LibraryPanel onGoToIngestion={() => setActiveTab("ingestion")} />
      )}
    </div>
  );
}
