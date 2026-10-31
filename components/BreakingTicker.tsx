'use client';
import { useEffect, useState } from 'react';

const FALLBACK = 'KEYAM SPORTS — 24/7 AI — Never Miss Anything ⚡️';

export default function BreakingTicker() {
  const [text, setText] = useState(FALLBACK);

  useEffect(() => {
    const load = () => {
      try {
        const raw = localStorage.getItem('keyam-last-article');
        if (raw) {
          const parsed = JSON.parse(raw) as { headline?: string };
          if (parsed.headline) setText(`📰 ${parsed.headline}`);
        }
      } catch {
        /* ignore */
      }
    };
    load();
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'keyam-last-article') load();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const loop = `${text}   •   ${text}   •   `;

  return (
    <div className="bg-gray-900 text-white overflow-hidden">
      <div className="flex items-stretch">
        <span className="bg-red-600 px-3 py-1.5 text-xs font-extrabold tracking-wider shrink-0 z-10 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
          BREAKING
        </span>
        <div className="relative flex-1 overflow-hidden">
          <div className="animate-marquee whitespace-nowrap py-1.5 text-sm inline-block will-change-transform">
            {loop}
          </div>
        </div>
      </div>
    </div>
  );
}
