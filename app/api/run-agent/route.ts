import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const key = process.env.THESPORTSDB_KEY || '123';
    const url = `https://www.thesportsdb.com/api/v1/json/${key}/livescore.php?s=Soccer`;

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`API request failed with status ${res.status}`);
    }

    const data = await res.json();
    if (!data || !data.events) {
      return NextResponse.json({ results: [], note: "No live matches or invalid response" });
    }

    const results = data.events.map((match: any) => ({
      league: match.strLeague,
      teams: { home: match.strHomeTeam, away: match.strAwayTeam },
      scores: { home: match.intHomeScore, away: match.intAwayScore },
      time: match.strProgress || "N/A",
    }));

    return NextResponse.json({ results });
  } catch (error: any) {
    console.error("Live score API error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
