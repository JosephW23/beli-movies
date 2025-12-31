export type Title = {
  id: number;
  name: string;
  type: "movie" | "tv";
  year?: number;
  poster_url?: string;
  genres?: string;
  tmdb_id?: number;
};