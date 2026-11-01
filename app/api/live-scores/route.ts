// GET /api/live-scores — real scores via TheSportsDB free API,
// with clearly-labeled demo fallback if the free API is unreachable.
// Response: { live: boolean, results: [...] }
export const dynamic = "force-dynamic";

const API = "https://www.thesportsdb.com/api/v1/json/123"; // free tier key

async function fetchJson(url: string, timeoutMs = 6000): Promise<any> {
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

const demoResults = [
  {
    league: "NBA",
    teams: { home: "Lakers", away: "Celtics" },
    scores: { home: 108, away: 101 },
    time: "Final",
  },
  {
    league: "NBA",
    teams: { home: "Warriors", away: "Suns" },
    scores: { home: 115, away: 112 },
    time: "Q4 02:14",
  },
];

function toResult(e: any) {
  return {
    league: e.strLeague || e.strSport || "Soccer",
    teams: { home: e.strHomeTeam || "Home", away: e.strAwayTeam || "Away" },
    scores: {
      home: Number(e.intHomeScore ?? 0),
      away: Number(e.intAwayScore ?? 0),
    },
    time:
      e.strStatus && e.strStatus !== "Not Started"
        ? e.strStatus
        : e.strProgress || e.dateEvent || "Scheduled",
  };
}

export async function GET() {
  try {
    const [liveSoccer, lastNba] = await Promise.all([
      fetchJson(`${API}/livescore.php?s=Soccer`).catch(() => null),
      fetchJson(`${API}/eventslast.php?id=4387`).catch(() => null), // 4387 = NBA
    ]);

    const results: any[] = [];
    // livescore.php returns { livescore: [...] }; other endpoints use { events: [...] }
    const liveEvents = liveSoccer?.livescore || liveSoccer?.events || [];
    for (const e of liveEvents.slice(0, 4)) results.push(toResult(e));
    const nbaEvents = lastNba?.results || lastNba?.events || [];
    for (const e of nbaEvents.slice(0, 3)) results.push(toResult(e));

    if (results.length > 0) {
      return Response.json({ live: true, results });
    }
    throw new Error("No events returned");
  } catch {
    return Response.json({ live: false, results: demoResults });
  }
}
