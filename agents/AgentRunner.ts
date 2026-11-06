// Orchestrator: runs the independent agents as a crew.
// Four Scouts (one per sport) report in parallel; the Senior Editor picks
// the front-page storyline; Writer and Stats run in parallel; Editor
// assembles the article; the Senior Editor does the final fact-check.
import type { AgentEvent, AgentId, EmitFn, RunContext } from "./types";
import { runScout } from "./ScoutAgent";
import { runWriter } from "./WriterAgent";
import { runStats } from "./StatsAgent";
import { runEditor } from "./EditorAgent";
import { pickTopStoryline, reviewArticle, type StorylineCandidate } from "./SeniorEditorAgent";
import { hasApiKey } from "./llm";

const SCOUT_SPORTS = ["NBA", "NFL", "MLB", "Soccer"];

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

  // 1. Four Scouts (one per sport) search in parallel
  const candidates: StorylineCandidate[] = [];
  await Promise.all(
    SCOUT_SPORTS.map((sport) =>
      wrap("scout", async () => {
        const { topic, findings } = await runScout(emit, {
          ...opts,
          sport,
        });
        candidates.push({ sport, topic, findings });
      })
    )
  );

  // 2. Senior Editor picks the front-page storyline
  await wrap("senior_editor", async () => {
    const { topic, findings } = await pickTopStoryline(candidates, emit);
    ctx.topic = topic;
    ctx.findings = findings;
  });

  // 3. Writer and Stats work in parallel
  await Promise.all([
    wrap("writer", async () => {
      ctx.recap = await runWriter(ctx, emit);
    }),
    wrap("stats", async () => {
      ctx.stats = await runStats(ctx, emit);
    }),
  ]);

  // 4. Editor assembles the final article
  await wrap("editor", async () => {
    ctx.article = await runEditor(ctx, emit);
  });

  // 5. Senior Editor: final fact-check (fail-open — never kills the run)
  const review = await reviewArticle(ctx, emit);
  ctx.article = review.article;
  ctx.seniorEditorVerdict = review.verdict;
  ctx.seniorEditorNotes = review.notes;

  emit({ type: "run_done", message: "All agents finished. Article ready.", payload: ctx });
  return ctx;
}
