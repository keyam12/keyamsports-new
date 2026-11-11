import { authorizeAgentRun } from "../../../lib/agentAccess";
// GET /api/agents — runs the agent crew and streams live progress
// as Server-Sent Events (agent_started, agent_log, agent_done, run_done).
// Rate limited: 10 runs per minute per IP (each run costs OpenAI tokens).
import { randomUUID } from "node:crypto";
import { runDraftJob } from "../../../lib/agentJobs";
import { rateLimit, clientIp } from "../../../lib/rateLimit";

export const dynamic = "force-dynamic";
export const maxDuration = 240;

export async function GET(req: Request) {
  const denied = await authorizeAgentRun(req, false);
  if (denied) return denied;
  const rl = await rateLimit(`agents:${clientIp(req)}`, 10, 60_000);
  if (!rl.ok) {
    return new Response("Too many requests — slow down.", {
      status: 429,
      headers: { "Retry-After": String(rl.retryAfter) },
    });
  }

  const suppliedKey = new URL(req.url).searchParams.get("key");
  if (suppliedKey && !/^[a-zA-Z0-9_-]{1,80}$/.test(suppliedKey)) return Response.json({ error: "Invalid run key." }, { status: 400 });
  const key = `console:${suppliedKey || randomUUID()}`;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let connected = true;
      const send = (event: object) => {
        if (!connected) return;
        try { controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`)); }
        catch { connected = false; }
      };
      try {
        const result = await runDraftJob(key, send);
        if (!result.claimed) send({ type: "run_done", message: result.limited ? "Daily quota reached." : "Job already exists. Review its status in Admin.", at: new Date().toISOString() });
      } catch (err: unknown) {
        console.error("[agents] Draft run failed");
        const msg = "Draft generation or storage failed; check Admin.";
        send({
          type: "run_done",
          message: `Run failed: ${msg}`,
          at: new Date().toISOString(),
        });
      } finally {
        if (connected) { try { controller.close(); } catch { /* client disconnected */ } }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
