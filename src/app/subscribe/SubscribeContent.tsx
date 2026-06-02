"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { PricingCards } from "@/components/auth/PricingCards";
import { type PlanId } from "@/lib/authApi";
import { useAuth } from "@/providers/AuthProvider";

export default function SubscribeContent() {
  const { subscribe, status } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/workspace";
  const preselected = (searchParams.get("plan") as PlanId | null) || null;

  const [selectedPlan, setSelectedPlan] = useState<PlanId | null>(preselected);
  const [step, setStep] = useState<"pick" | "checkout">(preselected ? "checkout" : "pick");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function completeCheckout() {
    if (!selectedPlan) return;
    setError(null);
    setLoading(true);
    try {
      await subscribe(selectedPlan);
      router.push(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Subscription failed.");
    } finally {
      setLoading(false);
    }
  }

  if (status === "guest") {
    return (
      <div className="mx-auto max-w-md px-5 py-16 text-center">
        <p className="text-[var(--muted)]">Sign in to choose a subscription plan.</p>
        <Link href="/login" className="mt-4 inline-block text-[var(--accent)] hover:underline">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-5 py-12 sm:px-8">
      <Link href="/" className="font-display text-lg font-semibold text-[var(--text)]">
        BookChat
      </Link>
      <h1 className="mt-8 font-display text-3xl font-semibold tracking-tight">Choose your plan</h1>
      <p className="mt-2 text-[var(--muted)]">
        Mock checkout — no payment gateway. Your plan activates instantly for development.
      </p>

      {step === "pick" ? (
        <div className="mt-10">
          <PricingCards
            highlightPlan={selectedPlan ?? undefined}
            actionLabel="Select plan"
            onSelectPlan={(planId) => {
              setSelectedPlan(planId);
              setStep("checkout");
            }}
          />
        </div>
      ) : (
        <div className="mt-10 max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--surface-card)] p-6">
          <p className="text-sm font-medium text-[var(--accent)]">Mock payment</p>
          <h2 className="mt-2 font-display text-xl font-semibold capitalize">
            {selectedPlan} plan
          </h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Enter fake card details below. Nothing is charged — this only activates your subscription
            in the database.
          </p>

          {error ? (
            <p className="mt-4 rounded-lg border border-[var(--danger-border)] bg-[var(--danger-bg)] px-3 py-2 text-sm text-[var(--danger)]">
              {error}
            </p>
          ) : null}

          <div className="mt-6 space-y-3">
            <label className="block text-sm">
              <span className="text-[var(--muted)]">Card number</span>
              <input
                readOnly
                value="4242 4242 4242 4242"
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-input)] px-3 py-2.5 font-mono text-sm"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm">
                <span className="text-[var(--muted)]">Expiry</span>
                <input
                  readOnly
                  value="12/30"
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-input)] px-3 py-2.5 text-sm"
                />
              </label>
              <label className="block text-sm">
                <span className="text-[var(--muted)]">CVC</span>
                <input
                  readOnly
                  value="123"
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-input)] px-3 py-2.5 text-sm"
                />
              </label>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setStep("pick")}
              className="rounded-lg border border-[var(--border)] px-4 py-2.5 text-sm text-[var(--muted)]"
            >
              Back
            </button>
            <button
              type="button"
              disabled={loading || !selectedPlan}
              onClick={() => void completeCheckout()}
              className="flex-1 rounded-lg bg-[var(--accent)] py-2.5 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-60"
            >
              {loading ? "Activating…" : "Complete mock payment"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
