"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuth } from "@/providers/AuthProvider";

export default function DemoPage() {
  const { enterDemo, status } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    let cancelled = false;

    void (async () => {
      try {
        await enterDemo();
        if (!cancelled) router.replace("/chat");
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not start demo.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enterDemo, router, status]);

  if (error) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-12 text-center">
        <h1 className="font-display text-xl font-semibold text-[var(--text)]">Demo unavailable</h1>
        <p className="mt-3 text-sm text-[var(--muted)]">{error}</p>
        <p className="mt-2 text-xs text-[var(--faint)]">
          Ask your host to run{" "}
          <code className="rounded bg-[var(--surface-muted)] px-1">python scripts/seed_demo.py</code>{" "}
          on the API server.
        </p>
        <Link href="/" className="mt-6 text-sm text-[var(--accent)] hover:underline">
          Back to home
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-5">
      <p className="text-sm text-[var(--muted)]">Opening demo with Harry Potter…</p>
    </div>
  );
}
