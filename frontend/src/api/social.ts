import type { FeedItem } from "../types/activity";
import type { SocialUser } from "../types/user";
import { apiRequest } from "./client";

export type { FeedItem } from "../types/activity";
export type { SocialUser } from "../types/user";

export function addFriend(token: string, username: string): Promise<SocialUser> {
  return apiRequest<SocialUser>("/friends", {
    token,
    method: "POST",
    body: JSON.stringify({ username }),
  });
}

export function getFriends(
  token: string,
  signal?: AbortSignal
): Promise<SocialUser[]> {
  return apiRequest<SocialUser[]>("/friends", { token, signal });
}

export function getFeed(
  token: string,
  limit = 20,
  offset = 0,
  signal?: AbortSignal
): Promise<FeedItem[]> {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  return apiRequest<FeedItem[]>(`/feed?${params.toString()}`, { token, signal });
}
