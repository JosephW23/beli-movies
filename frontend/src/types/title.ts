export type Title = {
  id: number;
  name: string;
  type: string;
  year: number | null;
  poster_url: string | null;
  genres: string | null;
  tmdb_id: number | null;
  overview?: string | null;
  runtime_minutes?: number | null;
};

export type ExternalTitle = {
  id: string;
  tmdb_id: number;
  type: "movie" | "tv";
  name: string;
  year: number | null;
  poster_url: string | null;
  overview: string | null;
  genre_ids: number[];
  genres: string[];
  runtime_minutes: number | null;
  local_title_id: number | null;
  average_score: number | null;
  rating_count: number;
};

export type SelectableTitle = Title | ExternalTitle;

export function isExternalTitle(title: SelectableTitle): title is ExternalTitle {
  return typeof title.id === "string";
}
