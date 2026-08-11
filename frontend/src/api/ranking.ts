import type { PersonalRanking, RankingProgress } from "../types/ranking";
import { apiRequest } from "./client";

export function getComparisonCandidate(
  token: string,
  titleId: number,
  enjoyed: boolean,
  excludedTitleIds: number[] = [],
  signal?: AbortSignal
): Promise<RankingProgress> {
  const params = new URLSearchParams({
    title_id: String(titleId),
    enjoyed: String(enjoyed),
  });
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
  preferredTitleId: number,
  enjoyed: boolean
): Promise<RankingProgress> {
  return apiRequest<RankingProgress>("/compare", {
    token,
    method: "POST",
    body: JSON.stringify({
      title_id: titleId,
      comparison_title_id: comparisonTitleId,
      preferred_title_id: preferredTitleId,
      enjoyed,
    }),
  });
}

export function saveTooTough(
  token: string,
  titleId: number,
  comparisonTitleId: number,
  enjoyed: boolean
): Promise<RankingProgress> {
  return apiRequest<RankingProgress>("/compare/too-tough", {
    token,
    method: "POST",
    body: JSON.stringify({
      title_id: titleId,
      comparison_title_id: comparisonTitleId,
      enjoyed,
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
