# KEYAM SPORTS — publishing roadmap

Updated: 2026-11-22. Target: run discovery and editorial processing every 15–30 minutes and automatically publish new, sufficiently verified Tier 1/2 stories approved by the Senior Editor. A processing interval is not a publishing quota. Preserve existing branding, typography, colors and public layout.

This is a plan, not certification of current production behavior. The last verified schedule was one run daily at 12:00 UTC; inspect live configuration and recent job/publication audits before claiming another frequency or successful operation. At the start of the November 22 review, production was `96a4202` and the primary-publication-date guard `2761794` was pending. See [the operations review](OPERATIONS_REVIEW_2026-11-22.md) for release evidence and remaining limitations. Updating this roadmap does not authorize deployment of that change, new integrations, purchases or configuration changes.

## Controlled phases

| Phase | Work | Exit evidence |
|---|---|---|
| 1. Verify the current flow | Inspect real scheduled jobs, publication/hold/failure records and public URLs. Resolve the pending source-date restriction through the authorized release process. | A real complete research → writing → Senior Editor → publication → HTTP 200 flow; preserve existing articles and distinguish fixture tests from production evidence. |
| 2. Review trust, privacy and rights | Complete the applicability checklist below; inventory real data collection, scripts, providers, source terms and editorial claims. Draft accurate policies and resolve applicable launch blockers. | Recorded findings and verified fixes; policy text matches actual behavior, consent choices work and content/media permissions are documented. |
| 3. Broaden discovery and verification | Evaluate official feeds/RSS and permitted news/sports-data APIs; document freshness, coverage, access restrictions, commercial permissions, rate limits and recurring cost. | Sufficient independent/primary evidence for useful coverage without relying only on ESPN snippets. Do not activate a paid provider without its concrete price and authorization. |
| 4. Strengthen the event queue | Persist discovered events/cursors, group duplicate reports, distinguish updates, provide durable retries and retain conflicting or sensitive stories automatically with reasons. | No lost queued events or repeat publication in concurrency/recovery tests; existing publications are preserved. |
| 5. Operate at 30 minutes | Check Vercel plan/scheduler capability, worker duration, provider limits, costs and monitoring; reserve global daily budgets before work. | Controlled end-to-end trial, no unbounded spend, functioning pause/recovery and verification of an actual scheduled run. Phase 2 applicable blockers must be closed before increasing public publishing volume. |
| 6. Consider 15 minutes | Increase frequency only after measured 30-minute operation shows adequate fresh evidence and reliable execution within budget. | Recorded reliability, content quality and real provider usage/costs. No filler or duplicate story to meet an interval. |

Read-only research and provider comparisons can proceed while phase 2 is being reviewed. Expanding public collection/tracking, activating providers or increasing publication volume must account for the relevant unresolved findings.

## Privacy, legal, editorial and accessibility checklist

Initial status for every item below: **not yet audited to completion**. Existing `/privacy` and `/terms` pages are starting points, not evidence that the requirements are satisfied. Determine applicable obligations from actual services, operator location and intended audience; obtain qualified legal review where necessary. A checklist does not guarantee that a site cannot be sued.

| # | Topic | KEYAM SPORTS action and acceptance evidence |
|---|---|---|
| 1 | Privacy policy | Inventory reader/admin data, cookies/localStorage, providers, purposes, retention, sharing/transfers and request channels. Verify the published policy matches deployed behavior. |
| 2 | Terms of service | Describe the actual service, responsible operator, content use and applicable service conditions; keep truthful contact details and policy version/date. Do not invent business facts. |
| 3 | Refund policy | Applicable if paid memberships/products are introduced. Document actual cancellation/refund conditions before charging; do not create a fictitious refund flow for a free news site. |
| 4 | Cookie/storage policy | List actual cookies, browser storage and similar technologies, including favorites, admin sessions, advertising and analytics when enabled. State purposes and durations accurately. |
| 5 | Cookie consent | Assess the actual tracker types and applicable rules. Where prior consent is required, prevent nonessential tracking before consent; make rejection and withdrawal work. Do not add a decorative banner that leaves trackers active. |
| 6 | Form consents | Review actual contact/newsletter/account/payment forms, notices and purposes. Use separate, non-preselected marketing consent where required; collect only necessary evidence. |
| 7 | Data minimization | Remove unnecessary fields and telemetry; establish retention/deletion for applicable reader/admin data and logs. Avoid collecting dates of birth or other sensitive data without a real need. |
| 8 | Third-party SDKs | Inventory deployed analytics, ads, embeds, APIs and dependencies; identify what data they receive and when they load. Check applicable terms, security and processor arrangements. |
| 9 | Dark patterns | Review consent, account, newsletter and future payment flows for misleading buttons, forced choices, obscured withdrawal or deceptive urgency. |
| 10 | Hidden fees | Conditional on monetization: disclose actual prices, renewals and cancellation terms before purchase. No invented fees, checkout or subscriptions. |
| 11 | Fake reviews | Inspect public copy for fabricated testimonials, endorsements, popularity or audience metrics. Remove unsupported material if present. |
| 12 | Unsupported claims | Review headlines, sports facts, allegations and marketing statements. Explain AI assistance, automated review and limitations accurately; provide editorial corrections and complaints procedures. AI approval alone is not independent proof. |
| 13 | Image alt text | Review meaningful images for accurate alt text and decorative images for appropriate empty alternatives; never describe generic imagery as a specific event. |
| 14 | Color contrast | Measure contrast for text, controls, focus and error states. Improve where necessary within existing branding; do not redesign the site. |
| 15 | Keyboard access | Test navigation, search/filter controls, dialogs, forms and admin actions for focus visibility/order, labels, keyboard operation and usable errors. |
| 16 | Business/operator details | Obtain and publish the real responsible identity and an effective contact channel as appropriate. Do not invent an address, entity or staffed support inbox. |
| 17 | Children's data | Determine whether the service is directed at children or knowingly collects their data. Implement applicable protections if relevant; avoid blanket age/date-of-birth collection without need. |
| 18 | Email unsubscribe | Applicable when sending newsletters/marketing: working unsubscribe, correct sender identity and consent/withdrawal handling. Transactional notices and marketing need distinct treatment. |
| 19 | Content/font/media licenses | Record provider permission for intended commercial API/feed use and each font/image/video asset's license, attribution and restrictions. Distinguish facts from protected expression; source citation alone does not license copying articles or media. |
| 20 | Deletion requests | Provide a functioning request channel, appropriate identity verification, responsible owner, applicable response timing and deletion/anonymization process across relevant systems. Explain legitimate retention exceptions accurately. |

## Completion record and publishing gate

For each finding record applicability, observed behavior, affected route/provider, priority, proposed fix, owner, verification and completion date. Mark conditional items as not applicable with a concrete reason; do not mark them complete by adding unused policies.

Before expanding to 30/15-minute processing or enabling new tracking/monetization:

- Close applicable critical privacy/consent, rights, security and misleading-content findings.
- Verify source/media rights and attribution against the intended use and provider terms.
- Verify correction/reporting and relevant privacy request channels actually work.
- Complete keyboard/mobile/accessibility checks for changed components while preserving design.
- Record remaining limitations, real costs and production verification. Do not claim guaranteed legal compliance, search rankings or guaranteed publication every interval.

No website, provider, credential, scheduler or production change is made by this document.
