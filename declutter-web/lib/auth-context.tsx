"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import { getStoredSession, setStoredSession } from "./api";
import type { AuthSession, User } from "./types";

type AuthContextValue = {
  session: AuthSession | null;
  user: User | null;
  hydrated: boolean;
  signIn: (session: AuthSession) => void;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setSession(getStoredSession());
    setHydrated(true);
  }, []);

  const signIn = useCallback((next: AuthSession) => {
    setStoredSession(next);
    setSession(next);
  }, []);

  const signOut = useCallback(() => {
    setStoredSession(null);
    setSession(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      hydrated,
      signIn,
      signOut
    }),
    [session, hydrated, signIn, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
