# Vercel Schedules migration

Prepared November 24, 2026. Deployment and an authenticated production invocation must be verified separately before claiming this migration is operational.

## Configuration

`vercel.json` replaces the legacy `crons` array with one named path schedule, `editorial-daily`. It preserves `/api/cron/agents`, `0 12 * * *` (daily at 12:00 UTC), and explicitly sets `requestMethod: GET` to match the existing handler. Do not retain the old cron alongside the schedule: it could invoke the same work twice.

The route retains its existing `CRON_SECRET` Bearer validation, production-only execution, readiness checks, pause switch, database leases, idempotency and daily generation cap. No credentials, budget, provider, dependency or editorial policy are changed. The actual run may still return a hold, budget limit or failure; migrating the trigger does not establish that news was published.

## Verification after release

1. Confirm the Vercel deployment succeeds and the project shows exactly one editorial schedule with the expected path, method and daily expression. Check the account's Schedules availability and usage terms; do not enroll in paid services automatically.
2. Confirm an unauthenticated request to `/api/cron/agents` still returns 401.
3. Use an authenticated Vercel Schedules run action to invoke `editorial-daily` once. Do not expose, rotate or copy production secrets to bypass unavailable access.
4. Inspect the private job history and queue summary: cycle claim, feed observations, selected event, editorial decision and publication outcome. Respect an active lease, pause or exhausted daily budget.
5. If published, verify the recorded public URL returns 200 and contains that specific article. A successful HTTP request to the scheduler alone does not establish publication.

If schedule deployment fails, diagnose the deployment before changing the production trigger. To revert the declaration, restore the previous daily `crons` entry in the same reviewed change that removes `schedules`; never activate both.

## References

- https://vercel.com/docs/schedules/migrate-from-cron-jobs
- https://vercel.com/docs/schedules/handle-runs

The 15–30 minute target remains a separate rollout requiring a reviewed budget and verification.
