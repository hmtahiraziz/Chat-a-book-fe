"use client";

import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";

const NAV = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#features", label: "Features" },
] as const;

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)]/80 bg-[var(--bg)]/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-5 sm:h-16 sm:px-8">
        <Link href="/" className="group flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)]">
            <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" aria-hidden>
              <path
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
          </div>
          <span className="font-display text-[15px] font-semibold tracking-tight text-[var(--text)]">
            BookChat
          </span>
        </Link>

        <nav className="hidden items-center gap-8 sm:flex" aria-label="Marketing">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm text-[var(--muted)] transition-colors hover:text-[var(--text)]"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle className="hidden border-transparent bg-transparent px-2 sm:flex" />
          <Link
            href="/workspace"
            className="rounded-lg bg-[var(--accent)] px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--accent-hover)] sm:px-4"
          >
            Open workspace
          </Link>
        </div>
      </div>
    </header>
  );
}
