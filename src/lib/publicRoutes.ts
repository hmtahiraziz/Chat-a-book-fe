/** Routes that do not require authentication (marketing + auth flows). */
export const PUBLIC_PATH_PREFIXES = [
  "/",
  "/login",
  "/register",
  "/pricing",
  "/subscribe",
  "/demo",
] as const;

export function isPublicPath(pathname: string | null | undefined): boolean {
  if (!pathname || pathname === "/") return true;
  return PUBLIC_PATH_PREFIXES.some(
    (prefix) => prefix !== "/" && (pathname === prefix || pathname.startsWith(`${prefix}/`)),
  );
}

/** Marketing/auth pages use a minimal chrome (no app sidebar). */
export function isBareLayoutPath(
  pathname: string,
  authStatus: "loading" | "authenticated" | "guest",
): boolean {
  if (pathname === "/") return true;
  if (pathname === "/login" || pathname === "/register" || pathname === "/demo") return true;
  if (pathname.startsWith("/subscribe")) return true;
  if (pathname === "/pricing" && authStatus !== "authenticated") return true;
  return false;
}
