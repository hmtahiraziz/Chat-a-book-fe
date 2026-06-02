import type { ReactNode } from "react";

type LandingSectionVariant = "default" | "muted" | "inset";

type LandingSectionProps = {
  id?: string;
  variant?: LandingSectionVariant;
  /** Tighter vertical padding (e.g. hero). */
  compact?: boolean;
  className?: string;
  children: ReactNode;
};

const VARIANT_CLASS: Record<LandingSectionVariant, string> = {
  default: "landing-section--default",
  muted: "landing-section--muted",
  inset: "landing-section--inset",
};

export function LandingSection({
  id,
  variant = "default",
  compact = false,
  className = "",
  children,
}: LandingSectionProps) {
  return (
    <section
      id={id}
      className={[
        "landing-section scroll-mt-[4.5rem] sm:scroll-mt-20",
        VARIANT_CLASS[variant],
        compact ? "landing-section--compact" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="landing-section__inner">{children}</div>
    </section>
  );
}

type SectionHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
};

export function SectionHeader({
  eyebrow,
  title,
  description,
  align = "left",
}: SectionHeaderProps) {
  const alignClass = align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl";

  return (
    <header className={alignClass}>
      {eyebrow ? <p className="landing-eyebrow">{eyebrow}</p> : null}
      <h2 className="landing-section-title">{title}</h2>
      {description ? <p className="landing-section-desc mt-3">{description}</p> : null}
    </header>
  );
}
