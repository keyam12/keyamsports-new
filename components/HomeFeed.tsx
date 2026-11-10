'use client';
import NewsCard from './NewsCard';
import Icon, { type IconName } from './Icon';
import LiveScoresWidget from './LiveScoresWidget';
import OddsWidget from './OddsWidget';
import FavoritesBar from './FavoritesBar';
import AdSlot from './AdSlot';
import { useState } from 'react';
import type { Article } from '../lib/articles';

const slots: Record<string, string> = { HOME_TOP: process.env.NEXT_PUBLIC_ADSLOT_HOME_TOP || '', HOME_INFEED: process.env.NEXT_PUBLIC_ADSLOT_HOME_INFEED || '', SIDEBAR_TOP: process.env.NEXT_PUBLIC_ADSLOT_SIDEBAR_TOP || '' };
const ADSLOT = (name: string) => slots[name] || '';

export default function HomeFeed({ initialArticles, today }: { initialArticles: Article[]; today: string }) {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const allArticles = initialArticles;
  const feedLoading = false;
  const articles = allArticles.filter((a) => {
    const favOk = favorites.length === 0 || favorites.includes(a.category);
    const q = query.trim().toLowerCase();
    const qOk =
      !q ||
      a.title.toLowerCase().includes(q) ||
      a.summary.toLowerCase().includes(q);
    return favOk && qOk;
  });
  const [featured, ...rest] = articles;
  const sportsCount = new Set(allArticles.map((a: any) => a.category)).size;

  return (
    <div>
      {/* HERO — estilo reel: rojo full-bleed, titular gigante, lima solo en detalles */}
      <section className="bg-primary text-white -mx-6 -mt-6 px-6 pt-10 pb-10 mb-6 relative overflow-hidden">
        <div className="flex items-center gap-2 mb-5">
          <span className="flex items-center gap-1.5 bg-accent text-ink text-xs font-bold px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-ink animate-pulse" /> LIVE
          </span>
          <span className="text-sm opacity-80">{today}</span>
        </div>
        <h1 className="font-display font-bold uppercase leading-[0.85] tracking-tight text-[19vw] sm:text-8xl lg:text-[7.5rem]">
          Keyam
          <br />
          Sports<span className="text-accent">.</span>
        </h1>
        <svg className="w-56 sm:w-80 mt-2" viewBox="0 0 300 20" fill="none" aria-hidden="true">
          <path d="M5 13 Q 45 4, 80 10 T 150 10 T 220 10 T 295 8" stroke="#D9FF3D" strokeWidth="6" strokeLinecap="round" />
        </svg>
        <p className="text-xl opacity-90 mt-4">AI-powered sports news, around the clock.</p>
        <p className="text-sm opacity-70 mt-1">Real headlines · Live scores · Zero guesswork</p>
        <div className="flex flex-wrap gap-3 mt-6">
          <a href="#headlines" className="inline-flex items-center gap-2 bg-accent text-ink font-bold px-5 py-2.5 rounded-full hover:opacity-90 transition">Ver las noticias <Icon name="arrowDown" className="h-4 w-4" /></a>
          <a href="/odds" className="inline-flex items-center gap-2 border-2 border-white/70 font-bold px-5 py-2.5 rounded-full hover:bg-white/10 transition"><Icon name="chart" className="h-4 w-4" /> Ver odds</a>
        </div>
        <div className="flex items-center gap-3 mt-8">
          <div className="flex -space-x-2">
            {(['basketball', 'baseball', 'soccer', 'football'] as IconName[]).map((sport) => (
              <span key={sport} className="w-9 h-9 rounded-full bg-white text-ink flex items-center justify-center ring-2 ring-primary"><Icon name={sport} /></span>
            ))}
          </div>
          <p className="text-sm opacity-80">Todos los deportes, en un solo lugar</p>
        </div>
        <div className="flex gap-8 mt-8 pt-6 border-t border-white/25">
          <div>
            <p className="font-display text-3xl font-bold leading-none">{articles.length || '—'}</p>
            <p className="text-[11px] uppercase tracking-wider opacity-80 mt-1">Artículos</p>
          </div>
          <div>
            <p className="font-display text-3xl font-bold leading-none">{sportsCount || '—'}</p>
            <p className="text-[11px] uppercase tracking-wider opacity-80 mt-1">Deportes</p>
          </div>
          <div>
            <p className="font-display text-3xl font-bold leading-none">24/7</p>
            <p className="text-[11px] uppercase tracking-wider opacity-80 mt-1">Redacción AI</p>
          </div>
        </div>
      </section>

      <div className="mb-6">
        <AdSlot slot={ADSLOT('HOME_TOP')} format="leaderboard" label="Top banner · 970×90" />
      </div>

      <div className="grid grid-cols-12 gap-6">
      {/* LEFT SIDE - Main Feed */}
      <div className="col-span-12 lg:col-span-8">
        <section id="headlines">
          <FavoritesBar onChange={(f, q) => { setFavorites(f); setQuery(q); }} />
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display text-3xl font-bold uppercase tracking-tight">Latest Headlines</h2>
              <div className="h-1 w-14 bg-primary rounded-full mt-2" />
            </div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Updated 24/7 by AI</span>
          </div>
          {feedLoading ? (
            <p className="text-gray-500 bg-white border rounded-2xl p-5">Loading headlines…</p>
          ) : articles.length === 0 ? (
            <p className="text-gray-500 bg-white border rounded-2xl p-5">{allArticles.length === 0 ? "No published headlines are available right now." : "No headlines match your filters."}</p>
          ) : null}
          <div className="space-y-4">
            {featured && <NewsCard article={featured} featured />}
            {rest.slice(0, 2).map((a: any, i: number) => (
              <NewsCard key={a.id} article={a} />
            ))}
            <AdSlot slot={ADSLOT('HOME_INFEED')} format="infeed" label="In-feed · after 2nd story" />
            {rest.slice(2).map((a: any, i: number) => (
              <NewsCard key={a.id} article={a} />
            ))}
          </div>
        </section>
      </div>

      {/* RIGHT SIDE - Sidebar */}
      <aside className="col-span-12 lg:col-span-4 space-y-6">
        <AdSlot slot={ADSLOT('SIDEBAR_TOP')} format="rectangle" label="Sidebar · 300×250" />
        <LiveScoresWidget />
        <OddsWidget />
      </aside>
      </div>
    </div>
  );
}
