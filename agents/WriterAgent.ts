// ✍️ Writer — turns the scout's findings into a punchy recap.
import type { EmitFn, RunContext } from "./types";
import { complete, hasApiKey, sleep } from "./llm";

export async function runWriter(
  ctx: Pick<RunContext, "topic" | "findings">,
  emit: EmitFn
): Promise<string> {
  emit({ type: "agent_started", agent: "writer", message: `Writer is drafting the recap on "${ctx.topic}"…` });
  await sleep(800);

  if (hasApiKey()) {
    emit({ type: "agent_log", agent: "writer", message: "Writing with AI…" });
    const recap = await complete(
      `Write a punchy 2-paragraph sports recap for KEYAM SPORTS about: ${ctx.topic}.\nContext: ${ctx.findings}\nKeep it energetic and under 120 words.`
    );
    emit({ type: "agent_done", agent: "writer", message: "Recap written." });
    return recap;
  }

  await sleep(900);
  emit({ type: "agent_log", agent: "writer", message: "Demo mode — drafting from scout findings…" });
  const recap =
    `The ${ctx.topic} story is heating up, and KEYAM SPORTS has you covered. ${ctx.findings} Fans are buzzing as the narrative takes shape — every game feels bigger than the last.\n\n` +
    `What stands out is the momentum swing: teams and players are rising to the moment, and the next chapter could flip the script entirely. Stay locked in — this one is far from over.`;
  emit({ type: "agent_done", agent: "writer", message: "Recap written." });
  return recap;
}
