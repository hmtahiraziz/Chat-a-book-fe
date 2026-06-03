const TOKEN_KEY = "bookchat-access-token";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(TOKEN_KEY);
  return value?.trim() || null;
}

export function setAccessToken(token: string): void {
  window.localStorage.setItem(TOKEN_KEY, token.trim());
}

export function clearAccessToken(): void {
  window.localStorage.removeItem(TOKEN_KEY);
}
