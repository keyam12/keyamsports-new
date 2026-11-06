// Supabase clients for KEYAM SPORTS.
// - supabaseAnon: public reads (NEXT_PUBLIC_SUPABASE_URL + ANON_KEY).
// - supabaseAdmin: server-only writes via the service-role key — NEVER
//   exposed to the browser. Admin routes use this.
// When the env vars are missing, the site falls back to data/sample.json
// and the admin panel shows the setup screen instead of crashing.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export function supabaseAnon(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export function supabaseAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}
