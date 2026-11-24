# Admin Agent

The Admin Agent is a rules-based final approval gate and private operational snapshot, integrated with the existing agent stack. It reuses the Senior Editor's AI assessment rather than adding an extra model call or new provider.

## Editorial authority

New crew runs pass the final Senior Editor verdict, article and research to `reviewForPublication`. The Admin Agent calls the existing publication policy, records its decision, timestamp and reviewer identity in `context.adminReview`, and copies that decision to the existing `context.automation` contract. Existing job persistence stores the context; no database migration is needed. The database publisher independently checks the evidence and decision again.

Only fresh primary evidence, explicit Senior Editor approval, supported claims and eligible Tier 1/2 content can pass. Missing evidence, unresolved conflicts, sensitive allegations and high risk remain on hold. The Admin Agent does not rewrite drafts, override a hold, approve historical articles in bulk, delete publications or change credentials, models, budgets or schedules. No additional AI tokens are consumed by this rules module.

## Operations

The authenticated job-history endpoint returns a rules-based snapshot of configuration, pause, storage/queue availability and the newest job in its existing history query. The panel shows the snapshot time and reasons requiring attention. It refreshes on panel load and the existing Refresh status action; it is not a continuously running independent worker, a full uptime monitor or proof that the scheduler delivered a run. Existing bounded retries, leases, queue recovery and publication verification remain responsible for recovery.

Existing job records without `adminReview` remain readable and do not acquire invented approval history. The panel displays Admin decisions only where the stored review exists. Public article design and administration authentication are unchanged.

## Verification

Application tests exercise eligible approval, missing evidence, unapproved reviews, sensitive allegations and operational attention states. Typecheck and build verify integration. An actual new production run must still be inspected to verify persisted Admin review, database publication decision and the public URL together.
