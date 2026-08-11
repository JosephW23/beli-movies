import { supabase } from "../lib/supabase";

const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

type ApiRequestOptions = RequestInit & {
  token?: string;
};

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const { data, error } = await supabase.auth.refreshSession();
        if (!error && data.session?.access_token) return data.session.access_token;
      } catch {
        // The original request will surface a useful error below.
      }
      try {
        await supabase.auth.signOut({ scope: "local" });
      } catch {
        // Local session cleanup is best-effort when the device is offline.
      }
      return null;
    })()
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

export async function apiRequest<T>(
  path: string,
  { token, ...options }: ApiRequestOptions = {}
): Promise<T> {
  if (!apiBaseUrl) throw new Error("Missing EXPO_PUBLIC_API_BASE_URL");

  const send = (accessToken?: string) => fetch(`${apiBaseUrl}${path}`, {
      ...options,
      headers: {
        Accept: "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    });

  let response = await send(token);
  if (response.status === 401 && token) {
    const freshToken = await refreshAccessToken();
    if (freshToken) response = await send(freshToken);
  }

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = (await response.json()) as { detail?: string };
      if (body.detail) message = body.detail;
    } catch {
      // Keep the status-based fallback for non-JSON responses.
    }
    throw new Error(message);
  }

  return (await response.json()) as T;
}
