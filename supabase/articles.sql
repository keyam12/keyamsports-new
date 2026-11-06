-- KEYAM SPORTS — articles table (run once in Supabase: SQL Editor → New query → paste → Run)
-- Project: supabase.com → New project → copy URL + anon key + service_role key
-- into Vercel env vars: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
-- SUPABASE_SERVICE_ROLE_KEY. Also set ADMIN_PASSWORD (the admin panel login).

create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('basketball', 'football', 'baseball', 'soccer')),
  title text not null,
  summary text not null default '',
  date date not null default current_date,
  ai boolean not null default true,
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now()
);

-- Public reads only; writes go through the service-role key in the admin API routes.
alter table public.articles enable row level security;

create policy "Public can read published articles"
  on public.articles for select
  using (status = 'published');

-- No public insert/update/delete policies: only the service-role key (server) writes.
