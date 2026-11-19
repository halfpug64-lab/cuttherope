// Builds js/levels.js from tools/levels-src.js.
//
// For each level it:
//  1. searches the timing template (`solve`) for solutions that win,
//  2. keeps the one whose tightest move has the most slack (a human can't hit
//     an exact frame),
//  3. places the fireflies only where the berry still passes when the player's
//     timing is a bit early or late,
//  4. fails the build if any move's timing window is below the minimum.
//
// Timing windows are measured like a player experiences them: moving one action
// also moves every later action by the same amount. 60 frames = 1 second.
//
// Usage: node tools/build-levels.js [levelNumber]   (a single level is checked, not saved)
'use strict';
var fs = require('fs');
var path = require('path');
var Engine = require('../js/engine.js');
var src = require('./levels-src.js');

var MIN_WIN = 20;    // frames of slack needed on every move just to win (1/3 s)
var MIN_STARS = 12;  // frames of slack needed on every move to also get all 3 fireflies (1/5 s)
var CATCH = 24;      // a firefly must be this close to every nearby-timing path

function expand(v) {
  if (Array.isArray(v)) { var o = []; for (var x = v[0]; x <= v[1]; x += (v[2] || 2)) o.push(x); return o; }
  return [v];
}

function shifted(acts, i, d) {
  var out = acts.map(function (b) { return Object.assign({}, b); });
  for (var j = i; j < out.length; j++) out[j].t += d;
  return out;
}

// width in frames of the timing window around action i (later actions move with it)
function windowOf(level, acts, i, needStars, cap) {
  cap = cap || 120;
  function ok(d) {
    var a = shifted(acts, i, d);
    if (a[i].t < 0) return false;
    var r = Engine.simulate(level, a);
    return r.state === 'won' && (!needStars || r.stars === level.stars.length);
  }
  var lo = 0, hi = 0;
  while (lo > -cap && ok(lo - 1)) lo--;
  while (hi < cap && ok(hi + 1)) hi++;
  return { lo: lo, hi: hi, width: hi - lo + 1 };
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
    // keep action order
    var ok = true;
    for (var j = 1; j < acts.length; j++) if (acts[j].t < acts[j - 1].t) ok = false;
    if (!ok) continue;
    var r = Engine.simulate(level, acts);
    if (r.state !== 'won' && (!search.miss || r.near < search.miss.near)) search.miss = { near: Math.round(r.near), at: r.nearAt, why: r.state + ' ' + r.reason, t: acts.map(function (a) { return a.t; }) };
    if (r.state === 'won' && (!level.stars || r.stars === level.stars.length)) wins.push({ acts: acts, key: idx.slice(), res: r });
  }
  if (!wins.length) return null;
  // shortlist by winning neighbours on the grid, then measure real windows
  var set = {};
  wins.forEach(function (w) { set[w.key.join(',')] = true; });
  wins.forEach(function (w) {
    var s = 0;
    for (var i = 0; i < w.key.length; i++) {
      for (var d = -3; d <= 3; d++) {
        if (!d) continue;
        var k = w.key.slice(); k[i] += d;
        if (set[k.join(',')]) s++;
      }
    }
    w.score = s;
  });
  wins.sort(function (a, b) { return b.score - a.score; });
  var best = null;
  wins.slice(0, 16).forEach(function (w) {
    var ws = w.acts.map(function (a, i) { return windowOf(level, w.acts, i, !!level.stars, 45); });
    // centre each action in its window so early and late mistakes are equally forgiven
    var centred = w.acts.map(function (a) { return Object.assign({}, a); });
    for (var i = 0; i < ws.length; i++) {
      var shift = Math.round((ws[i].lo + ws[i].hi) / 2);
      if (shift) { centred = shifted(centred, i, shift); }
    }
    var cr = Engine.simulate(level, centred);
    if (cr.state === 'won' && (!level.stars || cr.stars === level.stars.length)) w.acts = centred, w.res = cr;
    w.minWin = Math.min.apply(null, w.acts.map(function (a, i) { return windowOf(level, w.acts, i, !!level.stars, 45).width; }));
    if (!best || w.minWin > best.minWin) best = w;
  });
  best.count = wins.length;
  return best;
}

function distToPath(px, py, pts) {
  var best = 1e9;
  for (var i = 1; i < pts.length; i++) {
    var ax = pts[i - 1][0], ay = pts[i - 1][1], bx = pts[i][0], by = pts[i][1];
    var dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy;
    var t = l ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l)) : 0;
    var ex = ax + dx * t - px, ey = ay + dy * t - py, d = ex * ex + ey * ey;
    if (d < best) best = d;
  }
  return Math.sqrt(best);
}

function placeStars(level, acts, fracs) {
  var nominal = Engine.simulate(level, acts, 1500, 1).path;
  // paths the berry takes when each move is a bit early or late
  var others = [];
  acts.forEach(function (a, i) {
    var w = windowOf(level, acts, i, false, 30);
    var s = Math.max(2, Math.min(7, Math.floor((w.width - 1) / 3)));
    [-s, s].forEach(function (d) {
      var r = Engine.simulate(level, shifted(acts, i, d), 1500, 1);
      if (r.state === 'won') others.push(r.path);
    });
  });
  var idle = Engine.simulate(level, [], 1500, 2).path;
  var t0 = acts.length ? acts[0].t + 8 : 0;
  var p = nominal.filter(function (q) { return q[2] >= t0; });
  if (p.length < 3) p = nominal;
  function good(q) {
    if (q[1] < 100 || q[0] < 20 || q[0] > 380) return false;
    var gx = q[0] - level.goal.x, gy = q[1] - level.goal.y;
    if (gx * gx + gy * gy < 70 * 70) return false;                      // not inside the bird's mouth
    if (distToPath(q[0], q[1], idle) < 48) return false;               // not free if you do nothing
    for (var i = 0; i < others.length; i++) if (distToPath(q[0], q[1], others[i]) > CATCH) return false;
    return true;
  }
  var chosen = [];
  function farFromChosen(q) {
    return chosen.every(function (c) { var dx = c.x - q[0], dy = c.y - q[1]; return dx * dx + dy * dy > 60 * 60; });
  }
  fracs.forEach(function (f) {
    var want = Math.round(f * (p.length - 1)), pick = -1;
    for (var d = 0; d < p.length && pick < 0; d++) {
      var a = want + d, b = want - d;
      if (a < p.length && good(p[a]) && farFromChosen(p[a])) pick = a;
      else if (b >= 0 && good(p[b]) && farFromChosen(p[b])) pick = b;
    }
    if (pick < 0) { // fall back: any point on the path that isn't on the idle path
      for (var e = 0; e < p.length && pick < 0; e++) {
        var q = p[(want + e) % p.length];
        if (q[1] >= 100 && distToPath(q[0], q[1], idle) >= 48 && farFromChosen(q)) pick = (want + e) % p.length;
      }
    }
    if (pick < 0) pick = want;
    chosen.push({ x: p[pick][0], y: p[pick][1] });
  });
  return chosen;
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
  if (!lv.stars) level.stars = placeStars(level, best.acts, lv.starAt || [0.25, 0.5, 0.78]);
  var check = Engine.simulate(level, best.acts);
  var winW = best.acts.map(function (a, i) { return windowOf(level, best.acts, i, false).width; });
  var starW = best.acts.map(function (a, i) { return windowOf(level, best.acts, i, true).width; });
  var idle = Engine.simulate(level, []);
  level.solution = best.acts;
  delete level.solve;
  var line = '#' + num + ' ' + lv.name + ': ' + check.state + ' stars=' + check.stars +
    ' acts=' + JSON.stringify(best.acts.map(function (a) { return a.t; })) +
    ' windows win/3stars=' + winW.map(function (w, i) { return w + '/' + starW[i]; }).join(' ') +
    ' (' + (Date.now() - t0) + 'ms)';
  var problems = [];
  if (check.state !== 'won' || check.stars !== 3) problems.push('solution fails');
  if (Math.min.apply(null, winW) < MIN_WIN) problems.push('too tight to win');
  if (Math.min.apply(null, starW) < MIN_STARS) problems.push('fireflies too tight');
  if (idle.state === 'won' || idle.stars > 0) problems.push('doing nothing wins/scores');
  if (problems.length) { line += '  <-- ' + problems.join(', '); failed++; }
  console.log(line);
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
