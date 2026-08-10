import type { WatchStatus } from "./events";

export type SocialUser = {
  id: number;
  username: string;
  full_name: string;
};

export type FeedTitle = {
  id: number;
  name: string;
  type: string;
  year: number | null;
  poster_url: string | null;
};

export type FeedItem = {
  id: number;
  user: SocialUser;
  title: FeedTitle;
  status: WatchStatus;
  created_at: string;
};

const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

async function socialRequest<T>(
  path: string,
  token: string,
  options: RequestInit = {}
): Promise<T> {
  if (!apiBaseUrl) throw new Error("Missing EXPO_PUBLIC_API_BASE_URL");

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = (await response.json()) as { detail?: string };
      if (body.detail) message = body.detail;
    } catch {
      // Keep the status-based message if the response is not JSON.
    }
    throw new Error(message);
  }

  return (await response.json()) as T;
}

export function addFriend(token: string, username: string): Promise<SocialUser> {
  return socialRequest<SocialUser>("/friends", token, {
    method: "POST",
    body: JSON.stringify({ username }),
  });
}

export function getFriends(
  token: string,
  signal?: AbortSignal
): Promise<SocialUser[]> {
  return socialRequest<SocialUser[]>("/friends", token, { signal });
}

export function getFeed(token: string, signal?: AbortSignal): Promise<FeedItem[]> {
  return socialRequest<FeedItem[]>("/feed", token, { signal });
}
