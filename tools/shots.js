// Takes screenshots of the game into docs/. Usage: node tools/shots.js
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 420, height: 680 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'docs/menu.png' });
  await page.click('#btn-play');
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'docs/levels.png' });
  // play levels using their stored solutions, snapshot mid-way
  const shots = [[2, 0.62, 'swing'], [10, 0.55, 'pegs'], [12, 0.45, 'bubble'], [17, 0.5, 'blower'], [24, 0.6, 'finale']];
  for (const [n, frac, name] of shots) {
    await page.evaluate(i => window.__snip.start(i), n - 1);
    const sol = await page.evaluate(i => window.LEVELS[i].solution, n - 1);
    const end = await page.evaluate(([i]) => window.Engine.simulate(window.LEVELS[i], window.LEVELS[i].solution).frames, [n - 1]);
    const target = Math.floor(end * frac);
    // drive the live world frame-by-frame: wait until frame reaches each action
    let done = 0;
    while (true) {
      const f = await page.evaluate(() => window.__snip.world().frame);
      while (done < sol.length && sol[done].t <= f) {
        await page.evaluate(a => { const w = window.__snip.world(); if (a.cut !== undefined) w.cutRope(a.cut); if (a.pop) w.pop(); if (a.blow !== undefined) w.blow(a.blow); }, sol[done]);
        done++;
      }
      if (f >= target) break;
      await page.waitForTimeout(5);
    }
    await page.screenshot({ path: `docs/${name}.png` });
  }
  // let the finale finish to capture the result screen
  await page.waitForTimeout(3500);
  await page.screenshot({ path: 'docs/result.png' });
  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no page errors');
  await browser.close();
})();
