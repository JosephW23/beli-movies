import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { clearLegacyToken } from "../lib/token";
import { usernameFromFullName } from "../lib/username";

type AuthContextValue = {
  token: string | null;
  isRestoring: boolean;
  isLoading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (fullName: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);

  const [isRestoring, setIsRestoring] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;

      const nextToken = session?.access_token ?? null;
      setToken(nextToken);
    });

    async function restore() {
      try {
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (isMounted) setToken(data.session?.access_token ?? null);
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

      setToken(accessToken);
    } catch (requestError) {
      setError(errorMessage(requestError, "Sign in failed."));
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  }

  async function signUp(fullName: string, email: string, password: string) {
    setError(null);
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            username: usernameFromFullName(fullName),
          },
        },
      });
      if (error) throw error;

      // session may be null if email confirmation is required
      const accessToken = data.session?.access_token ?? null;

      if (accessToken) {
        setToken(accessToken);
      } else {
        setToken(null);
      }
    } catch (requestError) {
      setError(errorMessage(requestError, "Sign up failed."));
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
      // Remove the legacy access-token-only value used before full Supabase
      // session persistence was enabled.
      await clearLegacyToken();
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
