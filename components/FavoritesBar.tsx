'use client';
import { useEffect, useState } from 'react';

// Favorites + keyword search for the home feed.
// Favorites are stored in localStorage (v1 — no account needed).
// v2 moves them to the user account when the backend adds auth.

const SPORTS = [
  { id: 'basketball', label: '🏀 Basketball' },
  { id: 'baseball', label: '⚾ Baseball' },
  { id: 'soccer', label: '⚽ Soccer' },
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
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
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="🔍 Search headlines…"
        className="w-full border rounded-xl px-3 py-2 text-sm mb-3 outline-none focus:ring-2 focus:ring-primary/30"
      />
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-bold uppercase tracking-wider text-gray-400">My sports:</span>
        {SPORTS.map((s) => {
          const active = favorites.includes(s.id);
          return (
            <button
              key={s.id}
              onClick={() => toggle(s.id)}
              className={`text-xs font-bold px-3 py-1.5 rounded-full transition ${
                active ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {active ? '★ ' : ''}{s.label}
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
