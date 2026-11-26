import { researchStory } from '../agents/ResearchAgent';
import { createHash } from 'node:crypto';
import { supabaseAdmin } from './supabase';
import { getHeadlineBatch,validateHeadline,type Headline } from './headlines';
import { runDraftJob } from './agentJobs';
export function editorialSlotKey(now=new Date(),minutes:15|30=30) {
  if(!Number.isFinite(now.getTime()) || ![15,30].includes(minutes))throw new Error('Invalid editorial interval');
  const start=new Date(Math.floor(now.getTime()/(minutes*60_000))*minutes*60_000);
  return 'cycle:'+start.toISOString().slice(0,16).replace('T',':');
}
export function discoveryRecord(headline:Headline) {
  if(!validateHeadline(headline))throw new Error('Invalid source event');
  const url=new URL(headline.link);url.hash='';url.hostname=url.hostname.replace(/^www\./,'');
  for(const key of [...url.searchParams.keys()])if(key.startsWith('utm_') || ['gclid','fbclid'].includes(key))url.searchParams.delete(key);
  url.searchParams.sort();
  const normalized=headline.headline.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
  const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
  return {sourceKey:hash(url.href),storyKey:hash(`${headline.sport}:${new Date(headline.published).toISOString().slice(0,10)}:${normalized}`),
    providerId:headline.providerId || `espn:${headline.sport.toLowerCase()}`,headline:{...headline,link:url.href}};
}
export async function runEditorialCycle(key=editorialSlotKey()) {
  const summary={published:0,held:0,failed:0,discovered:0,budgetLimited:false,error:null as string|null};
  if(process.env.PAUSE_PUBLISHING==='true')return {...summary,paused:true};
  const db=supabaseAdmin();if(!db)throw new Error('Queue database unavailable');
  const rpc=async(name:string,parameters:Record<string,unknown>)=>{
    const result=await db.rpc(name,parameters);if(result.error)throw new Error('EDITORIAL_QUEUE_STORAGE_FAILED');return result.data;
  };
  const claim=await rpc('claim_editorial_cycle',{p_key:key});
  if(!claim?.claimed)return {...summary,skipped:claim?.reason || 'ACTIVE_RUN'};
  const cycle=claim.cycle;let event:any=null;
  try {
    const batch=await getHeadlineBatch();
    summary.discovered=await rpc('ingest_editorial_events',{p_key:key,p_lease:cycle.lease,p_events:batch.headlines.map(discoveryRecord),p_feeds:batch.feeds});
    if(!batch.feeds.some(feed=>feed.available))throw new Error('ALL_DISCOVERY_FEEDS_UNAVAILABLE');
    // Inspect up to three candidates without spending model quota on missing evidence.
    for(let candidate=0;candidate<3;candidate++) {
      event=await rpc('claim_editorial_event',{p_key:key,p_cycle_lease:cycle.lease});
      if(!event)break;
      const headlines=(event.headlines || []).filter(validateHeadline) as Headline[];
      if(!headlines.length)throw new Error('EVENT_EVIDENCE_EXPIRED');
      const research=await researchStory(headlines.map(h=>h.link),headlines[0].headline);
      if(!research.primaryVerified) {
        await rpc('finish_editorial_event',{p_id:event.id,p_lease:event.lease,p_outcome:'held',p_job:null,p_reason:'PRIMARY_EVIDENCE_NOT_VERIFIED'});
        summary.held++;event=null;continue;
      }
      const result=await runDraftJob(`event:${event.id}`,undefined,{headlines,research});
      const state=result.publication?.state;
      const outcome=result.limited || result.paused?'budget':state==='published'?'published':state==='hold'?'held':result.job?.state==='duplicate'?'duplicate':state==='failed'?'failed':'held';
      summary.budgetLimited=outcome==='budget';
      if(outcome==='published')summary.published++;
      if(outcome==='held')summary.held++;
      if(outcome==='failed')summary.failed++;
      await rpc('finish_editorial_event',{p_id:event.id,p_lease:event.lease,p_outcome:outcome,p_job:result.job?.id || null,p_reason:outcome==='budget'?'DAILY_BUDGET_REACHED':outcome==='held'?'EDITORIAL_HOLD':null});
      event=null;
      break; // At most one AI run; the existing daily budget still applies.
    }
    await rpc('finish_editorial_cycle',{p_key:key,p_lease:cycle.lease,p_summary:summary,p_failed:false});
    console.info('[editorial-cycle]',JSON.stringify({cycle:key,...summary}));
    return summary;
  }catch(error){
    summary.failed++;
    const code=error instanceof Error && /^[A-Z_]+$/.test(error.message)?error.message:'EDITORIAL_CYCLE_FAILED';
    if(event)await rpc('finish_editorial_event',{p_id:event.id,p_lease:event.lease,p_outcome:'failed',p_job:null,p_reason:code}).catch(()=>{});
    await rpc('finish_editorial_cycle',{p_key:key,p_lease:cycle.lease,p_summary:{...summary,error:code},p_failed:true}).catch(()=>{});
    console.error('[editorial-cycle]',JSON.stringify({cycle:key,...summary,error:code}));
    return {...summary,error:code};
  }
}
