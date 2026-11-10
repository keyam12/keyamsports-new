// Recent-coverage memory for the Scout.
// Reads the site's own published articles (bundled with the deploy) so the
// Scout doesn't pick a storyline it just covered. Vercel serverless has no
// persistent filesystem between runs, but the data file ships with the
// bundle, which is enough for a rolling 48h window.
import articlesData from "../data/published.json";

export function getRecentTopics(hoursBack = 48): string[] {
  const cutoff = Date.now() - hoursBack * 3600_000;
  const arts: unknown = (articlesData as { articles?: unknown }).articles;
  if (!Array.isArray(arts)) return [];
  return arts
    .filter((a) => {
      const d = (a as { date?: unknown })?.date;
      if (typeof d !== "string") return false;
      // Date-only values ("2026-11-06") parse as midnight UTC, so an
      // article dated Nov 6 fell out of the 48h window by Nov 6 13:31 UTC
      // — that is how the Scout re-picked the Blue Jays / Santander story
      // on 2026-11-08 09:31 AST, a day after it was published. Treat a
      // date-only value as end of that day, when the story was still live.
      const t = /^\d{4}-\d{2}-\d{2}$/.test(d)
        ? Date.parse(`${d}T23:59:59.999Z`)
        : Date.parse(d);
      return !Number.isNaN(t) && t >= cutoff;
    })
    .map((a) => String((a as { title?: unknown })?.title ?? "").trim())
    .filter((t) => t.length > 0);
}

// Words that carry no storyline identity on their own — dropped so keyword
// matching compares the distinctive nouns/names, not headline filler.
const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "of", "to", "in", "on", "for", "with",
  "amid", "among", "after", "before", "during", "while", "without", "from",
  "into", "over", "under", "about", "against", "versus", "vs", "as", "at",
  "by", "its", "his", "her", "their", "will", "would", "could", "should",
  "says", "said", "amid", "amidst",
  // generic headline verbs — the story is in the nouns, not these
  "returns", "return", "faces", "face", "turns", "turn", "opens", "open",
  "wins", "win", "beats", "beat", "rally", "past", "drops", "drop",
  "scores", "score", "seals", "stuns", "takes", "take", "hits", "hit",
  "gets", "get", "sets", "set", "puts", "put", "goes", "go", "comes",
  "come", "makes", "make", "looks", "look", "eyes", "eye",
]);

/**
 * Distinctive keywords of a topic, for same-story detection.
 * Exact-title matching failed on 2026-11-05: the Scout was told to exclude
 * "Guardians pitchers face scrutiny in pitch-rigging trial" and picked
 * "Guardians pitch-rigging trial" — same story, different wording.
 * Keywords catch that: the two share guardians/pitch/rigging/trial.
 */
export function extractTopicKeywords(topic: string): string[] {
  const seen = new Set<string>();
  for (const raw of topic
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")) {
    const w = raw.trim();
    if (w.length < 3 || STOPWORDS.has(w) || seen.has(w)) continue;
    seen.add(w);
  }
  return [...seen];
}

/**
 * One prompt-ready line per covered topic: the full title plus its
 * keywords, so the Scout can recognise the same story under a
 * different headline. A headline counts as the same story when it
 * shares 2+ keywords with a blocked topic; one shared word alone
 * (e.g. only a team name — Eagles/Milton vs Eagles/Hurts are different
 * stories) does not count.
 */
export function formatCoveredTopics(topics: string[]): string {
  return topics
    .map((t) => {
      const kws = extractTopicKeywords(t);
      return kws.length > 0 ? `- "${t}" (keywords: ${kws.join(", ")})` : `- "${t}"`;
    })
    .join("\n");
}
