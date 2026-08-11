import type { PersonalRanking, RankingProgress } from "../types/ranking";
import { apiRequest } from "./client";

export function getComparisonCandidate(
  token: string,
  titleId: number,
  excludedTitleIds: number[] = [],
  signal?: AbortSignal
): Promise<RankingProgress> {
  const params = new URLSearchParams({ title_id: String(titleId) });
  if (excludedTitleIds.length) {
    params.set("exclude_title_ids", excludedTitleIds.join(","));
  }
  return apiRequest<RankingProgress>(`/compare/candidate?${params.toString()}`, {
    token,
    signal,
  });
}

export function savePreference(
  token: string,
  titleId: number,
  comparisonTitleId: number,
  preferredTitleId: number
): Promise<RankingProgress> {
  return apiRequest<RankingProgress>("/compare", {
    token,
    method: "POST",
    body: JSON.stringify({
      title_id: titleId,
      comparison_title_id: comparisonTitleId,
      preferred_title_id: preferredTitleId,
    }),
  });
}

export function getMyRankings(
  token: string,
  limit = 20,
  type?: "movie" | "tv",
  signal?: AbortSignal
): Promise<PersonalRanking[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (type) params.set("type", type);
  return apiRequest<PersonalRanking[]>(`/me/rankings?${params.toString()}`, {
    token,
    signal,
  });
}
