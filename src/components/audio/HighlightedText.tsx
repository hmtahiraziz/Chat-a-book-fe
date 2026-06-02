"use client";

export function HighlightedText({
  text,
  start,
  end,
}: {
  text: string;
  start: number;
  end: number;
}) {
  const s = Math.max(0, Math.min(start, text.length));
  const e = Math.max(s, Math.min(end, text.length));
  if (e <= s) return <span className="whitespace-pre-wrap break-words">{text}</span>;
  return (
    <span className="whitespace-pre-wrap break-words">
      {text.slice(0, s)}
      <mark className="rounded-sm bg-[var(--accent)]/40 px-0.5 font-medium text-[var(--text)] [box-decoration-break:clone]">
        {text.slice(s, e)}
      </mark>
      {text.slice(e)}
    </span>
  );
}
