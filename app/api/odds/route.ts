// GET /api/odds?sport=nba|nfl|mlb|soccer
// Betting odds (moneyline, US region) via The Odds API with a 12h server
// cache — the upstream free tier is only 500 credits/month, so this route
// never calls the provider per page visit. Rate limited per IP.
// Response: { configured: boolean, cached: boolean, sport, odds: [...] }
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getOdds, ODDS_SPORTS } from "../../../lib/odds";
import { rateLimit, clientIp } from "../../../lib/rateLimit";

export async function GET(req: Request) {
  const ip = clientIp(req);
  const rl = await rateLimit(`odds:${ip}`, 30, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests", retryAfter: rl.retryAfter },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  const sport = new URL(req.url).searchParams.get("sport") || "nba";
  if (!ODDS_SPORTS[sport]) {
    return NextResponse.json(
      { error: `Unknown sport. Use one of: ${Object.keys(ODDS_SPORTS).join(", ")}` },
      { status: 400 }
    );
  }

  const { odds, cached, configured } = await getOdds(sport);
  return NextResponse.json({ configured, cached, sport, odds });
}
