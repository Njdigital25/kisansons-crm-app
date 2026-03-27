import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Lead = {
  id: string;
  name?: string;
  phone?: string;
  village?: string;
  district?: string;
  source?: string;
  status?: string;
  assigned_to?: string;
  follow_up_date?: string;
  created_at?: string;
};

export type Customer = {
  id: string;
  name?: string;
  phone?: string;
  village?: string;
  created_at?: string;
};
