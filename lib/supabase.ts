// Supabase clients for KEYAM SPORTS.
// - supabaseAnon: public reads (NEXT_PUBLIC_SUPABASE_URL + ANON_KEY).
// - supabaseAdmin: server-only writes via the service-role key — NEVER
//   exposed to the browser. Admin routes use this.
// Existing repository publications remain readable without database credentials.
// The admin panel shows setup instructions when writes are not configured.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const databaseFetch: typeof fetch = (input, init) => fetch(input, {
  ...init, cache: "no-store",
  signal: init?.signal ? AbortSignal.any([init.signal, AbortSignal.timeout(8000)]) : AbortSignal.timeout(8000),
});

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
  return createClient(url, key, { global: { fetch: databaseFetch }, auth: { persistSession: false } });
}

export function supabaseAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { global: { fetch: databaseFetch }, auth: { persistSession: false } });
}
