// Betting odds via The Odds API (free tier: 500 credits/month, no card).
// Server-side cache is REQUIRED: 1 credit per call (1 market × 1 region),
// so the route caches each sport for 12h and never calls the API per page
// visit. Without ODDS_API_KEY set, returns an empty list (no demo odds —
// invented betting lines would be worse than none).

const API_BASE = "https://api.the-odds-api.com/v4";

export const ODDS_SPORTS: Record<string, { api: string; label: string }> = {
  nba: { api: "basketball_nba", label: "NBA" },
  nfl: { api: "americanfootball_nfl", label: "NFL" },
  mlb: { api: "baseball_mlb", label: "MLB" },
  soccer: { api: "soccer_epl", label: "Premier League" },
};

export interface Odd {
  home: string;
  away: string;
  commenceTime: string;
  bookmakers: { name: string; home: number | null; away: number | null }[];
}

interface CacheEntry {
  at: number;
  data: Odd[];
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12h — odds refresh 1–2×/day max

async function fetchJson(url: string, timeoutMs = 8000): Promise<any> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

export async function getOdds(sport: string): Promise<{ odds: Odd[]; cached: boolean; configured: boolean }> {
  const key = process.env.ODDS_API_KEY || "";
  const mapping = ODDS_SPORTS[sport];
  if (!mapping) return { odds: [], cached: false, configured: !!key };

  const now = Date.now();
  const hit = cache.get(sport);
  if (hit && now - hit.at < CACHE_TTL_MS) {
    return { odds: hit.data, cached: true, configured: !!key };
  }
  if (!key) return { odds: [], cached: false, configured: false };

  try {
    const url = `${API_BASE}/sports/${mapping.api}/odds/?apiKey=${encodeURIComponent(key)}&regions=us&markets=h2h&oddsFormat=american`;
    const data = await fetchJson(url);
    const odds: Odd[] = (Array.isArray(data) ? data : []).slice(0, 20).map((e: any) => ({
      home: String(e.home_team || ""),
      away: String(e.away_team || ""),
      commenceTime: String(e.commence_time || ""),
      bookmakers: (e.bookmakers || []).slice(0, 5).map((b: any) => {
        const h2h = (b.markets || []).find((m: any) => m.key === "h2h");
        const outcomes = h2h?.outcomes || [];
        const find = (name: string) => outcomes.find((o: any) => o.name === name)?.price ?? null;
        return { name: String(b.title || b.key || ""), home: find(e.home_team), away: find(e.away_team) };
      }),
    })).filter((o) => o.home && o.away);
    cache.set(sport, { at: now, data: odds });
    return { odds, cached: false, configured: true };
  } catch (err) {
    console.error("[odds] fetch failed:", err);
    // Serve stale cache rather than failing the page
    if (hit) return { odds: hit.data, cached: true, configured: true };
    return { odds: [], cached: false, configured: true };
  }
}
