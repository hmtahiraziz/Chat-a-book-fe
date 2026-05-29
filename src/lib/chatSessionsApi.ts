import { API_BASE_URL } from "@/lib/api";
import { getClientId } from "@/lib/clientId";
import type { ChatSession } from "@/components/workspace/domain";

function headers(): HeadersInit {
  return {
    "Content-Type": "application/json",
    "X-Client-Id": getClientId(),
  };
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
  return Array.isArray(data.sessions) ? data.sessions : [];
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
