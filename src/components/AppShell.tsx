"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWorkspaceApp } from "@/providers/WorkspaceAppProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import { API_BASE_URL } from "@/lib/api";

const NAV = [
  {
    href: "/workspace",
    label: "Workspace",
    icon: (
      <svg className="h-[18px] w-[18px] shrink-0" fill="none" viewBox="0 0 24 24" aria-hidden>
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.75}
          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
        />
      </svg>
    ),
  },
  {
    href: "/chat",
    label: "Chat",
    icon: (
      <svg className="h-[18px] w-[18px] shrink-0" fill="none" viewBox="0 0 24 24" aria-hidden>
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.75}
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
        />
      </svg>
    ),
  },
  {
    href: "/settings",
    label: "Settings",
    icon: (
      <svg className="h-[18px] w-[18px] shrink-0" fill="none" viewBox="0 0 24 24" aria-hidden>
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.75}
          d="M12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"
        />
      </svg>
    ),
  },
  {
    href: "/admin/chunks",
    label: "Chunk inspector",
    icon: (
      <svg className="h-[18px] w-[18px] shrink-0" fill="none" viewBox="0 0 24 24" aria-hidden>
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.75}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
        />
      </svg>
    ),
  },
] as const;

function navItemActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  if (href === "/admin/chunks" && pathname.startsWith("/admin")) return true;
  if (href === "/settings" && pathname.startsWith("/settings")) return true;
  return false;
}

function ApiStatusPill({ status }: { status: "loading" | "ready" | "error" }) {
  if (status === "loading") {
    return (
      <span className="flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-2.5 py-1 text-[10px] font-medium text-[var(--muted)]">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--warning)]" />
        Connecting…
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="flex items-center gap-1.5 rounded-full border border-[var(--danger-border)] bg-[var(--danger-bg)] px-2.5 py-1 text-[10px] font-medium text-[var(--danger)]">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--danger)]" />
        API offline
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 rounded-full border border-[var(--success)]/30 bg-[var(--success)]/10 px-2.5 py-1 text-[10px] font-medium text-[var(--success)]">
      <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" />
      API connected
    </span>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { booksStatus } = useWorkspaceApp();
  const isMarketingHome = pathname === "/";

  if (isMarketingHome) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] md:flex">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[300] focus:rounded-lg focus:bg-[var(--accent)] focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>

      {/* Sidebar */}
      <aside className="z-50 flex w-full shrink-0 flex-col bg-[var(--panel)] md:fixed md:left-0 md:top-0 md:h-screen md:w-64 md:border-r md:border-[var(--border)] md:shadow-[var(--shadow-sidebar)]">
        {/* Brand */}
        <div className="shrink-0 px-4 pb-4 pt-5">
          <Link href="/" className="group flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)] shadow-sm transition-opacity group-hover:opacity-90">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <path
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="font-display text-[15px] font-semibold leading-tight tracking-tight text-[var(--text)]">
                BookChat
              </p>
              <p className="text-[10px] text-[var(--faint)]">RAG Platform</p>
            </div>
          </Link>

          <div className="mt-4">
            <ApiStatusPill status={booksStatus} />
          </div>

          {/* Collapsible endpoint */}
          <details className="group mt-2">
            <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[10px] text-[var(--faint)] hover:text-[var(--muted)] [&::-webkit-details-marker]:hidden">
              <svg
                className="h-3 w-3 transition-transform group-open:rotate-90"
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
              <span>Show endpoint</span>
            </summary>
            <p
              className="mt-1.5 break-all rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-2.5 py-1.5 font-mono text-[9px] leading-snug text-[var(--muted)]"
              title={API_BASE_URL}
            >
              {API_BASE_URL}
            </p>
          </details>
        </div>

        {/* Divider */}
        <div className="mx-4 h-px bg-[var(--border)]" />

        {/* Nav */}
        <nav
          className="flex flex-1 flex-row gap-0.5 overflow-x-auto p-2 md:flex-col md:overflow-x-visible"
          aria-label="Primary"
        >
          {NAV.map((item) => {
            const active = navItemActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                  active
                    ? "bg-[var(--accent-subtle)] text-[var(--text)]"
                    : "text-[var(--muted)] hover:bg-[var(--panel-soft)] hover:text-[var(--text)]"
                }`}
              >
                {/* Active left accent */}
                <span
                  className={`absolute left-2 hidden h-5 w-0.5 rounded-full bg-[var(--accent)] md:block ${active ? "opacity-100" : "opacity-0"}`}
                  aria-hidden
                />
                <span
                  className={`transition-colors ${active ? "text-[var(--accent)]" : "text-[var(--faint)] group-hover:text-[var(--muted)]"}`}
                >
                  {item.icon}
                </span>
                <span className="hidden md:block">{item.label}</span>
                {active && (
                  <span className="ml-auto hidden h-1.5 w-1.5 rounded-full bg-[var(--accent)] md:block" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="shrink-0 border-t border-[var(--border)] p-3">
          <ThemeToggle className="w-full justify-center md:justify-start" />
          <div className="mt-3 hidden flex-wrap gap-1.5 md:flex">
            {["LangChain", "Pinecone", "MongoDB"].map((tech) => (
              <span
                key={tech}
                className="rounded-md bg-[var(--surface-muted)] px-1.5 py-0.5 text-[9px] font-medium text-[var(--faint)]"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div
        id="main-content"
        className="flex min-h-screen flex-1 flex-col md:pl-64"
        tabIndex={-1}
      >
        {children}
      </div>
    </div>
  );
}
