'use client';
import { useEffect, useState } from 'react';
interface Job {
  id: string; job_key: string; state: string; attempts: number; article_id?: string;
  input_tokens: number; output_tokens: number; usage_incomplete: boolean;
  agent_publications?: {state:string;risk_tier:number;reasons:string[];public_url?:string} | {state:string;risk_tier:number;reasons:string[];public_url?:string}[];
  error_code?: string; updated_at: string; lease_until: string;
  context?: { seniorEditorVerdict?: string; seniorEditorNotes?: string[] };
}
interface Report {
  readiness: { ready: boolean; missing: string[]; dailyRunLimit: number; scheduled: boolean };
  storageReady: boolean; jobs: Job[];
}
export default function AgentJobsPanel({ onSaved }: { onSaved: () => void }) {
  const [report, setReport] = useState<Report | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  async function refresh() {
    const response = await fetch('/api/admin/agent-jobs', { cache: 'no-store' });
    if (!response.ok) throw new Error('Could not load private agent status.');
    setReport(await response.json());
  }
  useEffect(() => { refresh().catch(() => setError('Could not load private agent status.')); }, []);
  async function run(key: string) {
    setBusy(true); setError(''); setPendingKey(key);
    try {
      const response = await fetch('/api/admin/agent-jobs', { method: 'POST', headers: { 'Idempotency-Key': key } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Daily run limit reached.');
      setPendingKey(null);
      onSaved();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Run failed.');
    } finally {
      await refresh().catch(() => setError('Could not refresh job history.'));
      setBusy(false);
    }
  }
  return <section className="bg-white border rounded-2xl p-5 shadow-sm space-y-3" aria-labelledby="agent-jobs-title">
    <h2 id="agent-jobs-title" className="font-bold">Editorial automation</h2>
    <p className="text-sm text-gray-600">Research, write and review news. Eligible Tier 1/2 stories publish automatically; uncertain or sensitive stories are retained.</p>
    {!report ? <p className="text-sm">Loading agent status…</p> : <>
      <p className="text-sm">{report.readiness.ready && report.storageReady ? 'Ready for editorial runs' : 'Configuration required'} · Daily run limit: {report.readiness.dailyRunLimit} · Schedule: {report.readiness.scheduled ? 'Enabled in configuration' : 'Disabled'}</p>
      {report.readiness.missing.length > 0 && <p className="text-xs text-gray-600 break-words">Missing configuration: {report.readiness.missing.join(', ')}</p>}
      {!report.storageReady && <p className="text-sm text-amber-700">The private job database is unavailable. Complete connection and migrations first.</p>}
      <div className="flex flex-wrap gap-3">
        <button disabled={busy || !report.storageReady || !report.readiness.ready} onClick={() => run(pendingKey || `manual:${crypto.randomUUID()}`)} className="bg-primary text-white font-bold px-4 py-2 rounded-xl text-sm disabled:opacity-50">{busy ? 'Processing news…' : pendingKey ? 'Check or retry previous run' : 'Process news'}</button>
        <button disabled={busy} onClick={() => refresh().catch(() => setError('Could not refresh job history.'))} className="text-sm font-bold text-primary disabled:opacity-50">Refresh status</button>
      </div>
      <p className="text-xs text-gray-500">Token totals are reported usage, not a dollar estimate. Failed requests may have unreported usage.</p>
      <ul className="space-y-3">{report.jobs.map(job => <li key={job.id} className="border rounded-xl p-3 text-sm space-y-1">
        <p className="font-semibold">{((Array.isArray(job.agent_publications) ? job.agent_publications[0]?.state : job.agent_publications?.state) || job.state).replaceAll('_', ' ')} · Attempt {job.attempts}/3</p>
        <p className="text-xs text-gray-600">Updated: <time dateTime={job.updated_at}>{new Date(job.updated_at).toLocaleString()}</time> · Input tokens: {job.input_tokens} · Output tokens: {job.output_tokens}{job.usage_incomplete ? ' · Usage incomplete' : ''}</p>
        {job.error_code && <p>Run failed. Check configuration before retrying.</p>}
        {job.context?.seniorEditorVerdict && <p>Automated review: {job.context.seniorEditorVerdict}</p>}
        {(job.context?.seniorEditorNotes || []).map((note, index) => <p key={index} className="text-xs">{note}</p>)}
        {job.agent_publications && (() => {
          const publication=Array.isArray(job.agent_publications)?job.agent_publications[0]:job.agent_publications;
          return publication ? <div><p>Publication: {publication.state} · Tier {publication.risk_tier}</p>{publication.reasons?.map((reason,index)=><p key={index} className="text-xs">{reason}</p>)}{publication.public_url && <a href={publication.public_url} className="text-primary hover:underline">View article</a>}</div> : null;
        })()}
        {job.article_id && <p className="text-xs">The article is available in the article list below.</p>}
        {job.attempts < 3 && (job.state === 'failed' || (job.state === 'running' && Date.parse(job.lease_until) <= Date.now())) && <button disabled={busy || !report.readiness.ready} onClick={() => run(job.job_key)} className="text-primary font-bold text-xs disabled:opacity-50">Retry same job</button>}
      </li>)}</ul>
    </>}
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
  </section>;
}
