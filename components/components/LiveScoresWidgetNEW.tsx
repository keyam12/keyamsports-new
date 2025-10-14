'use client';
import { useEffect, useState } from 'react';

export default function LiveScoresWidget() {
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    loadScores();
    const interval = setInterval(loadScores, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading)
    return <div className="p-4 bg-white border rounded">Loading live scores...</div>;

  if (games.length === 0)
    return (
      <div className="p-4 bg-white border rounded text-center text-gray-600">
        ⚽🏀⚾🏈<br />
        <strong>No live games right now</strong>
        <p className="text-sm">Check back later for real-time updates.</p>
      </div>
    );

  return (
    <div className="border rounded p-4 bg-white">
      <h4 className="font-bold mb-3">Live Scores (TheSportsDB)</h4>
      <div className="space-y-4">
        {games.map((g, i) => (
          <div key={i} className="flex justify-between items-center border-b pb-2 gap-3">
            <div className="flex items-center gap-2">
              {g.teams.homeLogo && (
                <img
                  src={g.teams.homeLogo}
                  alt={g.teams.home}
                  className="w-6 h-6 rounded-full"
                />
              )}
              <span className="text-sm font-semibold">{g.teams.home}</span>
              <span className="text-xs text-gray-500">vs</span>
              <span className="text-sm font-semibold">{g.teams.away}</span>
              {g.teams.awayLogo && (
                <img
                  src={g.teams.awayLogo}
                  alt={g.teams.away}
                  className="w-6 h-6 rounded-full"
                />
              )}
            </div>
            <div className="text-right">
              <div className="font-bold text-lg">
                {g.scores.home}-{g.scores.away}
              </div>
              <div className="text-xs text-gray-500">
                {g.league} ({g.time})
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
