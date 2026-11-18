// Builds js/levels.js from tools/levels-src.js.
// For each level it searches the solution timings, places fireflies along the
// winning path (unless the level gives them), then re-checks the result.
// Usage: node tools/build-levels.js [levelNumber]
'use strict';
var fs = require('fs');
var path = require('path');
var Engine = require('../js/engine.js');
var src = require('./levels-src.js');

function expand(v) {
  if (Array.isArray(v)) { var o = []; for (var x = v[0]; x <= v[1]; x += (v[2] || 2)) o.push(x); return o; }
  return [v];
}

function search(level) {
  search.miss = null;
  var tmpl = level.solve || [];
  var axes = tmpl.map(function (a) { return expand(a.t); });
  var wins = [];
  var idx = axes.map(function () { return 0; });
  var total = axes.reduce(function (p, a) { return p * a.length; }, 1);
  var CAP = 3000, seen = {};
  var n = Math.min(total, CAP);
  // deterministic pseudo-random sampling when the grid is too big
  var seed = 12345;
  function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed; }
  for (var cc = 0; cc < n; cc++) {
    var c = total <= CAP ? cc : rnd() % total;
    if (seen[c]) continue; seen[c] = 1;
    var rem = c, acts = [];
    for (var i = 0; i < axes.length; i++) {
      idx[i] = rem % axes[i].length; rem = Math.floor(rem / axes[i].length);
      var a = Object.assign({}, tmpl[i]); a.t = axes[i][idx[i]]; acts.push(a);
    }
    // keep action order: each timed action must not precede the previous one
    var ok = true;
    for (var j = 1; j < acts.length; j++) if (acts[j].t < acts[j - 1].t) ok = false;
    if (!ok) continue;
    var r = Engine.simulate(level, acts);
    if (r.state !== 'won' && (!search.miss || r.near < search.miss.near)) search.miss = { near: Math.round(r.near), at: r.nearAt, why: r.state + ' ' + r.reason, t: acts.map(function (a) { return a.t; }) };
    if (r.state === 'won' && (!level.stars || r.stars === level.stars.length)) wins.push({ acts: acts, key: idx.slice(), res: r });
  }
  if (!wins.length) return null;
  // pick the most robust win: most winning neighbours on the grid
  var set = {};
  wins.forEach(function (w) { set[w.key.join(',')] = true; });
  var best = null, bestScore = -1;
  wins.forEach(function (w) {
    var s = 0;
    for (var i = 0; i < w.key.length; i++) {
      for (var d = -3; d <= 3; d++) {
        if (!d) continue;
        var k = w.key.slice(); k[i] += d;
        if (set[k.join(',')]) s++;
      }
    }
    if (s > bestScore) { bestScore = s; best = w; }
  });
  best.count = wins.length;
  best.score = bestScore;
  return best;
}

function placeStars(level, res, fracs, acts) {
  // only use the part of the path after the player's first move
  var t0 = acts.length ? acts[0].t + 8 : 0;
  var p = res.path.filter(function (q) { return q[2] >= t0; });
  if (p.length < 3) p = res.path;
  // keep fireflies away from where the berry goes if the player does nothing
  var idle = Engine.simulate(level, []).path;
  function free(q) {
    if (q[1] < 100 || q[0] < 20 || q[0] > 380) return false;
    for (var i = 0; i < idle.length; i++) {
      var dx = idle[i][0] - q[0], dy = idle[i][1] - q[1];
      if (dx * dx + dy * dy < 48 * 48) return false;
    }
    return true;
  }
  var used = {};
  return fracs.map(function (f) {
    var want = Math.round(f * (p.length - 1)), pick = want;
    for (var d = 0; d < p.length; d++) {
      var a = want + d, b = want - d;
      if (a < p.length && !used[a] && free(p[a])) { pick = a; break; }
      if (b >= 0 && !used[b] && free(p[b])) { pick = b; break; }
    }
    used[pick] = 1;
    return { x: p[pick][0], y: p[pick][1] };
  });
}

var only = process.argv[2] ? parseInt(process.argv[2], 10) : 0;
var out = [], failed = 0;
src.forEach(function (lv, n) {
  var num = n + 1;
  var level = JSON.parse(JSON.stringify(lv));
  delete level.starAt;
  if (only && only !== num) { out.push(null); return; }
  var t0 = Date.now();
  var best = search(level);
  if (!best) {
    console.log('#' + num + ' ' + lv.name + ': NO WIN FOUND (' + (Date.now() - t0) + 'ms) closest ' + JSON.stringify(search.miss));
    failed++; out.push(null); return;
  }
  if (!lv.stars) level.stars = placeStars(level, best.res, lv.starAt || [0.25, 0.5, 0.78], best.acts);
  var check = Engine.simulate(level, best.acts);
  var lazy = Engine.simulate(level, (level.solve || []).map(function (a) { var b = Object.assign({}, a); b.t = 0; return b; }));
  level.solution = best.acts;
  delete level.solve;
  var line = '#' + num + ' ' + lv.name + ': ' + check.state + ' stars=' + check.stars +
    ' wins=' + best.count + ' robust=' + best.score + ' acts=' + JSON.stringify(best.acts.map(function (a) { return a.t; })) +
    ' | all-at-once: ' + lazy.state + '/' + lazy.stars + ' (' + (Date.now() - t0) + 'ms)';
  if (check.state !== 'won' || check.stars !== 3) { line += '  <-- CHECK'; failed++; }
  console.log(line);
  if (only && process.argv[3]) console.log(JSON.stringify(best.res.path));
  out.push(level);
});

if (!only) {
  var js = '// Generated by tools/build-levels.js from tools/levels-src.js. Do not edit by hand.\n' +
    '(function (root) {\nvar LEVELS = ' + JSON.stringify(out, null, 1) + ';\n' +
    "if (typeof module !== 'undefined' && module.exports) module.exports = LEVELS; else root.LEVELS = LEVELS;\n})(this);\n";
  fs.writeFileSync(path.join(__dirname, '..', 'js', 'levels.js'), js);
  console.log(failed ? failed + ' level(s) need attention' : 'All ' + out.length + ' levels OK');
}
process.exitCode = failed ? 1 : 0;
