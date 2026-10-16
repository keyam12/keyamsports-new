'use client';
import NewsCard from '../components/NewsCard';
import LiveScoresWidget from '../components/LiveScoresWidget';
import sample from '../data/sample.json';
import { useState } from 'react';

export default function Home() {
  const [aiText, setAiText] = useState('');
  const [sourceText, setSourceText] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [loading, setLoading] = useState(false);

  async function runAgent() {
    if (sourceText.trim().length < 40) {
      setAiText('Add at least 40 characters of verified source information.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/run-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceText, sourceUrl }),
      });
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
          <h2 className="text-2xl font-bold mb-4">GPT-6 Editorial Draft Assistant</h2>
          <p className="mb-3 text-sm text-gray-600">Provide verified sports facts before generating a draft. All drafts require editorial review.</p>
          <div className="space-y-2">
            <textarea aria-label="Verified source material" value={sourceText} onChange={(e) => setSourceText(e.target.value)} placeholder="Paste verified game details, scores, quotes, and context (at least 40 characters)" className="w-full border rounded p-3 text-gray-900" rows={5} maxLength={12000} />
            <input aria-label="Source URL" type="url" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="Source URL (optional)" className="w-full border rounded p-3 text-gray-900" />
            <button
              onClick={runAgent}
              className="px-4 py-2 bg-primary text-white rounded hover:bg-blue-700 transition"
              disabled={loading || sourceText.trim().length < 40}
            >
              {loading ? 'Running…' : 'Generate Editorial Draft'}
            </button>
            <div className="p-4 border rounded bg-white min-h-[80px] text-gray-800">
              {aiText || 'Editorial draft will appear here'}
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
