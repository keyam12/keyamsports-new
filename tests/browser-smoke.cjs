// Local-only fixture backend; no real articles are created or published.
const http = require('node:http');
const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const path = require('node:path');
const fs = require('node:fs');
const rows = [
  { id: '00000000-0000-4000-8000-000000000001', category: 'basketball', title: 'Test fixture basketball headline', summary: 'Local browser test content only.', date: '2026-01-02', ai: true, status: 'published', sources: ['https://example.com/source'] },
  { id: '00000000-0000-4000-8000-000000000002', category: 'football', title: 'Test fixture football headline', summary: 'Second local browser test fixture.', date: '2026-01-01', ai: false, status: 'published', sources: ['https://example.com/source'] },
];
const fixture = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(rows));
});
const base = 'http://127.0.0.1:3100';
(async () => {
  await new Promise((resolve) => fixture.listen(4010, '127.0.0.1', resolve));
  const app = spawn('npm', ['run', 'start', '--', '-p', '3100'], {
    cwd: path.resolve(__dirname, '..'),
    env: { ...process.env, NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:4010', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-fixture-only', SUPABASE_SERVICE_ROLE_KEY: '', THESPORTSDB_API_KEY: '', KEYAM_ENABLE_AI: 'false', ADMIN_PASSWORD: '' },
    stdio: ['ignore', 'pipe', 'pipe'], detached: true,
  });
  let logs = '';
  app.stdout.on('data', (data) => { logs += data; });
  app.stderr.on('data', (data) => { logs += data; });
  let browser;
  try {
    let ready = false;
    for (let i = 0; i < 100; i++) {
      try { if ((await fetch(base)).ok) { ready = true; break; } } catch {}
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
    assert.ok(ready, logs);
    const html = await (await fetch(base)).text();
    assert.ok(html.includes(rows[0].title), 'published headline is in server HTML');
    assert.ok(html.includes(rows[0].summary), 'summary is in server HTML');
    for (const route of ['agents', 'run-agent', 'injury-report']) {
      assert.equal((await fetch(`${base}/api/${route}`)).status, 401);
    }
    const scores = await (await fetch(`${base}/api/live-scores`)).json();
    assert.deepEqual(scores.results, []);
    assert.equal(scores.live, false);
    const sitemap = await (await fetch(`${base}/sitemap.xml`)).text();
    for (const route of ['football', 'contact', 'odds']) assert.ok(sitemap.includes(`/${route}`));
    assert.ok(!sitemap.includes('/agents'));
    assert.ok(!sitemap.includes('<lastmod>'));
    const robots = await (await fetch(`${base}/robots.txt`)).text();
    assert.ok(robots.includes('Disallow: /admin'));
    assert.equal((await fetch(`${base}/agents`, { redirect: 'manual' })).status, 307);
    assert.equal((await fetch(`${base}/api/articles`)).headers.get('x-robots-tag'), 'noindex, nofollow');

    browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.getByRole('heading', { name: rows[0].title }).waitFor();
    const visibleText = (await page.locator('body').innerText()).replace(/[©®™]/gu, '');
    assert.equal(/\p{Extended_Pictographic}/u.test(visibleText), false, 'no decorative emoji in the public homepage');
    assert.ok(await page.locator('svg[stroke-width="1.5"][aria-hidden="true"]').count() >= 10, 'shared decorative line icons rendered');
    await page.getByText('Asistido por IA', { exact: true }).waitFor();
    const color = await page.locator('section').first().evaluate((node) => getComputedStyle(node).backgroundColor);
    assert.equal(color, 'rgb(244, 41, 2)', 'existing brand color preserved');
    assert.ok(await page.locator('h1').evaluate((node) => getComputedStyle(node).fontFamily.includes('Oswald')), 'existing display font preserved');
    await page.getByRole('searchbox', { name: 'Search headlines' }).fill('football');
    await page.getByRole('heading', { name: rows[1].title }).waitFor();
    await page.getByRole('heading', { name: rows[0].title }).waitFor({ state: 'detached' });
    assert.equal(await page.getByRole('heading', { name: rows[0].title }).count(), 0);
    await page.getByRole('searchbox').fill('');
    await page.getByRole('button', { name: 'Basketball', exact: true }).click();
    assert.equal(await page.getByRole('button', { name: 'Basketball', exact: true }).getAttribute('aria-pressed'), 'true');
    await page.getByRole('heading', { name: rows[1].title }).waitFor({ state: 'detached' });
    assert.equal(await page.getByRole('heading', { name: rows[1].title }).count(), 0);
    await page.getByRole('button', { name: 'Show all', exact: true }).click();
    await page.getByRole('heading', { name: rows[1].title }).waitFor();
    assert.equal(await page.getByRole('heading', { name: rows[1].title }).count(), 1, 'clearing filters preserves the other article');
    fs.mkdirSync('/tmp/keyam-verification', { recursive: true });
    await page.screenshot({ path: '/tmp/keyam-verification/desktop.png', fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: '/tmp/keyam-verification/mobile.png', fullPage: true });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'no mobile horizontal overflow');
    await page.getByRole('searchbox').fill('no-match-fixture');
    await page.getByText('No headlines match your filters.').waitFor();
    for (const [route, heading] of [['basketball', 'Basketball'], ['football', 'Football'], ['baseball', 'Baseball'], ['soccer', 'Soccer']]) {
      await page.goto(`${base}/${route}`, { waitUntil: 'networkidle' });
      await page.getByRole('heading', { name: heading, exact: true }).waitFor();
      if (['baseball', 'soccer'].includes(route)) await page.getByText('No published stories in this section yet.').waitFor();
    }
    await page.goto(`${base}/admin`);
    assert.ok((await page.locator('meta[name="robots"]').getAttribute('content')).includes('noindex'));
    await page.getByRole('textbox', { name: 'Admin password' }).count();
    assert.deepEqual(errors, [], 'no browser runtime errors');
    console.log('PASS: server-rendered feed; private AI endpoints; no fake scores; sitemap/robots; desktop/mobile; search/favorites; four league routes; private-page noindex. Line-icon UI without emojis; screenshots: /tmp/keyam-verification');
  } finally {
    if (browser) await browser.close();
    process.kill(-app.pid, 'SIGTERM');
    await new Promise((resolve) => fixture.close(resolve));
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
