'use client';
import NewsCard from '../components/NewsCard';
import LiveScoresWidget from '../components/LiveScoresWidget';
import OddsWidget from '../components/OddsWidget';
import FavoritesBar from '../components/FavoritesBar';
import AdSlot from '../components/AdSlot';
import { useEffect, useState } from 'react';

const ADSLOT = (name: string) =>
  (process.env as Record<string, string | undefined>)[`NEXT_PUBLIC_ADSLOT_${name}`] || '';

export default function Home() {
  const [aiText, setAiText] = useState('');
  const [loading, setLoading] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [allArticles, setAllArticles] = useState<any[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);

  // Articles come from /api/articles (Supabase when configured, otherwise
  // the built-in list) so admin-published notes appear without a deploy.
  useEffect(() => {
    fetch('/api/articles')
      .then((r) => r.json())
      .then((d) => setAllArticles(d.articles || []))
      .catch(() => setAllArticles([]))
      .finally(() => setFeedLoading(false));
  }, []);
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
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  async function runAgent() {
    setLoading(true);
    try {
      const res = await fetch('/api/run-agent');
      const json = await res.json();
      if (json.ok) setAiText(json.text || 'No output');
      else setAiText('Agent error: ' + json.error);
    } catch (e: any) {
      setAiText('Request failed: ' + String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* LEFT SIDE - Main Feed */}
      <div className="col-span-12 lg:col-span-8">
        <div className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-primary to-accent text-white p-10 rounded-2xl shadow-lg mb-6">
          <div className="absolute -top-10 -right-10 text-[120px] opacity-10 select-none">⚡️</div>
          <div className="flex items-center gap-2 mb-3">
            <span className="flex items-center gap-1.5 bg-green-500/90 text-xs font-bold px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> LIVE
            </span>
            <span className="text-sm opacity-80">{today}</span>
          </div>
          <h1 className="text-5xl font-extrabold mb-2 tracking-tight">KEYAM SPORTS ⚡️</h1>
          <p className="text-xl opacity-90">AI-powered sports news, around the clock.</p>
          <p className="text-sm opacity-70 mt-2">Real headlines · Live scores · Zero guesswork</p>
        </div>

        <div className="mb-6">
          <AdSlot slot={ADSLOT('HOME_TOP')} format="leaderboard" label="Top banner · 970×90" />
        </div>

        <section>
          <FavoritesBar onChange={(f, q) => { setFavorites(f); setQuery(q); }} />
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Latest Headlines</h2>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Updated 24/7 by AI</span>
          </div>
          {feedLoading ? (
            <p className="text-gray-500 bg-white border rounded-2xl p-5">Loading headlines…</p>
          ) : articles.length === 0 ? (
            <p className="text-gray-500 bg-white border rounded-2xl p-5">No headlines match your filters.</p>
          ) : null}
          <div className="space-y-4">
            {featured && <NewsCard article={featured} featured />}
            {rest.slice(0, 2).map((a: any, i: number) => (
              <NewsCard key={i} article={a} />
            ))}
            <AdSlot slot={ADSLOT('HOME_INFEED')} format="infeed" label="In-feed · after 2nd story" />
            {rest.slice(2).map((a: any, i: number) => (
              <NewsCard key={i + 2} article={a} />
            ))}
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-2xl font-bold mb-4">AI Headline Generator</h2>
          <div className="space-y-2">
            <button
              onClick={runAgent}
              className="px-4 py-2 bg-primary text-white rounded hover:bg-blue-700 transition"
              disabled={loading}
            >
              {loading ? 'Running…' : 'Generate AI Headline'}
            </button>
            <div className="p-4 border rounded bg-white min-h-[80px] text-gray-800">
              {aiText || 'AI output will appear here'}
            </div>
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
  );
}
