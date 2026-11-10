# KEYAM SPORTS repository audit

Audited 2026-11-10, baseline commit `0930bc0`. Scope: every tracked source/configuration file, schema, dependency manifest and public asset. This is a source audit, not verification of production configuration, existing story accuracy, API commercial permissions, or analytics. No production credentials were supplied. Findings below describe the baseline; see STABILITY_CHANGELOG.md for fixes and validation.

## 1. Current architecture

Next.js App Router, TypeScript, React, Tailwind, Vercel-compatible route handlers. Contrary to the brief's Next 14.2 baseline, package.json and lockfile declare Next ^16.4.5 / React ^19.3.0. Preserve this baseline pending dependency verification; no framework migration is authorized or needed for the initial fixes.

- Public pages: home, basketball, football, baseball, soccer, odds, about, contact, privacy, terms. Existing red/lime palette, Oswald display font, header, ticker, cards, favorites/search and ad/sidebar layout must remain.
- Home: client-rendered feed fetched from /api/articles. League pages: server components calling getPublishedArticles, without explicit refresh policy.
- Content: Supabase Postgres articles table with published-only public RLS; service-role CRUD behind admin password cookie. Bundled sample.json is used when configuration is absent or database reads fail.
- Administration: /admin client login/create/status/delete/seed UI; /agents public client SSE console. Hiding menu links does not secure routes.
- Data: route handlers for scores, odds, injuries, media. Per-instance caches in media/odds/injuries; Upstash optional for per-IP rate limits.
- AI: four parallel Scouts -> Senior Editor selection -> Writer/Stats -> Editor -> Senior Editor review. Results streamed to browser, stored only in localStorage. MainAgent.ts is a separate self-executing filesystem script.
- public/logo.png is a 1×1 asset; the visible header branding is text. Preserve both; obtain the original high-resolution logo before any asset replacement.
- No checked-in cron configuration, queue, persistent agent-run history, automated tests, CI workflow, usage ledger, or monitoring integration.

## 2. Existing functionality worth preserving

Four league pages reuse NewsCard; home favorites and keyword filtering use localStorage; public article API and Supabase CRUD/RLS are implemented; source domain links appear on cards; contact/legal pages and mobile wrapping navigation exist. Odds and stock media return empty data when keys are absent. Headline discovery and injury feeds have timeouts. Agent console streams progress and retains browser-local history. These are code paths present in source, not proof that production credentials or upstream services work.

## 3. Broken or incomplete features, prioritized

**P0 trust/cost/security**

- /api/agents, /api/run-agent and /api/injury-report can spend API credits without authorization. Per-IP limits are not global budgets; Redis failures fall open to memory.
- /api/run-agent and MainAgent ask the model for current news without sources. Scout falls back to model memory when feeds fail. Stats demands a number even when none is sourced.
- Senior Editor approves demo output, malformed verdicts and review exceptions. A model comparing its own generated findings is not independent verification.
- Scores include invented demo games on failure and mark historical NBA results live. eventslast.php expects a team, not the NBA league ID used in the code. Missing scores become zero.
- sample.json contains apparent illustrative cards without sources and sensitive allegations. Bundled records have no editorial approval provenance; do not automatically import or publish them as verified reporting. Existing claims require human verification.
- Admin shared password hash is a reusable seven-day bearer cookie; no expiry validation on the server or login throttling. Article updates accept arbitrary fields. Seed is repeatable and inserts samples directly as published.

**P1 content/reliability**

- No /news/[slug] route, article body, stable URL or card-to-article link. Article storage only has summary/date/draft-or-published, with no revisions, licensing, fact records or full workflow.
- League pages can be prerendered without a revalidation policy; homepage HTML contains loading state instead of headlines.
- Duplicate prevention is prompt-based and reads bundled samples instead of persisted publications. No atomic job idempotency or durable retries.
- Scores have no cache/dedup/last-updated contract. Other caches are per-process, so serverless restarts can exceed advertised call budgets. Injury failures can look like no injuries.
- /admin UI does not edit existing articles or show source/license/review records. Failed status/delete requests are not checked by the UI.
- Media only searches Pixabay; no per-asset license record, durable storage or article assignment. No YouTube/Commons/Unsplash/Pexels adapters.
- Breaking ticker promotes browser-local generated drafts as breaking news; different visitors see different content.
- AdSense script/frames/connections are blocked by the current CSP. Public env slot names use dynamic lookup, which Next does not reliably inline.

## 4. AI status

A modular **draft generator exists**, not an autonomous verified newsroom. Scouts receive ESPN headline/description snippets, not researched source documents. No confidence score, evidence-backed trend scoring, contradiction detection, deterministic sensitive-story gate, media/SEO agent or persistent workflow exists. Current model defaults must be checked against the operator's actual OpenAI API model access; ChatGPT model availability does not establish API access. An APPROVED LLM verdict must never by itself authorize publication. Keep all generation private and human reviewed until the research, rights and publication gates exist.

## 5. API/provider opportunities and rights review

| Provider | Evaluation / next step |
|---|---|
| TheSportsDB | Existing integration. Use server-only configured key, documented endpoints and correct league/team IDs; separate live/results/schedules capabilities. API access is not a blanket license for hosted third-party photos/logos. Review https://www.thesportsdb.com/docs_terms_of_use.php and https://www.thesportsdb.com/docs_pricing.php before enabling commercial use. |
| MLB Stats API | Candidate for schedules/results/stats. Public accessibility alone does not establish commercial redistribution permission or an SLA. Confirm MLB terms before adding. |
| NBA/NFL/soccer providers | Obtain coverage, refresh intervals, commercial permissions, rate limits and price from a licensed provider. Do not scrape unofficial endpoints as a production reliability commitment. |
| ESPN | Existing public headline/injury endpoints are undocumented integrations without a verified commercial agreement. Treat as discovery inputs only pending permission/terms review, not licensed republication feeds. |
| Wikimedia Commons | Best first photo adapter: query individual file metadata, author, license/version/URL, attribution, modifications and subject suitability. Reject unknown/incompatible rights. |
| Unsplash/Pexels/Pixabay | Generic context only unless actual subject/event is verified. Implement each provider's display, attribution, download/hotlink/cache requirements. Existing Pixabay cache does not implement durable downloads. |
| YouTube | Official channel allowlist; verify embeddable/public status and relevance. Store channel/video IDs and checked time. No downloading/rehosting. |
| The Odds API | Existing integration; review plan credits and display terms. Distributed caching required before relying on monthly limits. |

No new paid provider should be activated without price/terms approval. Provider reliability still needs a staging probe and monitoring.

## 6. Technical SEO/performance/accessibility

No article URLs, article metadata or NewsArticle schema. Home content requires JS. Shared generic metadata, missing page canonicals and league titles. Sitemap omits football/contact/odds, includes /agents and invents lastModified on every request. robots allows admin/API/agents. No Search Console verification, GA4, news sitemap, editorial author pages, large-image preview directive or image rights pipeline. The configured default canonical host must be checked against the real production domain. next/font downloads introduce a build network dependency. No measured CWV evidence yet; do not claim speed/Discover improvements without field data. Search input lacks accessible label, preferences can throw on blocked storage, ticker/card animations lack reduced-motion handling. Current cards contain no photos, so do not replace them with unrelated stock imagery just to increase image coverage.

## 7. Recommended database and automation architecture

**Retain Supabase Postgres**, already integrated; do not introduce a second database. Extend with additive migrations: article slug/body/language (default current language), author and published/updated timestamps; article revisions; source documents/facts/contradictions; media assets with rights metadata; reviews; topics; teams/leagues/players/games; agent runs; jobs; usage ledger; daily analytics summaries. Explicit foreign keys, unique slug/topic fingerprints and published-only RLS. Keep admin/service-role secrets server-only. Use Supabase Auth with editor/admin roles, MFA and expiring sessions for the mature admin system.

Use a Vercel authenticated cron to enqueue work, not run an unbounded multi-agent chain in a single request. Durable Postgres jobs claim with row locks/leases, unique idempotency key, bounded attempts/backoff, retry_at, heartbeat, error summaries and dead-letter state. Worker selection should fit measured job duration (bounded Vercel invocations initially; external worker only if needed). Reserve token/API budgets atomically before work. Daily limits are ceilings, not quotas. Disable scheduling by default until tested.

Workflow: discovered -> researching -> draft -> needs_review -> approved -> published; rejected and update_required supported. Verified facts and licensed media are stored before drafting. Sensitive allegations, rumors, contradictions, stale evidence, missing rights and failed reviews always require human review. Publishing is a transaction that checks approval/version, uniqueness and budget, then triggers cache invalidation/feed refresh. Updates retain revision and review history. Separate human approval from LLM suggestions.

## 8. Incremental roadmap and files

| Phase | Priority / deliverable | Specific files |
|---|---|---|
| A | Audit, reproducible install/build, provider/config inventory | docs/REPOSITORY_AUDIT.md, package.json, package-lock.json, README.md, .env.example |
| B | Authorize AI, fail closed, remove fake scores, validate admin writes, render content on server, crawl rules | lib/adminAuth.ts, lib/rateLimit.ts, app/api/{agents,run-agent,injury-report}/route.ts, agents/{ScoutAgent,StatsAgent,WriterAgent,SeniorEditorAgent,AgentRunner,MainAgent,llm}.ts, app/api/admin/{login,articles,seed}/route.ts, lib/articles.ts, app/page.tsx, components/{HomeFeed,LiveScoresWidget,BreakingTicker,FavoritesBar}.tsx, app/{robots,sitemap,layout}.tsx/ts, next.config.js |
| C | Unified provider DTOs, capabilities, validation, Redis cache, retry/rate handling, freshness | lib/sports/*, app/api/live-scores/route.ts, lib/{injuries,odds}.ts, components/LiveScoresWidget.tsx |
| D | Fact/evidence schemas, weighted trends, grounded drafts, media/SEO/QC modules | agents/*, lib/headlines.ts, lib/recentCoverage.ts, lib/media/*, lib/editorial/* |
| E | Additive migrations, durable jobs, review transitions, deduplication, full article pages and feeds | supabase/migrations/*, lib/articles.ts, lib/jobs/*, app/news/[slug]/page.tsx, app/api/cron/*, vercel.json, components/NewsCard.tsx, app/sitemap.ts |
| F | Canonicals/schema/news sitemap, licensed images, GA4/GSC, internal entity links, reporting | app/layout.tsx, app/news/[slug]/page.tsx, app/news-sitemap.xml/route.ts, lib/analytics/*, components/Analytics.tsx |
| G | Role-based administration, review/edit/revisions, run/cost/traffic dashboards | app/admin/*, app/agents/*, app/api/admin/*, lib/adminAuth.ts |

Do not rush schema-dependent article pages by inventing full bodies or publication timestamps from old summaries. Build each phase against fixtures, then staging credentials. No production deployment or destructive SQL without approval.

## 9. Monthly operating-cost planning (USD)

Prices checked against official pricing pages on audit date; estimates are planning allowances, not quotes, purchased services or measured usage. Early commercial launch, one editor, low traffic:

| Item | Monthly allowance / basis |
|---|---|
| Vercel | $20 base Pro planning figure; seats, compute and transfer overages extra. Hobby eligibility is limited; confirm commercial plan requirements. https://vercel.com/pricing |
| Supabase | $0 prototype; $25 Pro baseline for production planning, compute/storage/egress extras possible. https://supabase.com/pricing |
| Redis/queue | $0-10 early allowance, subject to actual commands/storage and current Upstash plan. |
| AI | $5-30 initial **budget cap**, not predicted bill. Calculate actual input/output tokens × chosen model prices; include all scouts, review, retries and rejected drafts. Verify API model IDs and https://openai.com/api/pricing/ before activation. |
| Sports/media licenses | $0 while disabled; licensed real-time/photography feeds require provider-specific quotes. Free APIs are only usable where terms permit. |
| Analytics/monitoring | $0-10 allowance using GA4/GSC and limited error retention; privacy/consent configuration required. |

Production planning subtotal: **$50-95/month before paid sports/media rights, overages, taxes, domains and human editorial work**. Free development can remain near $0 with generation off. This is not a quote for reliable live data or licensed event photography. No new paid dependency is required for Phase B.

## 10. Growth and analytics plan

First establish GA4 consent/configuration, GSC domain verification and real acquisition baseline. Track article_view with stable article/league/language identifiers (no PII); organic sessions, returning readers, engagement and referral sources from GA4; query/page impressions, clicks and CTR from GSC. Import aggregated data into private daily summaries; do not expose admin metrics publicly. No data means no traffic claims or fabricated trend interest.

Prioritize verified league/team news around actual schedules, sourced game previews/recaps, original analysis and evergreen explainers. Use real query gaps and reader engagement to adjust the starting trend weights (30/25/20/15/10). Missing audience-interest evidence is unknown, never invented volume. Add useful internal links between real articles/entities. Prepare language field and translation relationships for English/Spanish; keep current language until an editorial decision. Discover readiness requires original trustworthy reporting and suitable licensed large images, not guaranteed placement.
