export type CurrentUser = {
  id: number;
  email: string | null;
  supabase_sub: string;
  full_name: string | null;
  username: string | null;
};

export type SocialUser = {
  id: number;
  username: string;
  full_name: string;
};
