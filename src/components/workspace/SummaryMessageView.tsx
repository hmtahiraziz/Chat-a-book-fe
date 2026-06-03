"use client";

import {
  isMeaningfulSummaryIntro,
  parseSummarySections,
  preprocessSummaryText,
  splitIntroFromSummary,
  stripMarkdownEmphasis,
  type SummarySection,
} from "@/components/workspace/domain";

function SummarySectionBody({ section, messageId, sectionIdx }: {
  section: SummarySection;
  messageId: string;
  sectionIdx: number;
}) {
  const lines = section.body
    .split("\n")
    .map((ln) => ln.trim())
    .filter(Boolean);
  const isList = lines.some((ln) => /^[-*•]\s/.test(ln) || /^[A-Za-z][^:]{0,40}:\s/.test(ln));

  if (isList) {
    return (
      <ul className="space-y-1.5 pl-4 text-[14px] leading-relaxed text-[var(--text)] marker:text-[var(--accent)]">
        {lines.map((ln, i) => (
          <li key={`${messageId}-summary-${sectionIdx}-li-${i}`}>
            {stripMarkdownEmphasis(ln.replace(/^[-*•]\s*/, ""))}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-[var(--text)]">
      {section.body}
    </p>
  );
}

type Props = {
  messageId: string;
  content: string;
};

export function SummaryMessageView({ messageId, content }: Props) {
  const normalized = preprocessSummaryText(content);
  const { intro, body } = splitIntroFromSummary(normalized);
  const sections = parseSummarySections(body);

  if (sections.length === 0) {
    return <p className="whitespace-pre-wrap text-sm leading-relaxed">{content}</p>;
  }

  const showIntro = isMeaningfulSummaryIntro(intro);

  return (
    <div className="summary-message space-y-3">
      {showIntro ? (
        <p className="border-b border-[var(--border)]/60 pb-3 text-[13px] leading-relaxed text-[var(--muted)]">
          {stripMarkdownEmphasis(intro)}
        </p>
      ) : null}
      <div className="space-y-3">
        {sections.map((section, idx) => (
          <section
            key={`${messageId}-summary-${idx}`}
            className="rounded-xl border border-[var(--border)] bg-[var(--panel)]/80 p-3.5"
          >
            <h4 className="mb-2.5 flex items-center gap-2">
              <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-md bg-[var(--accent-subtle)] px-1 text-[10px] font-bold tabular-nums text-[var(--accent)]">
                {idx + 1}
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--accent-warm)]">
                {section.title}
              </span>
            </h4>
            <SummarySectionBody section={section} messageId={messageId} sectionIdx={idx} />
          </section>
        ))}
      </div>
    </div>
  );
}
