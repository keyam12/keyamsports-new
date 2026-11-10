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
