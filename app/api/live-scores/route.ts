import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Placeholder demo data until you connect your real API
    const mockData = {
      results: [
        {
          league: 'NBA',
          teams: { home: 'Lakers', away: 'Celtics' },
          scores: { home: 108, away: 101 },
          time: 'Final',
        },
        {
          league: 'NFL',
          teams: { home: 'Eagles', away: 'Cowboys' },
          scores: { home: 24, away: 27 },
          time: 'Q4 03:25',
        },
        {
          league: 'MLB',
          teams: { home: 'Yankees', away: 'Red Sox' },
          scores: { home: 5, away: 4 },
          time: 'Top 9th',
        },
        {
          league: 'Soccer (La Liga)',
          teams: { home: 'Real Madrid', away: 'Barcelona' },
          scores: { home: 2, away: 2 },
          time: '90+2’',
        },
      ],
    };

    // Return JSON response
    return NextResponse.json(mockData);
  } catch (error: any) {
    console.error('Live score API error:', error);
    return NextResponse.json(
      { results: [], error: error.message },
      { status: 500 }
    );
  }
}
