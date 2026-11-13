import { supabaseAdmin } from './supabase';
import { articlePath } from './articleUrls';
import type { RunContext } from '../agents/types';
export async function verifyPublishedUrl(url:string,id:string,reserve?:()=>Promise<boolean>):Promise<boolean> {
  const u=new URL(url);
  if(u.origin!=='https://keyamsports-new.vercel.app' || !u.pathname.startsWith('/news/') || !u.pathname.endsWith(id))return false;
  for(let attempt=0;attempt<3;attempt++) {
    if(reserve && !await reserve())return false;
    try {
      const response=await fetch(url,{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(5000)});
      if(response.status===200 && (await response.text()).includes(`data-article-id="${id}"`))return true;
    } catch { /* a bounded read retry; never repeat or delete a published article */ }
    if(attempt<2)await new Promise(resolve=>setTimeout(resolve,250*2**attempt));
  }
  return false;
}
export async function publishPreparedJob(jobId:string,articleId:string,ctx:RunContext) {
  if(process.env.PAUSE_PUBLISHING==='true')return {state:'paused',public_url:null};
  const db=supabaseAdmin();if(!db)throw new Error('Publication store unavailable');
  const path=articlePath({id:articleId,title:ctx.article.split('\n')[0].trim()});
  if(!path)throw new Error('No public article URL');
  const {data,error}=await db.rpc('decide_agent_publication',{p_job:jobId,p_url:'https://keyamsports-new.vercel.app'+path});
  if(error || !data)throw new Error('Publication decision unavailable');
  if(data.state==='hold' || data.state==='published')return data;
  const verified=await verifyPublishedUrl(data.public_url,data.article_id,async()=>{
    const reserved=await db.rpc('reserve_publication_verification',{p_job:jobId});
    if(reserved.error)throw new Error('Verification lease unavailable');
    return reserved.data===true;
  });
  const recorded=await db.rpc('verify_agent_publication',{p_job:jobId,p_ok:verified});
  if(recorded.error)throw new Error('Publication verification could not be recorded');
  return recorded.data || {...data,state:verified?'published':'failed'};
}
/** Resume stored work without another model call. Legacy drafts are untouched. */
export async function resumePublication(jobId:string) {
  if(process.env.PAUSE_PUBLISHING==='true')return null;
  const db=supabaseAdmin();if(!db)return null;
  const {data,error}=await db.from('agent_jobs').select('context,article_id,state').eq('id',jobId).maybeSingle();
  if(error || !data?.context?.automation || !data.article_id || data.state!=='needs_review')return null;
  return publishPreparedJob(jobId,data.article_id,data.context as RunContext);
}

/** One pending verification per cycle, without additional generation or credentials. */
export async function reconcilePendingPublication() {
  if(process.env.PAUSE_PUBLISHING==='true')return null;
  const db=supabaseAdmin();if(!db)return null;
  const {data,error}=await db.from('agent_publications').select('job_id').eq('state','pending').order('updated_at',{ascending:true}).limit(1);
  if(error || !data?.[0])return null;
  return resumePublication(data[0].job_id);
}
