# KEYAM SPORTS

Existing Next.js App Router sports site. Branding, colors, typography and homepage structure are preserved.

## Local development

Use Node 22 LTS or newer (validated with Node 24). Run `npm ci`, copy `.env.example` to `.env.local`, configure the services you intend to use, then `npm run dev`.

Without Supabase, the public feed is empty rather than showing unverified bundled stories. To inspect the old archive locally only, set `KEYAM_ENABLE_SAMPLE_CONTENT=true` in development. No samples are served or seeded in production.

## Checks

- `npm test`: security/data-integrity regressions; no credentials or paid calls.
- `npm run build`: production compilation and type validation. The existing Oswald font requires build access to fonts.googleapis.com and fonts.gstatic.com.
- `npm run typecheck`: standalone TypeScript validation after Next generates route types.
- `node tests/browser-smoke.cjs`: optional fixture-backed browser checks after build. Requires Playwright and `/usr/bin/chromium` (available in the managed test environment). Starts local ports 3100/4010 and stops its servers. It does not access production Supabase or publish content.

## Configuration and rollout

See [.env.example](.env.example). Do not commit credentials.

- Retain the existing Supabase database. `supabase/articles.sql` is setup for a **new** database, not a migration to rerun blindly. No database changes are required by this stability batch.
- Admin uses signed, expiring, HttpOnly cookies and a strong `ADMIN_PASSWORD`. Old hash cookies become invalid; sign in again. Production login requires Upstash Redis configuration for throttling and fails closed on limiter failure.
- AI endpoints and `/agents` require an admin session. Generation additionally requires `KEYAM_ENABLE_AI=true`, an API key, verified API model IDs and a daily global run limit. The default ceiling is five runs per rolling day. This is a run cap, **not** a dollar budget; account spend controls and the later usage ledger are still required. No automated publishing or cron is configured.
- Agent responses are drafts requiring human review even when automated review succeeds. Missing headlines and failed reviews cannot authorize publication. Independent fact verification remains future work.
- Scores require `THESPORTSDB_API_KEY` and commercial terms review. The initial adapter shows periodic date snapshots, not guaranteed real-time scores. Provider failure returns no fabricated or replayed stale results. Shared caching/rate controls remain Phase C.
- Set `NEXT_PUBLIC_SITE_URL` to the production origin. `GOOGLE_SITE_VERIFICATION` supplies the optional Search Console meta verification token; account verification must still be completed in Search Console.
- AdSense is existing optional functionality. The baseline CSP needs provider-specific review before advertisements or third-party embeds are enabled. GA4, licensed images/video and a consent flow are not implemented yet.

Read the [audit and roadmap](docs/REPOSITORY_AUDIT.md) and [stability results](docs/STABILITY_CHANGELOG.md) before staging. Confirm Supabase/Redis access, provider permissions, model access and editorial review rules in staging. No production deployment is authorized by this change.
