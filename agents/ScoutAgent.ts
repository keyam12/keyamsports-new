// 🔭 Scout — the eyes of the crew. Finds today's top sports storyline.
import type { EmitFn, RunContext } from "./types";
import { completeFor, hasApiKey, sleep } from "./llm";
import { getHeadlines, formatHeadlines } from "../lib/headlines";

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
    emit({ type: "agent_log", agent: "scout", message: "Fetching today's real sports headlines…" });
    const headlines = await getHeadlines();
    let prompt: string;
    if (headlines.length > 0) {
      emit({ type: "agent_log", agent: "scout", message: `Found ${headlines.length} real headlines. Asking AI to pick the top storyline…` });
      prompt =
        "Below are TODAY'S REAL sports headlines from ESPN. Pick the single biggest storyline FROM THIS LIST ONLY — do not invent stories, scores, or events not listed here. Reply with one short topic line, then 2-3 sentences of findings based on the headline(s) you picked. Format exactly:\nTOPIC: ...\nFINDINGS: ...\n\nHEADLINES:\n" +
        formatHeadlines(headlines);
    } else {
      emit({ type: "agent_log", agent: "scout", message: "Headline feed unreachable — asking AI for today's top storyline…" });
      prompt =
        "What is the single biggest sports storyline today? Reply with one short topic line, then 2-3 sentences of findings. Format exactly:\nTOPIC: ...\nFINDINGS: ...";
    }
    const raw = await completeFor("scout", prompt);
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
