// GET /api/agents — runs the agent crew and streams live progress
// as Server-Sent Events (agent_started, agent_log, agent_done, run_done).
import { runCrew } from "../../../agents/AgentRunner";

export const dynamic = "force-dynamic";

export async function GET() {
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
