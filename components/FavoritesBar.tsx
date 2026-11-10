'use client';
import { useEffect, useState } from 'react';
import Icon, { sportIconName } from './Icon';

// Favorites + keyword search for the home feed.
// Favorites are stored in localStorage (v1 — no account needed).
// v2 moves them to the user account when the backend adds auth.

const SPORTS = [
  { id: 'basketball', label: 'Basketball' },
  { id: 'football', label: 'Football' },
  { id: 'baseball', label: 'Baseball' },
  { id: 'soccer', label: 'Soccer' },
];

const STORAGE_KEY = 'keyam-favorites';

export function loadFavorites(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function FavoritesBar({
  onChange,
}: {
  onChange: (favorites: string[], query: string) => void;
}) {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setFavorites(loadFavorites());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites)); } catch { /* Storage may be blocked. */ }
    onChange(favorites, query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [favorites, query, ready]);

  const toggle = (id: string) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  };

  return (
    <div className="bg-white border rounded-2xl p-4 shadow-sm mb-6">
      <div className="relative mb-3">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><Icon name="search" className="h-4 w-4" /></span>
      <input
        type="search"
        aria-label="Search headlines"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search headlines…"
        className="w-full border rounded-xl pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
      />
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-bold uppercase tracking-wider text-gray-400">My sports:</span>
        {SPORTS.map((s) => {
          const active = favorites.includes(s.id);
          return (
            <button
              key={s.id}
              aria-pressed={active}
              aria-label={s.label}
              onClick={() => toggle(s.id)}
              className={`inline-flex items-center gap-1.5 border text-xs font-bold px-3 py-1.5 rounded-full transition ${
                active ? 'border-primary bg-primary text-white' : 'border-gray-200 bg-white text-gray-600 hover:border-primary/40 hover:text-primary'
              }`}
            >
              <Icon name={sportIconName(s.id)} className="h-4 w-4" />
              {s.label}
              {active && <Icon name="check" className="h-3.5 w-3.5" />}
            </button>
          );
        })}
        {favorites.length > 0 && (
          <button
            onClick={() => setFavorites([])}
            className="text-xs text-gray-400 hover:text-gray-600 underline ml-1"
          >
            Show all
          </button>
        )}
      </div>
    </div>
  );
}
