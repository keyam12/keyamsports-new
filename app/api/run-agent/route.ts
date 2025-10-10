import { NextResponse } from 'next/server';

export async function GET() {
  const key = process.env.THESPORTSDB_KEY || '123';

  const sports = ['Soccer', 'Basketball', 'Baseball', 'American%20Football'];
  const allResults: any[] = [];

  try {
    // Fetch each sport sequentially
    for (const s of sports) {
      const res = await fetch(`https://www.thesportsdb.com/api/v1/json/${key}/livescore.php?s=${s}`);
      if (!res.ok) continue;
      const data = await res.json();
      if (data && data.events) {
        data.events.forEach((match: any) => {
          allResults.push({
            sport: decodeURIComponent(s),
            league: match.strLeague,
            teams: { home: match.strHomeTeam, away: match.strAwayTeam },
            scores: { home: match.intHomeScore, away: match.intAwayScore },
            time: match.strProgress || 'N/A',
          });
        });
      }
    }

    return NextResponse.json({ results: allResults });
  } catch (error: any) {
    console.error('Live score API error:', error);
    return NextResponse.json({ results: [], error: error.message }, { status: 500 });
  }
}
