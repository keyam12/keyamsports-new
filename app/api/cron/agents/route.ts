import { safeEqual } from "../../../../lib/adminAuth";
import { agentReadiness, runDraftJob } from "../../../../lib/agentJobs";
export const dynamic = "force-dynamic";
export const maxDuration = 240;
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 32 || !safeEqual(req.headers.get("authorization") || "", `Bearer ${secret}`)) {
    return Response.json({ error: "Not authorized." }, { status: 401 });
  }
  if (!agentReadiness().scheduled || !agentReadiness().ready || process.env.VERCEL_ENV !== "production") {
    return Response.json({ error: "Scheduled drafts are disabled or unconfigured." }, { status: 503 });
  }
  try {
    const result = await runDraftJob(`daily:${new Date().toISOString().slice(0, 10)}`);
    return Response.json(result, { status: result.limited ? 429 : 200, headers: { "Cache-Control": "no-store" } });
  } catch {
    console.error("[cron/agents] Scheduled draft failed");
    return Response.json({ error: "Draft run failed. Nothing was published." }, { status: 503 });
  }
}
