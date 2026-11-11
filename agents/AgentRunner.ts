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
import { getPublishedArticles } from "../lib/articles";

const SCOUT_SPORTS = ["NBA", "NFL", "MLB", "Soccer"];

export async function runCrew(
  emitRaw: (event: AgentEvent) => void,
  opts?: { excludeTopics?: string[] }
): Promise<RunContext> {
  const emit: EmitFn = (e) => emitRaw({ ...e, at: new Date().toISOString() });
  if (!hasApiKey()) throw new Error("AI credentials are not configured; no demo news is generated.");
  const demo = false;

  const ctx: RunContext = {
    topic: "",
    findings: "",
    recap: "",
    stats: "",
    article: "",
    demo,
    publicationStatus: "needs_review",
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
  const previous = await getPublishedArticles();
  const excludeTopics = [...previous.map((a) => a.title), ...(opts?.excludeTopics || [])].slice(0, 30);
  await Promise.allSettled(
    SCOUT_SPORTS.map((sport) =>
      wrap("scout", async () => {
        const { topic, findings, sources } = await runScout(emit, {
          ...opts,
          excludeTopics,
          sport,
        });
        candidates.push({ sport, topic, findings, sources });
      })
    )
  );

  if (!candidates.length) throw new Error("No source candidates available");
  // All scouts have settled before recording failure or saving a final draft.
  // A league feed outage need not prevent coverage of another league.

  // 2. Senior Editor picks the front-page storyline
  await wrap("senior_editor", async () => {
    const { topic, findings, sources, category } = await pickTopStoryline(candidates, emit);
    ctx.topic = topic;
    ctx.category = category;
    ctx.findings = findings;
    ctx.sources = sources;
  });

  // 3. Writer and Stats work in parallel
  const writingResults = await Promise.allSettled([
    wrap("writer", async () => {
      ctx.recap = await runWriter(ctx, emit);
    }),
    wrap("stats", async () => {
      ctx.stats = await runStats(ctx, emit);
    }),
  ]);

  const failedWriting = writingResults.find((result) => result.status === "rejected");
  if (failedWriting?.status === "rejected") throw failedWriting.reason;

  // 4. Editor assembles the final article
  await wrap("editor", async () => {
    ctx.article = await runEditor(ctx, emit);
  });

  // 5. Automated review is advisory; human approval is still required.
  const review = await reviewArticle(ctx, emit);
  ctx.article = review.article;
  ctx.seniorEditorVerdict = review.verdict;
  ctx.seniorEditorNotes = review.notes;

  emit({ type: "run_done", message: "Draft complete. Human editorial review required; nothing was published.", payload: ctx });
  return ctx;
}
