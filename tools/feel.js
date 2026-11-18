// Measures rope feel. Usage: node tools/feel.js '{"stiff":0.3,"iter":6}'
var E = require('../js/engine.js');
Object.assign(E.C, JSON.parse(process.argv[2] || '{}'));
var lv = { berry: { x: 200, y: 100 }, ropes: [{ x: 200, y: 80, len: 150 }], goal: { x: -500, y: -500 } };
var w = new E.World(lv), out = [];
for (var f = 0; f < 240; f++) { w.step(); if (f % 6 === 0) out.push(Math.round(w.berry.y - 80)); }
console.log('drop onto 150 rope, dist every 6f:', out.join(' '));
var lv2 = { berry: { x: 340, y: 80 }, ropes: [{ x: 200, y: 80 }], goal: { x: -500, y: -500 } };
w = new E.World(lv2); var peaks = [], prevx = w.berry.x, dir = 0, f0 = 0, per = [];
for (f = 0; f < 1200; f++) { w.step(); var vx = w.berry.x - prevx; if (dir && Math.sign(vx) !== dir && vx !== 0) { peaks.push(Math.round(Math.abs(w.berry.x - 200))); per.push(f - f0); f0 = f; } if (vx) dir = Math.sign(vx); prevx = w.berry.x; }
console.log('swing turns (start 140):', peaks.slice(0, 16).join(' '), '| half-period', per[2]);
var fall = new E.World({ berry: { x: 200, y: 0 }, goal: { x: -500, y: -500 } }); var t = 0;
while (fall.berry.y < 640 && t < 999) { fall.step(); t++; }
console.log('free fall full screen frames:', t);
