import { createClient, SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export async function getSupabase(): Promise<SupabaseClient> {
  if (client) return client;
  const res = await fetch("/api/auth/config");
  const config = await res.json();
  client = createClient(config.supabaseUrl, config.supabaseAnonKey);
  return client;
}
