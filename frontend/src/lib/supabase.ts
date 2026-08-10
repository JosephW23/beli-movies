import { createClient } from "@supabase/supabase-js";
import { supabaseStorage } from "./token";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase env vars (EXPO_PUBLIC_...) at runtime");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: (...args) => fetch(...(args as [RequestInfo, RequestInit?])),
  },
  auth: {
    detectSessionInUrl: false,
    persistSession: true,
    autoRefreshToken: true,
    storage: supabaseStorage,
  },
});
