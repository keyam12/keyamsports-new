import { publicationDecision, type EditorialDecision } from '../lib/editorialPolicy';
import type { Research } from './ResearchAgent';
import type { EmitFn } from './types';

export interface AdminReview {
  agent: 'admin';
  mode: 'rules';
  reviewedAt: string;
  seniorEditorVerdict: string;
  decision: EditorialDecision;
}

/** Final administrative gate: enforces the Senior Editor's evidence-based policy.
 * No new model calls, credentials, publication writes or retrospective approvals.
 * The database publisher independently validates the stored evidence again.
 */
export function reviewForPublication(input: {
  topic: string; article: string; verdict: string;
  assessment?: Record<string, unknown>; research?: Research;
}, emit?: EmitFn): AdminReview {
  const decision = publicationDecision(input);
  const review: AdminReview = {
    agent: 'admin', mode: 'rules', reviewedAt: new Date().toISOString(),
    seniorEditorVerdict: input.verdict, decision,
  };
  emit?.({ type: 'agent_log', message: `Admin Agent: ${decision.decision} · Tier ${decision.riskTier}${decision.reasons.length ? ' · '+decision.reasons.join(' ') : ''}` });
  return review;
}

export function superviseOperations(input: {
  ready: boolean; storageReady: boolean; queueReady: boolean; paused: boolean; scheduled: boolean;
  jobs: { state: string; error_code?: string | null }[];
}) {
  const reasons: string[] = [];
  if (input.paused) reasons.push('PUBLICATION_PAUSED');
  if (!input.ready) reasons.push('AGENT_CONFIGURATION_INCOMPLETE');
  if (!input.storageReady) reasons.push('JOB_STORAGE_UNAVAILABLE');
  if (!input.queueReady) reasons.push('QUEUE_STATUS_UNAVAILABLE');
  if (!input.scheduled) reasons.push('SCHEDULE_DISABLED_IN_CONFIGURATION');
  const latest = input.jobs[0];
  if (latest?.state === 'failed' || latest?.error_code) reasons.push('LATEST_JOB_REQUIRES_ATTENTION');
  return {
    agent: 'admin', mode: 'rules', checkedAt: new Date().toISOString(),
    status: reasons.length ? 'attention' : latest ? 'observed' : 'unverified', reasons,
    scope: 'Read-only snapshot of configuration and recent jobs; not proof of scheduler delivery or successful publication.',
  };
}
