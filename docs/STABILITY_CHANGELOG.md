# First stability increment

**Subsequent correction:** repository history established that the mixed sample file also held thirteen editorial publications. The blanket production exclusion was too broad and has been repaired; see [CONTENT_RECOVERY.md](CONTENT_RECOVERY.md). Statements below describe the first increment at the time it was made.

Baseline: `0930bc0`. Local branch: `fix/stability-audit`. No remote push, production deployment, paid subscription, real article publication, database operation or scheduled job was performed.

## Completed

- Audited the tracked repository; documented all ten requested audit areas in REPOSITORY_AUDIT.md.
- Preserved the logo asset, Tailwind palette, Oswald font, public navigation, homepage JSX structure/classes, cards and sidebar layout. Extracted the homepage UI into HomeFeed; server supplies initial articles. League pages explicitly render current published data per request.
- Protected all three token-spending API routes with admin authorization and explicit AI opt-in. Production requires distributed rate limiting. Added shared daily run ceiling, completion-length limit, timeout and bounded SDK retries. Full token/cost accounting remains future work.
- Secured /agents with a server session check. Login is throttled; signed cookies expire after eight hours and reject tampering. Mutations check Origin when provided. Existing cookies require fresh sign-in. Roles/MFA remain future work.
- Replaced legacy unsourced recap generation with the sourced draft pipeline. MainAgent no longer self-executes or writes to ephemeral disk on import.
- Stopped scouting without recent source feeds. Returned citations must match supplied feed URLs. Writer/Stats prompts prohibit unsupported facts/statistics; these safeguards do not independently verify facts.
- Failed/malformed/demo reviews return NEEDS_REVIEW. Every crew result remains needs_review. No pipeline publication is performed; UI messages describe drafts.
- Removed invented score fallbacks, incorrect league-as-team lookup and historical-results-as-live flags. Added typed provider boundary, validation, timeout, per-instance cache/dedup and retrieval timestamps. Unknown scores stay unknown. No old scores replay on failure. The initial configured adapter provides date snapshots; licensed real-time data and shared caching remain future work.
- Removed production fallback/import of unverified samples; preserved archive for opt-in local inspection. Development imports become drafts. Existing production records were not inspected, modified or deleted.
- Validated admin fields, dates, statuses and HTTPS source links; reject arbitrary column updates. Publishing requires complete summary/source URLs. Admin shows summary/source links and failed update/delete responses.
- Public database reads have a timeout, no stale caching and normalized-title deduplication. Semantic deduplication and atomic publication gates remain future work.
- Ticker uses published headlines, not browser-local drafts. Sitemap includes football/contact/odds, excludes private agents and removes invented modification dates. Robots disallows private/API paths; private pages/APIs carry noindex. Added league titles/canonicals, home canonical, max-image-preview:large and optional GSC verification.
- Added accessible search/password labels, favorite pressed state, blocked-storage handling, reduced-motion rules and literal Next public ad-slot lookups.

## Verification

- Locked installation succeeded. No dependency version changes or new dependencies.
- `npm audit --omit=dev --json`: zero reported production dependency vulnerabilities at audit time; this is not proof of absence.
- Production build and TypeScript checks pass. Initial sandbox build failed on font download; managed-network build passed with existing typography.
- `npm test`: **15 passing tests**, covering signed session expiry/tampering, origin checks, article validation, publication requirements, scores parsing/configuration/cache/failure, private AI, disabled AI, failed review, source outage, production sample isolation, fail-closed limiter, login throttling and database outage.
- Fixture-backed Chromium: server-rendered headline/summary; private APIs return 401; /agents redirects; private noindex; honest score failure; sitemap/robots; search/favorites; four league routes/empty states; preserved red palette/Oswald; no horizontal overflow at 390px; no page runtime errors.
- Fixture screenshots: `/tmp/keyam-verification/desktop.png`, `/tmp/keyam-verification/mobile.png`. These are test artifacts, not real news or traffic evidence.

## Configuration required before staging

1. Existing Supabase URL/anon/service-role settings and reviewed published records. No SQL migration is included.
2. Strong ADMIN_PASSWORD and production Upstash credentials. Without Redis, production login/AI fail closed; public reads still work.
3. Explicit AI enablement, verified API model IDs, account spend controls and human editorial review. No paid AI calls validated credentials/model access.
4. Sports-provider key and confirmed commercial permissions. The snapshot adapter makes no live-score guarantee.
5. Actual canonical domain, optional GSC token and account verification.

## Remaining work

Phase C: shared sports cache, documented permissions, real freshness/rate-limit capabilities, schedules/standings/stats and staging provider validation.

Phases D/E: independent research/fact records, evidence-based trend scoring, sensitive/rumor/conflict gates, full persistent publication states/revisions, licensed media discovery, durable/idempotent jobs, retries, usage ledger/budgets and human overrides. No 24/7 cron is enabled.

Phases E/F: article bodies/slugs and /news/[slug] routes, publication/update timestamps, related/entity links, NewsArticle schema, news sitemap/RSS, GA4/GSC imports, consent and measured performance. Cards still show summaries; no body or photo was invented to fill gaps.

Phase G: role-based authentication, existing-article editing, audit history, review/job/cost/traffic dashboards and alerts. Shared-password admin remains transitional.

No search rankings, Discover placement, traffic growth, independent fact accuracy, production uptime or photograph licensing rights have been claimed or verified.
