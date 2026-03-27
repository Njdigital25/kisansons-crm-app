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
  id: number;
  name: string;
  email: string;
  company?: string;
  status?: string;
  created_at?: string;
};
