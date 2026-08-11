import type { ExternalTitle } from "../types/title";
import { apiRequest } from "./client";

export type Recommendation = ExternalTitle & {
  reason: string;
};

export function getRecommendations(
  token: string,
  limit = 20,
  page = 1,
  signal?: AbortSignal
): Promise<Recommendation[]> {
  return apiRequest<Recommendation[]>(`/me/recs?limit=${limit}&page=${page}`, {
    token,
    signal,
  });
}
