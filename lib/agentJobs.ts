import { supabaseAdmin } from "./supabase";
import { hasApiKey, modelFor } from "../agents/llm";
import { runCrew } from "../agents/AgentRunner";
import { withUsageTracking } from "../agents/usage";
import { validateArticleInput, isSourceUrl } from "./articleValidation";
import { rateLimit } from "./rateLimit";
import type { AgentEvent, RunContext } from "../agents/types";

const requiredModels = ["scout", "writer", "stats", "editor", "senior_editor"] as const;
export function agentReadiness() {
  const missing = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"].filter((key) => !process.env[key]);
  if (!hasApiKey()) missing.push("OPENAI_API_KEY");
  for (const agent of requiredModels) {
    try { modelFor(agent); } catch { missing.push(`KEYAM_MODEL_${agent.toUpperCase()}`); }
  }
  const limit = Number(process.env.KEYAM_MAX_AI_RUNS_PER_DAY || "5");
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) missing.push("KEYAM_MAX_AI_RUNS_PER_DAY");
  if (process.env.KEYAM_ENABLE_AI !== "true") missing.push("KEYAM_ENABLE_AI=true");
  return { ready: missing.length === 0, missing, dailyRunLimit: limit,
    scheduled: process.env.KEYAM_ENABLE_SCHEDULED_AGENTS === "true" && !!process.env.CRON_SECRET && process.env.CRON_SECRET.length >= 32 };
}

function canonicalSource(value: string): string {
  const url = new URL(value);
  url.hash = "";
  for (const key of [...url.searchParams.keys()]) {
    if (key.startsWith("utm_") || ["fbclid", "gclid"].includes(key)) url.searchParams.delete(key);
  }
  return url.toString();
}
export function draftFromContext(ctx: RunContext) {
  if (ctx.publicationStatus !== "needs_review" || !ctx.category || !ctx.article?.trim() ||
      !ctx.findings?.trim() || !ctx.sources?.length || !ctx.sources.every(isSourceUrl)) {
    throw new Error("Incomplete sourced draft");
  }
  const title = ctx.article.split("\n")[0].trim();
  return validateArticleInput({ title, summary: ctx.article, category: ctx.category,
    sources: [...new Set(ctx.sources.map(canonicalSource))], date: new Date().toISOString().slice(0, 10),
    status: "draft", ai: true });
}

export async function runDraftJob(key: string, emit?: (event: AgentEvent) => void) {
  const readiness = agentReadiness();
  if (!readiness.ready) throw new Error("Agent setup incomplete");
  if (!/^[a-zA-Z0-9:_-]{1,100}$/.test(key)) throw new Error("Invalid job key");
  const db = supabaseAdmin();
  if (!db) throw new Error("Database unavailable");
  const { data: claim, error: claimError } = await db.rpc("claim_agent_job", { p_key: key, p_limit: readiness.dailyRunLimit });
  if (claimError || !claim) throw new Error("Agent job store unavailable");
  if (!claim.claimed) return { claimed: false, limited: !!claim.limited,
    job: claim.job ? { id: claim.job.id, state: claim.job.state, article_id: claim.job.article_id } : null };
  const job = claim.job;
  try {
    const quota = await rateLimit(`ai:global:daily:${new Date().toISOString().slice(0, 10)}`, readiness.dailyRunLimit, 86_400_000, true);
    if (!quota.ok) throw new Error("Global run quota unavailable or exhausted");
    const ctx = await withUsageTracking(async (usage) => {
      const { error } = await db.rpc("record_agent_usage", { p_id: job.id, p_lease: job.lease, p_usage: usage });
      if (error) throw new Error("Usage accounting unavailable");
    }, () => runCrew((event) => { if (event.type !== "run_done") emit?.(event); }));
    const draft = draftFromContext(ctx);
    const { data, error } = await db.rpc("finish_agent_job", { p_id: job.id, p_lease: job.lease, p_context: ctx, p_draft: draft });
    if (error || !data) throw new Error("Draft storage failed");
    emit?.({ type: "run_done", at: new Date().toISOString(), message: data.state === "duplicate" ? "Story already exists; no duplicate article saved." : "Draft saved for human review; nothing was published.", payload: ctx });
    return { context: ctx, claimed: true, limited: false, job: { id: data.id, state: data.state, article_id: data.article_id } };
  } catch {
    const { error } = await db.rpc("fail_agent_job", { p_id: job.id, p_lease: job.lease });
    console.error("[agent-job] Failed", { id: job.id, failureRecorded: !error });
    throw new Error("Draft generation failed. Check the private job history; nothing was published.");
  }
}
