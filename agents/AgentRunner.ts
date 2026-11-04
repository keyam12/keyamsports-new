// Orchestrator: runs the independent agents as a crew.
// Scout goes first; Writer and Stats run in parallel; Editor finishes.
import type { AgentEvent, AgentId, EmitFn, RunContext } from "./types";
import { runScout } from "./ScoutAgent";
import { runWriter } from "./WriterAgent";
import { runStats } from "./StatsAgent";
import { runEditor } from "./EditorAgent";
import { hasApiKey } from "./llm";

export async function runCrew(
  emitRaw: (event: AgentEvent) => void,
  opts?: { excludeTopics?: string[] }
): Promise<RunContext> {
  const emit: EmitFn = (e) => emitRaw({ ...e, at: new Date().toISOString() });
  const demo = !hasApiKey();

  const ctx: RunContext = {
    topic: "",
    findings: "",
    recap: "",
    stats: "",
    article: "",
    demo,
  };

  const wrap = async (id: AgentId, fn: () => Promise<void>) => {
    try {
      await fn();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      emit({ type: "agent_failed", agent: id, message: `${id} failed: ${msg}` });
      throw err;
    }
  };

  // 1. Scout finds the storyline
  await wrap("scout", async () => {
    const { topic, findings } = await runScout(emit, opts);
    ctx.topic = topic;
    ctx.findings = findings;
  });

  // 2. Writer and Stats work in parallel
  await Promise.all([
    wrap("writer", async () => {
      ctx.recap = await runWriter(ctx, emit);
    }),
    wrap("stats", async () => {
      ctx.stats = await runStats(ctx, emit);
    }),
  ]);

  // 3. Editor assembles the final article
  await wrap("editor", async () => {
    ctx.article = await runEditor(ctx, emit);
  });

  emit({ type: "run_done", message: "All agents finished. Article ready.", payload: ctx });
  return ctx;
}
