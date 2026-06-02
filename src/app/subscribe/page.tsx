"use client";

import { Suspense } from "react";

import SubscribeContent from "./SubscribeContent";

export default function SubscribePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-[var(--muted)]">
          Loading…
        </div>
      }
    >
      <SubscribeContent />
    </Suspense>
  );
}
