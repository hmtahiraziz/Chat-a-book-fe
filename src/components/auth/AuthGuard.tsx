"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { useAuth } from "@/providers/AuthProvider";

const PUBLIC_PREFIXES = ["/login", "/register", "/pricing", "/subscribe", "/demo"];

function isPublicPath(pathname: string): boolean {
  if (pathname === "/") return true;
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function AuthGuard({ children }: { children: ReactNode }) {
  const { status, user, isSubscribed } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;
    if (isPublicPath(pathname)) return;

    if (status === "guest") {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }

    if (!isSubscribed && pathname !== "/subscribe" && pathname !== "/pricing") {
      router.replace(`/subscribe?next=${encodeURIComponent(pathname)}`);
    }
  }, [status, isSubscribed, pathname, router]);

  if (status === "loading" && !isPublicPath(pathname)) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-8">
        <p className="text-sm text-[var(--muted)]">Loading your account…</p>
      </div>
    );
  }

  if (!isPublicPath(pathname) && status === "guest") {
    return null;
  }

  if (
    !isPublicPath(pathname) &&
    status === "authenticated" &&
    !isSubscribed &&
    pathname !== "/subscribe" &&
    pathname !== "/pricing"
  ) {
    return null;
  }

  return <>{children}</>;
}

export function AuthMarketingLinks() {
  const { status, user, logout } = useAuth();

  if (status === "loading") {
    return <span className="text-sm text-[var(--faint)]">…</span>;
  }

  if (status === "authenticated" && user) {
    return (
      <div className="flex items-center gap-2 sm:gap-3">
        <span className="hidden text-sm text-[var(--muted)] sm:inline">{user.email}</span>
        {!user.subscription.plan_id || user.subscription.status !== "active" ? (
          <Link
            href="/subscribe"
            className="rounded-lg border border-[var(--accent)] px-3 py-2 text-sm font-medium text-[var(--accent)]"
          >
            Subscribe
          </Link>
        ) : null}
        <Link
          href="/workspace"
          className="rounded-lg bg-[var(--accent)] px-3.5 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
        >
          Workspace
        </Link>
        <button
          type="button"
          onClick={logout}
          className="rounded-lg px-2 py-2 text-sm text-[var(--muted)] hover:text-[var(--text)]"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <Link
        href="/demo"
        className="hidden text-sm font-medium text-[var(--accent)] hover:underline sm:inline"
      >
        Try demo
      </Link>
      <Link href="/login" className="text-sm text-[var(--muted)] hover:text-[var(--text)]">
        Sign in
      </Link>
      <Link
        href="/register"
        className="rounded-lg bg-[var(--accent)] px-3.5 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
      >
        Get started
      </Link>
    </div>
  );
}
