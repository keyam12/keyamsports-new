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
      `Give ONE striking stat highlight (one sentence, with a number) for this sports storyline: ${ctx.topic}.\nContext: ${ctx.findings}`
    );
    emit({ type: "agent_done", agent: "stats", message: "Key stat found." });
    return stats;
  }

  await sleep(900);
  emit({ type: "agent_log", agent: "stats", message: "Demo mode — pulling a highlight number…" });
  const stats = `Stat to watch: momentum has flipped in 3 of the last 4 matchups in this ${ctx.topic} race — the next game could decide everything.`;
  emit({ type: "agent_done", agent: "stats", message: "Key stat found." });
  return stats;
}
