const DEMO_BOOK_KEY = "bookchat-demo-book-id";

export function setDemoBookId(bookId: string): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(DEMO_BOOK_KEY, bookId);
}

export function peekDemoBookId(): string | null {
  if (typeof window === "undefined") return null;
  const id = window.sessionStorage.getItem(DEMO_BOOK_KEY)?.trim();
  return id || null;
}

export function consumeDemoBookId(): string | null {
  if (typeof window === "undefined") return null;
  const id = peekDemoBookId();
  if (id) window.sessionStorage.removeItem(DEMO_BOOK_KEY);
  return id;
}
