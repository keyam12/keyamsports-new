// Real sports headlines feed (ESPN public API — free, no key needed).
// The Scout uses these so it picks storylines from actual news
// instead of the model's memory.

export interface Headline {
  sport: string;
  headline: string;
  description: string;
  link: string;
  published: string;
}

const FEEDS: { sport: string; url: string }[] = [
  { sport: "NBA", url: "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/news?limit=6" },
  { sport: "NFL", url: "https://site.api.espn.com/apis/site/v2/sports/football/nfl/news?limit=6" },
  { sport: "MLB", url: "https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/news?limit=6" },
  { sport: "Soccer", url: "https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/news?limit=6" },
];

async function fetchFeed(sport: string, url: string, timeoutMs = 7000): Promise<Headline[]> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) return [];
    const data = await res.json();
    const articles = data?.articles || [];
    return articles.slice(0, 6).map((a: any) => ({
      sport,
      headline: String(a.headline || "").trim(),
      description: String(a.description || "").trim(),
      link: String(a.links?.web?.href || ""),
      published: String(a.published || ""),
    })).filter((h: Headline) => h.headline.length > 0);
  } catch {
    return [];
  } finally {
    clearTimeout(t);
  }
}

/** Returns today's real sports headlines across leagues (empty array on failure).
 *  Pass a sport (NBA, NFL, MLB, Soccer) to fetch only that league's feed. */
export async function getHeadlines(sport?: string): Promise<Headline[]> {
  const feeds = sport ? FEEDS.filter((f) => f.sport === sport) : FEEDS;
  const results = await Promise.all(feeds.map((f) => fetchFeed(f.sport, f.url)));
  return results.flat();
}

/** Formats headlines as a numbered list for the Scout's prompt.
 *  Each headline carries its source URL so the Scout can cite it. */
export function formatHeadlines(headlines: Headline[]): string {
  return headlines
    .map((h, i) => `${i + 1}. [${h.sport}] ${h.headline}${h.description ? ` — ${h.description}` : ""}${h.link ? `\n   Source: ${h.link}` : ""}`)
    .join("\n");
}
