# Research and security review — November 26, 2026

## Publication blocker

The supplied administrator screenshot demonstrates a completed scheduled cycle with one editorial hold, 38 queued events, zero publications and no failed events. It does not identify the exact source responses for that held article. Missing fresh primary evidence is a confirmed recorded reason; the findings below are reproduced code defects, not proof that any single one caused that particular hold.

Research previously appended official evidence after up to three reporter pages, then retained only the first three entries. This could remove all official evidence. It now prioritizes primary entries before truncation. Existing permitted official links can be relative or protocol-relative and are resolved against the fetched page, with HTTPS, credential, port and hostname restrictions still applied at every redirect. Typed Article/NewsArticle structured text can supplement article/main extraction; only matching article data can supply the original publication date. Navigation, generic website JSON, snippets and recommendation timestamps are not evidence.

The scheduled queue examines at most three candidate events. A candidate without verified primary evidence is held before claiming an AI job or reserving its model budget. One candidate with evidence proceeds using the retrieved research, avoiding a second research fetch. At most one generation job runs per cycle; the daily limit and schedule are unchanged. Manual draft runs keep their existing workflow. Unsupported, sensitive or contradictory claims still require HOLD. No new source provider, domain permission or paid service is introduced.

These fixes do not ensure that ESPN reports contain accessible, recent, permitted primary sources. A held event remains held; this change does not republish old stories or retry them automatically. Provider permission review and production evidence are still required.

## Security changes and limits

- Login now enforces an independent global distributed ceiling as well as the existing IP-based limit. Rotating a spoofed forwarding header cannot bypass the global ceiling. This is a safeguard, not proof that every forwarded header is trustworthy. The global cap can also temporarily throttle legitimate logins during abuse.
- Login and administrative article requests enforce byte limits while streaming instead of buffering the entire request before checking size. Login permits 4 KiB JSON; article writes permit 64 KiB. Existing valid inputs fit the limits.
- CSP now explicitly restricts base URI, objects, framing and form destinations. Existing script/style allowances remain; this is not a complete nonce-based CSP migration.
- Existing private routes continue to authenticate server-side. Existing Supabase migrations restrict private queue/publication RPCs to service role; database regression checks cover the established permission boundaries. No new database view or privilege is added.
- Production dependency audit reported zero known advisories at review time. This does not establish absence of application vulnerabilities.

## Applicability of the supplied checklist

GraphQL alias abuse, SAML bypass, OAuth email binding, two-factor replay, application JWT algorithm confusion, padding oracles, XML external entities, WebSocket hijacking and username-specific edge cases have no corresponding implemented subsystem in the inspected app. This is an applicability finding, not a guarantee about future integrations.

HTTP/2 reset floods, request smuggling, CDN cache behavior and infrastructure denial of service require platform review and authorized infrastructure testing. No load test, exploitation, external penetration test, firewall purchase or platform configuration change was performed. Prototype pollution, template injection, Unicode identity confusion and regex abuse require continued review of concrete input paths; JSON is parsed as data, article fields are validated and React renders ordinary article text with escaping. No blanket compliance or pentest certification is claimed.

## Release status

Prepared locally for review. Production deployment and a real evidence-to-publication cycle must be verified separately. No credentials, budget, cadence, article records or branding changed during this review.
