# Recovery of existing publications

## Cause

The stability increment incorrectly treated all of `data/sample.json` as development samples. That filename actually held both the original six seed cards and thirteen editorial notes published in subsequent commits. Disabling the entire file hid the editorial notes from production when Supabase was unavailable. The file was never deleted.

## Evidence and recovery

Git history identifies the six seed records before `810f498` and the editorial publications in commits `810f498`, `729f949`, `a87c289` and `8014480`. This establishes prior publication provenance; it is not a new independent verification of their news claims.

`data/published.json` now preserves all thirteen previously published notes, including their exact titles, summaries, original dates, AI disclosure and source URLs where supplied. Original public API IDs are retained for compatibility, even though those historic IDs start with `sample-`. The six original illustrative seed cards remain intact in `data/sample.json` for development and are excluded from production publications.

## Read behavior

- Missing Supabase configuration or a read failure: serve existing repository publications in the default `auto` mode.
- Successful database response: use the database result, including an intentionally empty list. Do not merge back articles editors unpublished.
- After a complete database migration, `KEYAM_CONTENT_SOURCE=database` disables the repository fallback even during outages, preventing later unpublishing decisions from being undone by archived content.
- Administrative writes remain authenticated and database-only. No database inserts, source changes, fresh publication dates or new fact-check approvals are fabricated by this repair.

The homepage, league pages, public feed and ticker share this data layer. Scout recent-coverage memory reads the separated publication file rather than the mixed seed file.

## Validation

Regression tests cover exact copy/date/source/ID preservation, seed exclusion, missing database configuration, database failures, successful empty/database-only results and all prior security checks. Production compilation and browser checks are required before publishing this repair.
