import type { Title } from "../types/title";

export type WatchStatus = "WANT" | "WATCHED" | "WATCHING";

export type EventResult = {
  id: number;
  title_id: number;
  status: WatchStatus;
  created_at: string;
};

export type SavedTitle = Title & {
  event_id: number;
  status: WatchStatus;
  saved_at: string;
};

export type MyList = {
  want_to_watch: SavedTitle[];
  watched: SavedTitle[];
};

const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

async function authenticatedRequest<T>(
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
      // Keep the status-based fallback for non-JSON responses.
    }
    throw new Error(message);
  }

  return (await response.json()) as T;
}

export function saveTitleStatus(
  token: string,
  titleId: number,
  status: WatchStatus
): Promise<EventResult> {
  return authenticatedRequest<EventResult>("/events", token, {
    method: "POST",
    body: JSON.stringify({ title_id: titleId, status }),
  });
}

export function getMyList(token: string, signal?: AbortSignal): Promise<MyList> {
  return authenticatedRequest<MyList>("/me/list", token, { signal });
}
