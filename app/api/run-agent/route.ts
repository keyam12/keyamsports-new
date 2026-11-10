// Legacy endpoint kept, now using the same sourced/private draft pipeline.
import { runCrew } from "../../../agents/AgentRunner";
import { authorizeAgentRun } from "../../../lib/agentAccess";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const denied = await authorizeAgentRun(req);
  if (denied) return denied;
  try {
    const result = await runCrew(() => {});
    return Response.json({ ok: true, text: result.article, status: "needs_review", sources: result.sources }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("[run-agent] Draft generation failed", error);
    return Response.json({ ok: false, error: "Draft generation failed. No content was published." }, { status: 503 });
  }
}
