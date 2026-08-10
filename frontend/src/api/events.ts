import type { Title } from "../types/title";
import { apiRequest } from "./client";

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

export function saveTitleStatus(
  token: string,
  titleId: number,
  status: WatchStatus
): Promise<EventResult> {
  return apiRequest<EventResult>("/events", {
    token,
    method: "POST",
    body: JSON.stringify({ title_id: titleId, status }),
  });
}

export function getMyList(token: string, signal?: AbortSignal): Promise<MyList> {
  return apiRequest<MyList>("/me/list", { token, signal });
}
