import { agentReadiness } from "./agentJobs";
import { supabaseAdmin } from "./supabase";
import { verifyConfiguredModels } from "../agents/llm";
import { getHeadlines } from "./headlines";

/** Private read-only diagnostics. Never returns credentials or model prompts. */
export async function agentDiagnostics() {
  const readiness = agentReadiness();
  const db = supabaseAdmin();
  if (!db) return { readiness, ok: false, error: "DATABASE_NOT_CONFIGURED" };
  const [published, jobs, models, headlines] = await Promise.all([
    db.from("articles").select("id", { count: "exact", head: true }).eq("status", "published"),
    db.from("agent_jobs").select("id,state,attempts,article_id,error_code,input_tokens,output_tokens,usage_incomplete,usage,context,updated_at,agent_publications(state,risk_tier,reasons,public_url,verified_at)")
      .order("updated_at", { ascending: false }).limit(1),
    readiness.ready ? verifyConfiguredModels() : Promise.resolve([]),
    getHeadlines(),
  ]);
  const job = jobs.data?.[0];
  return { publicationMode: "automatic_low_risk", ok: readiness.ready && !published.error && !jobs.error && models.length > 0 && models.every(m => m.available) && headlines.length > 0,
    readiness, databaseReady: !published.error && !jobs.error, publishedArticles: published.count,
    models, availableHeadlines: headlines.length,
    latestJob: job ? { id: job.id, state: job.state, attempts: job.attempts, articleId: job.article_id,
      error: job.error_code, inputTokens: job.input_tokens, outputTokens: job.output_tokens, usageIncomplete: job.usage_incomplete,
      agents: Array.isArray(job.usage) ? job.usage.map(u => u.agent) : [],
      review: job.context?.seniorEditorVerdict, editorialDecision:job.context?.automation, publication:job.agent_publications, notes: job.context?.seniorEditorNotes, updatedAt: job.updated_at } : null };
}
