import { isAdmin, isTrustedOrigin } from "./adminAuth";
import { hasApiKey } from "../agents/llm";
import { rateLimit } from "./rateLimit";
import { supabaseAdmin } from "./supabase";

/** Runs remain private and opt-in until durable budgets/review are implemented. */
export async function authorizeAgentRun(req: Request, reserveQuota = true): Promise<Response | null> {
  if (!isAdmin(req) || !isTrustedOrigin(req)) {
    return Response.json({ error: "Admin authentication required." }, { status: 401 });
  }
  if (process.env.KEYAM_ENABLE_AI !== "true" || !hasApiKey()) {
    return Response.json({ error: "AI generation is disabled or not configured." }, { status: 503 });
  }
  if (process.env.NODE_ENV === "production" &&
      (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) && !supabaseAdmin()) {
    return Response.json({ error: "Database or distributed rate limiting is required for production AI runs." }, { status: 503 });
  }
  // Global cap, not per IP. This is a run ceiling, not a monetary budget.
  const limit = Number(process.env.KEYAM_MAX_AI_RUNS_PER_DAY || "5");
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    return Response.json({ error: "Invalid daily AI run limit." }, { status: 503 });
  }
  if (!reserveQuota) return null;
  const result = await rateLimit(`ai:global:daily:${new Date().toISOString().slice(0, 10)}`, limit, 86_400_000, true);
  return result.ok ? null : Response.json(
    { error: "AI run limit reached or limiter unavailable." },
    { status: 429, headers: { "Retry-After": String(result.retryAfter) } }
  );
}
