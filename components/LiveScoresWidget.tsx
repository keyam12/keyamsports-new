'use client';
import { useEffect, useState } from 'react';
import Icon, { type IconName } from './Icon';

export default function LiveScoresWidget() {
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [available, setAvailable] = useState(false);

  async function loadScores() {
    try {
      const res = await fetch('/api/live-scores');
      if (!res.ok) throw new Error("Scores unavailable");
      const data = await res.json();
      setGames(data.results || []);
      setAvailable(data.available === true);
      setUpdatedAt(data.updatedAt || null);
    } catch (err) {
      setGames([]);
      setAvailable(false);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadScores();
    const interval = setInterval(loadScores, 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading)
    return <div className="p-4 bg-white border rounded">Loading live scores...</div>;

  if (games.length === 0)
    return (
      <div className="p-4 bg-white border rounded text-center text-gray-600">
        <div className="mb-2 flex justify-center gap-2 text-gray-400">{(['soccer', 'basketball', 'baseball', 'football'] as IconName[]).map(sport => <Icon key={sport} name={sport} className="h-4 w-4" />)}</div>
        <strong>{available ? "No games in the current scores feed" : "Scores are temporarily unavailable"}</strong>
        <p className="text-sm">Check back later for score updates.</p>
      </div>
    );

  return (
    <div className="border rounded p-4 bg-white">
      <h4 className="font-bold mb-1">Scores <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 align-middle">SNAPSHOT</span></h4>
      <p className="text-xs text-gray-500 mb-3">{updatedAt && <>Last checked <time dateTime={updatedAt}>{new Date(updatedAt).toLocaleString()}</time>. </>}Periodic results; not a real-time feed.</p>
      <div className="space-y-4">
        {games.map((g, i) => (
          <div
            key={i}
            className="flex justify-between items-center border-b pb-2 gap-3"
          >
            <div className="flex items-center gap-2">
              {g.teams?.homeLogo && (
                <img
                  src={g.teams.homeLogo}
                  alt={g.teams.home}
                  className="w-6 h-6 rounded-full"
                />
              )}
              <span className="text-sm font-semibold">{g.teams?.home}</span>
              <span className="text-xs text-gray-500">vs</span>
              <span className="text-sm font-semibold">{g.teams?.away}</span>
              {g.teams?.awayLogo && (
                <img
                  src={g.teams.awayLogo}
                  alt={g.teams.away}
                  className="w-6 h-6 rounded-full"
                />
              )}
            </div>
            <div className="text-right">
              <div className="font-bold text-lg">
                {g.scores?.home ?? '—'}-{g.scores?.away ?? '—'}
              </div>
              <div className="text-xs text-gray-500">
                {g.league} ({g.time}) · {g.eventDate}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
