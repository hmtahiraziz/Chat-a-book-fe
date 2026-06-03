"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  fetchCurrentUser,
  hasActiveSubscription,
  loginDemo,
  loginUser,
  logoutLocal,
  mockSubscribe,
  registerUser,
  type AuthUser,
  type DemoLoginResponse,
  type PlanId,
} from "@/lib/authApi";
import { setDemoBookId } from "@/lib/demoBook";

type AuthStatus = "loading" | "guest" | "authenticated";

type AuthContextValue = {
  status: AuthStatus;
  user: AuthUser | null;
  isSubscribed: boolean;
  refreshUser: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  enterDemo: () => Promise<DemoLoginResponse>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  subscribe: (planId: PlanId) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);

  const refreshUser = useCallback(async () => {
    try {
      const next = await fetchCurrentUser();
      setUser(next);
      setStatus(next ? "authenticated" : "guest");
    } catch {
      setUser(null);
      setStatus("guest");
    }
  }, []);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await loginUser({ email, password });
    setUser(res.user);
    setStatus("authenticated");
  }, []);

  const enterDemo = useCallback(async () => {
    const res = await loginDemo();
    setUser(res.user);
    setStatus("authenticated");
    if (res.demo_book_id) setDemoBookId(res.demo_book_id);
    return res;
  }, []);

  const register = useCallback(async (email: string, password: string, name?: string) => {
    const res = await registerUser({ email, password, name });
    setUser(res.user);
    setStatus("authenticated");
  }, []);

  const subscribe = useCallback(async (planId: PlanId) => {
    const updated = await mockSubscribe(planId);
    setUser(updated);
    setStatus("authenticated");
  }, []);

  const logout = useCallback(() => {
    logoutLocal();
    setUser(null);
    setStatus("guest");
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      isSubscribed: hasActiveSubscription(user),
      refreshUser,
      login,
      enterDemo,
      register,
      subscribe,
      logout,
    }),
    [status, user, refreshUser, login, enterDemo, register, subscribe, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
