# Persisted editorial drafts

The existing crew now saves its generated work through the private PostgreSQL job store. `/admin` includes configuration status, a draft-run button, history, attempts, reported token totals and editorial review notes. Existing public branding/layout remains unchanged. This stage creates **drafts only**; it does not provide independent reporting, licensed media discovery or automatic publication.

## What runs

Four scouts use recent source headlines; unavailable leagues do not prevent coverage of another league. All scouts settle before proceeding. Senior Editor selects the story and league; Writer and Stats prepare supplied-evidence text; Editor assembles it; automated review remains advisory. The result and review are stored privately, and an article with `status=draft` is inserted atomically. A human reviews its facts, sources and text before publication in the existing article controls.

This is headline-based assistance, not full research or fact verification. ESPN public endpoint availability does not establish a commercial license. Review intended provider use/terms before activation; add licensed/primary-source adapters for a production newsroom. No new article images or video rights are implied.

## Storage, retries and limits

Apply `supabase/migrations/20261111095000_agent_drafts.sql` after the initial migration. Tables and RPCs are service-role only, RLS enabled, with no anonymous/authenticated permissions. Draft finalization never accepts `published`. An advisory transaction lock serializes finalization; overlapping canonical source URLs or an identical normalized headline prevent saving another article. This is exact source/headline deduplication, not semantic grouping of different reports of one event.

Unique job keys prevent repeating completed/active work. Each attempt has a fenced ten-minute lease. A stale attempt cannot save a draft after its replacement has claimed the job. Failed/expired work can be retried manually with the same key up to three attempts, consuming quota on each attempt. No automatic retry loop or queue service is added. The next daily schedule creates a different key; it does not recover all earlier failed work. Check Admin regularly during initial rollout.

Atomic PostgreSQL daily counters cap job attempts in UTC. A shared global limiter additionally covers manual legacy endpoints and injury runs, using existing Redis if configured or the private database limiter otherwise. Sensitive operations reject requests on storage/limiter failure. The PostgreSQL limiter requires only the existing database, avoiding a new Redis service for basic operation.

Model IDs are explicitly configured; previous unverified defaults were removed. Each tracked run allows at most ten model calls, at most 16,000 UTF-8 prompt bytes and 2,000 system bytes per call, and 1,800 completion tokens per call. SDK retries are disabled. Actual reported prompt/completion tokens are recorded after each successful call before proceeding. Network failures with unknown usage are marked incomplete, never represented as confirmed zero cost. A process kill or failed accounting write can leave usage incomplete; reconcile against provider billing. These controls are **not** a hard dollar budget; configure provider spending limits before activation. Model prices/cost estimates are intentionally not fabricated.

## Entry points

- `GET /api/admin/agent-jobs`: authenticated private readiness/history, never secret values.
- `POST /api/admin/agent-jobs`: authenticated, same-origin, requires a stable `Idempotency-Key`; saves/retries the draft job.
- Existing `/api/agents` streaming console and `/api/run-agent` now save through the same job store. Console uses a stable key for an EventSource connection. A browser disconnect does not authorize publication or erase stored work; server lifetime is still bounded.
- `GET /api/cron/agents`: requires a server-only `CRON_SECRET` of at least 32 characters, `KEYAM_ENABLE_SCHEDULED_AGENTS=true`, `KEYAM_ENABLE_AI=true`, configured models/database and `VERCEL_ENV=production`. Idempotent daily UTC key. `vercel.json` requests one run daily at 12:00 UTC, a deliberately low-frequency starter schedule. Hosting may deliver it within a wider window depending on plan. A declared schedule does not prove cron execution.

Functions have a 240-second limit. Current bounded crew is intended to finish within it. Hard terminations are recovered through lease expiry/manual retry, not a durable workflow engine. Higher-frequency 24/7 coverage and automatic retries require a later queue/workflow stage and plan/cost evaluation.

## Secure activation

1. Connect the **existing** Supabase project to the **primary** Vercel project `keyamsports-new` (not its two sibling deployments). Through account settings/integration configure `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and server-only `SUPABASE_SERVICE_ROLE_KEY` in production. Do not give previews production database credentials. Never paste credentials into chat or commit them.
2. Set a long unique `ADMIN_PASSWORD` through Vercel settings. Apply/verify both migrations first; login uses the PostgreSQL limiter without Upstash, or the existing Upstash config if supplied.
3. Set all five active `KEYAM_MODEL_*` IDs to verified models available to the connected OpenAI API account (Scout, Writer, Stats, Editor, Senior Editor). The existing OpenAI key's presence is not proof it works. Injury model is separate if needed. Set provider spending limits and review source terms.
4. Enable `KEYAM_ENABLE_AI=true`, conservatively set `KEYAM_MAX_AI_RUNS_PER_DAY` (1 initially recommended), and redeploy after configuration changes. In Admin generate one real draft, verify source/factual accuracy and reported usage, check it is hidden from public queries and confirm the existing 13 publications remain visible. No real paid-model test has been performed without these prerequisites.
5. Only after successful manual verification set a random `CRON_SECRET` and `KEYAM_ENABLE_SCHEDULED_AGENTS=true`, redeploy, then inspect the first scheduled job. Generating a cron secret is possible; obtaining existing Supabase account keys still requires authorized account access/integration.

No new paid dependency is provisioned. PGlite is a free development-only PostgreSQL test dependency; it is not the production database. AI calls and hosting/database usage may incur provider charges. Current account-specific monthly cost cannot be estimated reliably without selected model prices, source permissions and measured usage.

## Verification

`npm test` covers auth, disabled scheduling, draft validation, persistence/usage, duplicate-before-generation, failure recording and input/call caps plus existing regressions. `npm run test:db` exercises both real SQL migrations in local PGlite, RLS/grants, lease fencing, atomic draft insertion, duplicate suppression, daily limits, three-attempt retries and the shared database limiter. `npm run build` validates Next compilation/types. Local SQL tests and successful deployment checks do not substitute for authenticated hosted-database and real-model verification.


## Activation checks

The secret-protected scheduler supports `?mode=check` for read-only diagnostics (configured-model access, source availability, published row count, private-job store and latest editorial result). It performs no text generation and consumes no run quota. `?mode=test` runs the same bounded daily draft job while scheduling is still disabled; it retains production-only, bearer, AI, database and quota checks. It shares the daily key with the eventual cron, so enabling the schedule cannot repeat that day's completed work. Neither mode publishes articles.
