'use client';
import { useEffect, useState } from 'react';

export default function LiveScoresWidget() {
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadScores() {
      try {
        const res = await fetch('/api/live-scores');
        const data = await res.json();
        setGames(data.results || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadScores();
  }, []);

  if (loading)
    return <div className="p-4 bg-white border rounded">Loading live scores...</div>;

  if (games.length === 0)
    return (
      <div className="p-4 bg-white border rounded text-center text-gray-600">
        ⚽🏀⚾🏈 <br />
        <strong>No live games right now</strong>
        <p className="text-sm">Check back later for real-time updates.</p>
      </div>
    );

  return (
    <div className="border rounded p-4 bg-white">
      <h4 className="font-bold mb-2">Live Scores (TheSportsDB)</h4>
      <div className="space-y-3">
        {games.map((g, i) => (
          <div key={i} className="flex justify-between border-b pb-2">
            <div>
              <div className="font-semibold text-sm">{g.sport} - {g.league}</div>
              <div className="text-xs text-gray-500">
                {g.teams.home} vs {g.teams.away}
              </div>
            </div>
            <div className="font-bold">{g.scores.home} - {g.scores.away}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
