import { superviseOperations } from '../../../../agents/AdminAgent';
import { isAdmin, isTrustedOrigin } from "../../../../lib/adminAuth";
import { agentReadiness, runDraftJob } from "../../../../lib/agentJobs";
import { supabaseAdmin } from "../../../../lib/supabase";
export const dynamic = "force-dynamic";
export const maxDuration = 240;
function denied(req: Request) {
  return !isAdmin(req) || !isTrustedOrigin(req)
    ? Response.json({ error: "Admin authentication required." }, { status: 401 }) : null;
}
const headers = { "Cache-Control": "no-store" };
export async function GET(req: Request) {
  const rejection = denied(req); if (rejection) return rejection;
  const readiness = agentReadiness();
  const db = supabaseAdmin();
  if (!db) return Response.json({ readiness, jobs: [], storageReady: false }, { headers });
  const history = db.from("agent_jobs")
    .select("id,job_key,state,attempts,article_id,error_code,input_tokens,output_tokens,usage_incomplete,created_at,updated_at,lease_until,context,agent_publications(state,risk_tier,reasons,public_url,verified_at)")
    .order("updated_at", { ascending: false }).limit(20);
  const [{data,error},queue] = await Promise.all([history,db.rpc("editorial_queue_status")]);
  if (error) console.error("[agent-jobs] Private history unavailable");
  const admin = superviseOperations({ready:readiness.ready,storageReady:!error,queueReady:!queue.error,paused:process.env.PAUSE_PUBLISHING==='true',scheduled:readiness.scheduled,jobs:data || []});
  return Response.json({ readiness, admin, queueReady:!queue.error, queue:queue.error?null:queue.data, jobs: (data || []).map(job => ({ ...job, context: job.context ? {
    adminReview: job.context.adminReview, seniorEditorVerdict: job.context.seniorEditorVerdict, seniorEditorNotes: job.context.seniorEditorNotes,
  } : null })), storageReady: !error }, { headers });
}
export async function POST(req: Request) {
  const rejection = denied(req); if (rejection) return rejection;
  const key = req.headers.get("idempotency-key");
  if (!key || !/^[a-zA-Z0-9:_-]{1,100}$/.test(key)) return Response.json({ error: "A valid Idempotency-Key is required." }, { status: 400 });
  if (!agentReadiness().ready) return Response.json({ error: "Agent setup incomplete.", readiness: agentReadiness() }, { status: 503, headers });
  try {
    const result = await runDraftJob(key);
    return Response.json(result, { status: result.limited ? 429 : 200, headers });
  } catch {
    console.error("[agent-jobs] Draft request failed");
    return Response.json({ error: "Draft run failed. Review job history; consult the private publication audit." }, { status: 503, headers });
  }
}
