// 📊 Stats — digs up the one number that tells the story.
import type { EmitFn, RunContext } from "./types";
import { completeFor, hasApiKey, sleep } from "./llm";

export async function runStats(
  ctx: Pick<RunContext, "topic" | "findings">,
  emit: EmitFn
): Promise<string> {
  emit({ type: "agent_started", agent: "stats", message: "Stats is crunching the numbers…" });
  await sleep(800);

  if (hasApiKey()) {
    emit({ type: "agent_log", agent: "stats", message: "Finding the key stat with AI…" });
    const stats = await completeFor("stats",
      `Use ONLY statistics explicitly present in the supplied context. If none is available reply exactly "No verified statistic available." Never infer, invent or recall a statistic. Give at most one sourced stat highlight for this sports storyline: ${ctx.topic}.\nContext: ${ctx.findings}`
    );
    emit({ type: "agent_done", agent: "stats", message: "Key stat found." });
    return stats;
  }

  throw new Error("AI credentials are not configured; no statistics were generated.");
}
