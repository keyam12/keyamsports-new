# Initial Supabase migration

Target existing project: `yrqzjcastjnpwkhsyyze`. The user-provided integration screen shows repository `keyam12/keyamsports-new`, working directory `.`, production deploys enabled and production branch `main`. This is configuration evidence, not proof of a successful deployment.

## Change prepared

`supabase/migrations/20261111090000_initial_articles.sql` creates the schema already used by `lib/articles.ts`, enables published-only row level security, grants public read-only access, and imports the 13 existing publications from `data/published.json`. It does not import the six original example articles. UUID associations are recorded in `supabase/article-id-mapping.json`; existing copy, dates, categories and source arrays are retained. This is a storage migration, not a fresh editorial verification of those publications.

The migration aborts if `public.articles` already exists. Inspect that database and prepare an additive migration rather than removing or overwriting the existing table. Supabase's GitHub deployment workflow wraps each migration in a transaction and records successful versions; the file deliberately contains no BEGIN/COMMIT and must be executed transactionally by the migration runner.

No `config.toml` is introduced: production API/Auth configuration is not being changed. No seed file, paid service, database credentials, or public UI changes are included.

## Local verification

Executed the SQL against local PostgreSQL using the temporary PGlite verifier (no application dependency added). Verified exact equality of all 13 imported publications, hidden drafts for anonymous/authenticated users, denied public inserts/updates/deletes, service-role draft editing, pre-existing-table protection and rollback. Application regression checks also run separately. These checks do not establish access to, or success against, hosted Supabase.

## Deployment and follow-up

1. Obtain explicit approval before sending this migration to `main`: the connected Supabase integration applies production migrations on that branch, and Vercel also rebuilds the application on a main push.
2. Check the integration's pending/saved state in Supabase and its deployment/check logs after merge. Confirm all 13 rows and four category counts: basketball 5, soccer 4, baseball 3, football 1. Do not report success based only on a GitHub push.
3. If opening a PR first, confirm automatic preview branching is disabled or its costs have been accepted. Creating a GitHub branch can provision a Supabase branch when automatic branching is enabled. This change does not enable branching or upgrade a plan.
4. Verify hosted public reads exclude drafts and public writes fail. Review failure logs before any retry. Never drop an existing table or reset the database to retry this migration.
5. Only after import and hosted verification, configure the existing Vercel variables `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and server-only `SUPABASE_SERVICE_ROLE_KEY` through secure account settings. Never place keys in this repository or chat. Importing the database alone does not connect the application.
6. Test the application against the intended database before production configuration rollout. Keep `KEYAM_CONTENT_SOURCE=auto` until migration and read/error behavior have been verified; consider `database` mode afterward so intentionally unpublished content cannot return from the repository fallback.

Admin login separately requires `ADMIN_PASSWORD` and the existing production Upstash limiter variables. This migration does not activate AI, automated publishing, analytics or any background job.
