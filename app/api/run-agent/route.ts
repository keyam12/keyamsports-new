// Legacy endpoint: sourced drafts are now persisted in the private job store.
import { randomUUID } from "node:crypto";
import { runDraftJob } from "../../../lib/agentJobs";
import { authorizeAgentRun } from "../../../lib/agentAccess";
export const dynamic = "force-dynamic";
export const maxDuration = 240;
export async function GET(req: Request) {
  const denied = await authorizeAgentRun(req, false);
  if (denied) return denied;
  try {
    const result = await runDraftJob(`legacy:${randomUUID()}`);
    return Response.json({ ok: true, text: result.context?.article, status: result.publication?.state || "needs_review", sources: result.context?.sources, job: result.job }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    console.error("[run-agent] Draft generation failed");
    return Response.json({ ok: false, error: "Draft generation failed. Consult the private publication audit." }, { status: 503 });
  }
}
