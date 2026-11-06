// GET /api/injuries?sport=nfl|nba|mlb|soccer (or all)
// Raw injury data from ESPN's public injuries API. Rate limited per IP.
// Response: { cached: boolean, count, injuries: [...] }
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getInjuries } from "../../../lib/injuries";
import { rateLimit, clientIp } from "../../../lib/rateLimit";

const SPORTS = ["nfl", "nba", "mlb", "soccer"];

export async function GET(req: Request) {
  const ip = clientIp(req);
  const rl = await rateLimit(`injuries:${ip}`, 30, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests", retryAfter: rl.retryAfter },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  const sport = new URL(req.url).searchParams.get("sport") || undefined;
  if (sport && !SPORTS.includes(sport)) {
    return NextResponse.json(
      { error: `Unknown sport. Use one of: ${SPORTS.join(", ")}` },
      { status: 400 }
    );
  }

  const { injuries, cached } = await getInjuries(sport);
  return NextResponse.json({ cached, count: injuries.length, injuries });
}
