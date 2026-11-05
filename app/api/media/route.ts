// GET /api/media?q=basketball
// Free stock photos via Pixabay with a 24h server cache. Rate limited per IP.
// Response: { configured: boolean, cached: boolean, items: [...] }
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getMedia } from "../../../lib/media";
import { rateLimit, clientIp } from "../../../lib/rateLimit";

export async function GET(req: Request) {
  const ip = clientIp(req);
  const rl = await rateLimit(`media:${ip}`, 30, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests", retryAfter: rl.retryAfter },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  const q = new URL(req.url).searchParams.get("q") || "";
  const { items, cached, configured } = await getMedia(q);
  return NextResponse.json({ configured, cached, items });
}
