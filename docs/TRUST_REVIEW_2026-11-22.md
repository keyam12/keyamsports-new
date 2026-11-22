# Trust, privacy, rights and accessibility review — 2026-11-22

This records implemented corrections and unresolved items; it is not legal certification.

## Implemented in the current code batch

- Public about copy now describes automated Senior Editor review and conditional automatic publication, removing an inaccurate human-verification guarantee and the invitation for visitors to use a private agents room.
- Removed unsubstantiated continuous-publishing / "zero guesswork" / "never miss anything" text. The homepage news badge is not represented as live sports scores. Existing layout, wordmark, font and colors are retained.
- Privacy text describes favorites localStorage (`keyam-favorites`), private administrative signed cookies (eight-hour lifetime), technical hosting request data, editorial processing by OpenAI, storage by Supabase and hosting by Vercel. It no longer labels unknown technical data anonymous or suggests that readers submit unrestricted AI prompts.
- Privacy contact directs to the existing Contact page rather than an About page with no contact details. Contact copy avoids claiming every message is read, guaranteeing a response time or promising an unverified media kit.
- Terms remove obsolete production-demo language and avoid asserting blanket copyright over all AI output.
- Oswald SIL OFL text is retained locally from the official Google Fonts repository.
- Existing production variable names contain no GA4/AdSense/AdSlot settings. No analytics, advertising, consent SDK, tracking integration or paid service was enabled by this batch. No decorative consent banner was added as a substitute for actual tracker control.

## Open requirements

| Area | Status / remaining evidence |
|---|---|
| Responsible operator, jurisdiction, audience | Owner-verified legal identity/location, intended markets and age/audience determination remain unavailable. No address or legal entity was invented. |
| Contact and deletion | Existing repository email `keyamsports@outlook.com` was retained. Mailbox ownership/monitoring and request-handling responsibility/timelines must be verified; no email was sent. No automated DSAR/deletion capability is claimed. |
| Retention | Define appropriate article/source/job/security-log retention and justified exceptions. No destructive cleanup or deletion of published articles was introduced. |
| Provider terms | ESPN commercial permission remains unverified. MLB automation restriction found; new retrieval disabled. New APIs and per-asset photography/video rights require explicit intended-use review. No new media used. |
| Consent / ads / analytics | No active configuration observed for those optional integrations. Implement applicable prior-consent/rejection/withdrawal enforcement before activating trackers; verify the deployed SDK/network behavior then. |
| Accessibility | Existing browser checks cover responsive layout, labeled controls and keyboard-facing semantics; they are not a full WCAG audit. Measure contrast and focus/navigation in all relevant states before high-volume launch; preserve branding while resolving defects. |
| Refunds / fees / newsletter / children's data | No new memberships, checkout, marketing email or age-data collection was introduced. Mark applicable obligations only after confirming actual product behavior; do not add fake flows or unnecessary date-of-birth collection. |
| Corrections | Existing email reporting path remains. Operational responsibility and response workflow require verification; automated checks do not guarantee factual correctness. |

Public policies remain subject to these unresolved operational/legal details. Increasing publication frequency is not evidence that this review is complete.
