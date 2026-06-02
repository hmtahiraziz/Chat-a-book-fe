import { API_BASE_URL } from "@/lib/api";
import { authHeaders } from "@/lib/authApi";
import {
  CHAT_STORAGE_KEY,
  dedupeChatSessions,
  type ChatSession,
} from "@/components/workspace/domain";

let legacyMigrationPromise: Promise<void> | null = null;

/** Upload localStorage sessions once (safe under React Strict Mode double-mount). */
export async function migrateLegacySessionsOnce(legacy: ChatSession[]): Promise<void> {
  const rows = dedupeChatSessions(legacy);
  if (rows.length === 0) return;
  if (!legacyMigrationPromise) {
    legacyMigrationPromise = (async () => {
      for (const session of rows) {
        try {
          await createChatSession(session);
        } catch {
          // skip failed legacy rows
        }
      }
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(CHAT_STORAGE_KEY);
      }
    })();
  }
  await legacyMigrationPromise;
}

function headers(): HeadersInit {
  return authHeaders();
}

async function parseError(res: Response): Promise<string> {
  const body = (await res.json().catch(() => ({}))) as { detail?: unknown };
  if (typeof body.detail === "string") return body.detail;
  return `Request failed (HTTP ${res.status}).`;
}

export async function fetchChatSessions(): Promise<ChatSession[]> {
  const res = await fetch(`${API_BASE_URL}/chat/sessions`, { headers: headers() });
  if (!res.ok) throw new Error(await parseError(res));
  const data = (await res.json()) as { sessions?: ChatSession[] };
  const sessions = Array.isArray(data.sessions) ? data.sessions : [];
  return dedupeChatSessions(sessions);
}

export async function createChatSession(session: ChatSession): Promise<ChatSession> {
  const res = await fetch(`${API_BASE_URL}/chat/sessions`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(session),
  });
  if (!res.ok) throw new Error(await parseError(res));
  const data = (await res.json()) as { session: ChatSession };
  return data.session;
}

export async function replaceChatSession(session: ChatSession): Promise<ChatSession> {
  const res = await fetch(`${API_BASE_URL}/chat/sessions/${encodeURIComponent(session.id)}`, {
    method: "PUT",
    headers: headers(),
    body: JSON.stringify(session),
  });
  if (!res.ok) throw new Error(await parseError(res));
  const data = (await res.json()) as { session: ChatSession };
  return data.session;
}

export async function deleteChatSession(sessionId: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/chat/sessions/${encodeURIComponent(sessionId)}`, {
    method: "DELETE",
    headers: headers(),
  });
  if (!res.ok) throw new Error(await parseError(res));
}
