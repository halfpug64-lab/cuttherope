// For each built level, nudge each action by -8..+8 frames and report how often it still wins.
var Engine = require('../js/engine.js');
var L = require('../js/levels.js');
L.forEach(function (lv, n) {
  if (!lv) return console.log('#' + (n + 1) + ' missing');
  var per = lv.solution.map(function (a, i) {
    var ok = 0, tot = 0;
    for (var d = -8; d <= 8; d += 2) {
      if (!d) continue;
      var acts = lv.solution.map(function (b) { return Object.assign({}, b); });
      for (var j = i; j < acts.length; j++) acts[j].t += d; tot++;
      var r = Engine.simulate(lv, acts);
      if (r.state === 'won') ok++;
    }
    return ok + '/' + tot;
  });
  console.log('#' + (n + 1) + ' ' + lv.name + ' ' + per.join(' '));
});
