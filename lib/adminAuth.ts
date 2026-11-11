// Shared-password access for the existing single-editor panel.
// Signed, expiring cookies; migrate to role-based Supabase Auth in Phase G.
import { createHmac, timingSafeEqual } from "crypto";

const COOKIE = "keyam-admin";
const SESSION_SECONDS = 8 * 60 * 60;

export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function signature(value: string): string | null {
  const secret = process.env.ADMIN_PASSWORD;
  return secret ? createHmac("sha256", secret).update(`keyam-session:${value}`).digest("hex") : null;
}

export function isAdmin(req: Request): boolean {
  const cookie = req.headers.get("cookie") || "";
  const token = cookie.match(/(?:^|;\s*)keyam-admin=([^;]+)/)?.[1];
  if (!token) return false;
  const [expiry, sig, extra] = token.split(".");
  if (extra || !/^\d+$/.test(expiry) || !sig) return false;
  const expires = Number(expiry);
  const now = Math.floor(Date.now() / 1000);
  if (expires <= now || expires > now + SESSION_SECONDS) return false;
  const expected = signature(expiry);
  return expected !== null && safeEqual(sig, expected);
}

// Same-origin checks for administrative mutations. CLI jobs may omit Origin,
// but must still authenticate; no permissive CORS headers are emitted.
export function isTrustedOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    const source = new URL(origin);
    const target = new URL(req.url);
    // Next's internal request URL can use a different hostname behind a proxy.
    // The browser-controlled destination Host must still match the Origin;
    // never trust arbitrary X-Forwarded-Host values for this check.
    return source.origin === target.origin ||
      (source.protocol === target.protocol && source.host === req.headers.get("host"));
  } catch { return false; }
}

export function adminCookieHeader(): string {
  const expiry = String(Math.floor(Date.now() / 1000) + SESSION_SECONDS);
  const sig = signature(expiry);
  if (!sig) throw new Error("Admin authentication is not configured");
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${COOKIE}=${expiry}.${sig}; HttpOnly; Path=/; Max-Age=${SESSION_SECONDS}; SameSite=Strict${secure}`;
}
