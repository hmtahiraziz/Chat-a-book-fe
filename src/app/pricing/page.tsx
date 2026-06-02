"use client";

import Link from "next/link";

import { PricingCards } from "@/components/auth/PricingCards";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { useAuth } from "@/providers/AuthProvider";

function AppPricingContent() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--accent-warm)]">
        Subscription
      </p>
      <h1 className="font-display mt-1 text-3xl font-semibold tracking-tight text-[var(--text)]">
        Plans & pricing
      </h1>
      <p className="mt-2 max-w-xl text-sm text-[var(--muted)]">
        Compare what each plan includes. To change your plan, contact support or register a new
        account — checkout is not available from this screen.
      </p>
      <div className="mt-10">
        <PricingCards viewOnly />
      </div>
    </div>
  );
}

export default function PricingPage() {
  const { status } = useAuth();
  const inApp = status === "authenticated";

  if (inApp) {
    return <AppPricingContent />;
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <MarketingHeader />
      <main className="mx-auto max-w-4xl px-5 py-12 sm:px-8 sm:py-16">
        <p className="text-sm font-medium uppercase tracking-wider text-[var(--accent)]">Pricing</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Simple plans for serious readers
        </h1>
        <p className="mt-3 max-w-xl text-[var(--muted)]">
          Payment is mocked for now — no card required. Pick a plan and start using BookChat
          immediately.
        </p>
        <div className="mt-10">
          <PricingCards actionLabel="Get started" />
        </div>
        <p className="mt-8 text-center text-sm text-[var(--faint)]">
          Already registered?{" "}
          <Link href="/login" className="text-[var(--accent)] hover:underline">
            Sign in
          </Link>
        </p>
      </main>
    </div>
  );
}
