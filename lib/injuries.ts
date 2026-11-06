// Injury data via ESPN's public injuries API (free, no key).
// Covers NFL, NBA, MLB and soccer (Premier League). Rotoworld is the
// editorial reference for injury news, but it has no free API — ESPN's
// feed is the structured source; Rotoworld/ESPN headlines reach the
// Scout the same way. Twitter/X and Facebook have no free access
// (X API ~$200/mo), so they are NOT polled directly.
// Server-side cache: 1h — injuries don't change minute by minute.

export interface Injury {
  id: string;
  sport: string;
  team: string;
  player: string;
  position: string;
  status: string;
  comment: string;
  date: string;
}

const LEAGUES: { sport: string; label: string; url: string }[] = [
  { sport: "nfl", label: "NFL", url: "https://site.api.espn.com/apis/site/v2/sports/football/nfl/injuries" },
  { sport: "nba", label: "NBA", url: "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/injuries" },
  { sport: "mlb", label: "MLB", url: "https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/injuries" },
  { sport: "soccer", label: "Soccer", url: "https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/injuries" },
];

interface CacheEntry {
  at: number;
  data: Injury[];
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1h

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

async function fetchLeague(league: (typeof LEAGUES)[number]): Promise<Injury[]> {
  try {
    const data = await fetchJson(league.url);
    const out: Injury[] = [];
    for (const team of data?.injuries || []) {
      for (const inj of team?.injuries || []) {
        const athlete = inj?.athlete || {};
        out.push({
          id: `${league.sport}:${inj?.id || athlete?.id || `${team?.displayName}-${athlete?.displayName}`}`,
          sport: league.label,
          team: String(team?.displayName || ""),
          player: String(athlete?.displayName || ""),
          position: String(athlete?.position?.abbreviation || ""),
          status: String(inj?.status || ""),
          comment: String(inj?.longComment || inj?.comment || "").trim(),
          date: String(inj?.date || ""),
        });
      }
    }
    return out.filter((i) => i.player);
  } catch (err) {
    console.error(`[injuries] ${league.sport} fetch failed:`, err);
    return [];
  }
}

export async function getInjuries(sport?: string): Promise<{ injuries: Injury[]; cached: boolean }> {
  const leagues = sport ? LEAGUES.filter((l) => l.sport === sport) : LEAGUES;
  if (leagues.length === 0) return { injuries: [], cached: false };

  const now = Date.now();
  const key = sport || "all";
  const hit = cache.get(key);
  if (hit && now - hit.at < CACHE_TTL_MS) {
    return { injuries: hit.data, cached: true };
  }

  const results = await Promise.all(leagues.map(fetchLeague));
  const injuries = results.flat();
  // Serve stale cache on total failure rather than an empty list
  if (injuries.length === 0 && hit) return { injuries: hit.data, cached: true };
  cache.set(key, { at: now, data: injuries });
  return { injuries, cached: false };
}
