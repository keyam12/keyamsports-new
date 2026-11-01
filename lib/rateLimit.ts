// Simple in-memory sliding-window rate limiter.
// First line of defense against endpoint abuse (e.g. someone looping the
// AI agent endpoints and burning OpenAI credits).
// NOTE: on serverless (Vercel) each instance keeps its own counters, so a
// distributed attacker can partially bypass this. For production, swap the
// Map for @upstash/ratelimit backed by Redis — the call signature below
// is intentionally compatible.

const hits = new Map<string, number[]>();

export interface RateLimitResult {
  ok: boolean;
  retryAfter: number;
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const recent = (hits.get(key) || []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    const retryAfter = Math.ceil((recent[0] + windowMs - now) / 1000);
    return { ok: false, retryAfter: Math.max(retryAfter, 1) };
  }
  recent.push(now);
  // Prevent unbounded growth if keys are attacker-controlled
  if (hits.size < 10000) hits.set(key, recent);
  return { ok: true, retryAfter: 0 };
}

export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "unknown";
}
