import type { WatchStatus } from "../api/events";
import type { SocialUser } from "./user";

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
