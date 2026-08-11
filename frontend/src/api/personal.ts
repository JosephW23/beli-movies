import type { WatchStatus } from "./events";
import { apiRequest } from "./client";

export type PersonalTitle = {
  title_id: number;
  status: WatchStatus | null;
  personal_score: number | null;
  review: string | null;
};

export type Review = {
  id: number;
  title_id: number;
  title_name: string;
  poster_url: string | null;
  year: number | null;
  score: number | null;
  body: string;
  updated_at: string;
};

export function getPersonalTitle(
  token: string,
  titleId: number,
  signal?: AbortSignal
): Promise<PersonalTitle> {
  return apiRequest<PersonalTitle>(`/me/titles/${titleId}`, { token, signal });
}

export function updatePersonalScore(
  token: string,
  titleId: number,
  score: number
): Promise<PersonalTitle> {
  return apiRequest<PersonalTitle>(`/me/titles/${titleId}/score`, {
    token,
    method: "PATCH",
    body: JSON.stringify({ score }),
  });
}

export function saveReview(token: string, titleId: number, body: string): Promise<Review> {
  return apiRequest<Review>(`/me/titles/${titleId}/review`, {
    token,
    method: "PUT",
    body: JSON.stringify({ body }),
  });
}

export function getMyReviews(token: string, signal?: AbortSignal): Promise<Review[]> {
  return apiRequest<Review[]>("/me/reviews", { token, signal });
}
