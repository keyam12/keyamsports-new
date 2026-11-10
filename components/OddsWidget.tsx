'use client';
import { useEffect, useState } from 'react';
import Icon from './Icon';

const SPORTS = [
  { id: 'nba', label: 'NBA' },
  { id: 'nfl', label: 'NFL' },
  { id: 'mlb', label: 'MLB' },
  { id: 'soccer', label: 'Soccer' },
];

interface Odd {
  home: string;
  away: string;
  commenceTime: string;
  bookmakers: { name: string; home: number | null; away: number | null }[];
}

function fmtAmerican(price: number | null): string {
  if (price === null || price === undefined) return '—';
  return price > 0 ? `+${price}` : `${price}`;
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

export default function OddsWidget({ limit = 5 }: { limit?: number }) {
  const [sport, setSport] = useState('nba');
  const [odds, setOdds] = useState<Odd[]>([]);
  const [configured, setConfigured] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/odds?sport=${sport}`)
      .then((r) => r.json())
      .then((d) => {
        setOdds(d.odds || []);
        setConfigured(d.configured !== false);
      })
      .catch(() => setOdds([]))
      .finally(() => setLoading(false));
  }, [sport]);

  return (
    <div className="bg-white border rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="flex items-center gap-2 font-bold text-lg"><Icon name="chart" className="h-5 w-5 text-primary" /> Betting Odds</h3>
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Moneyline · US</span>
      </div>
      <div className="flex gap-1.5 mb-4 flex-wrap">
        {SPORTS.map((s) => (
          <button
            key={s.id}
            onClick={() => setSport(s.id)}
            className={`text-xs font-bold px-2.5 py-1.5 rounded-full transition ${
              sport === s.id ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
      {loading ? (
        <p className="text-sm text-gray-500">Loading odds…</p>
      ) : !configured ? (
        <p className="text-sm text-gray-500">
          Odds feed not connected yet — the API key is pending. Lines will appear here once it&apos;s live.
        </p>
      ) : odds.length === 0 ? (
        <p className="text-sm text-gray-500">No upcoming games with odds right now.</p>
      ) : (
        <div className="space-y-3">
          {odds.slice(0, limit).map((o, i) => (
            <div key={i} className="border-b last:border-0 pb-3 last:pb-0">
              <div className="flex justify-between text-sm">
                <span className="font-semibold">{o.away} @ {o.home}</span>
                <span className="text-gray-400 text-xs">{fmtDate(o.commenceTime)}</span>
              </div>
              <div className="flex gap-3 mt-1 text-xs text-gray-600">
                {o.bookmakers.slice(0, 3).map((b, j) => (
                  <span key={j}>
                    <span className="font-semibold">{b.name}</span> {fmtAmerican(b.away)} / {fmtAmerican(b.home)}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="text-[11px] text-gray-400 mt-3">Informational only — no bets are accepted on this site.</p>
    </div>
  );
}
