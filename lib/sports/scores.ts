/** Initial provider boundary. Snapshot results are never advertised as live. */
export interface Score {
  id: string;
  league: string;
  teams: { home: string; away: string };
  scores: { home: number | null; away: number | null };
  time: string;
  eventDate: string;
}
export interface ScoreSnapshot {
  live: false;
  results: Score[];
  updatedAt: string | null; // Successful provider retrieval time, not event time.
  stale: boolean;
  available: boolean;
  configured: boolean;
  provider: string;
}
export interface ScoresProvider {
  name: string;
  fetchScores(): Promise<Score[]>;
}

function score(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string" && typeof value !== "number") return null;
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 ? n : null;
}

export function parseEvent(event: unknown): Score | null {
  if (!event || typeof event !== "object") return null;
  const e = event as Record<string, unknown>;
  if (typeof e.idEvent !== "string" || typeof e.strHomeTeam !== "string" ||
      typeof e.strAwayTeam !== "string" || !e.strHomeTeam.trim() || !e.strAwayTeam.trim() ||
      typeof e.dateEvent !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(e.dateEvent) ||
      !Number.isFinite(Date.parse(e.dateEvent))) return null;
  return {
    id: e.idEvent, league: typeof e.strLeague === "string" ? e.strLeague : "",
    teams: { home: e.strHomeTeam, away: e.strAwayTeam },
    scores: { home: score(e.intHomeScore), away: score(e.intAwayScore) },
    time: typeof e.strStatus === "string" && e.strStatus ? e.strStatus : "Status unavailable",
    eventDate: e.dateEvent,
  };
}

const sportsDB: ScoresProvider = {
  name: "TheSportsDB",
  async fetchScores() {
    const key = process.env.THESPORTSDB_API_KEY;
    if (!key) throw new Error("Scores provider is not configured");
    const date = new Date().toISOString().slice(0, 10);
    // eventsday is a date snapshot endpoint, not a guaranteed live feed.
    const response = await fetch(
      `https://www.thesportsdb.com/api/v1/json/${encodeURIComponent(key)}/eventsday.php?d=${date}`,
      { signal: AbortSignal.timeout(6000), cache: "no-store" }
    );
    if (!response.ok) throw new Error(`Scores provider HTTP ${response.status}`);
    const data = await response.json();
    if (!data || !(data.events === null || Array.isArray(data.events))) throw new Error("Invalid scores response");
    const leagues = new Set(["4387", "4391", "4424", "4328"]); // NBA, NFL, MLB, EPL
    const events = (data.events || []).filter((e: any) => leagues.has(String(e?.idLeague)) && e?.dateEvent === date);
    return events.map(parseEvent).filter((e: Score | null): e is Score => e !== null);
  },
};

// Per-instance protection; Phase C adds shared Redis caching and provider budgets.
const TTL = 60_000;
let cached: ScoreSnapshot | null = null;
let pending: Promise<ScoreSnapshot> | null = null;

export async function getScores(): Promise<ScoreSnapshot> {
  const configured = !!process.env.THESPORTSDB_API_KEY;
  const empty: ScoreSnapshot = {
    live: false, results: [], updatedAt: null, stale: false, available: false, configured, provider: sportsDB.name,
  };
  if (!configured) return empty;
  if (cached?.updatedAt && Date.now() - Date.parse(cached.updatedAt) < TTL) return cached;
  if (pending) return pending;
  pending = (async () => {
    try {
      const results = await sportsDB.fetchScores();
      cached = { ...empty, results, available: true, updatedAt: new Date().toISOString() };
      return cached;
    } catch {
      // Do not replay old scores after provider failure.
      return { ...empty, updatedAt: cached?.updatedAt || null, stale: !!cached };
    } finally { pending = null; }
  })();
  return pending;
}
