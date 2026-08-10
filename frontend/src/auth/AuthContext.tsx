import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { clearToken, getToken, saveToken } from "../lib/token";

type AuthContextValue = {
  token: string | null;
  isRestoring: boolean; // <-- NEW: only for app start
  isLoading: boolean;   // <-- still used for button loading (login/signup/logout)
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);

  // NEW: split the loading states
  const [isRestoring, setIsRestoring] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [error, setError] = useState<string | null>(null);

  // Init: restore token on app start
  useEffect(() => {
    let isMounted = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // With our custom SecureStore setup Supabase has no persisted session to
      // report on startup. Let restore() handle that initial value instead.
      if (!isMounted || (event === "INITIAL_SESSION" && !session)) return;

      const nextToken = session?.access_token ?? null;
      setToken(nextToken);

      // Keep SecureStore in sync for sign-in, sign-up, refresh, and sign-out
      // events that can happen outside the methods below.
      void (nextToken ? saveToken(nextToken) : clearToken()).catch(() => {
        if (isMounted) setError("Failed to save session.");
      });
    });

    async function restore() {
      try {
        const stored = await getToken();
        if (isMounted) setToken(stored);
      } catch (e) {
        if (isMounted) setError("Failed to restore session.");
      } finally {
        if (isMounted) setIsRestoring(false);
      }
    }

    restore();
    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function signIn(email: string, password: string) {
    setError(null);
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;

      const accessToken = data.session?.access_token;
      if (!accessToken) throw new Error("No access token returned.");

      await saveToken(accessToken);
      setToken(accessToken);
    } catch (e: any) {
      setError(e?.message ?? "Sign in failed.");
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  }

  async function signUp(email: string, password: string) {
    setError(null);
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) throw error;

      // session may be null if email confirmation is required
      const accessToken = data.session?.access_token ?? null;

      if (accessToken) {
        await saveToken(accessToken);
        setToken(accessToken);
      } else {
        setToken(null);
      }
    } catch (e: any) {
      setError(e?.message ?? "Sign up failed.");
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  }

  async function signOut() {
    setError(null);
    setIsLoading(true);
    try {
      await supabase.auth.signOut();
    } finally {
      await clearToken();
      setToken(null);
      setIsLoading(false);
    }
  }

  const value = useMemo<AuthContextValue>(
    () => ({ token, isRestoring, isLoading, error, signIn, signUp, signOut }),
    [token, isRestoring, isLoading, error]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside an AuthProvider");
  return ctx;
}
