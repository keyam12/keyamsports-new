// 🚑 Injury Report — tracks injuries across all sports and writes the alert.
// Sources: ESPN public injuries API (free, no key) for NFL/NBA/MLB/soccer.
// The cron (keyam-injury-watch, every 2h) calls /api/injury-report, diffs
// against the seen-list, and alerts Kevin only on NEW injuries.
import type { EmitFn } from "./types";
import { completeFor, hasApiKey, sleep } from "./llm";
import { getInjuries, type Injury } from "../lib/injuries";

export interface InjuryReport {
  digest: string;
  injuries: Injury[];
  count: number;
}

export async function runInjuryReport(emit?: EmitFn): Promise<InjuryReport> {
  emit?.({ type: "agent_started", agent: "injury", message: "Injury Report is checking all leagues…" });
  await sleep(500);

  const { injuries } = await getInjuries();
  if (injuries.length === 0) {
    emit?.({ type: "agent_done", agent: "injury", message: "No injuries reported right now." });
    return { digest: "No injuries reported right now.", injuries: [], count: 0 };
  }

  if (!hasApiKey()) {
    const digest = injuries
      .slice(0, 8)
      .map((i) => `• ${i.player} (${i.team}, ${i.sport}) — ${i.status}`)
      .join("\n");
    emit?.({ type: "agent_done", agent: "injury", message: `${injuries.length} injuries tracked.` });
    return { digest, injuries, count: injuries.length };
  }

  const list = injuries
    .slice(0, 30)
    .map((i) => `${i.player} (${i.position}, ${i.team}, ${i.sport}) — ${i.status}${i.comment ? `: ${i.comment}` : ""}`)
    .join("\n");
  const digest = await completeFor(
    "injury",
    `You are the Injury Report agent for KEYAM SPORTS. Write a short alert digest in Spanish (max 6 lines) with the most important injuries from this list — star players and new/out statuses first. One bullet per injury, no intro paragraph:\n\n${list}`
  );
  emit?.({ type: "agent_done", agent: "injury", message: `${injuries.length} injuries tracked.` });
  return { digest, injuries, count: injuries.length };
}
