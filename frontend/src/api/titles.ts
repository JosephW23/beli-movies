import type { Title } from "../types/title";

type TitlesResponse = {
  items: Title[];
  page: number;
  page_size: number;
  total: number;
};

const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

export async function searchTitles(
  query: string,
  signal?: AbortSignal
): Promise<Title[]> {
  if (!apiBaseUrl) throw new Error("Missing EXPO_PUBLIC_API_BASE_URL");

  const params = new URLSearchParams({ page: "1", page_size: "20" });
  if (query.trim()) params.set("query", query.trim());

  const response = await fetch(`${apiBaseUrl}/titles?${params.toString()}`, {
    signal,
  });
  if (!response.ok) throw new Error(`Could not load titles (${response.status})`);

  const body = (await response.json()) as TitlesResponse;
  return body.items;
}
