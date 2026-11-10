// Rate limiting for the AI endpoints (/api/agents, /api/run-agent).
//
// Distributed mode: when UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
// are set (Vercel env vars), limits are enforced in Upstash Redis so they
// hold across all serverless instances. Otherwise it falls back to the
// in-memory sliding window (fine for local dev; NOT safe on serverless
// because each instance keeps its own counters).
//
// failClosed=true requires Redis in production and rejects Redis failures.

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export interface RateLimitResult {
  ok: boolean;
  retryAfter: number; // seconds, meaningful when ok === false
}

// ---------- in-memory fallback (local dev / pre-migration) ----------

const hits = new Map<string, number[]>();

function memoryRateLimit(
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

// ---------- Upstash-backed limiter (production) ----------

const limiters = new Map<string, Ratelimit | null>();
let loggedMode = false;

function getLimiter(limit: number, windowMs: number): Ratelimit | null {
  const cacheKey = `${limit}:${windowMs}`;
  if (limiters.has(cacheKey)) return limiters.get(cacheKey) ?? null;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    limiters.set(cacheKey, null);
    return null;
  }
  try {
    const redis = new Redis({ url, token });
    const windowSec = Math.max(1, Math.round(windowMs / 1000));
    const limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, `${windowSec} s`),
      analytics: true,
      prefix: "keyam-rl",
    });
    limiters.set(cacheKey, limiter);
    return limiter;
  } catch {
    limiters.set(cacheKey, null);
    return null;
  }
}

// ---------- public API ----------

export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
  failClosed = false
): Promise<RateLimitResult> {
  const limiter = getLimiter(limit, windowMs);
  if (!limiter) {
    if (failClosed && process.env.NODE_ENV === "production") return { ok: false, retryAfter: 60 };
    if (!loggedMode) {
      loggedMode = true;
      console.warn(
        "[rateLimit] Upstash env vars not set — using in-memory limiter (not safe on serverless)."
      );
    }
    return memoryRateLimit(key, limit, windowMs);
  }
  try {
    const { success, reset } = await limiter.limit(key);
    if (success) return { ok: true, retryAfter: 0 };
    return {
      ok: false,
      retryAfter: Math.max(1, Math.ceil((reset - Date.now()) / 1000)),
    };
  } catch (err) {
    // Public reads may use memory on outage. Sensitive endpoints fail closed.
    console.error("[rateLimit] Upstash request failed:", err);
    return failClosed ? { ok: false, retryAfter: 60 } : memoryRateLimit(key, limit, windowMs);
  }
}

export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "unknown";
}
