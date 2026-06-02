import Link from "next/link";
import type { ReactNode } from "react";

export function AuthFormLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-12">
      <Link href="/" className="mb-8 font-display text-lg font-semibold text-[var(--text)]">
        BookChat
      </Link>
      <h1 className="font-display text-2xl font-semibold tracking-tight text-[var(--text)]">{title}</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">{subtitle}</p>
      <div className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--surface-card)] p-6 shadow-sm">
        {children}
      </div>
      {footer ? <div className="mt-6 text-center text-sm text-[var(--muted)]">{footer}</div> : null}
    </div>
  );
}
