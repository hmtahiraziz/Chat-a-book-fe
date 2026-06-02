"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { fetchPlans, type PlanId, type SubscriptionPlan } from "@/lib/authApi";

function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

export function PricingCards({
  actionLabel = "Choose plan",
  onSelectPlan,
  highlightPlan,
}: {
  actionLabel?: string;
  onSelectPlan?: (planId: PlanId) => void;
  highlightPlan?: PlanId;
}) {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchPlans()
      .then(setPlans)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load plans."));
  }, []);

  if (error) {
    return <p className="text-sm text-[var(--danger)]">{error}</p>;
  }

  if (plans.length === 0) {
    return <p className="text-sm text-[var(--muted)]">Loading plans…</p>;
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {plans.map((plan) => {
        const highlighted = highlightPlan === plan.id || plan.id === "pro";
        return (
          <div
            key={plan.id}
            className={`relative flex flex-col rounded-2xl border p-6 ${
              highlighted
                ? "border-[var(--accent)] bg-[var(--accent-subtle)]"
                : "border-[var(--border)] bg-[var(--surface-card)]"
            }`}
          >
            {plan.id === "pro" ? (
              <span className="absolute -top-3 right-4 rounded-full bg-[var(--accent)] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                Popular
              </span>
            ) : null}
            <h3 className="font-display text-xl font-semibold text-[var(--text)]">{plan.name}</h3>
            <p className="mt-1 text-sm text-[var(--muted)]">{plan.description}</p>
            <p className="mt-4 font-display text-3xl font-semibold text-[var(--text)]">
              {formatPrice(plan.price_monthly, plan.currency)}
              <span className="text-base font-normal text-[var(--muted)]">/mo</span>
            </p>
            <ul className="mt-6 flex-1 space-y-2 text-sm text-[var(--muted)]">
              {plan.features.map((feature) => (
                <li key={feature} className="flex gap-2">
                  <span className="text-[var(--accent)]" aria-hidden>
                    ✓
                  </span>
                  {feature}
                </li>
              ))}
            </ul>
            {onSelectPlan ? (
              <button
                type="button"
                onClick={() => onSelectPlan(plan.id)}
                className={`mt-6 w-full rounded-lg py-2.5 text-sm font-medium ${
                  highlighted
                    ? "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
                    : "border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text)] hover:border-[var(--accent)]"
                }`}
              >
                {actionLabel}
              </button>
            ) : (
              <Link
                href={`/subscribe?plan=${plan.id}`}
                className={`mt-6 block w-full rounded-lg py-2.5 text-center text-sm font-medium ${
                  highlighted
                    ? "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
                    : "border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text)]"
                }`}
              >
                {actionLabel}
              </Link>
            )}
          </div>
        );
      })}
    </div>
  );
}
