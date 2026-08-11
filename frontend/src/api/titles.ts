import type { ExternalTitle, Title } from "../types/title";
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

export async function searchStoredTitles(
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

export function searchTmdbTitles(
  query: string,
  signal?: AbortSignal
): Promise<ExternalTitle[]> {
  const normalized = query.trim();
  if (!normalized) return Promise.resolve([]);
  return apiRequest<ExternalTitle[]>(`/search?q=${encodeURIComponent(normalized)}`, {
    signal,
  });
}

export function getTrendingTitles(signal?: AbortSignal): Promise<ExternalTitle[]> {
  return apiRequest<ExternalTitle[]>("/search/trending", { signal });
}

export function getTmdbTitleDetails(
  mediaType: "movie" | "tv",
  tmdbId: number,
  signal?: AbortSignal
): Promise<ExternalTitle> {
  return apiRequest<ExternalTitle>(`/search/${mediaType}/${tmdbId}`, { signal });
}

export function importTmdbTitle(
  token: string,
  tmdbId: number,
  mediaType: "movie" | "tv"
): Promise<Title> {
  return apiRequest<Title>("/titles/import", {
    method: "POST",
    token,
    body: JSON.stringify({ tmdb_id: tmdbId, type: mediaType }),
  });
}

export function getTitleRatingSummary(
  titleId: number,
  signal?: AbortSignal
): Promise<RatingSummary> {
  return apiRequest<RatingSummary>(`/titles/${titleId}/rating-summary`, { signal });
}
