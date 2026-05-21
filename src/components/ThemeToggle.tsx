"use client";

import { useTheme } from "@/providers/ThemeProvider";
import type { Theme } from "@/lib/theme";

function SunIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth={1.75} />
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth={1.75}
        d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
      />
    </svg>
  );
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" aria-hidden>
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M21 14.5A8.5 8.5 0 1111.5 3a7 7 0 109.5 11.5z"
      />
    </svg>
  );
}

type ThemeToggleProps = {
  variant?: "compact" | "segmented";
  className?: string;
};

export function ThemeToggle({ variant = "compact", className = "" }: ThemeToggleProps) {
  const { theme, setTheme, toggleTheme } = useTheme();

  if (variant === "segmented") {
    const options: { value: Theme; label: string; icon: React.ReactNode }[] = [
      { value: "light", label: "Light", icon: <SunIcon className="h-4 w-4" /> },
      { value: "dark", label: "Dark", icon: <MoonIcon className="h-4 w-4" /> },
    ];
    return (
      <div className={`flex flex-wrap gap-2 ${className}`}>
        {options.map((opt) => {
          const active = theme === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setTheme(opt.value)}
              className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm transition-colors ${
                active
                  ? "border-[var(--accent)] bg-[var(--accent-subtle)] text-[var(--text)] ring-1 ring-[var(--accent)]/40"
                  : "border-[var(--border)] bg-[var(--chat-thread)] text-[var(--muted)] hover:border-[var(--border-strong)] hover:text-[var(--text)]"
              }`}
              aria-pressed={active}
            >
              <span className={active ? "text-[var(--accent)]" : "text-[var(--faint)]"}>{opt.icon}</span>
              <span className="font-medium">{opt.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  const isDark = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] px-3 py-2 text-sm text-[var(--muted)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-muted)] hover:text-[var(--text)] ${className}`}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
    >
      <span className="text-[var(--accent)]">{isDark ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}</span>
      <span className="hidden font-medium md:inline">{isDark ? "Light" : "Dark"}</span>
    </button>
  );
}
