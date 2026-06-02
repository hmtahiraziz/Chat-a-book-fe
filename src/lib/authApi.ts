import { API_BASE_URL } from "@/lib/api";
import { clearAccessToken, getAccessToken, setAccessToken } from "@/lib/authToken";

export type PlanId = "starter" | "pro";

export type SubscriptionInfo = {
  plan_id: PlanId | null;
  status: "inactive" | "active" | "cancelled";
  subscribed_at: number | null;
};

export type AuthUser = {
  user_id: string;
  email: string;
  name: string;
  role: "user" | "admin";
  is_demo?: boolean;
  subscription: SubscriptionInfo;
  created_at?: number | null;
};

export function isDemoUser(user: AuthUser | null): boolean {
  return Boolean(user?.is_demo);
}

export type SubscriptionPlan = {
  id: PlanId;
  name: string;
  price_monthly: number;
  currency: string;
  description: string;
  features: string[];
};

export type AuthResponse = {
  access_token: string;
  token_type: string;
  user: AuthUser;
};

export type DemoLoginResponse = AuthResponse & {
  demo_book_id: string | null;
  demo_book_label: string | null;
};

async function parseError(res: Response): Promise<string> {
  const body = (await res.json().catch(() => ({}))) as { detail?: unknown };
  if (typeof body.detail === "string") return body.detail;
  return `Request failed (HTTP ${res.status}).`;
}

export function authHeaders(extra?: HeadersInit): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (extra && typeof extra === "object" && !Array.isArray(extra)) {
    Object.assign(headers, extra as Record<string, string>);
  }
  return headers;
}

/** Bearer token only — for multipart uploads (no Content-Type). */
export function authHeadersBearerOnly(): HeadersInit {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchPlans(): Promise<SubscriptionPlan[]> {
  const res = await fetch(`${API_BASE_URL}/auth/plans`);
  if (!res.ok) throw new Error(await parseError(res));
  const data = (await res.json()) as { plans?: SubscriptionPlan[] };
  return Array.isArray(data.plans) ? data.plans : [];
}

export async function registerUser(input: {
  email: string;
  password: string;
  name?: string;
}): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await parseError(res));
  const data = (await res.json()) as AuthResponse;
  setAccessToken(data.access_token);
  return data;
}

export async function loginDemo(): Promise<DemoLoginResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/demo-login`, { method: "POST" });
  if (!res.ok) throw new Error(await parseError(res));
  const data = (await res.json()) as DemoLoginResponse;
  setAccessToken(data.access_token);
  return data;
}

export async function loginUser(input: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await parseError(res));
  const data = (await res.json()) as AuthResponse;
  setAccessToken(data.access_token);
  return data;
}

export async function fetchCurrentUser(): Promise<AuthUser | null> {
  const token = getAccessToken();
  if (!token) return null;
  const res = await fetch(`${API_BASE_URL}/auth/me`, { headers: authHeaders() });
  if (res.status === 401) {
    clearAccessToken();
    return null;
  }
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as AuthUser;
}

export async function mockSubscribe(planId: PlanId): Promise<AuthUser> {
  const res = await fetch(`${API_BASE_URL}/auth/subscribe/mock-checkout`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ plan_id: planId }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as AuthUser;
}

export function logoutLocal(): void {
  clearAccessToken();
}

export function hasActiveSubscription(user: AuthUser | null): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;
  return user.subscription.status === "active" && Boolean(user.subscription.plan_id);
}
