// Tries random layouts for one level and prints the most forgiving ones.
// Usage: node tools/design-search.js <levelNumber> <tries>
// The layout generators below describe what each level is allowed to vary.
'use strict';
var path = require('path');
var Engine = require('../js/engine.js');
var src = require('./levels-src.js');
var builder = path.join(__dirname, 'build-levels.js');

var seed = 99;
function rnd(a, b) { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return a + (seed % 10000) / 10000 * (b - a); }
function ri(a, b) { return Math.round(rnd(a, b)); }

var GEN = {
  4: function () { // Double Knot: two ropes, cut one, swing, cut the other
    var ay = ri(80, 260);
    return { berry: { x: ri(170, 230), y: ay + ri(100, 160) }, ropes: [{ x: ri(40, 110), y: ay + ri(-30, 30) }, { x: ri(290, 360), y: ay + ri(-30, 30) }],
      goal: { x: ri(250, 350), y: ri(540, 580) } };
  },
  19: function () { // Updraft: drop, puff it into a peg, cut to the nest
    return { berry: { x: ri(160, 240), y: ri(120, 180) }, ropes: [{ x: 0, y: 40 }], blowers: [{ x: ri(30, 60), y: ri(280, 360), angle: ri(-45, -15) }],
      autoRopes: [{ x: ri(280, 340), y: ri(180, 260), r: ri(85, 110) }], spikes: [{ x: 0, y: ri(430, 470), w: ri(220, 270), h: 20 }],
      goal: { x: ri(300, 350), y: ri(550, 580) } };
  },
  21: function () { // Ping Pong: bubble up, puff right, puff left, pop over nest
    return { blowers: [{ x: 20, y: ri(370, 430), angle: 0 }, { x: 380, y: ri(200, 260), angle: 180 }],
      spikes: [{ x: 0, y: 0, w: 400, h: 16 }, { x: ri(130, 170), y: ri(280, 320), w: 100, h: 16 }], goal: { x: ri(50, 140), y: ri(540, 575) } };
  }
};

var n = +process.argv[2], tries = +process.argv[3] || 20;
var results = [];
for (var t = 0; t < tries; t++) {
  var over = GEN[n]();
  if (n === 19) over.ropes[0].x = over.berry.x;
  var lv = Object.assign(JSON.parse(JSON.stringify(src[n - 1])), over);
  // run the builder on this one level, capturing its line
  var lines = [];
  var log = console.log; console.log = function (s) { lines.push(String(s)); };
  delete require.cache[builder]; delete require.cache[require.resolve('./levels-src.js')];
  var s2 = require('./levels-src.js'); s2[n - 1] = lv;
  process.argv = [process.argv[0], builder, String(n)];
  try { require(builder); } catch (e) { lines.push('ERR ' + e.message); }
  console.log = log;
  var line = lines[0] || '';
  var m = line.match(/windows win\/3stars=([0-9/ ]+)/);
  var score = -1;
  if (m && line.indexOf('<--') < 0) score = Math.min.apply(null, m[1].trim().split(' ').map(function (p) { return Math.min(+p.split('/')[0], +p.split('/')[1] * 1.5); }));
  else if (m && /too tight|fireflies/.test(line) && !/doing nothing|fails/.test(line)) score = Math.min.apply(null, m[1].trim().split(' ').map(function (p) { return Math.min(+p.split('/')[0], +p.split('/')[1] * 1.5); })) - 100;
  results.push({ score: score, over: over, line: line });
  process.stderr.write('.');
}
results.sort(function (a, b) { return b.score - a.score; });
results.slice(0, 3).forEach(function (r) { console.log(r.score, JSON.stringify(r.over)); console.log('   ', r.line); });
