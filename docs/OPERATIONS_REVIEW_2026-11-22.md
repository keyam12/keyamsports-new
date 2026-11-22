# Operations, sources and publishing readiness — 2026-11-22

## What was actually observed

Production: https://keyamsports-new.vercel.app. Read-only GET `/api/articles` returned HTTP 200 and **14 published articles**. The most recent public article date was **2026-11-13**; the other publication dates include November 8, 7, 6, 5 and 2. No newer public article was observed. This does not distinguish held stories, failed jobs or missed scheduler executions.

All four existing ESPN discovery endpoints returned HTTP 200 and six items in one probe each. Latest timestamps observed: NBA 2026-11-22T17:52:36Z; NFL 2026-11-22T19:29:44Z; MLB 2026-11-21T19:54:54Z; Soccer 2026-11-22T19:12:07Z. Upstream availability is therefore not evidence of complete editorial/publication success.

Vercel's seven-day error-cluster query returned no clusters. Its seven-day runtime-log query failed because this Hobby project retains only one hour; a corrected 30-minute query returned no entries. Neither establishes that daily jobs ran. Current machine has no ready Supabase credential binding or Supabase management connector; private job history cannot be read with the available unauthenticated public API. No production secrets were retrieved, passwords requested or credentials rotated to bypass this boundary.

The existing `vercel.json` still declares `0 12 * * *`. No hosting plan, credential, schedule or generation-budget variable was changed. No new story or paid-model request was submitted during this work.

## Implemented in the new batch; distinguish from deployment

- Includes the previously prepared primary-publication-date guard (`2761794`): old/undated primary pages cannot pass as fresh evidence.
- Durable PostgreSQL discovery events, canonical URL identities, same-sport/day normalized-title grouping, source revisions and per-feed successful-poll cursors. A failed ingestion transaction cannot advance a cursor. Later feed items are re-read and deduplicated rather than discarded solely because they arrive behind a watermark.
- Global leased editorial cycles and fenced event leases; at most three processing attempts with 15/30-minute failure backoff. A budget deferral preserves the event without spending an attempt. Hard platform interruption can be recovered after lease expiry.
- One event processed per cycle; the existing daily model cap still applies. Stable `event:<uuid>` jobs resume saved work instead of generating another copy after interrupted bookkeeping. Verified publication status is required before a queue item can be marked published.
- The private admin panel/diagnostics expose queue counts, feed cursors, latest cycle outcome and alerts. Future cycle summaries are stored in PostgreSQL, not dependent only on short hosting-log retention.
- Existing manual controls and public design retained. Public policy/about/contact copy corrected to describe automated review, browser storage and actual service providers; unsupported continuous-update and guaranteed-human-review claims removed.
- New providers were evaluated and registered **disabled**, not silently activated. MLB primary-page retrieval was removed from the active research allowlist pending permission because the terms found restrict automated collection.
- The existing Oswald font's official SIL OFL license is stored at `public/licenses/oswald-OFL.txt` from https://raw.githubusercontent.com/google/fonts/main/ofl/oswald/OFL.txt.

Exact-title grouping is not semantic event clustering. A source correction is retained as a revision; it does not automatically rewrite a published story. Feed responses are limited upstream; the system cannot guarantee recovery of items no longer available in a source feed. Old drafts without new verification evidence are not retroactively published.

## Scheduler findings: old Cron Jobs versus new Schedules

Verified official sources:
- https://vercel.com/docs/schedules/cron-jobs/usage-and-pricing
- https://vercel.com/docs/schedules/limits
- https://vercel.com/changelog/vercel-schedules-is-now-in-public-beta
- https://vercel.com/pricing

Legacy Cron Jobs on Hobby permit a daily invocation with a per-hour timing window. Replacing the existing cron expression with `*/30 * * * *` on that product would fail deployment.

**Vercel Schedules**, launched in public beta on November 5, 2026, is a distinct current option: Hobby supports a minimum 15-minute interval, a fixed 15-minute jitter window and 5,000 runs per billing period. One 30-minute schedule would be 1,440 runs in a 30-day month; a 15-minute schedule would be 2,880. These are cadence calculations, not traffic or publication forecasts. Counts include other project/team schedule usage and manual runs. Beta limits can change, function usage remains subject to plan limits, and Hobby's commercial-use eligibility must still be checked for this business.

Therefore it is incorrect to say that Pro is the only technical route to a 15/30-minute prototype. It is also incorrect to claim that frequent schedules are already enabled here. A real Schedules migration needs the current SDK/private-function trigger, authenticated dispatch tests, account eligibility and budget decisions. No example configuration was applied. The queue uses 30-minute UTC slot identities and can also derive 15-minute keys, without changing the actual hosting trigger.

Vercel Pro lists a USD 20/month base planning figure, subject to current account/seat/usage/tax details. No upgrade or trial was started. Do not evade legacy cron restrictions by multiplying daily crons.

## Source comparison — actual prices, no purchase

| Source | Observed terms/coverage | Cost/status |
|---|---|---|
| Existing ESPN public endpoints | Four news discovery feeds are operational. Undocumented access and attribution do not establish commercial redistribution permission or a reliability agreement. | Existing integration retained; terms review remains open. No expanded polling activated. |
| MLB official RSS/pages | RSS is discoverable, but MLB terms restrict automated scripts collecting from its digital properties. Availability is not permission. | Disabled/pending permission. No paid license or RSS activation. |
| GNews Essential | Commercial API plan; real-time data, full content, 1,000 requests/day, up to 25 articles/request. API access still does not grant blanket rights to reproduce publishers' expression/media. | **EUR 49.99/month**, billed monthly. Free tier is non-commercial, delayed and truncated. No trial started. |
| NewsAPI Business | Production/commercial plan; 250,000 requests/month. The provider explicitly does not supply full article content. Free Developer is development-only, not staging or production. | **USD 449/month**, billed monthly; not recommended as the early default solely for headline discovery. No subscription started. |

Sources: https://gnews.io/pricing, https://gnews.io/faq, https://newsapi.org/pricing, https://newsapi.org/terms, https://www.mlb.com/official-information/terms-of-use. Prices/currencies are as displayed on review date, not quotes including tax. Choose coverage, rights and a concrete budget before connecting a new provider/key. Do not copy paid news articles or rehost images/video merely because an API exposes them.

## AI cost scenarios, not a new budget

The recorded first real test on November 13 used 5,866 input and 838 output tokens on GPT-6 Luna. Using the then-verified standard USD 0.10/M input and USD 0.50/M output rates gives about USD 0.001006 for that sample; this is not an invoice and not a reliable average for all future stories.

If that same sample cost were repeated 1,440 times, the arithmetic is about USD 1.45/month. Actual research, revisions, failures and prompt lengths differ. The current ten-call, 16,000-byte prompt, 2,000-byte system and 1,800-output-token ceilings permit much higher per-run usage; reserve a materially larger cap and verify provider spending controls before increasing the daily generation limit. No AI budget variable was increased. Hosting, database, API rights and tax are separate.

## Deployment/release checks

Before releasing this batch: application tests, real SQL migration tests in local PGlite, production build and desktop/mobile browser checks. Then confirm the new Supabase migration result, live public article preservation, private history and the next actual scheduled cycle. Do not mark the private-history investigation or real automatic-publication test complete using fixture tests alone.
