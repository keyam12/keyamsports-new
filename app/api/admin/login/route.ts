export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { safeEqual, adminCookieHeader, isTrustedOrigin, adminPassword } from "../../../../lib/adminAuth";
import { rateLimit, clientIp } from "../../../../lib/rateLimit";

export async function POST(req: Request) {
  if (!isTrustedOrigin(req)) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const rl = await rateLimit(`admin-login:${clientIp(req)}`, 5, 15 * 60_000, true);
  if (!rl.ok) return NextResponse.json({ error: "Too many attempts or limiter unavailable." }, {
    status: 429, headers: { "Retry-After": String(rl.retryAfter) },
  });
  const expected = adminPassword();
  if (!expected) return NextResponse.json({ error: "Admin authentication is not configured." }, { status: 503 });
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const password = body && typeof body === "object" ? (body as { password?: unknown }).password : undefined;
  if (typeof password !== "string" || password.length > 1024 || !safeEqual(password, expected)) {
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.headers.set("Set-Cookie", adminCookieHeader());
  res.headers.set("Cache-Control", "no-store");
  return res;
}
