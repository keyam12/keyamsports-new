'use client';
import { useEffect, useRef, useState } from 'react';
import { AGENT_META } from '../../agents/types';
import type { AgentEvent, AgentId, AgentStatus } from '../../agents/types';

const ORDER: AgentId[] = ['scout', 'writer', 'stats', 'editor'];

const DOT: Record<AgentStatus, string> = {
  idle: 'bg-gray-300',
  running: 'bg-amber-400 animate-pulse',
  done: 'bg-green-500',
  failed: 'bg-red-500',
};

const LABEL: Record<AgentStatus, string> = {
  idle: 'Idle',
  running: 'Working…',
  done: 'Done',
  failed: 'Failed',
};

const CARD_RING: Record<AgentStatus, string> = {
  idle: 'border-gray-200',
  running: 'border-amber-400 ring-2 ring-amber-200',
  done: 'border-green-400',
  failed: 'border-red-400',
};

const idleStatuses = (): Record<AgentId, AgentStatus> => ({
  scout: 'idle',
  writer: 'idle',
  stats: 'idle',
  editor: 'idle',
});

interface HistoryItem {
  at: string;
  topic: string;
  headline: string;
  article: string;
}

function formatElapsed(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export default function AgentsPage() {
  const [statuses, setStatuses] = useState<Record<AgentId, AgentStatus>>(idleStatuses);
  const [logs, setLogs] = useState<AgentEvent[]>([]);
  const [article, setArticle] = useState('');
  const [typed, setTyped] = useState('');
  const [demo, setDemo] = useState<boolean | null>(null);
  const [running, setRunning] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const feedRef = useRef<HTMLDivElement>(null);

  // Load run history
  useEffect(() => {
    try {
      setHistory(JSON.parse(localStorage.getItem('keyam-agent-history') || '[]'));
    } catch {
      /* ignore */
    }
  }, []);

  // Auto-scroll the live feed
  useEffect(() => {
    const el = feedRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [logs]);

  // Elapsed timer while running
  useEffect(() => {
    if (!running || startedAt === null) return;
    const id = setInterval(() => setElapsed(Date.now() - startedAt), 250);
    return () => clearInterval(id);
  }, [running, startedAt]);

  // Typewriter reveal for the final article
  useEffect(() => {
    setTyped('');
    if (!article) return;
    let i = 0;
    const id = setInterval(() => {
      i += 4;
      setTyped(article.slice(0, i));
      if (i >= article.length) clearInterval(id);
    }, 12);
    return () => clearInterval(id);
  }, [article]);

  function handleEvent(ev: AgentEvent) {
    setLogs((prev) => [...prev.slice(-199), ev]);
    if (ev.agent) {
      const id = ev.agent;
      if (ev.type === 'agent_started') setStatuses((s) => ({ ...s, [id]: 'running' }));
      if (ev.type === 'agent_done') setStatuses((s) => ({ ...s, [id]: 'done' }));
      if (ev.type === 'agent_failed') setStatuses((s) => ({ ...s, [id]: 'failed' }));
    }
    if (ev.type === 'run_done') {
      const ctx = (ev as { payload?: { article?: string; demo?: boolean; topic?: string } }).payload;
      if (ctx?.article) {
        setArticle(ctx.article);
        const headline = ctx.article.split('\n')[0].replace(/^🏆\s*/, '').trim();
        const item: HistoryItem = {
          at: new Date().toISOString(),
          topic: ctx.topic || 'Sports',
          headline,
          article: ctx.article,
        };
        try {
          const next = [item, ...history].slice(0, 5);
          setHistory(next);
          localStorage.setItem('keyam-agent-history', JSON.stringify(next));
          localStorage.setItem('keyam-last-article', JSON.stringify({ headline, at: item.at }));
        } catch {
          /* ignore */
        }
      }
      if (typeof ctx?.demo === 'boolean') setDemo(ctx.demo);
      setRunning(false);
    }
  }

  function startRun() {
    if (running) return;
    setRunning(true);
    setLogs([]);
    setArticle('');
    setDemo(null);
    setStatuses(idleStatuses());
    setStartedAt(Date.now());
    setElapsed(0);

    const src = new EventSource('/api/agents');
    src.onmessage = (m) => {
      try {
        const ev = JSON.parse(m.data) as AgentEvent;
        handleEvent(ev);
        if (ev.type === 'run_done') src.close();
      } catch {
        /* ignore malformed chunk */
      }
    };
    src.onerror = () => {
      src.close();
      setRunning(false);
    };
  }

  const doneCount = ORDER.filter((id) => statuses[id] === 'done').length;

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="bg-gradient-to-r from-primary to-accent text-white p-10 rounded-2xl shadow-lg text-center animate-fade-up">
        <div className="flex items-center justify-center gap-3 mb-2">
          <h1 className="text-4xl font-bold">🤖 AI Agents Control Room</h1>
          {running && (
            <span className="flex items-center gap-1.5 bg-red-600 text-white text-xs font-extrabold px-2.5 py-1 rounded-full">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              LIVE
            </span>
          )}
        </div>
        <p className="text-lg">Four independent agents. One breaking sports story. Watch them work live.</p>
        <div className="mt-3 flex items-center justify-center gap-3 text-sm">
          {demo !== null && (
            <span className="inline-block px-3 py-1 rounded-full font-semibold bg-white/20">
              {demo ? '🎭 Demo mode — add OPENAI_API_KEY for real AI' : '⚡️ Live AI mode'}
            </span>
          )}
          {(running || elapsed > 0) && (
            <span className="inline-block px-3 py-1 rounded-full font-mono bg-black/25">
              ⏱ {formatElapsed(elapsed)}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={startRun}
          disabled={running}
          className="px-6 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-blue-700 hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:transform-none"
        >
          {running ? 'Agents are working…' : '▶ Run the Agents'}
        </button>
        {(running || doneCount > 0) && (
          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
              style={{ width: `${(doneCount / ORDER.length) * 100}%` }}
            />
          </div>
        )}
      </div>

      {/* Agent cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {ORDER.map((id, idx) => {
          const meta = AGENT_META[id];
          const st = statuses[id];
          return (
            <div
              key={id}
              className={`bg-white rounded-2xl border-2 p-5 shadow-sm transition-all duration-300 animate-fade-up ${CARD_RING[st]}`}
              style={{ animationDelay: `${idx * 80}ms` }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-3xl">{meta.emoji}</span>
                <span className="flex items-center gap-2 text-sm font-medium">
                  <span className={`w-3 h-3 rounded-full ${DOT[st]}`} />
                  {LABEL[st]}
                </span>
              </div>
              <h3 className="font-bold text-lg">{meta.name}</h3>
              <p className="text-sm text-gray-500">{meta.role}</p>
            </div>
          );
        })}
      </section>

      {/* Live feed */}
      <section className="animate-fade-up">
        <h2 className="text-2xl font-bold mb-3">Live Feed</h2>
        <div
          ref={feedRef}
          className="feed-scroll bg-gray-900 text-green-300 rounded-2xl p-5 h-64 overflow-y-auto font-mono text-sm space-y-1 shadow-inner"
        >
          {logs.length === 0 && <p className="text-gray-500">Press “Run the Agents” to start the crew…</p>}
          {logs.map((ev, i) => (
            <p key={i} className="animate-fade-up">
              <span className="text-gray-500">{new Date(ev.at).toLocaleTimeString()}</span>{' '}
              {ev.agent ? <span className="text-yellow-300">[{AGENT_META[ev.agent].name}]</span> : <span className="text-cyan-300">[system]</span>}{' '}
              {ev.message}
            </p>
          ))}
          {running && <p className="animate-blink text-green-400">▊</p>}
        </div>
      </section>

      {/* Final article with typewriter */}
      {article && (
        <section className="animate-fade-up">
          <div className="flex items-center gap-3 mb-3">
            <h2 className="text-2xl font-bold">📰 Final Article</h2>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-purple-100 text-purple-700">
              🤖 AI-generated
            </span>
          </div>
          <div className="bg-white rounded-2xl border p-6 shadow-sm whitespace-pre-wrap leading-relaxed">
            {typed}
            {typed.length < article.length && <span className="animate-blink text-primary">▊</span>}
          </div>
        </section>
      )}

      {/* Run history */}
      {history.length > 0 && (
        <section className="animate-fade-up">
          <h2 className="text-2xl font-bold mb-3">🕘 Recent Runs</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {history.map((h, i) => (
              <button
                key={i}
                onClick={() => setArticle(h.article)}
                className="text-left bg-white border rounded-2xl p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
              >
                <p className="font-bold truncate">{h.headline}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(h.at).toLocaleString()} • {h.topic}
                </p>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
