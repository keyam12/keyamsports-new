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

const idleStatuses = (): Record<AgentId, AgentStatus> => ({
  scout: 'idle',
  writer: 'idle',
  stats: 'idle',
  editor: 'idle',
});

export default function AgentsPage() {
  const [statuses, setStatuses] = useState<Record<AgentId, AgentStatus>>(idleStatuses);
  const [logs, setLogs] = useState<AgentEvent[]>([]);
  const [article, setArticle] = useState('');
  const [demo, setDemo] = useState<boolean | null>(null);
  const [running, setRunning] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = feedRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [logs]);

  function handleEvent(ev: AgentEvent) {
    setLogs((prev) => [...prev.slice(-199), ev]);
    if (ev.agent) {
      const id = ev.agent;
      if (ev.type === 'agent_started') setStatuses((s) => ({ ...s, [id]: 'running' }));
      if (ev.type === 'agent_done') setStatuses((s) => ({ ...s, [id]: 'done' }));
      if (ev.type === 'agent_failed') setStatuses((s) => ({ ...s, [id]: 'failed' }));
    }
    if (ev.type === 'run_done') {
      const ctx = (ev as { payload?: { article?: string; demo?: boolean } }).payload;
      if (ctx?.article) setArticle(ctx.article);
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

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="bg-gradient-to-r from-primary to-accent text-white p-10 rounded-2xl shadow-lg text-center">
        <h1 className="text-4xl font-bold mb-2">🤖 AI Agents Control Room</h1>
        <p className="text-lg">Four independent agents. One breaking sports story. Watch them work live.</p>
        {demo !== null && (
          <div className="mt-3 inline-block px-3 py-1 rounded-full text-sm font-semibold bg-white/20">
            {demo ? '🎭 Demo mode — add OPENAI_API_KEY for real AI' : '⚡️ Live AI mode'}
          </div>
        )}
      </div>

      <button
        onClick={startRun}
        disabled={running}
        className="px-6 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-blue-700 transition disabled:opacity-50"
      >
        {running ? 'Agents are working…' : '▶ Run the Agents'}
      </button>

      {/* Agent cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {ORDER.map((id) => {
          const meta = AGENT_META[id];
          const st = statuses[id];
          return (
            <div key={id} className="bg-white rounded-2xl border p-5 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-3xl">{meta.emoji}</span>
                <span className={`flex items-center gap-2 text-sm font-medium`}>
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
      <section>
        <h2 className="text-2xl font-bold mb-3">Live Feed</h2>
        <div
          ref={feedRef}
          className="bg-gray-900 text-green-300 rounded-2xl p-5 h-64 overflow-y-auto font-mono text-sm space-y-1"
        >
          {logs.length === 0 && <p className="text-gray-500">Press “Run the Agents” to start the crew…</p>}
          {logs.map((ev, i) => (
            <p key={i}>
              <span className="text-gray-500">{new Date(ev.at).toLocaleTimeString()}</span>{' '}
              {ev.agent ? <span className="text-yellow-300">[{AGENT_META[ev.agent].name}]</span> : <span className="text-cyan-300">[system]</span>}{' '}
              {ev.message}
            </p>
          ))}
          {running && <p className="animate-pulse text-green-400">▊</p>}
        </div>
      </section>

      {/* Final article */}
      {article && (
        <section>
          <h2 className="text-2xl font-bold mb-3">📰 Final Article</h2>
          <div className="bg-white rounded-2xl border p-6 shadow-sm whitespace-pre-wrap leading-relaxed">
            {article}
          </div>
        </section>
      )}
    </div>
  );
}
