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
  const { data, error } = await db.from("agent_jobs")
    .select("id,job_key,state,attempts,article_id,error_code,input_tokens,output_tokens,usage_incomplete,created_at,updated_at,lease_until,context")
    .order("updated_at", { ascending: false }).limit(20);
  if (error) console.error("[agent-jobs] Private history unavailable");
  return Response.json({ readiness, jobs: (data || []).map(job => ({ ...job, context: job.context ? {
    seniorEditorVerdict: job.context.seniorEditorVerdict, seniorEditorNotes: job.context.seniorEditorNotes,
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
    return Response.json({ error: "Draft run failed. Review job history; nothing was published." }, { status: 503, headers });
  }
}
