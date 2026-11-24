import { agentReadiness } from './agentJobs';
import { supabaseAdmin } from './supabase';
import { reconcilePendingPublication } from './autoPublisher';
import { runEditorialCycle } from './editorialCycle';

/** Runs the real editorial workflow, then checks durable operational state.
 * Does not elevate budgets, override editorial holds or depend on an open panel.
 */
export async function runAdminCycle(allowUnscheduledTest = false) {
  if (process.env.PAUSE_PUBLISHING === 'true') return {published:0,held:0,failed:0,paused:true,error:null};
  const readiness = agentReadiness();
  if (!readiness.ready || (!allowUnscheduledTest && !readiness.scheduled) || process.env.VERCEL_ENV !== 'production') {
    throw new Error('ADMIN_CYCLE_NOT_READY');
  }
  const db = supabaseAdmin();
  if (!db) throw new Error('ADMIN_CYCLE_STORAGE_UNAVAILABLE');
  // Fail closed before any generation if the durable queue is unavailable.
  const before = await db.rpc('editorial_queue_status');
  if (before.error || !before.data) throw new Error('ADMIN_QUEUE_UNAVAILABLE');
  const reconciliation = await reconcilePendingPublication();
  const result = await runEditorialCycle();
  const after = await db.rpc('editorial_queue_status');
  const admin = {
    checkedAt: new Date().toISOString(),
    status: after.error || !after.data || result.error ? 'attention' : 'checked',
    queueAvailable: !after.error && !!after.data,
    reconciliationState: reconciliation?.state || null,
    // A checked cycle may publish nothing. Never turn a hold into approval.
    cycleError: result.error || null,
    queue: after.error ? null : after.data,
  };
  console.info('[admin-cycle]', JSON.stringify({status:admin.status,published:result.published,held:result.held,failed:result.failed,cycleError:admin.cycleError,queueAvailable:admin.queueAvailable}));
  return {...result,admin,error:result.error || (admin.status==='attention'?'ADMIN_POSTCHECK_FAILED':null)};
}
