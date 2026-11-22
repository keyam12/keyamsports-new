import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
const migration = name => readFileSync(new URL(`../supabase/migrations/${name}`, import.meta.url),'utf8');
const setup = migration('20261111090000_initial_articles.sql');
const jobs = migration('20261111095000_agent_drafts.sql')+migration('20261113140000_autonomous_publication.sql')+migration('20261113141000_require_primary_publication_date.sql')+migration('20261122100000_discovery_queue.sql');
const db = new PGlite();
await db.exec('create role anon; create role authenticated; create role service_role bypassrls; begin;'+setup+jobs+'commit;');
const rpc = async (name,args) => (await db.query(`select public.${name}(${args.map((_,i)=>`$${i+1}`).join(',')}) as result`,args)).rows[0].result;
const draft = {category:'basketball',title:'Local test story',summary:'Local fixture draft for testing only.',date:'2026-01-01',status:'draft',sources:['https://example.com/test-only']};
const ctx = {publicationStatus:'needs_review'};
let lease;
test('private infrastructure and RPCs are inaccessible to public roles', async()=>{
 for(const role of ['anon','authenticated']){
  await db.exec(`set role ${role};`);
  for(const table of ['agent_jobs','agent_daily_usage','private_rate_limits']) await assert.rejects(db.query(`select * from public.${table}`),/permission denied/);
  await assert.rejects(rpc('claim_agent_job',['test',5]),/permission denied/);
  await assert.rejects(rpc('check_private_rate_limit',['a'.repeat(64),5,60]),/permission denied/);
  await db.exec('reset role;');
 }
});
test('claims are idempotent and concurrent calls consume one attempt',async()=>{
 await db.exec('set role service_role;');
 const results=await Promise.all([rpc('claim_agent_job',['job1',10]),rpc('claim_agent_job',['job1',10])]);
 assert.equal(results.filter(x=>x.claimed).length,1);
 lease=results.find(x=>x.claimed).job;
 assert.equal((await db.query('select runs from agent_daily_usage')).rows[0].runs,1);
});
test('usage is recorded per call and fenced against stale workers',async()=>{
 await rpc('record_agent_usage',[lease.id,lease.lease,{agent:'writer',model:'fixture',inputTokens:100,outputTokens:40,incomplete:false}]);
 assert.equal((await db.query('select input_tokens from agent_jobs')).rows[0].input_tokens,100);
 assert.equal((await db.query('select output_tokens from agent_daily_usage')).rows[0].output_tokens,40);
 await assert.rejects(rpc('record_agent_usage',[lease.id,'00000000-0000-0000-0000-000000000000',{}]),/lease expired/);
});
test('finishing creates only a private draft and repeating a source creates no duplicate',async()=>{
 const finished=await rpc('finish_agent_job',[lease.id,lease.lease,ctx,draft]);
 assert.equal(finished.state,'needs_review');
 assert.equal((await rpc('claim_agent_job',['job1',10])).claimed,false);
 const next=await rpc('claim_agent_job',['job2',10]);
 const duplicate=await rpc('finish_agent_job',[next.job.id,next.job.lease,ctx,draft]);
 assert.equal(duplicate.state,'duplicate');
 assert.equal(duplicate.article_id,finished.article_id);
 await db.exec('reset role; set role anon;');
 assert.equal((await db.query('select count(*)::int as n from articles')).rows[0].n,13);
 await db.exec('reset role; set role service_role;');
 assert.equal((await db.query('select count(*)::int as n from articles')).rows[0].n,14);
});
test('workers cannot publish through the draft RPC and failures remain atomic',async()=>{
 const claimed=await rpc('claim_agent_job',['bad-draft',10]);
 await assert.rejects(rpc('finish_agent_job',[claimed.job.id,claimed.job.lease,ctx,{...draft,status:'published'}]),/Incomplete draft/);
 assert.equal((await db.query('select count(*)::int as n from articles')).rows[0].n,14);
 await rpc('fail_agent_job',[claimed.job.id,claimed.job.lease]);
});
test('retries consume quota, rotate leases and stop after three attempts',async()=>{
 const second=await rpc('claim_agent_job',['bad-draft',10]);
 assert.equal(second.job.attempts,2);
 await rpc('fail_agent_job',[second.job.id,second.job.lease]);
 const third=await rpc('claim_agent_job',['bad-draft',10]);
 assert.equal(third.job.attempts,3);
 assert.notEqual(second.job.lease,third.job.lease);
 await rpc('fail_agent_job',[third.job.id,third.job.lease]);
 assert.equal((await rpc('claim_agent_job',['bad-draft',10])).claimed,false);
 const consumed=(await db.query('select runs from agent_daily_usage')).rows[0].runs;
 assert.equal((await rpc('claim_agent_job',['over-budget',consumed])).limited,true);
 assert.equal((await db.query('select count(*)::int as n from agent_jobs where job_key=$1',['over-budget'])).rows[0].n,0);
});
test('expired workers cannot save or charge usage after a replacement claims the job',async()=>{
 const first=await rpc('claim_agent_job',['expired',20]);
 await db.query("update agent_jobs set lease_until=now()-interval '1 second' where id=$1",[first.job.id]);
 const second=await rpc('claim_agent_job',['expired',20]);
 assert.equal(second.claimed,true);
 assert.equal(second.job.usage_incomplete,true);
 await assert.rejects(rpc('finish_agent_job',[first.job.id,first.job.lease,ctx,draft]),/lease expired/);
 await rpc('fail_agent_job',[first.job.id,first.job.lease]);
 assert.equal((await db.query('select state from agent_jobs where id=$1',[second.job.id])).rows[0].state,'running');
});
test('database limiter shares counts and resets an expired window',async()=>{
 const key='b'.repeat(64);
 assert.equal((await rpc('check_private_rate_limit',[key,1,60])).ok,true);
 const blocked=await rpc('check_private_rate_limit',[key,1,60]);
 assert.equal(blocked.ok,false); assert.ok(blocked.retryAfter>0);
 await db.query("update private_rate_limits set expires_at=now()-interval '1 second' where key_hash=$1",[key]);
 assert.equal((await rpc('check_private_rate_limit',[key,1,60])).ok,true);
});

test('autonomous approval publishes only the selected verified Tier 1/2 article',async()=>{
 const claim=await rpc('claim_agent_job',['auto-publish-fixture',100]);
 const body='Local approved headline\nVerified local fixture text only.';
 const context={publicationStatus:'needs_review',article:body,seniorEditorVerdict:'APPROVED',research:{primaryVerified:true,evidence:[{primary:true,relevant:true,publishedAt:new Date().toISOString(),checkedAt:new Date().toISOString()}]},category:'basketball',sources:['https://nba.com/news/test-publication-fixture'],automation:{decision:'APPROVE',riskTier:1,allClaimsSupported:true,contradictions:false,reasons:[]}};
 const fixture={...draft,title:'Local approved headline',summary:body,sources:['https://nba.com/news/test-publication-fixture']};
 const finished=await rpc('finish_agent_job',[claim.job.id,claim.job.lease,context,fixture]);
 const url='https://keyamsports-new.vercel.app/news/fixture-'+finished.article_id;
 const publication=await rpc('decide_agent_publication',[claim.job.id,url]);
 assert.equal(publication.state,'pending');
 assert.equal(await rpc('reserve_publication_verification',[claim.job.id]),true);
 assert.equal(await rpc('reserve_publication_verification',[claim.job.id]),true);
 assert.equal(await rpc('reserve_publication_verification',[claim.job.id]),true);
 assert.equal(await rpc('reserve_publication_verification',[claim.job.id]),false);
 assert.equal((await db.query('select status from articles where id=$1',[finished.article_id])).rows[0].status,'published');
 assert.equal((await db.query("select count(*)::int as n from articles where status='published'")).rows[0].n,14);
 assert.equal((await rpc('decide_agent_publication',[claim.job.id,url])).state,'pending');
 await rpc('verify_agent_publication',[claim.job.id,true]);
 assert.equal((await rpc('decide_agent_publication',[claim.job.id,url])).state,'published');
 assert.equal((await rpc('verify_agent_publication',[claim.job.id,false])).state,'published');
 assert.equal((await db.query("select count(*)::int as n from agent_alerts where job_id=$1 and code='PUBLIC_URL_FAILED'",[claim.job.id])).rows[0].n,0);
});
test('high risk, missing primary evidence and legacy drafts remain unpublished with alerts',async()=>{
 for(const [index,context] of [
   {publicationStatus:'needs_review',seniorEditorVerdict:'APPROVED',automation:{decision:'APPROVE',riskTier:3,allClaimsSupported:true,contradictions:false},research:{primaryVerified:true}},
   {publicationStatus:'needs_review',seniorEditorVerdict:'APPROVED',automation:{decision:'APPROVE',riskTier:1,allClaimsSupported:true,contradictions:false},research:{primaryVerified:false}},
   {publicationStatus:'needs_review'},
 ].entries()){
   const claim=await rpc('claim_agent_job',['held-'+index,100]);
   const fixture={...draft,title:'Held local fixture '+index,summary:'Held local fixture '+index+'\nEvidence requires retention.',sources:['https://nba.com/news/held-fixture-'+index]};
   context.article=fixture.summary;
   const finished=await rpc('finish_agent_job',[claim.job.id,claim.job.lease,context,fixture]);
   assert.equal((await rpc('decide_agent_publication',[claim.job.id,'https://keyamsports-new.vercel.app/news/fixture-'+finished.article_id])).state,'hold');
   assert.equal((await db.query('select status from articles where id=$1',[finished.article_id])).rows[0].status,'draft');
   assert.equal((await db.query('select count(*)::int as n from agent_alerts where job_id=$1',[claim.job.id])).rows[0].n,1);
 }
});
test('public roles cannot approve articles or read internal publication alerts',async()=>{
 await db.exec('reset role; set role anon;');
 await assert.rejects(db.query('select * from agent_publications'),/permission denied/);
 await assert.rejects(db.query('select * from agent_alerts'),/permission denied/);
 await assert.rejects(rpc('decide_agent_publication',['00000000-0000-4000-8000-000000000000','https://example.com']),/permission denied/);
 await db.exec('reset role; set role service_role;');
});

test('freshly fetched historical primary pages cannot authorize a new publication',async()=>{
 const claim=await rpc('claim_agent_job',['old-primary-fixture',100]);
 const fixture={...draft,title:'Old source fixture',summary:'Old source fixture\nThis must stay retained.',sources:['https://nba.com/news/old-primary-fixture']};
 const context={publicationStatus:'needs_review',article:fixture.summary,category:fixture.category,sources:fixture.sources,seniorEditorVerdict:'APPROVED',research:{primaryVerified:true,evidence:[{primary:true,relevant:true,checkedAt:new Date().toISOString(),publishedAt:'2020-01-01T00:00:00Z'}]},automation:{decision:'APPROVE',riskTier:1,allClaimsSupported:true,contradictions:false,reasons:[]}};
 const completed=await rpc('finish_agent_job',[claim.job.id,claim.job.lease,context,fixture]);
 assert.equal((await rpc('decide_agent_publication',[claim.job.id,'https://keyamsports-new.vercel.app/news/fixture-'+completed.article_id])).state,'hold');
 assert.equal((await db.query('select status from articles where id=$1',[completed.article_id])).rows[0].status,'draft');
});

let queueCycle;
const queueEvent=(source,story,title,offset=0)=>({sourceKey:source.repeat(64),storyKey:story.repeat(64),providerId:'espn:nba',headline:{sport:'NBA',headline:title,description:'Local queue fixture',link:'https://espn.com/story/'+source,published:new Date(Date.now()-offset).toISOString()}});
test('discovery is durable and repeated batches do not duplicate events or drop revisions',async()=>{
 queueCycle=(await rpc('claim_editorial_cycle',['queue-fixture-1'])).cycle;
 assert.equal((await rpc('claim_editorial_cycle',['queue-overlap'])).reason,'ACTIVE_RUN');
 const events=[queueEvent('a','b','First queue fixture'),queueEvent('c','d','Second queue fixture',1000)];
 assert.equal(await rpc('ingest_editorial_events',[queueCycle.cycle_key,queueCycle.lease,events,[{id:'espn:nba',available:true},{id:'espn:nfl',available:false}]]),2);
 assert.equal(await rpc('ingest_editorial_events',[queueCycle.cycle_key,queueCycle.lease,events,[]]),0);
 assert.equal((await db.query('select count(*)::int n from editorial_events')).rows[0].n,2);
 events[0].headline.description='Updated source facts';
 await rpc('ingest_editorial_events',[queueCycle.cycle_key,queueCycle.lease,events,[]]);
 assert.equal((await db.query('select max(versions) as n from editorial_discoveries')).rows[0].n,2);
 assert.equal((await db.query("select count(*)::int n from editorial_feed_cursors where provider_id='espn:nfl'")).rows[0].n,0);
});
test('budget deferral preserves an event without consuming an attempt; stale workers cannot finish it',async()=>{
 const event=await rpc('claim_editorial_event',[queueCycle.cycle_key,queueCycle.lease]);
 assert.equal(event.attempts,1);
 await assert.rejects(rpc('finish_editorial_event',[event.id,'00000000-0000-0000-0000-000000000000','held',null,'BAD_LEASE']),/lease expired/);
 await assert.rejects(rpc('finish_editorial_event',[event.id,event.lease,'published',null,null]),/No verified publication/);
 await rpc('finish_editorial_event',[event.id,event.lease,'budget',null,'DAILY_BUDGET_REACHED']);
 const stored=(await db.query('select state,attempts from editorial_events where id=$1',[event.id])).rows[0];
 assert.equal(stored.state,'queued');assert.equal(stored.attempts,0);
 const next=await rpc('claim_editorial_event',[queueCycle.cycle_key,queueCycle.lease]);
 assert.notEqual(next.id,event.id);
 await rpc('finish_editorial_event',[next.id,next.lease,'held',null,'EDITORIAL_HOLD']);
 await rpc('finish_editorial_cycle',[queueCycle.cycle_key,queueCycle.lease,{held:1},false]);
 assert.equal((await rpc('claim_editorial_cycle',['queue-fixture-1'])).reason,'ALREADY_PROCESSED');
});
test('event retries recover after expiry and stop after three failures',async()=>{
 const cycle=(await rpc('claim_editorial_cycle',['queue-fixture-2'])).cycle;
 await db.exec("update editorial_events set available_at=now() where state='queued'");
 let event;
 for(let attempt=1;attempt<=3;attempt++){
  event=await rpc('claim_editorial_event',[cycle.cycle_key,cycle.lease]);
  assert.equal(event.attempts,attempt);
  await rpc('finish_editorial_event',[event.id,event.lease,'failed',null,'FIXTURE_FAILURE']);
  await db.exec("update editorial_events set available_at=now() where state='queued'");
 }
 assert.equal((await db.query('select state from editorial_events where id=$1',[event.id])).rows[0].state,'failed');
 assert.equal(await rpc('claim_editorial_event',[cycle.cycle_key,cycle.lease]),null);
 assert.ok((await db.query('select count(*)::int n from editorial_queue_alerts')).rows[0].n>=2);
 await rpc('finish_editorial_cycle',[cycle.cycle_key,cycle.lease,{failed:1},true]);
});
test('an invalid discovery batch cannot advance its cursor or partially persist',async()=>{
 const cycle=(await rpc('claim_editorial_cycle',['queue-invalid-batch'])).cycle;
 const good=queueEvent('e','f','Transactional fixture');
 const bad={...queueEvent('f','e','Bad source'),sourceKey:'invalid'};
 await assert.rejects(rpc('ingest_editorial_events',[cycle.cycle_key,cycle.lease,[good,bad],[{id:'new-provider',available:true}]]),/Invalid event/);
 assert.equal((await db.query('select count(*)::int n from editorial_discoveries where source_key=$1',[good.sourceKey])).rows[0].n,0);
 assert.equal((await db.query("select count(*)::int n from editorial_feed_cursors where provider_id='new-provider'")).rows[0].n,0);
 await rpc('finish_editorial_cycle',[cycle.cycle_key,cycle.lease,{failed:1},true]);
});
test('queue observability remains private',async()=>{
 const report=await rpc('editorial_queue_status',[]);
 assert.equal(report.events.held,1);assert.equal(report.events.failed,1);
 await db.exec('reset role; set role anon;');
 await assert.rejects(rpc('editorial_queue_status',[]),/permission denied/);
 await assert.rejects(db.query('select * from editorial_events'),/permission denied/);
 await db.exec('reset role; set role service_role;');
});
test.after(async()=>{await db.close();});
