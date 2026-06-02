import { ADMIN_API_TOKEN, API_BASE_URL } from "@/lib/api";
import { authHeaders } from "@/lib/authApi";
import { speechCleanText } from "@/components/workspace/domain";

const TEXT_PAGE_LIMIT = 500;
const CACHE_TTL_MS = 5 * 60 * 1000;

type CacheEntry = {
  texts: string[];
  fetchedAt: number;
};

const textCache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<string[]>>();

function cacheKey(bookId: string, embeddingProvider: string): string {
  return `${bookId}:${embeddingProvider}`;
}

export function invalidateBookChunksCache(bookId?: string): void {
  if (!bookId) {
    textCache.clear();
    return;
  }
  for (const key of textCache.keys()) {
    if (key.startsWith(`${bookId}:`)) textCache.delete(key);
  }
}

async function fetchChunkTextsPage(
  bookId: string,
  embeddingProvider: string,
  offset: number,
  limit: number,
): Promise<{ total: number; returned: number; texts: string[] }> {
  const params = new URLSearchParams({
    offset: String(offset),
    limit: String(limit),
    embedding_provider: embeddingProvider,
  });
  const paths = [
    `/books/${encodeURIComponent(bookId)}/chunks/text?${params}`,
    `/admin/books/${encodeURIComponent(bookId)}/chunks/text?${params}`,
  ];
  const headers = { ...(authHeaders() as Record<string, string>) };
  if (ADMIN_API_TOKEN) headers["X-Admin-Token"] = ADMIN_API_TOKEN;

  let response: Response | null = null;
  for (const path of paths) {
    const res = await fetch(`${API_BASE_URL}${path}`, { headers });
    if (res.status === 404) continue;
    response = res;
    break;
  }
  if (!response) {
    throw new Error("This backend does not expose a chunks text endpoint for book audio.");
  }
  if (!response.ok) {
    throw new Error(
      response.status === 401
        ? "Admin token required for book audio. Set NEXT_PUBLIC_ADMIN_API_TOKEN."
        : `Could not load book text (HTTP ${response.status}).`,
    );
  }
  return (await response.json()) as {
    total: number;
    returned: number;
    texts: string[];
  };
}

/**
 * Load all chunk texts for TTS/read-aloud with in-memory cache and in-flight deduplication.
 */
export async function fetchAllBookChunkTexts(
  bookId: string,
  embeddingProvider: string = "openai",
): Promise<string[]> {
  const key = cacheKey(bookId, embeddingProvider);
  const cached = textCache.get(key);
  if (cached && cached.texts.length > 0 && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.texts;
  }

  let promise = inflight.get(key);
  if (!promise) {
    promise = (async () => {
      let offset = 0;
      let total = Number.POSITIVE_INFINITY;
      const parts: string[] = [];
      while (offset < total) {
        const data = await fetchChunkTextsPage(
          bookId,
          embeddingProvider,
          offset,
          TEXT_PAGE_LIMIT,
        );
        total = typeof data.total === "number" ? data.total : 0;
        const pageTexts = (data.texts ?? [])
          .map((t) => speechCleanText(t))
          .filter(Boolean);
        parts.push(...pageTexts);
        if (!data.returned || data.returned <= 0) break;
        offset += data.returned;
      }
      return parts;
    })();
    inflight.set(key, promise);
    void promise.finally(() => {
      inflight.delete(key);
    });
  }

  const texts = await promise;
  if (texts.length > 0) {
    textCache.set(key, { texts, fetchedAt: Date.now() });
  }
  return texts;
}
