// 👔 Senior Editor — runs the newsroom.
// Two jobs:
//  1. pickTopStoryline: several Scouts (one per sport) report in parallel;
//     the Senior Editor picks the single biggest storyline of the day.
//  2. reviewArticle: final quality gate AFTER the Editor assembles the
//     article — checks every factual claim against the Scout's findings,
//     fixes wrong numbers/names, and either approves or corrects the piece.
// Failed or incomplete reviews always require human review.
import type { EmitFn, RunContext } from "./types";
import { completeFor, hasApiKey, sleep } from "./llm";

export interface StorylineCandidate {
  sport: string;
  topic: string;
  findings: string;
  sources: string[];
}

export async function pickTopStoryline(
  candidates: StorylineCandidate[],
  emit: EmitFn
): Promise<Pick<RunContext, "topic" | "findings" | "sources" | "category">> {
  emit({ type: "agent_started", agent: "senior_editor", message: "Senior Editor is weighing the Scouts' storylines…" });
  await sleep(600);

  if (!hasApiKey() || candidates.length === 0) {
    const best = candidates[0] ?? { topic: "Today's Top Story", findings: "", sources: [] };
    emit({ type: "agent_done", agent: "senior_editor", message: `Picked: ${best.topic}` });
    return { topic: best.topic, findings: best.findings, sources: best.sources ?? [] };
  }

  const list = candidates
    .map((c, i) => `${i + 1}. [${c.sport}] ${c.topic} — ${c.findings}`)
    .join("\n");
  const raw = await completeFor(
    "senior_editor",
    `You are the Senior Editor of KEYAM SPORTS. Four Scouts filed these storylines. Pick the SINGLE biggest one for today's front page. Reply exactly:\nPICK: <number 1-${candidates.length}>\nREASON: <one short sentence>\n\n${list}`
  );
  const pickNum = parseInt(raw.match(/PICK:\s*(\d+)/)?.[1] || "1", 10);
  const chosen = candidates[Math.min(Math.max(pickNum - 1, 0), candidates.length - 1)];
  const reason = raw.match(/REASON:\s*(.+)/)?.[1]?.trim() || "";
  emit({ type: "agent_log", agent: "senior_editor", message: `Picked [${chosen.sport}] ${chosen.topic}${reason ? ` — ${reason}` : ""}` });
  emit({ type: "agent_done", agent: "senior_editor", message: "Front-page story chosen." });
  const category = { NBA: "basketball", NFL: "football", MLB: "baseball", Soccer: "soccer" }[chosen.sport] as RunContext["category"];
  if (!category) throw new Error("Unknown story category");
  return { topic: chosen.topic, findings: chosen.findings, sources: chosen.sources ?? [], category };
}

export interface ReviewResult {
  verdict: "APPROVED" | "NEEDS_FIXES" | "NEEDS_REVIEW";
  notes: string[];
  article: string;
}

export async function reviewArticle(
  ctx: Pick<RunContext, "topic" | "findings" | "recap" | "stats" | "article">,
  emit: EmitFn
): Promise<ReviewResult> {
  emit({ type: "agent_started", agent: "senior_editor", message: "Senior Editor is doing the final fact-check…" });
  await sleep(600);

  if (!hasApiKey()) {
    emit({ type: "agent_done", agent: "senior_editor", message: "No fact-check performed — human review required." });
    return { verdict: "NEEDS_REVIEW", notes: ["No fact-check performed."], article: ctx.article };
  }

  try {
    const raw = await completeFor(
      "senior_editor",
      `You are the Senior Editor of KEYAM SPORTS doing the FINAL fact-check before publication. ` +
        `Check the article below against the Scout's findings. Flag any claim NOT supported by the findings (invented scores, wrong names, wrong numbers, wrong teams). ` +
        `Reply with JSON only, no markdown fences:\n` +
        `{"verdict": "APPROVED" | "NEEDS_FIXES", "notes": ["short note per issue"], "correctedArticle": "full article text with fixes applied, or the original text unchanged if APPROVED"}\n\n` +
        `SCOUT FINDINGS:\n${ctx.findings}\n\nARTICLE:\n${ctx.article}`
    );
    const parsed = JSON.parse(raw) as {
      verdict?: string;
      notes?: string[];
      correctedArticle?: string;
    };
    if (!["APPROVED", "NEEDS_FIXES"].includes(parsed.verdict || "") ||
        !Array.isArray(parsed.notes) || !parsed.notes.every((note) => typeof note === "string") ||
        typeof parsed.correctedArticle !== "string" || !parsed.correctedArticle.trim()) {
      throw new Error("Invalid editorial review response");
    }
    const verdict = parsed.verdict as "APPROVED" | "NEEDS_FIXES";
    const notes = Array.isArray(parsed.notes) ? parsed.notes : [];
    const article =
      verdict === "NEEDS_FIXES" && parsed.correctedArticle
        ? parsed.correctedArticle
        : ctx.article;
    emit({
      type: "agent_log",
      agent: "senior_editor",
      message:
        verdict === "APPROVED"
          ? "Fact-check passed — article approved."
          : `Fixed ${notes.length} issue(s): ${notes.join("; ")}`,
    });
    emit({ type: "agent_done", agent: "senior_editor", message: `Verdict: ${verdict}.` });
    return { verdict, notes, article };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    emit({ type: "agent_log", agent: "senior_editor", message: `Review failed (${msg}) — keeping Editor's article.` });
    emit({ type: "agent_done", agent: "senior_editor", message: "Review failed — human review required." });
    return { verdict: "NEEDS_REVIEW", notes: ["Automated review failed. Human review is required."], article: ctx.article };
  }
}
