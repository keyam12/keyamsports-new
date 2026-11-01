// GET /api/agents — runs the agent crew and streams live progress
// as Server-Sent Events (agent_started, agent_log, agent_done, run_done).
// Rate limited: 10 runs per minute per IP (each run costs OpenAI tokens).
import { runCrew } from "../../../agents/AgentRunner";
import { rateLimit, clientIp } from "../../../lib/rateLimit";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const rl = rateLimit(`agents:${clientIp(req)}`, 10, 60_000);
  if (!rl.ok) {
    return new Response("Too many requests — slow down.", {
      status: 429,
      headers: { "Retry-After": String(rl.retryAfter) },
    });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };
      try {
        await runCrew((e) => send({ ...e }));
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        send({
          type: "run_done",
          message: `Run failed: ${msg}`,
          at: new Date().toISOString(),
        });
      } finally {
        controller.close();
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
