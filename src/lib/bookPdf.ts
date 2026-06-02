import { API_BASE_URL } from "@/lib/api";
import { authHeadersBearerOnly } from "@/lib/authApi";

export async function fetchBookPdfBlobUrl(
  bookId: string,
  fragment = "",
): Promise<string> {
  const res = await fetch(`${API_BASE_URL}/books/${encodeURIComponent(bookId)}/pdf`, {
    headers: authHeadersBearerOnly(),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { detail?: unknown };
    const detail = typeof body.detail === "string" ? body.detail : null;
    throw new Error(detail ?? `Could not load PDF (HTTP ${res.status}).`);
  }
  const blob = await res.blob();
  const base = URL.createObjectURL(blob);
  return fragment ? `${base}${fragment}` : base;
}

/** Revoke a blob URL created by fetchBookPdfBlobUrl (strips #fragment). */
export function revokeBookPdfBlobUrl(blobUrl: string): void {
  const base = blobUrl.split("#")[0] ?? blobUrl;
  if (base.startsWith("blob:")) {
    URL.revokeObjectURL(base);
  }
}
