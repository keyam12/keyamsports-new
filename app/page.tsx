'use client';
import NewsCard from '../components/NewsCard';
import LiveScoresWidget from '../components/LiveScoresWidget';
import sample from '../data/sample.json';
import { useState } from 'react';

export default function Home() {
  const [aiText, setAiText] = useState('');
  const [loading, setLoading] = useState(false);

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
        <div className="bg-gradient-to-r from-primary to-accent text-white p-10 rounded-2xl shadow-lg text-center mb-8">
          <h1 className="text-5xl font-bold mb-2">KEYAM SPORTS ⚡️</h1>
          <p className="text-xl">24/7 AI — Never Miss Anything ⚡️</p>
        </div>

        <section>
          <h2 className="text-2xl font-bold mb-4">Latest Headlines</h2>
          <div className="space-y-4">
            {sample.articles.map((a: any, i: number) => (
              <NewsCard key={i} article={a} />
            ))}
          </div>
        </section>

        <section className="mt-6">
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

      {/* RIGHT SIDE - Live Scores Widget */}
      <aside className="col-span-12 lg:col-span-4 space-y-6">
        <LiveScoresWidget />
      </aside>
    </div>
  );
}
