// Admin auth — single shared password (ADMIN_PASSWORD env var) stored as
// a SHA-256 hash in an HttpOnly cookie. Simple by design: this is a
// one-editor newsroom, not multi-user auth. Set ADMIN_PASSWORD in Vercel
// env vars; without it the admin panel stays locked.
import { createHash } from "crypto";

const COOKIE = "keyam-admin";

export function adminToken(): string | null {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return null;
  return createHash("sha256").update(pw).digest("hex");
}

export function isAdmin(req: Request): boolean {
  const token = adminToken();
  if (!token) return false;
  const cookie = req.headers.get("cookie") || "";
  const m = cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  return m?.[1] === token;
}

export function adminCookieHeader(): string {
  const token = adminToken() || "";
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${COOKIE}=${token}; HttpOnly; Path=/; Max-Age=${7 * 24 * 3600}; SameSite=Lax${secure}`;
}
