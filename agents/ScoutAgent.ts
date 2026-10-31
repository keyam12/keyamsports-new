// 🔭 Scout — the eyes of the crew. Finds today's top sports storyline.
import type { EmitFn, RunContext } from "./types";
import { complete, hasApiKey, sleep } from "./llm";

const DEMO_STORYLINES = [
  {
    topic: "NBA Opening Week",
    findings:
      "The new NBA season has tipped off. Early storylines: hyped rookie debuts, an opening-night overtime thriller, and title contenders already starting to separate from the pack.",
  },
  {
    topic: "World Series",
    findings:
      "It's late October, which means World Series baseball. The Fall Classic is underway with elite pitching duels, late-inning drama, and a championship on the line.",
  },
  {
    topic: "NFL Midseason",
    findings:
      "The NFL season has hit its midpoint. Playoff races are tightening, MVP candidates are emerging, and a few surprise teams are crashing the contender conversation.",
  },
  {
    topic: "Champions League",
    findings:
      "The Champions League group stage is in full swing across Europe. Matchday drama, late winners, and breakout performances from young stars headline the week.",
  },
];

export async function runScout(
  emit: EmitFn
): Promise<Pick<RunContext, "topic" | "findings">> {
  emit({ type: "agent_started", agent: "scout", message: "Scout is scanning the sports world…" });
  await sleep(900);

  if (hasApiKey()) {
    emit({ type: "agent_log", agent: "scout", message: "Asking AI for today's top storyline…" });
    const raw = await complete(
      "What is the single biggest sports storyline today? Reply with one short topic line, then 2-3 sentences of findings. Format exactly:\nTOPIC: ...\nFINDINGS: ..."
    );
    const topic = raw.match(/TOPIC:\s*(.+)/)?.[1]?.trim() || "Today's Top Story";
    const findings = raw.match(/FINDINGS:\s*([\s\S]+)/)?.[1]?.trim() || raw;
    emit({ type: "agent_log", agent: "scout", message: `Picked storyline: ${topic}` });
    emit({ type: "agent_done", agent: "scout", message: "Storyline locked in." });
    return { topic, findings };
  }

  const pick = DEMO_STORYLINES[Math.floor(Math.random() * DEMO_STORYLINES.length)];
  emit({ type: "agent_log", agent: "scout", message: "Demo mode — picking from trending storylines…" });
  await sleep(700);
  emit({ type: "agent_log", agent: "scout", message: `Picked storyline: ${pick.topic}` });
  emit({ type: "agent_done", agent: "scout", message: "Storyline locked in." });
  return { topic: pick.topic, findings: pick.findings };
}
