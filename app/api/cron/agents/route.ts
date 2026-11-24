import { safeEqual } from "../../../../lib/adminAuth";
import { agentReadiness } from "../../../../lib/agentJobs";
import { runAdminCycle } from "../../../../lib/adminCycle";
import { agentDiagnostics } from "../../../../lib/agentDiagnostics";
export const dynamic = "force-dynamic";
export const maxDuration = 240;
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 32 || !safeEqual(req.headers.get("authorization") || "", `Bearer ${secret}`)) {
    return Response.json({ error: "Not authorized." }, { status: 401 });
  }
  const mode = new URL(req.url).searchParams.get("mode");
  if (mode && !["check", "test"].includes(mode)) return Response.json({ error: "Unknown mode." }, { status: 400 });
  if (mode === "check") {
    try { return Response.json(await agentDiagnostics(), { headers: { "Cache-Control": "no-store" } }); }
    catch { console.error("[cron/agents] Diagnostics failed"); return Response.json({ error: "Diagnostics unavailable." }, { status: 503 }); }
  }
  if ((mode !== "test" && !agentReadiness().scheduled) || !agentReadiness().ready || process.env.VERCEL_ENV !== "production") {
    return Response.json({ error: "Scheduled editorial runs are disabled or unconfigured." }, { status: 503 });
  }
  if (process.env.PAUSE_PUBLISHING === "true") return Response.json({paused:true,published:0,held:0,failed:0});
  try {
    const result = await runAdminCycle(mode === "test");
    return Response.json(result, { status: result.error ? 503 : 200, headers: { "Cache-Control": "no-store" } });
  } catch {
    console.error("[cron/agents] Scheduled draft failed");
    return Response.json({ error: "Editorial run failed. Consult the private publication audit for the actual publication state." }, { status: 503 });
  }
}
