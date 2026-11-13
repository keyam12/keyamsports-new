# KEYAM SPORTS

Existing Next.js App Router sports site. Branding, colors, typography and homepage structure are preserved.

## Local development

Use Node 22 LTS or newer (validated with Node 24). Run `npm ci`, copy `.env.example` to `.env.local`, configure the services you intend to use, then `npm run dev`.

Existing editorial notes live in `data/published.json` and remain visible without Supabase. They retain their original copy, dates, IDs and source links. The six original seed examples are excluded from this publication file; `KEYAM_ENABLE_SAMPLE_CONTENT=true` exposes the legacy mixed file only in development. No seed examples are served or seeded in production.

When Supabase returns successfully, its published results are authoritative, including an intentionally empty list. On missing configuration or a read failure, the existing repository publications remain available. After fully migrating the notes to Supabase, set `KEYAM_CONTENT_SOURCE=database` to disable repository fallback and prevent an outage from restoring content that editors later unpublished.

## Checks

- `npm test`: security/data-integrity regressions; no credentials or paid calls.
- `npm run test:db`: private agent RPCs, transactions, RLS, quota and recovery checks in local PostgreSQL (PGlite).
- `npm run build`: production compilation and type validation. The existing Oswald font requires build access to fonts.googleapis.com and fonts.gstatic.com.
- `npm run typecheck`: standalone TypeScript validation after Next generates route types.
- `node tests/browser-smoke.cjs`: optional fixture-backed browser checks after build. Requires Playwright and `/usr/bin/chromium` (available in the managed test environment). Starts local ports 3100/4010 and stops its servers. It does not access production Supabase or publish content.

## Configuration and rollout

See [.env.example](.env.example). Do not commit credentials.

The initial Supabase migration and import of the 13 existing publications are prepared separately. See [migration checks and rollout](docs/SUPABASE_MIGRATION.md). This migration requires production approval before sending it to `main`; preparing the file does not connect or modify the hosted database.

- Retain the existing Supabase database. `supabase/articles.sql` is setup for a **new** database, not a migration to rerun blindly. No database changes are required by this stability batch.
- Admin uses signed, expiring, HttpOnly cookies and a strong `ADMIN_PASSWORD`. Production sensitive requests use the private PostgreSQL limiter or optional configured Upstash; they fail closed on limiter failure.
- AI endpoints and `/agents` require an admin session. Generation additionally requires `KEYAM_ENABLE_AI=true`, an API key, verified API model IDs and a daily global run limit. The default ceiling is five runs per rolling day. This is a run cap, **not** a dollar budget; account spend controls and the later usage ledger are still required. Verified Tier 1/2 stories can publish automatically after the research and Senior Editor gates; see [autonomous publication](docs/AUTONOMOUS_PUBLICATION.md). A daily draft-only cron is declared but fails closed until explicitly configured; see [agent automation](docs/AGENT_AUTOMATION.md).
- Worker output is stored before the automatic publication gate; only verified approved Tier 1/2 stories publish, and other stories are retained. Missing headlines and failed reviews cannot authorize publication. Independent fact verification remains future work. Generated drafts now persist through private, leased, idempotent database jobs; the admin panel exposes review history and reported usage.
- Scores require `THESPORTSDB_API_KEY` and commercial terms review. The initial adapter shows periodic date snapshots, not guaranteed real-time scores. Provider failure returns no fabricated or replayed stale results. Shared caching/rate controls remain Phase C.
- Set `NEXT_PUBLIC_SITE_URL` to the production origin. `GOOGLE_SITE_VERIFICATION` supplies the optional Search Console meta verification token; account verification must still be completed in Search Console.
- AdSense is existing optional functionality. The baseline CSP needs provider-specific review before advertisements or third-party embeds are enabled. GA4, licensed images/video and a consent flow are not implemented yet.

Read the [audit and roadmap](docs/REPOSITORY_AUDIT.md) and [stability results](docs/STABILITY_CHANGELOG.md) before staging. Confirm Supabase/Redis access, provider permissions, model access and editorial review rules in staging. Production deployments require explicit user authorization. See [content recovery](docs/CONTENT_RECOVERY.md) for the correction preserving the existing editorial notes.
