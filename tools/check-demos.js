// Plays every level's "Show me how" demo in a real browser and checks it wins with 3 fireflies.
// Usage: node tools/check-demos.js   (needs Playwright)
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 420, height: 680 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
  const n = await page.evaluate(() => window.LEVELS.length);
  let bad = 0;
  for (let i = 0; i < n; i++) {
    await page.evaluate(i => window.__snip.start(i, true), i);
    await page.waitForFunction(() => window.__snip.world().state !== 'play', null, { timeout: 30000 }).catch(() => {});
    const r = await page.evaluate(() => { const w = window.__snip.world(); return { state: w.state, stars: w.collected, name: w.level.name }; });
    const ok = r.state === 'won' && r.stars === 3;
    if (!ok) bad++;
    console.log(`#${i + 1} ${r.name}: ${r.state} ${r.stars}/3 ${ok ? '' : '<-- FAIL'}`);
  }
  console.log(errors.length ? 'page errors:\n' + errors.join('\n') : 'no page errors');
  console.log(bad ? bad + ' failed' : 'all demos win in the browser');
  await browser.close();
  process.exitCode = bad ? 1 : 0;
})();
