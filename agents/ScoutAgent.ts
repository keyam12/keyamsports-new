// 🔭 Scout — the eyes of the crew. Finds today's top sports storyline.
import type { EmitFn, RunContext } from "./types";
import { completeFor, hasApiKey, sleep } from "./llm";
import { getHeadlines, formatHeadlines } from "../lib/headlines";
import { getRecentTopics, formatCoveredTopics } from "../lib/recentCoverage";

export interface ScoutOptions {
  /** Topics covered very recently (e.g. recent chat drafts) — don't pick these again. */
  excludeTopics?: string[];
  /** Limit the scout to one sport feed (NBA, NFL, MLB, Soccer). Default: all. */
  sport?: string;
}

export async function runScout(
  emit: EmitFn,
  opts: ScoutOptions = {}
): Promise<Pick<RunContext, "topic" | "findings" | "sources">> {
  emit({ type: "agent_started", agent: "scout", message: `Scout is scanning${opts.sport ? ` ${opts.sport}` : " the sports world"}…` });
  await sleep(900);

  // Memory of recently covered storylines: the site's own published articles
  // (last 48h) plus any topics the caller asks to exclude (recent drafts).
  const covered = [
    ...getRecentTopics(48),
    ...(opts.excludeTopics ?? []).map((t) => t.trim()).filter(Boolean),
  ];
  const coveredBlock =
    covered.length > 0
      ? "\n\nIMPORTANT — already covered recently, do NOT pick these again. Choose the next-biggest DIFFERENT storyline. A headline is the SAME story if it shares 2 or more keywords with any blocked topic below — even if the wording is different. One shared word alone (e.g. only a team name) does not count.\n" +
        formatCoveredTopics(covered)
      : "";

  if (!hasApiKey()) throw new Error("AI credentials are not configured");
  {
    emit({ type: "agent_log", agent: "scout", message: `Fetching today's real ${opts.sport || "sports"} headlines…` });
    const headlines = await getHeadlines(opts.sport);
    let prompt: string;
    if (headlines.length > 0) {
      emit({ type: "agent_log", agent: "scout", message: `Found ${headlines.length} real headlines. Asking AI to pick the top storyline…` });
      prompt =
        "Below are TODAY'S REAL sports headlines from ESPN. Pick the single biggest storyline FROM THIS LIST ONLY — do not invent stories, scores, or events not listed here. Reply with one short topic line, then 2-3 sentences of findings based on the headline(s) you picked, then the source URLs of the headlines you used (copy them exactly from the Source lines below, one per line, max 3). Format exactly:\nTOPIC: ...\nFINDINGS: ...\nSOURCES: ...\n\nHEADLINES:\n" +
        formatHeadlines(headlines) +
        coveredBlock;
    } else {
      throw new Error("No source headlines available; generation stopped.");
    }
    const raw = await completeFor("scout", prompt);
    const topic = raw.match(/TOPIC:\s*(.+)/)?.[1]?.trim() || "Today's Top Story";
    const findings =
      raw.match(/FINDINGS:\s*([\s\S]*?)(?=SOURCES:|$)/)?.[1]?.trim() || raw;
    const sources = (raw.match(/SOURCES:\s*([\s\S]+)/)?.[1] || "")
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter((s) => headlines.some((headline) => headline.link === s))
      .slice(0, 3);
    if (!sources.length) throw new Error("Scout did not return a source from the supplied feed");
    emit({ type: "agent_log", agent: "scout", message: `Picked storyline: ${topic}` });
    emit({ type: "agent_done", agent: "scout", message: "Storyline locked in." });
    return { topic, findings, sources };
  }

}
