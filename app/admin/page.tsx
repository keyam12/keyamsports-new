'use client';
import { useEffect, useState } from 'react';

interface Article {
  id: string;
  category: string;
  title: string;
  summary: string;
  date: string;
  ai: boolean;
  status: 'draft' | 'published';
  sources?: string[];
}

const CATEGORIES = ['basketball', 'football', 'baseball', 'soccer'];

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [articles, setArticles] = useState<Article[]>([]);
  const [configured, setConfigured] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ category: 'basketball', title: '', summary: '', sources: '', status: 'draft' as 'draft' | 'published' });

  async function load() {
    setLoading(true);
    setError('');
    const res = await fetch('/api/admin/articles');
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Failed to load articles.');
      setLoading(false);
      return;
    }
    setConfigured(data.configured !== false);
    setArticles(data.articles || []);
    setLoading(false);
  }

  useEffect(() => {
    if (authed) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed]);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setLoginError('');
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      setAuthed(true);
    } else {
      const data = await res.json();
      setLoginError(data.error || 'Wrong password.');
    }
  }

  async function setStatus(a: Article, status: 'draft' | 'published') {
    const res = await fetch('/api/admin/articles', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: a.id, status }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Article operation failed.");
      return;
    }
    load();
  }

  async function remove(a: Article) {
    if (!confirm(`Delete "${a.title}"?`)) return;
    const res = await fetch('/api/admin/articles', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: a.id }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Article operation failed.");
      return;
    }
    load();
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    const res = await fetch('/api/admin/articles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, sources: form.sources.split('\n').map((source) => source.trim()).filter(Boolean) }),
    });
    if (res.ok) {
      setForm({ category: 'basketball', title: '', summary: '', sources: '', status: 'draft' });
      load();
    } else {
      const data = await res.json();
      setError(data.error || 'Failed to create article.');
    }
  }

  async function seed() {
    if (!confirm('Copy the sample articles into the database?')) return;
    const res = await fetch('/api/admin/seed', { method: 'POST' });
    const data = await res.json();
    if (res.ok) load();
    else setError(data.error || 'Seed failed.');
  }

  if (!authed) {
    return (
      <div className="max-w-sm mx-auto">
        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <h1 className="text-xl font-bold mb-1">🔐 Admin</h1>
          <p className="text-sm text-gray-500 mb-4">Review and publish articles for KEYAM SPORTS.</p>
          <form onSubmit={login} className="space-y-3">
            <input
              type="password"
              aria-label="Admin password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Admin password"
              className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
            {loginError && <p className="text-sm text-red-600">{loginError}</p>}
            <button className="w-full bg-primary text-white font-bold py-2 rounded-xl text-sm">Enter</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">📰 Admin — Articles</h1>
        <a href="/agents" className="text-sm font-bold text-primary hover:underline">Editorial agents</a>
        <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
          {configured ? '● Database live' : '● Database not configured'}
        </span>
      </div>

      {!configured && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm">
          <p className="font-bold mb-1">Database not connected yet</p>
          <p className="text-gray-600">
            Existing repository publications remain visible while the database is disconnected. To publish from this panel:
            create a free project at supabase.com, run <code>supabase/articles.sql</code> in its SQL
            Editor, then add <code>NEXT_PUBLIC_SUPABASE_URL</code>,{' '}
            <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> and <code>SUPABASE_SERVICE_ROLE_KEY</code>{' '}
            to the Vercel env vars (and redeploy).
          </p>
        </div>
      )}

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>}

      <div className="bg-white border rounded-2xl p-5 shadow-sm">
        <h2 className="font-bold mb-3">New article</h2>
        <form onSubmit={create} className="space-y-3">
          <div className="flex gap-2">
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="border rounded-xl px-3 py-2 text-sm"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as 'draft' | 'published' })}
              className="border rounded-xl px-3 py-2 text-sm"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </div>
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            aria-label="Headline"
            placeholder="Headline"
            className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
          <textarea
            value={form.summary}
            onChange={(e) => setForm({ ...form, summary: e.target.value })}
            aria-label="Summary"
            placeholder="Summary"
            rows={3}
            className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
          <textarea value={form.sources} onChange={(e) => setForm({ ...form, sources: e.target.value })} placeholder="Source URLs — one HTTPS URL per line" aria-label="Source URLs" rows={3} className="w-full border rounded-xl px-3 py-2 text-sm" />
          <p className="text-xs text-gray-500">Publishing confirms you have checked the facts and sources. Sensitive or conflicting claims require human editorial review.</p>
          <button className="bg-primary text-white font-bold px-4 py-2 rounded-xl text-sm">Save article</button>
        </form>
      </div>

      <div className="bg-white border rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold">All articles ({articles.length})</h2>
          {configured && (
            <button onClick={seed} className="text-xs font-bold text-primary hover:underline">
              Import archive as drafts (development only)
            </button>
          )}
        </div>
        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : articles.length === 0 ? (
          <p className="text-sm text-gray-500">No articles yet. Create a sourced draft above.</p>
        ) : (
          <div className="space-y-3">
            {articles.map((a) => (
              <div key={a.id} className="border rounded-xl p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-sm">{a.title}</p>
                    <p className="text-xs text-gray-500">{a.category} · {a.date}{a.ai ? ' · 🤖 AI' : ''}</p>
                  </div>
                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full shrink-0 ${
                      a.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {a.status}
                  </span>
                </div>
                <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">{a.summary}</p>
                <ul className="mt-2 text-xs text-primary space-y-1">
                  {(a.sources || []).map((source) => <li key={source}><a href={source} target="_blank" rel="noopener noreferrer" className="break-all hover:underline">{source}</a></li>)}
                </ul>
                <div className="flex gap-3 mt-2">
                  {a.status === 'draft' ? (
                    <button onClick={() => setStatus(a, 'published')} className="text-xs font-bold text-green-600 hover:underline">
                      Publish
                    </button>
                  ) : (
                    <button onClick={() => setStatus(a, 'draft')} className="text-xs font-bold text-amber-600 hover:underline">
                      Unpublish
                    </button>
                  )}
                  <button onClick={() => remove(a)} className="text-xs font-bold text-red-600 hover:underline">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
