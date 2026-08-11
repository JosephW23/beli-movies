import type { Title } from "../types/title";
import { apiRequest } from "./client";

type TitlesResponse = {
  items: Title[];
  page: number;
  page_size: number;
  total: number;
};

export type RatingSummary = {
  average_score: number | null;
  rating_count: number;
};

export async function searchTitles(
  query: string,
  signal?: AbortSignal
): Promise<Title[]> {
  const params = new URLSearchParams({ page: "1", page_size: "20" });
  if (query.trim()) params.set("query", query.trim());

  const body = await apiRequest<TitlesResponse>(`/titles?${params.toString()}`, {
    signal,
  });
  return body.items;
}

export function getTitleRatingSummary(
  titleId: number,
  signal?: AbortSignal
): Promise<RatingSummary> {
  return apiRequest<RatingSummary>(`/titles/${titleId}/rating-summary`, { signal });
}
