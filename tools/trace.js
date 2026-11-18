// node tools/trace.js <levelNum> '<actions json>'  -> prints berry path every 5 frames
var Engine = require('../js/engine.js');
var src = require('./levels-src.js');
var lv = JSON.parse(JSON.stringify(src[+process.argv[2] - 1]));
var r = Engine.simulate(lv, JSON.parse(process.argv[3] || '[]'), +process.argv[4] || 900);
console.log(r.state, r.reason, 'stars', r.stars, 'frames', r.frames);
console.log(r.path.map(function (p) { return p[2] + ':' + p[0] + ',' + p[1]; }).join(' '));
