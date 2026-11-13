// Load project TypeScript without adding a test runner dependency.
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => {
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText;
  module._compile(source, filename);
};
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHmac } = require('node:crypto');
const auth = require('../lib/adminAuth.ts');
const { validateArticleInput, validatePublication } = require('../lib/articleValidation.ts');
const { parseEvent, getScores } = require('../lib/sports/scores.ts');
const { authorizeAgentRun } = require('../lib/agentAccess.ts');
const llm = require('../agents/llm.ts');
const { reviewArticle } = require('../agents/SeniorEditorAgent.ts');
const { runScout } = require('../agents/ScoutAgent.ts');
const headlines = require('../lib/headlines.ts');
const { getPublishedArticles, getRepositoryPublications } = require('../lib/articles.ts');
const repositoryArticles = require('../data/published.json').articles;
const originalArticles = require('../data/sample.json').articles;

const req = (cookie, origin) => new Request('https://keyam.test/admin', { headers: { ...(cookie ? { cookie } : {}), ...(origin ? { origin } : {}) } });
const article = { title: 'A verified headline', summary: 'A sourced summary.', category: 'basketball', date: '2026-01-01', status: 'published', sources: ['https://example.com/source'] };

test('signed admin sessions reject tampering, expiry, wrong secret and missing configuration', () => {
  process.env.ADMIN_PASSWORD = 'unit-test-password-not-a-real-secret';
  const cookie = auth.adminCookieHeader().split(';')[0];
  assert.equal(auth.isAdmin(req(cookie)), true);
  assert.equal(auth.isAdmin(req(cookie + 'x')), false);
  assert.equal(auth.isAdmin(req()), false);
  const expiry = String(Math.floor(Date.now() / 1000) - 1);
  const sig = createHmac('sha256', process.env.ADMIN_PASSWORD).update(`keyam-session:${expiry}`).digest('hex');
  assert.equal(auth.isAdmin(req(`keyam-admin=${expiry}.${sig}`)), false);
  process.env.ADMIN_PASSWORD = 'a-different-test-password';
  assert.equal(auth.isAdmin(req(cookie)), false);
  delete process.env.ADMIN_PASSWORD;
  assert.equal(auth.isAdmin(req(cookie)), false);
});

test('administrative origin checks reject cross-origin mutations', () => {
  assert.equal(auth.isTrustedOrigin(req(null, 'https://attacker.test')), false);
  assert.equal(auth.isTrustedOrigin(req(null, 'https://keyam.test')), true);
  const proxied = new Request('https://internal.test/admin', {headers:{host:'keyam.test',origin:'https://keyam.test'}});
  assert.equal(auth.isTrustedOrigin(proxied),true);
  assert.equal(auth.isTrustedOrigin(new Request('https://internal.test/admin', {headers:{host:'keyam.test',origin:'https://attacker.test','x-forwarded-host':'attacker.test'}})),false);
  assert.equal(auth.isTrustedOrigin(req(null,'null')),false);
});

test('article validation rejects arbitrary field updates, impossible/future dates and unsafe links', () => {
  assert.throws(() => validateArticleInput({ ...article, created_at: 'changed' }));
  assert.throws(() => validateArticleInput({ ...article, date: '2026-02-30' }));
  assert.throws(() => validateArticleInput({ ...article, date: '2999-01-01' }));
  assert.throws(() => validateArticleInput({ ...article, sources: ['javascript:alert(1)'] }));
  assert.throws(() => validateArticleInput({ ...article, sources: ['https://user:password@example.com'] }));
  assert.throws(() => validateArticleInput({ summary: ' ' }, true));
  assert.deepEqual(validateArticleInput({ title: ' New headline ' }, true), { title: 'New headline' });
  assert.equal(validateArticleInput(article).status, 'published');
});

test('publication requires a complete article and source URLs', () => {
  assert.throws(() => validatePublication({ ...article, sources: [] }));
  assert.throws(() => validatePublication({ ...article, summary: '' }));
  assert.doesNotThrow(() => validatePublication(article));
});

test('score parser retains unknown scores and rejects invalid events', () => {
  const event = { idEvent: '1', strHomeTeam: 'Home fixture', strAwayTeam: 'Away fixture', dateEvent: '2026-01-01', intHomeScore: null, intAwayScore: '0' };
  assert.deepEqual(parseEvent(event).scores, { home: null, away: 0 });
  assert.deepEqual(parseEvent({ ...event, intHomeScore: 'bad', intAwayScore: -1 }).scores, { home: null, away: null });
  assert.equal(parseEvent({ ...event, strHomeTeam: '' }), null);
  assert.equal(parseEvent(null), null);
});

test('missing score credentials produce no invented results or live claim', async () => {
  delete process.env.THESPORTSDB_API_KEY;
  const result = await getScores();
  assert.equal(result.live, false);
  assert.equal(result.available, false);
  assert.deepEqual(result.results, []);
  assert.equal(result.updatedAt, null);
});

test('score requests deduplicate, cache snapshots and never replay stale scores on failure', async () => {
  process.env.THESPORTSDB_API_KEY = 'test-only';
  const originalFetch = global.fetch;
  const originalNow = Date.now;
  let calls = 0;
  global.fetch = async () => {
    calls++;
    return Response.json({ events: [{ idEvent: 'test', idLeague: '4387', strHomeTeam: 'Fixture home', strAwayTeam: 'Fixture away', dateEvent: new Date().toISOString().slice(0, 10), intHomeScore: '0', intAwayScore: null }] });
  };
  try {
    const results = await Promise.all([getScores(), getScores(), getScores()]);
    assert.equal(calls, 1);
    assert.equal(results[0].results.length, 1);
    assert.equal(results[0].live, false);
    assert.ok(results[0].updatedAt);
    await getScores();
    assert.equal(calls, 1);
    Date.now = () => originalNow() + 120_000;
    global.fetch = async () => { throw new Error('provider unavailable'); };
    const failed = await getScores();
    assert.equal(failed.available, false);
    assert.equal(failed.stale, true);
    assert.deepEqual(failed.results, []);
    assert.equal(failed.updatedAt, results[0].updatedAt);
  } finally { global.fetch = originalFetch; Date.now = originalNow; delete process.env.THESPORTSDB_API_KEY; }
});

test('all costly endpoints require authentication before running agents', async () => {
  for (const route of ['agents', 'run-agent', 'injury-report']) {
    const { GET } = require(`../app/api/${route}/route.ts`);
    const response = await GET(new Request(`https://keyam.test/api/${route}`));
    assert.equal(response.status, 401, route);
  }
});

test('AI remains off by default even for an authenticated editor', async () => {
  process.env.ADMIN_PASSWORD = 'test-only';
  delete process.env.KEYAM_ENABLE_AI;
  const response = await authorizeAgentRun(req(auth.adminCookieHeader().split(';')[0]));
  assert.equal(response.status, 503);
  delete process.env.ADMIN_PASSWORD;
});

test('malformed or failed automated reviews never approve content', async () => {
  const originalComplete = llm.completeFor;
  const originalHasKey = llm.hasApiKey;
  const originalSleep = llm.sleep;
  llm.hasApiKey = () => true;
  llm.sleep = async () => {};
  const ctx = { topic: 'Fixture', findings: 'Fixture facts', recap: '', stats: '', article: 'Fixture draft' };
  try {
    for (const raw of ['not json', '{}', '{"verdict":"unexpected"}', '{"verdict":"APPROVED","notes":[123],"correctedArticle":"test"}']) {
      llm.completeFor = async () => raw;
      assert.equal((await reviewArticle(ctx, () => {})).verdict, 'NEEDS_REVIEW');
    }
    llm.completeFor = async () => { throw new Error('provider failed'); };
    assert.equal((await reviewArticle(ctx, () => {})).verdict, 'NEEDS_REVIEW');
    llm.hasApiKey = () => false;
    assert.equal((await reviewArticle(ctx, () => {})).verdict, 'NEEDS_REVIEW');
  } finally { llm.completeFor = originalComplete; llm.hasApiKey = originalHasKey; llm.sleep = originalSleep; }
});

test('source outage stops scouting instead of asking for news from model memory', async () => {
  const original = { complete: llm.completeFor, key: llm.hasApiKey, sleep: llm.sleep, headlines: headlines.getHeadlines };
  let generated = false;
  llm.hasApiKey = () => true;
  llm.sleep = async () => {};
  llm.completeFor = async () => { generated = true; return ''; };
  headlines.getHeadlines = async () => [];
  try {
    await assert.rejects(runScout(() => {}), /No source headlines/);
    assert.equal(generated, false);
  } finally { llm.completeFor = original.complete; llm.hasApiKey = original.key; llm.sleep = original.sleep; headlines.getHeadlines = original.headlines; }
});

test('production preserves editorial publications while excluding original seed examples', async () => {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  process.env.KEYAM_ENABLE_SAMPLE_CONTENT = 'true';
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  try {
    const actual = await getPublishedArticles();
    assert.equal(actual.length, 13);
    assert.equal(new Set(actual.map(a => a.id)).size, 13);
    assert.equal(actual.some(a => a.title === 'Lakers Rally Past Celtics'), false);
    assert.equal(actual.some(a => a.title === 'Rookie Drops 40 in Debut'), false);
    for (const expected of repositoryArticles) {
      const restored = actual.find(a => a.id === expected.id);
      assert.equal(restored.title, expected.title);
      assert.equal(restored.summary, expected.summary);
      assert.equal(restored.date, expected.date);
      assert.deepEqual(restored.sources, expected.sources);
    }
  } finally { process.env.NODE_ENV = previous; delete process.env.KEYAM_ENABLE_SAMPLE_CONTENT; }
});

test('production sensitive rate limiting fails closed without Redis', async () => {
  const { rateLimit } = require('../lib/rateLimit.ts');
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  try { assert.equal((await rateLimit('test-private', 5, 60_000, true)).ok, false); }
  finally { process.env.NODE_ENV = previous; }
});

test('login validates input, sets a usable cookie and throttles repeated attempts', async () => {
  const { POST } = require('../app/api/admin/login/route.ts');
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = 'development';
  process.env.ADMIN_PASSWORD = 'test-login-only';
  const request = (body) => new Request('https://keyam.test/api/admin/login', { method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': 'unit-test-login' }, body });
  try {
    assert.equal((await POST(request('{bad'))).status, 400);
    assert.equal((await POST(request('{"password":123}'))).status, 401);
    const response = await POST(request('{"password":"test-login-only"}'));
    assert.equal(response.status, 200);
    const cookie = response.headers.get('set-cookie');
    assert.ok(cookie.includes('HttpOnly'));
    assert.ok(cookie.includes('SameSite=Strict'));
    assert.equal(auth.isAdmin(req(cookie.split(';')[0])), true);
    await POST(request('{"password":"wrong"}'));
    await POST(request('{"password":"wrong"}'));
    assert.equal((await POST(request('{"password":"wrong"}'))).status, 429);
  } finally { process.env.NODE_ENV = previous; delete process.env.ADMIN_PASSWORD; }
});

test('database failures retain existing editorial notes without serving seed examples', async () => {
  const db = require('../lib/supabase.ts');
  const original = db.supabaseAnon;
  db.supabaseAnon = () => ({ from: () => ({ select: () => ({ eq: () => ({ order: async () => ({ data: null, error: { message: 'fixture database outage' } }) }) }) }) });
  try {
    assert.equal((await getPublishedArticles()).length, 13);
    db.supabaseAnon = () => { throw new Error('fixture malformed configuration'); };
    assert.equal((await getPublishedArticles()).length, 13);
  } finally { db.supabaseAnon = original; }
});


test('recovered notes preserve all originally published copy and attribution', () => {
  for (const restored of getRepositoryPublications()) {
    const index = Number(restored.id.replace('sample-', ''));
    const original = originalArticles[index];
    assert.deepEqual({ title: restored.title, summary: restored.summary, date: restored.date, ai: restored.ai, category: restored.category, sources: restored.sources },
      { title: original.title, summary: original.summary, date: original.date, ai: original.ai, category: original.category, sources: original.sources });
  }
});

test('a successful database result stays authoritative, including intentional unpublishing', async () => {
  const db = require('../lib/supabase.ts');
  const original = db.supabaseAnon;
  let rows = [];
  db.supabaseAnon = () => ({ from: () => ({ select: () => ({ eq: () => ({ order: async () => ({ data: rows, error: null }) }) }) }) });
  try {
    assert.deepEqual(await getPublishedArticles(), []);
    rows = [{ id: 'db-fixture', ...article, ai: false }];
    const actual = await getPublishedArticles();
    assert.equal(actual.length, 1);
    assert.equal(actual[0].id, 'db-fixture');
    assert.equal(actual.some(a => a.id.startsWith('sample-')), false);
  } finally { db.supabaseAnon = original; }
});

test('explicit database-only mode never revives repository notes on an outage', async () => {
  const db = require('../lib/supabase.ts');
  const original = db.supabaseAnon;
  process.env.KEYAM_CONTENT_SOURCE = 'database';
  try {
    db.supabaseAnon = () => null;
    assert.deepEqual(await getPublishedArticles(), []);
    db.supabaseAnon = () => { throw new Error('fixture outage after editorial unpublishing'); };
    assert.deepEqual(await getPublishedArticles(), []);
  } finally { db.supabaseAnon = original; delete process.env.KEYAM_CONTENT_SOURCE; }
});

test('private job controls and scheduled entry reject unauthenticated requests', async () => {
  const jobs = require('../app/api/admin/agent-jobs/route.ts');
  const cron = require('../app/api/cron/agents/route.ts');
  delete process.env.CRON_SECRET;
  assert.equal((await jobs.GET(req())).status, 401);
  assert.equal((await jobs.POST(req())).status, 401);
  assert.equal((await cron.GET(req())).status, 401);
  process.env.CRON_SECRET = 'local-test-secret-with-at-least-32-characters';
  delete process.env.KEYAM_ENABLE_SCHEDULED_AGENTS;
  const request = new Request('https://keyam.test/api/cron/agents', {headers:{authorization:`Bearer ${process.env.CRON_SECRET}`}});
  assert.equal((await cron.GET(request)).status, 503);
  delete process.env.CRON_SECRET;
});

test('draft persistence requires sources and never accepts a publication state', () => {
  const { draftFromContext } = require('../lib/agentJobs.ts');
  const ctx = {topic:'Fixture', findings:'Fixture evidence', category:'basketball', article:'Fixture title\nFixture draft', sources:['https://example.com/story?utm_source=test#part'], publicationStatus:'needs_review'};
  const draft = draftFromContext(ctx);
  assert.equal(draft.status,'draft');
  assert.equal(draft.title,'Fixture title');
  assert.deepEqual(draft.sources,['https://example.com/story']);
  assert.throws(()=>draftFromContext({...ctx, sources:[]}));
  assert.throws(()=>draftFromContext({...ctx, publicationStatus:'published'}));
});

test('tracked jobs persist drafts and usage, deduplicate before AI, and record failures', async()=>{
  const database=require('../lib/supabase.ts');
  const runner=require('../agents/AgentRunner.ts');
  const limits=require('../lib/rateLimit.ts');
  const {runDraftJob}=require('../lib/agentJobs.ts');
  const {recordModelUsage}=require('../agents/usage.ts');
  const originals={db:database.supabaseAdmin,run:runner.runCrew,limit:limits.rateLimit};
  const names=['NEXT_PUBLIC_SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','OPENAI_API_KEY','KEYAM_ENABLE_AI',...['SCOUT','WRITER','STATS','EDITOR','SENIOR_EDITOR'].map(x=>'KEYAM_MODEL_'+x)];
  const env=Object.fromEntries(names.map(n=>[n,process.env[n]]));
  names.forEach(n=>process.env[n]=n==='KEYAM_ENABLE_AI'?'true':n.includes('URL')?'https://fixture.test':'test-only');
  const calls=[]; let claimed=true; let fail=false; let runs=0;
  database.supabaseAdmin=()=>({from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:null,error:null})})})}),rpc:async(name,args)=>{
    calls.push({name,args});
    if(name==='claim_agent_job') return {data:{claimed,job:{id:'fixture-id',lease:'fixture-lease',state:'needs_review'}},error:null};
    if(name==='finish_agent_job') return {data:{id:'fixture-id',state:'needs_review',article_id:'00000000-0000-4000-8000-000000000003'},error:null};
    if(name==='decide_agent_publication') return {data:{state:'hold'},error:null};
    return {data:null,error:null};
  }});
  limits.rateLimit=async(key)=>{
    assert.equal(key,`ai:global:daily:${new Date().toISOString().slice(0,10)}`);
    return {ok:true,retryAfter:0};
  };
  runner.runCrew=async()=>{
    runs++;
    if(fail) throw new Error('Fixture provider failure');
    await recordModelUsage({agent:'writer',model:'fixture',inputTokens:12,outputTokens:4,incomplete:false});
    return {topic:'Fixture',findings:'Evidence',article:'Fixture title\nFixture body',category:'soccer',sources:['https://example.com/fixture'],publicationStatus:'needs_review'};
  };
  try {
    assert.equal((await runDraftJob('fixture1')).job.state,'needs_review');
    assert.equal(calls.find(c=>c.name==='finish_agent_job').args.p_draft.status,'draft');
    assert.equal(calls.find(c=>c.name==='record_agent_usage').args.p_usage.outputTokens,4);
    claimed=false;
    assert.equal((await runDraftJob('fixture1')).claimed,false);
    assert.equal(runs,1);
    claimed=true; fail=true;
    await assert.rejects(runDraftJob('fixture2'),/publication audit/);
    assert.ok(calls.some(c=>c.name==='fail_agent_job'));
    assert.equal(calls.filter(c=>c.name==='finish_agent_job').length,1);
  } finally {
    database.supabaseAdmin=originals.db; runner.runCrew=originals.run; limits.rateLimit=originals.limit;
    for(const n of names){ if(env[n]===undefined) delete process.env[n]; else process.env[n]=env[n]; }
  }
});

test('per-run model call and input limits bound tracked generation',async()=>{
  const {withUsageTracking,reserveModelCall}=require('../agents/usage.ts');
  await withUsageTracking(async()=>{},async()=>{
    for(let i=0;i<10;i++) reserveModelCall('fixture','fixture');
    assert.throws(()=>reserveModelCall('fixture','fixture'),/call limit/);
  });
  assert.throws(()=>reserveModelCall('x'.repeat(16001),'fixture'),/input limit/);
});


test('preferred admin password overrides the legacy value for login and signed sessions', async () => {
  const original = { first: process.env.ADMIN_PASSWORD, second: process.env.ADMIN_PASSWORD_2, mode: process.env.NODE_ENV };
  const { POST } = require('../app/api/admin/login/route.ts');
  process.env.NODE_ENV = 'development';
  process.env.ADMIN_PASSWORD = 'legacy-fixture-only';
  process.env.ADMIN_PASSWORD_2 = 'preferred-fixture-only';
  const request = password => new Request('https://keyam.test/api/admin/login', { method: 'POST', headers: {'content-type':'application/json','x-forwarded-for':'preferred-password-test'}, body: JSON.stringify({password}) });
  try {
    assert.equal((await POST(request('legacy-fixture-only'))).status,401);
    const response = await POST(request('preferred-fixture-only'));
    assert.equal(response.status,200);
    const cookie = response.headers.get('set-cookie').split(';')[0];
    assert.equal(auth.isAdmin(req(cookie)),true);
    process.env.ADMIN_PASSWORD = 'another-unused-legacy-value';
    assert.equal(auth.isAdmin(req(cookie)),true);
    delete process.env.ADMIN_PASSWORD_2;
    assert.equal(auth.isAdmin(req(cookie)),false);
    assert.equal(auth.adminPassword(),'another-unused-legacy-value');
  } finally {
    for (const [key,value] of [['ADMIN_PASSWORD',original.first],['ADMIN_PASSWORD_2',original.second],['NODE_ENV',original.mode]]) {
      if(value===undefined) delete process.env[key]; else process.env[key]=value;
    }
  }
});

test('scheduler diagnostics are private, read-only, and do not require enabling the schedule',async()=>{
  const diagnostics=require('../lib/agentDiagnostics.ts');
  const original=diagnostics.agentDiagnostics;
  const originalSecret=process.env.CRON_SECRET;
  const cron=require('../app/api/cron/agents/route.ts');
  const secret='fixture-scheduler-key-with-at-least-32-characters';
  process.env.CRON_SECRET=secret;
  let checks=0;
  diagnostics.agentDiagnostics=async()=>{checks++;return {ok:true,databaseReady:true};};
  try {
    assert.equal((await cron.GET(new Request('https://keyam.test/api/cron/agents?mode=check'))).status,401);
    assert.equal(checks,0);
    const response=await cron.GET(new Request('https://keyam.test/api/cron/agents?mode=check',{headers:{authorization:`Bearer ${secret}`}}));
    assert.equal(response.status,200);
    assert.equal((await response.json()).databaseReady,true);
    assert.equal(checks,1);
    assert.equal((await cron.GET(new Request('https://keyam.test/api/cron/agents?mode=unknown',{headers:{authorization:`Bearer ${secret}`}}))).status,400);
  } finally {diagnostics.agentDiagnostics=original;if(originalSecret===undefined)delete process.env.CRON_SECRET;else process.env.CRON_SECRET=originalSecret;}
});


test('automatic publication requires fresh primary evidence, explicit approval and low risk',()=>{
  const {publicationDecision}=require('../lib/editorialPolicy.ts');
  const evidence={primary:true,relevant:true,url:'https://www.nba.com/news/fixture',text:'Fixture primary evidence.',checkedAt:new Date().toISOString()};
  const input={topic:'Home team wins basketball game',article:'Home team wins. Fixture match report.',verdict:'APPROVED',research:{primaryVerified:true,evidence:[evidence],reasons:[]},assessment:{decision:'APPROVE',riskTier:1,allClaimsSupported:true,contradictions:false,contentType:'game_result'}};
  assert.equal(publicationDecision(input).decision,'APPROVE');
  for(const changed of [
    {...input,research:{...input.research,primaryVerified:false}},
    {...input,verdict:'NEEDS_REVIEW'},
    {...input,assessment:{...input.assessment,riskTier:3}},
    {...input,assessment:{...input.assessment,contradictions:true}},
    {...input,assessment:{...input.assessment,allClaimsSupported:false}},
    {...input,article:'Player arrested following allegations.'},
    {...input,research:{...input.research,evidence:[{...evidence,checkedAt:'2020-01-01'}]}},
    {...input,assessment:{}},
  ])assert.equal(publicationDecision(changed).decision,'HOLD');
});
test('research rejects untrusted destinations and irrelevant or navigation-only primary pages',()=>{
  const {permittedEvidenceUrl,evidenceFromHtml}=require('../agents/ResearchAgent.ts');
  assert.equal(permittedEvidenceUrl('https://www.nba.com/news/fixture'),true);
  for(const url of ['http://nba.com/news','https://nba.com.attacker.test/news','https://user:pass@nba.com/news','https://127.0.0.1/news','https://nba.com:9000/news'])assert.equal(permittedEvidenceUrl(url),false);
  assert.equal(evidenceFromHtml('https://nba.com/news','<title>Team news</title><nav>Fixture text</nav>','Lakers win basketball game'),null);
  const html='<h1>Lakers Celtics match result</h1><article>'+('Fixture evidence describing the basketball match. '.repeat(8))+'</article>';
  assert.equal(evidenceFromHtml('https://nba.com/news',html,'Lakers Celtics game result').relevant,true);
  assert.equal(evidenceFromHtml('https://nba.com/news',html,'Arsenal Liverpool game result').relevant,false);
});
test('publisher verifies a real public article marker and never follows a different host',async()=>{
  const {verifyPublishedUrl}=require('../lib/autoPublisher.ts');
  const original=global.fetch;let calls=0;
  const id='00000000-0000-4000-8000-000000000001';
  global.fetch=async()=>{calls++;return new Response(`<article data-article-id="${id}">Fixture</article>`);};
  try{
    assert.equal(await verifyPublishedUrl('https://attacker.test/news/'+id,id),false);
    assert.equal(calls,0);
    assert.equal(await verifyPublishedUrl('https://keyamsports-new.vercel.app/news/fixture-'+id,id),true);
    assert.equal(calls,1);
  }finally{global.fetch=original;}
});
test('pause prevents autonomous generation without changing the job queue',async()=>{
  const original=process.env.PAUSE_PUBLISHING;process.env.PAUSE_PUBLISHING='true';
  try{assert.equal((await require('../lib/agentJobs.ts').runDraftJob('paused-fixture')).paused,true);}
  finally{if(original===undefined)delete process.env.PAUSE_PUBLISHING;else process.env.PAUSE_PUBLISHING=original;}
});
