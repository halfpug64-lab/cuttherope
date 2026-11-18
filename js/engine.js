// Snip & Drop - physics engine (no DOM, so it also runs in Node for level tests)
(function (root) {
  'use strict';

  var W = 400, H = 640;
  // feel settings (tunable from tools/feel.js)
  var C = {
    gravity: 0.27,      // px / frame^2
    bubbleLift: -0.11,
    damp: 0.999,        // berry air drag per frame
    nodeDamp: 0.985,    // drag on the visible rope pieces
    spring: 0.06,       // rope pull per px of stretch (bungee feel)
    springDamp: 0.2,    // damping of the stretch/bounce
    maxStretch: 1.35,   // hard limit on how far a rope can stretch
    iter: 12
  };
  var BERRY_R = 16;
  var SEG_LEN = 14;
  var STAR_R = 22;
  var BUBBLE_R = 24;
  var GOAL_R = 40;
  var BLOW_RANGE = 320;
  var BLOW_CONE = Math.cos(38 * Math.PI / 180);
  var BLOW_POWER = 7;

  function Node(x, y, inv) {
    this.x = x; this.y = y; this.px = x; this.py = y; this.inv = inv;
  }

  function World(level) {
    this.level = level;
    this.frame = 0;
    this.state = 'play'; // play | won | lost
    this.loseReason = '';
    this.berry = new Node(level.berry.x, level.berry.y, 0);
    if (level.berry.vx || level.berry.vy) {
      this.berry.px -= level.berry.vx || 0;
      this.berry.py -= level.berry.vy || 0;
    }
    this.bubbled = false;
    this.angle = 0; this.spin = 0;
    this.ropes = [];
    this.autoRopes = (level.autoRopes || []).map(function (a) {
      return { x: a.x, y: a.y, r: a.r, used: false };
    });
    this.bubbles = (level.bubbles || []).map(function (b) { return { x: b.x, y: b.y, taken: false }; });
    this.spikes = (level.spikes || []).slice();
    this.blowers = (level.blowers || []).map(function (b) {
      var a = b.angle * Math.PI / 180;
      return { x: b.x, y: b.y, angle: b.angle, dx: Math.cos(a), dy: Math.sin(a), puff: 0 };
    });
    this.stars = (level.stars || []).map(function (s) { return { x: s.x, y: s.y, got: false, t: 0 }; });
    this.goal = { x: level.goal.x, y: level.goal.y };
    this.collected = 0;
    this.events = [];
    var self = this;
    (level.ropes || []).forEach(function (r) { self.addRope(r.x, r.y, r.len); });
  }

  World.prototype.addRope = function (ax, ay, len) {
    var b = this.berry;
    var dx = b.x - ax, dy = b.y - ay;
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (!len) len = dist;
    var n = Math.max(3, Math.round(len / SEG_LEN));
    var rest = len / n;
    var nodes = [new Node(ax, ay, 0)];
    for (var i = 1; i < n; i++) {
      var t = i / n;
      // a little sag so slack ropes look slack
      var sag = Math.max(0, len - dist) * 0.5 * Math.sin(Math.PI * t);
      nodes.push(new Node(ax + dx * t, ay + dy * t + sag, 1));
    }
    nodes.push(b);
    var links = [];
    for (var j = 0; j < n; j++) links.push({ a: j, b: j + 1, rest: rest, on: true });
    this.ropes.push({ nodes: nodes, links: links, attached: true, ax: ax, ay: ay, len: len });
    this.events.push({ type: 'rope' });
    return this.ropes.length - 1;
  };

  World.prototype.cutLink = function (rope, k) {
    if (!rope.attached) return false;
    // the piece on the pin side dangles from the pin, the other piece trails from the berry
    rope.links[k].on = false;
    rope.attached = false;
    this.events.push({ type: 'cut' });
    return true;
  };

  // cut rope by index (used by scripted solutions)
  World.prototype.cutRope = function (i) {
    var r = this.ropes[i];
    if (!r) return false;
    return this.cutLink(r, Math.floor(r.links.length / 2));
  };

  function segIntersect(ax, ay, bx, by, cx, cy, dx, dy) {
    var d = (bx - ax) * (dy - cy) - (by - ay) * (dx - cx);
    if (d === 0) return false;
    var u = ((cx - ax) * (dy - cy) - (cy - ay) * (dx - cx)) / d;
    var v = ((cx - ax) * (by - ay) - (cy - ay) * (bx - ax)) / d;
    return u >= 0 && u <= 1 && v >= 0 && v <= 1;
  }

  // swipe from (x1,y1) to (x2,y2): cut any rope it crosses
  World.prototype.swipe = function (x1, y1, x2, y2) {
    var cut = false;
    for (var i = 0; i < this.ropes.length; i++) {
      var r = this.ropes[i];
      if (!r.attached) continue;
      for (var k = 0; k < r.links.length; k++) {
        var L = r.links[k];
        if (!L.on) continue;
        var a = r.nodes[L.a], b = r.nodes[L.b];
        if (segIntersect(x1, y1, x2, y2, a.x, a.y, b.x, b.y)) {
          this.cutLink(r, k); cut = true; break;
        }
      }
    }
    return cut;
  };

  // tap at a point: pop bubble or fire blower
  World.prototype.tap = function (x, y) {
    if (this.bubbled) {
      var dx = x - this.berry.x, dy = y - this.berry.y;
      if (dx * dx + dy * dy < 40 * 40) { this.pop(); return true; }
    }
    for (var i = 0; i < this.blowers.length; i++) {
      var bl = this.blowers[i];
      var ex = x - bl.x, ey = y - bl.y;
      if (ex * ex + ey * ey < 34 * 34) { this.blow(i); return true; }
    }
    return false;
  };

  World.prototype.pop = function () {
    if (!this.bubbled) return false;
    this.bubbled = false;
    this.events.push({ type: 'pop', x: this.berry.x, y: this.berry.y });
    return true;
  };

  World.prototype.blow = function (i) {
    var bl = this.blowers[i];
    if (!bl) return false;
    bl.puff = 1;
    this.events.push({ type: 'blow', i: i });
    var vx = this.berry.x - bl.x, vy = this.berry.y - bl.y;
    var d = Math.sqrt(vx * vx + vy * vy);
    if (d > 0 && d < BLOW_RANGE && (vx * bl.dx + vy * bl.dy) / d > BLOW_CONE) {
      var p = BLOW_POWER * (1 - 0.5 * d / BLOW_RANGE);
      this.berry.px -= bl.dx * p;
      this.berry.py -= bl.dy * p;
    }
    return true;
  };

  function circleRect(cx, cy, r, s) {
    var nx = Math.max(s.x, Math.min(cx, s.x + s.w));
    var ny = Math.max(s.y, Math.min(cy, s.y + s.h));
    var dx = cx - nx, dy = cy - ny;
    return dx * dx + dy * dy < r * r;
  }

  World.prototype.step = function () {
    if (this.state !== 'play') { this.frame++; return; }
    var b = this.berry;
    var i, k, r;

    // rope tension: each attached rope is a bungee from its pin to the berry
    var fx = 0, fy = 0;
    var bvx = b.x - b.px, bvy = b.y - b.py;
    for (i = 0; i < this.ropes.length; i++) {
      r = this.ropes[i];
      if (!r.attached) continue;
      var tx = b.x - r.ax, ty = b.y - r.ay;
      var td = Math.sqrt(tx * tx + ty * ty);
      if (td <= r.len || td === 0) continue;
      var nx = tx / td, ny = ty / td;
      var vn = bvx * nx + bvy * ny;
      var f = C.spring * (td - r.len) + (vn > 0 ? C.springDamp * vn : 0);
      fx -= nx * f; fy -= ny * f;
    }
    // integrate berry
    var damp = this.bubbled ? 0.97 : C.damp;
    bvx *= damp; bvy *= damp;
    b.px = b.x; b.py = b.y;
    b.x += bvx + fx; b.y += bvy + fy + (this.bubbled ? C.bubbleLift : C.gravity);
    // never let a rope stretch past its limit
    for (i = 0; i < this.ropes.length; i++) {
      r = this.ropes[i];
      if (!r.attached) continue;
      var mx = b.x - r.ax, my = b.y - r.ay, md = Math.sqrt(mx * mx + my * my), lim = r.len * C.maxStretch;
      if (md > lim) { b.x = r.ax + mx / md * lim; b.y = r.ay + my / md * lim; }
    }
    // spin: the berry tumbles with its sideways motion
    this.spin = this.spin * 0.96 + (b.x - b.px) * 0.004;
    this.angle += this.spin;

    // visible rope pieces (pinned at the pin and/or the berry, don't push the berry)
    for (i = 0; i < this.ropes.length; i++) {
      r = this.ropes[i];
      for (k = 0; k < r.nodes.length; k++) {
        var n = r.nodes[k];
        if (n.inv === 0) continue;
        var vx = (n.x - n.px) * C.nodeDamp, vy = (n.y - n.py) * C.nodeDamp;
        n.px = n.x; n.py = n.y;
        n.x += vx; n.y += vy + C.gravity;
      }
    }
    for (var it = 0; it < C.iter; it++) {
      for (i = 0; i < this.ropes.length; i++) {
        r = this.ropes[i];
        for (k = 0; k < r.links.length; k++) {
          var L = r.links[k];
          if (!L.on) continue;
          var A = r.nodes[L.a], B = r.nodes[L.b];
          var dx = B.x - A.x, dy = B.y - A.y;
          var d = Math.sqrt(dx * dx + dy * dy);
          if (d <= L.rest || d === 0) continue;
          var wsum = A.inv + B.inv;
          if (wsum === 0) continue;
          var diff = (d - L.rest) / (d * wsum);
          A.x += dx * diff * A.inv; A.y += dy * diff * A.inv;
          B.x -= dx * diff * B.inv; B.y -= dy * diff * B.inv;
        }
      }
    }

    // auto ropes
    for (i = 0; i < this.autoRopes.length; i++) {
      var ar = this.autoRopes[i];
      if (ar.used) continue;
      var ex = b.x - ar.x, ey = b.y - ar.y;
      if (ex * ex + ey * ey < ar.r * ar.r) {
        ar.used = true;
        this.addRope(ar.x, ar.y, Math.sqrt(ex * ex + ey * ey));
      }
    }

    // bubbles
    for (i = 0; i < this.bubbles.length; i++) {
      var bu = this.bubbles[i];
      if (bu.taken) continue;
      var fx = b.x - bu.x, fy = b.y - bu.y;
      if (fx * fx + fy * fy < (BUBBLE_R + BERRY_R) * (BUBBLE_R + BERRY_R)) {
        bu.taken = true;
        this.bubbled = true;
        // slow down when caught
        b.px = b.x - (b.x - b.px) * 0.3;
        b.py = b.y - (b.y - b.py) * 0.3;
        this.events.push({ type: 'bubble' });
      }
    }

    // stars
    for (i = 0; i < this.stars.length; i++) {
      var s = this.stars[i];
      if (s.got) continue;
      var gx = b.x - s.x, gy = b.y - s.y;
      if (gx * gx + gy * gy < (STAR_R + BERRY_R) * (STAR_R + BERRY_R)) {
        s.got = true; this.collected++;
        this.events.push({ type: 'star', x: s.x, y: s.y });
      }
    }

    // spikes
    for (i = 0; i < this.spikes.length; i++) {
      if (circleRect(b.x, b.y, BERRY_R - 3, this.spikes[i])) {
        this.state = 'lost'; this.loseReason = 'spikes';
        this.events.push({ type: 'lose' });
        break;
      }
    }

    // goal
    if (this.state === 'play') {
      var hx = b.x - this.goal.x, hy = b.y - this.goal.y;
      if (hx * hx + hy * hy < GOAL_R * GOAL_R) {
        this.state = 'won';
        this.events.push({ type: 'win' });
      }
    }

    // out of bounds
    if (this.state === 'play' && (b.y > H + 60 || b.y < -80 || b.x < -80 || b.x > W + 80)) {
      this.state = 'lost'; this.loseReason = 'gone';
      this.events.push({ type: 'lose' });
    }

    for (i = 0; i < this.blowers.length; i++) {
      if (this.blowers[i].puff > 0) this.blowers[i].puff = Math.max(0, this.blowers[i].puff - 0.04);
    }
    this.frame++;
  };

  // run a scripted solution: [{t: frame, cut: i} | {t, pop: true} | {t, blow: i}]
  function simulate(level, actions, maxFrames) {
    var w = new World(level);
    var acts = (actions || []).slice().sort(function (a, b) { return a.t - b.t; });
    var ai = 0, path = [], near = 1e9, nearAt = null;
    maxFrames = maxFrames || 1500;
    while (w.state === 'play' && w.frame < maxFrames) {
      while (ai < acts.length && acts[ai].t <= w.frame) {
        var a = acts[ai++];
        if (a.cut !== undefined) w.cutRope(a.cut);
        if (a.pop) w.pop();
        if (a.blow !== undefined) w.blow(a.blow);
      }
      w.step();
      var gx = w.berry.x - w.goal.x, gy = w.berry.y - w.goal.y, gd = Math.sqrt(gx * gx + gy * gy);
      if (gd < near) { near = gd; nearAt = [Math.round(w.berry.x), Math.round(w.berry.y), w.frame]; }
      if (w.frame % 5 === 0) path.push([Math.round(w.berry.x), Math.round(w.berry.y), w.frame]);
    }
    return { state: w.state, reason: w.loseReason, stars: w.collected, frames: w.frame, path: path, near: near, nearAt: nearAt, world: w };
  }

  var api = {
    W: W, H: H, World: World, simulate: simulate, C: C,
    BERRY_R: BERRY_R, STAR_R: STAR_R, BUBBLE_R: BUBBLE_R, GOAL_R: GOAL_R
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Engine = api;
})(this);
