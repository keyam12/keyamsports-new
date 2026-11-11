import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
const migration = name => readFileSync(new URL(`../supabase/migrations/${name}`, import.meta.url),'utf8');
const setup = migration('20261111090000_initial_articles.sql');
const jobs = migration('20261111095000_agent_drafts.sql');
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
test.after(async()=>{await db.close();});
