export type Book = {
  book_id: string;
  filename: string;
  pages: number;
  chunks: number;
  chapters: string[];
  indexed_at: number;
  embedding_provider?: "openai";
};

export type ChatSource = {
  page?: number;
  chapter?: string;
  preview?: string;
};

export type ChatResponse = {
  classification: string;
  answer: string;
  sources: ChatSource[];
};

export type StoredMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  classification?: string;
  sources?: ChatSource[];
  createdAt: number;
};

export type ChatSession = {
  id: string;
  bookId: string;
  bookLabel: string;
  embeddingProvider: "openai";
  chatProvider: "openai";
  title: string;
  messages: StoredMessage[];
  updatedAt: number;
};

export const CHAT_STORAGE_KEY = "bookchat-chat-sessions-v1";

/** Keep the newest row when the same session id appears more than once. */
export function dedupeChatSessions(sessions: ChatSession[]): ChatSession[] {
  const byId = new Map<string, ChatSession>();
  for (const session of sessions) {
    const existing = byId.get(session.id);
    if (!existing || session.updatedAt >= existing.updatedAt) {
      byId.set(session.id, session);
    }
  }
  return Array.from(byId.values());
}

export const TERMINAL_INGEST_STATUSES = ["completed", "failed", "stopped"];

export type IngestStatusPayload = {
  status: string;
  filename?: string;
  book_id?: string;
  message?: string;
  elapsed_seconds?: number;
  total_chunks?: number;
  processed_chunks?: number;
  progress_percent?: number;
  retry_in_seconds?: number;
};

export type PdfReaderModal = {
  bookId: string;
  title: string;
  blobUrl: string;
};

export function readSessionsFromStorage(): ChatSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [];
    const normalized: ChatSession[] = [];
    for (const item of data) {
      if (!item || typeof item !== "object") continue;
      const session = item as Partial<ChatSession> & { messages?: unknown };
      if (!session.id || !session.bookId) continue;
      const msgs = Array.isArray(session.messages)
        ? session.messages
            .filter((m) => m && typeof m === "object")
            .map((m) => {
              const mm = m as Partial<StoredMessage>;
              return {
                id: mm.id ?? newMessageId(),
                role: mm.role === "assistant" ? "assistant" : "user",
                content: String(mm.content ?? ""),
                classification: mm.classification,
                sources: Array.isArray(mm.sources) ? mm.sources : undefined,
                createdAt:
                  typeof mm.createdAt === "number" && Number.isFinite(mm.createdAt)
                    ? mm.createdAt
                    : Date.now(),
              } as StoredMessage;
            })
        : [];
      normalized.push({
        id: String(session.id),
        bookId: String(session.bookId),
        bookLabel: String(session.bookLabel ?? session.bookId),
        embeddingProvider: "openai",
        chatProvider: "openai",
        title: String(session.title ?? "New chat"),
        messages: msgs,
        updatedAt:
          typeof session.updatedAt === "number" && Number.isFinite(session.updatedAt)
            ? session.updatedAt
            : Date.now(),
      });
    }
    return normalized;
  } catch {
    return [];
  }
}

export function writeSessionsToStorage(sessions: ChatSession[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(sessions));
  } catch {
    // quota or private mode
  }
}

export function newMessageId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function sessionPreviewTitle(firstUserText: string): string {
  const t = firstUserText.replace(/\s+/g, " ").trim();
  if (!t) return "New chat";
  return t.length > 52 ? `${t.slice(0, 52)}…` : t;
}

export type SummarySection = {
  title: string;
  body: string;
};

/** Section headings the UI parser and backend prompts agree on. */
export const SUMMARY_SECTION_HEADINGS = [
  "main plot",
  "key characters",
  "major themes",
  "ending / resolution overview",
  "resolution overview",
  "chapter overview",
  "key events",
  "notable details",
] as const;

const SUMMARY_SECTION_PATTERN =
  "main plot|key characters|major themes|ending(?:\\s*\\/\\s*resolution|\\s+overview)?|resolution overview|chapter overview|key events|notable details";

export function isSummaryIntent(intent: string | undefined): boolean {
  return intent === "book_summary" || intent === "chapter_summary";
}

function normalizeSummaryTitle(raw: string): string {
  const cleaned = raw.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  const noNumber = cleaned.replace(/^\d+[\).\s:-]*/, "").trim();
  const lower = noNumber.toLowerCase();
  if (lower === "ending" || lower === "resolution" || lower === "ending resolution") {
    return "Ending / Resolution Overview";
  }
  return noNumber
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export function stripMarkdownEmphasis(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`(.*?)`/g, "$1")
    .replace(/^#+\s*/gm, "")
    .trim();
}

/** Normalize LLM output before parsing (orphan numbers, markdown headings, etc.). */
export function preprocessSummaryText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/^#{1,3}\s+/gm, "")
    .replace(/^\s*\d+[\).\s:-]*\s*$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function isMeaningfulSummaryIntro(intro: string): boolean {
  const t = stripMarkdownEmphasis(intro).trim();
  if (!t) return false;
  if (/^(\d+[\).\s:-]+\s*)+$/i.test(t)) return false;
  const letters = (t.match(/[a-zA-Z]/g) ?? []).length;
  if (letters < 10) return false;
  return true;
}

function matchSummaryHeading(line: string): { title: string; rest: string } | null {
  const stripped = stripMarkdownEmphasis(line).trim();
  const cleaned = stripped.replace(/^[-*•]\s+/, "");

  const inline = cleaned.match(
    new RegExp(
      `^(?:\\d+[\\.\\)\\s:-]*)?(${SUMMARY_SECTION_PATTERN})\\s*:?\\s*(.*)$`,
      "i",
    ),
  );
  if (inline?.[1]) {
    return {
      title: normalizeSummaryTitle(inline[1]),
      rest: (inline[2] ?? "").trim(),
    };
  }

  const headingOnly = cleaned.match(
    new RegExp(`^(?:\\d+[\\.\\)\\s:-]*)?(${SUMMARY_SECTION_PATTERN})\\s*:?\\s*$`, "i"),
  );
  if (headingOnly?.[1]) {
    return { title: normalizeSummaryTitle(headingOnly[1]), rest: "" };
  }

  return null;
}

export function splitIntroFromSummary(text: string): { intro: string; body: string } {
  const normalized = preprocessSummaryText(text);
  const re = new RegExp(
    `(?:^|\\n)\\s*(?:\\d+[\\.\\)\\s:-]*)?(${SUMMARY_SECTION_PATTERN})\\b`,
    "i",
  );
  const match = normalized.match(re);
  if (!match || match.index == null) return { intro: "", body: normalized };
  const intro = normalized.slice(0, match.index).trim();
  const body = normalized.slice(match.index).trim();
  return { intro, body };
}

export function parseSummarySections(text: string): SummarySection[] {
  const lines = preprocessSummaryText(text).split("\n").map((l) => l.trim());
  const sections: SummarySection[] = [];

  let currentTitle = "";
  let currentBody: string[] = [];

  const flush = () => {
    const body = currentBody.join("\n").trim();
    if (currentTitle && body) sections.push({ title: currentTitle, body });
    currentTitle = "";
    currentBody = [];
  };

  for (const line of lines) {
    if (!line) {
      if (currentBody.length > 0) currentBody.push("");
      continue;
    }

    const heading = matchSummaryHeading(line);
    if (heading) {
      flush();
      currentTitle = heading.title;
      if (heading.rest) currentBody.push(heading.rest);
      continue;
    }

    if (currentTitle) currentBody.push(stripMarkdownEmphasis(line));
  }

  flush();
  return sections;
}

export function speechCleanText(text: string): string {
  return text
    .replace(/\[(\d+(?:\]\[\d+)*)\]/g, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`(.*?)`/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}
