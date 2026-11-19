// For each level and action: how many frames wide the timing window is (60 frames = 1 second).
// Moving an action also moves every later one, like a player reacting to what they see.
// Shows "win window / 3-firefly window".
var Engine = require('../js/engine.js');
var L = require('../js/levels.js');
var only = +process.argv[2] || 0;
L.forEach(function (lv, n) {
  if (only && only !== n + 1) return;
  var out = lv.solution.map(function (a, i) {
    function width(need3) {
      var lo = 0, hi = 0;
      function ok(d) {
        var acts = lv.solution.map(function (b) { return Object.assign({}, b); });
        for (var j = i; j < acts.length; j++) acts[j].t += d;
        if (acts[i].t < 0) return false;
        var r = Engine.simulate(lv, acts);
        return r.state === 'won' && (!need3 || r.stars === 3);
      }
      while (lo > -120 && ok(lo - 1)) lo--;
      while (hi < 120 && ok(hi + 1)) hi++;
      return hi - lo + 1;
    }
    return (a.cut !== undefined ? 'cut' : a.pop ? 'pop' : 'blow') + ':' + width(false) + '/' + width(true);
  });
  console.log('#' + (n + 1) + ' ' + lv.name + '  ' + out.join('  '));
});
