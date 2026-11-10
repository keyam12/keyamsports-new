import { authorizeAgentRun } from "../../../lib/agentAccess";
// GET /api/injury-report — runs the Injury Report agent and returns a
// Spanish alert digest plus the full injury list. Used by the
// keyam-injury-watch cron (every 2h) to alert Kevin on NEW injuries.
// Rate limited: 10 runs per minute per IP (each run costs OpenAI tokens).
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { runInjuryReport } from "../../../agents/InjuryAgent";
import { rateLimit, clientIp } from "../../../lib/rateLimit";

export async function GET(req: Request) {
  const denied = await authorizeAgentRun(req);
  if (denied) return denied;
  const rl = await rateLimit(`injury-report:${clientIp(req)}`, 10, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests", retryAfter: rl.retryAfter },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  try {
    const report = await runInjuryReport();
    return NextResponse.json({ demo: false, ...report });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
