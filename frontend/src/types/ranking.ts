export type ComparisonTitle = {
  id: number;
  name: string;
  type: string;
  year: number | null;
  poster_url: string | null;
};

export type RankingProgress = {
  complete: boolean;
  new_title: ComparisonTitle;
  comparison_title: ComparisonTitle | null;
  comparison_number: number;
  estimated_comparisons: number;
  rank_position: number | null;
  score: number | null;
  total_ranked: number;
};
