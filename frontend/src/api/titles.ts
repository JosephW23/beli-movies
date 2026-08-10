import type { Title } from "../types/title";
import { apiRequest } from "./client";

type TitlesResponse = {
  items: Title[];
  page: number;
  page_size: number;
  total: number;
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
