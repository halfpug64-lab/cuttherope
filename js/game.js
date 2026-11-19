// Snip & Drop - rendering, input and screens
(function () {
  'use strict';
  var E = window.Engine, LEVELS = window.LEVELS;
  var W = E.W, H = E.H;
  var CHAPTERS = [
    { name: 'Ropes', from: 0, sky: ['#1b2a4a', '#2f5d73'] },
    { name: 'Pegs', from: 6, sky: ['#2a1f45', '#5b4a7a'] },
    { name: 'Bubbles', from: 10, sky: ['#123a4a', '#2f7d86'] },
    { name: 'Air Puffs', from: 15, sky: ['#33263f', '#8a5a6b'] },
    { name: 'Everything', from: 19, sky: ['#1a1c33', '#3d4f7a'] }
  ];
  function chapterOf(i) {
    var c = CHAPTERS[0];
    for (var k = 0; k < CHAPTERS.length; k++) if (i >= CHAPTERS[k].from) c = CHAPTERS[k];
    return c;
  }

  // ---------- save data ----------
  var SAVE_KEY = 'snipdrop.v1';
  var save = { best: {}, muted: false };
  try { var raw = localStorage.getItem(SAVE_KEY); if (raw) save = Object.assign(save, JSON.parse(raw)); } catch (e) {}
  function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} }
  function bestOf(i) { return save.best[i] === undefined ? -1 : save.best[i]; }
  function unlocked(i) { return i === 0 || bestOf(i - 1) >= 0; }

  // ---------- audio ----------
  var actx = null;
  function beep(freq, dur, type, vol, slide) {
    if (save.muted) return;
    try {
      if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
      var t = actx.currentTime, o = actx.createOscillator(), g = actx.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(freq, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
      g.gain.setValueAtTime(vol || 0.15, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g); g.connect(actx.destination);
      o.start(t); o.stop(t + dur);
    } catch (e) {}
  }
  var sfx = {
    cut: function () { beep(900, 0.08, 'triangle', 0.12, 300); },
    rope: function () { beep(300, 0.1, 'sine', 0.1, 500); },
    star: function (n) { beep(660 + n * 220, 0.18, 'sine', 0.14, 1200 + n * 200); },
    bubble: function () { beep(400, 0.25, 'sine', 0.1, 800); },
    pop: function () { beep(1200, 0.06, 'square', 0.06, 200); },
    blow: function () { beep(180, 0.2, 'sawtooth', 0.05, 90); },
    win: function () { [523, 659, 784, 1046].forEach(function (f, i) { setTimeout(function () { beep(f, 0.2, 'triangle', 0.13); }, i * 110); }); },
    lose: function () { beep(300, 0.4, 'sawtooth', 0.06, 90); }
  };

  // ---------- canvas ----------
  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');
  var scale = 1, dpr = 1;
  function resize() {
    var wrap = document.getElementById('stage');
    var bw = wrap.clientWidth, bh = wrap.clientHeight;
    scale = Math.min(bw / W, bh / H);
    dpr = window.devicePixelRatio || 1;
    canvas.style.width = Math.floor(W * scale) + 'px';
    canvas.style.height = Math.floor(H * scale) + 'px';
    canvas.width = Math.floor(W * scale * dpr);
    canvas.height = Math.floor(H * scale * dpr);
  }
  window.addEventListener('resize', resize);

  // ---------- state ----------
  var world = null, levelIndex = 0, endTimer = 0, time = 0;
  var trail = [], particles = [], flyStars = [];
  var bird = { open: 0, blink: 0, happy: 0, sad: 0 };
  var stars0 = [];
  for (var s = 0; s < 40; s++) stars0.push({ x: Math.random() * W, y: Math.random() * H * 0.7, r: Math.random() * 1.4 + 0.3, p: Math.random() * 6 });

  var $ = function (id) { return document.getElementById(id); };

  var demo = null; // when set, the level's stored solution plays itself

  function startLevel(i, watch) {
    levelIndex = i;
    world = new E.World(LEVELS[i]);
    demo = watch ? { acts: LEVELS[i].solution.slice(), next: 0 } : null;
    endTimer = 0; trail = []; particles = []; flyStars = [];
    bird.happy = 0; bird.sad = 0;
    $('lvl-num').textContent = (i + 1);
    $('lvl-name').textContent = LEVELS[i].name;
    updateHudStars();
    var hint = $('hint');
    if (watch) { hint.textContent = 'Watch: this is one way to solve it'; hint.classList.add('show'); }
    else if (LEVELS[i].hint) { hint.textContent = LEVELS[i].hint; hint.classList.add('show'); }
    else hint.classList.remove('show');
    show('play');
  }

  function updateHudStars() {
    var n = world ? world.collected : 0;
    var els = document.querySelectorAll('#hud-stars .fly');
    for (var i = 0; i < els.length; i++) els[i].classList.toggle('on', i < n);
  }

  function show(screen) {
    ['menu', 'levels', 'result'].forEach(function (id) { $(id).classList.toggle('hidden', id !== screen); });
    $('hud').classList.toggle('hidden', screen !== 'play' && screen !== 'result');
    if (screen === 'levels') buildLevelGrid();
  }

  function buildLevelGrid() {
    var grid = $('grid');
    grid.innerHTML = '';
    var total = 0;
    CHAPTERS.forEach(function (c, ci) {
      var end = ci + 1 < CHAPTERS.length ? CHAPTERS[ci + 1].from : LEVELS.length;
      var h = document.createElement('h3');
      h.textContent = (ci + 1) + '. ' + c.name;
      grid.appendChild(h);
      var row = document.createElement('div');
      row.className = 'row';
      for (var i = c.from; i < end; i++) {
        var b = document.createElement('button');
        var best = bestOf(i);
        if (best > 0) total += best;
        b.className = 'lvl' + (unlocked(i) ? '' : ' locked');
        b.innerHTML = '<span class="n">' + (i + 1) + '</span><span class="s">' +
          [0, 1, 2].map(function (k) { return '<i class="' + (k < best ? 'on' : '') + '"></i>'; }).join('') + '</span>';
        b.title = LEVELS[i].name;
        (function (idx) { b.onclick = function () { if (unlocked(idx)) startLevel(idx); }; })(i);
        if (!unlocked(i)) b.disabled = true;
        row.appendChild(b);
      }
      grid.appendChild(row);
    });
    $('total').textContent = total + ' / ' + (LEVELS.length * 3);
  }

  function finish() {
    var won = world.state === 'won';
    var n = world.collected;
    var watched = !!demo;
    if (won && !watched && n > bestOf(levelIndex)) { save.best[levelIndex] = n; persist(); }
    $('result-title').textContent = won ? ['Yum!', 'Tasty!', 'Delicious!', 'Perfect!'][n] : (world.loseReason === 'spikes' ? 'Ouch!' : 'Missed!');
    $('result-sub').textContent = watched ? 'That was one way to do it. Your turn!' :
      won ? (n === 3 ? 'All three fireflies!' : n + ' of 3 fireflies') : 'Pip is still hungry.';
    var rs = document.querySelectorAll('#result-stars .fly');
    for (var i = 0; i < rs.length; i++) {
      rs[i].classList.remove('on');
      if (won && i < n) (function (el, d) { setTimeout(function () { el.classList.add('on'); }, 200 + d * 250); })(rs[i], i);
    }
    $('result-stars').style.display = won ? '' : 'none';
    var next = $('btn-next');
    next.style.display = won && levelIndex + 1 < LEVELS.length ? '' : 'none';
    $('btn-done').style.display = won && levelIndex + 1 >= LEVELS.length ? '' : 'none';
    show('result');
  }

  // ---------- input ----------
  var pointer = { down: false, x: 0, y: 0 };
  function toWorld(e) {
    var r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) / scale, y: (e.clientY - r.top) / scale };
  }
  canvas.addEventListener('pointerdown', function (e) {
    if (!world || world.state !== 'play' || demo) return;
    canvas.setPointerCapture(e.pointerId);
    var p = toWorld(e);
    pointer.down = true; pointer.x = p.x; pointer.y = p.y;
    trail.push({ x: p.x, y: p.y, life: 1, start: true });
    world.tap(p.x, p.y);
    $('hint').classList.remove('show');
  });
  canvas.addEventListener('pointermove', function (e) {
    if (!pointer.down || !world || world.state !== 'play') return;
    var p = toWorld(e);
    world.swipe(pointer.x, pointer.y, p.x, p.y);
    pointer.x = p.x; pointer.y = p.y;
    trail.push({ x: p.x, y: p.y, life: 1 });
  });
  function up() { pointer.down = false; }
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);

  $('btn-play').onclick = function () { show('levels'); };
  $('btn-levels').onclick = function () { show('levels'); };
  $('btn-back').onclick = function () { show('menu'); };
  $('btn-restart').onclick = function () { startLevel(levelIndex); };
  $('btn-watch').onclick = function () { startLevel(levelIndex, true); };
  $('btn-res-watch').onclick = function () { startLevel(levelIndex, true); };
  $('btn-retry').onclick = function () { startLevel(levelIndex); };
  $('btn-next').onclick = function () { startLevel(levelIndex + 1); };
  $('btn-done').onclick = function () { show('levels'); };
  $('btn-res-levels').onclick = function () { show('levels'); };
  function syncMute() { $('btn-mute').textContent = save.muted ? 'Sound: off' : 'Sound: on'; }
  $('btn-mute').onclick = function () { save.muted = !save.muted; persist(); syncMute(); };
  syncMute();
  document.addEventListener('keydown', function (e) {
    if (e.key === 'r' && world && $('menu').classList.contains('hidden') && $('levels').classList.contains('hidden')) startLevel(levelIndex);
  });

  // ---------- effects ----------
  function burst(x, y, color, n, speed) {
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2, v = (Math.random() * 0.7 + 0.3) * (speed || 3);
      particles.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, color: color, r: Math.random() * 2 + 1.5 });
    }
  }
  function handleEvents() {
    var ev = world.events; world.events = [];
    ev.forEach(function (e) {
      if (e.type === 'cut') sfx.cut();
      else if (e.type === 'rope' && world.frame > 0) sfx.rope();
      else if (e.type === 'star') { sfx.star(world.collected - 1); burst(e.x, e.y, '#ffe680', 14, 3); flyStars.push({ x: e.x, y: e.y, t: 0 }); updateHudStars(); }
      else if (e.type === 'bubble') sfx.bubble();
      else if (e.type === 'pop') { sfx.pop(); burst(e.x, e.y, '#bfefff', 12, 2.5); }
      else if (e.type === 'blow') {
        sfx.blow();
        var bl = world.blowers[e.i];
        for (var k = 0; k < 14; k++) {
          var a = Math.atan2(bl.dy, bl.dx) + (Math.random() - 0.5) * 0.6, v = Math.random() * 4 + 3;
          particles.push({ x: bl.x + bl.dx * 22, y: bl.y + bl.dy * 22, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, color: 'rgba(255,255,255,0.8)', r: Math.random() * 4 + 3, puff: true });
        }
      }
      else if (e.type === 'win') { sfx.win(); bird.happy = 1; burst(world.goal.x, world.goal.y - 10, '#ff6fae', 18, 3); }
      else if (e.type === 'lose') { sfx.lose(); bird.sad = 1; if (world.loseReason === 'spikes') burst(world.berry.x, world.berry.y, '#c2185b', 20, 3.5); }
    });
  }

  // ---------- drawing ----------
  function drawBackground() {
    var c = chapterOf(levelIndex);
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, c.sky[0]); g.addColorStop(1, c.sky[1]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    stars0.forEach(function (s) {
      ctx.globalAlpha = 0.35 + 0.35 * Math.sin(time * 0.03 + s.p);
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 1;
    // hills
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath(); ctx.moveTo(0, H);
    for (var x = 0; x <= W; x += 20) ctx.lineTo(x, H - 110 - Math.sin(x * 0.015 + 1) * 30);
    ctx.lineTo(W, H); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.moveTo(0, H);
    for (x = 0; x <= W; x += 20) ctx.lineTo(x, H - 50 - Math.sin(x * 0.02 + 3) * 20);
    ctx.lineTo(W, H); ctx.fill();
  }

  function drawPeg(x, y) {
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.arc(x + 1.5, y + 2, 9, 0, Math.PI * 2); ctx.fill();
    var g = ctx.createRadialGradient(x - 3, y - 3, 1, x, y, 9);
    g.addColorStop(0, '#e9c38f'); g.addColorStop(1, '#8a5a2b');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#5c3a1a';
    ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI * 2); ctx.fill();
  }

  function drawRopes() {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    world.ropes.forEach(function (r) {
      // dark outline
      ctx.strokeStyle = '#4a2e14'; ctx.lineWidth = 6;
      ctx.beginPath();
      var drawing = false;
      r.links.forEach(function (L) {
        var a = r.nodes[L.a], b = r.nodes[L.b];
        if (!L.on) { drawing = false; return; }
        if (!drawing) { ctx.moveTo(a.x, a.y); drawing = true; }
        ctx.lineTo(b.x, b.y);
      });
      ctx.stroke();
      // twisted look: alternate two tones per segment
      ctx.lineWidth = 3.5;
      r.links.forEach(function (L, k) {
        if (!L.on) return;
        var a = r.nodes[L.a], b = r.nodes[L.b];
        ctx.strokeStyle = k % 2 ? '#e8c38a' : '#b98448';
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      });
    });
  }

  function drawAutoRopes() {
    world.autoRopes.forEach(function (a) {
      if (!a.used) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.45)';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 7]);
        ctx.lineDashOffset = -time * 0.4;
        ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }
      drawPeg(a.x, a.y);
    });
  }

  function drawSpikes() {
    world.spikes.forEach(function (s) {
      ctx.fillStyle = '#3b4250';
      ctx.fillRect(s.x, s.y + s.h * 0.3, s.w, s.h * 0.4);
      var horiz = s.w >= s.h;
      var len = horiz ? s.w : s.h, th = horiz ? s.h : s.w;
      var n = Math.max(1, Math.round(len / 14)), step = len / n;
      for (var i = 0; i < n; i++) {
        var g;
        for (var side = 0; side < 2; side++) {
          ctx.beginPath();
          if (horiz) {
            var x0 = s.x + i * step;
            var base = s.y + th / 2, tip = side ? s.y + th : s.y;
            ctx.moveTo(x0, base); ctx.lineTo(x0 + step / 2, tip); ctx.lineTo(x0 + step, base);
            g = ctx.createLinearGradient(x0, 0, x0 + step, 0);
          } else {
            var y0 = s.y + i * step;
            var bx = s.x + th / 2, tx = side ? s.x + th : s.x;
            ctx.moveTo(bx, y0); ctx.lineTo(tx, y0 + step / 2); ctx.lineTo(bx, y0 + step);
            g = ctx.createLinearGradient(0, y0, 0, y0 + step);
          }
          g.addColorStop(0, '#dfe6ee'); g.addColorStop(0.5, '#9aa6b4'); g.addColorStop(1, '#5d6876');
          ctx.fillStyle = g;
          ctx.closePath(); ctx.fill();
        }
      }
    });
  }

  function drawBubble(x, y, r, wob) {
    var rx = r * (1 + Math.sin(time * 0.1 + wob) * 0.04), ry = r * (1 - Math.sin(time * 0.1 + wob) * 0.04);
    ctx.save();
    var g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.2, x, y, r);
    g.addColorStop(0, 'rgba(255,255,255,0.08)'); g.addColorStop(0.8, 'rgba(160,230,255,0.18)'); g.addColorStop(1, 'rgba(200,245,255,0.55)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(220,250,255,0.7)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath(); ctx.ellipse(x - r * 0.4, y - r * 0.45, r * 0.22, r * 0.12, -0.6, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function drawBlowers() {
    world.blowers.forEach(function (b) {
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(Math.atan2(b.dy, b.dx));
      var sq = 1 - b.puff * 0.25;
      ctx.scale(sq, 1);
      // body (a little bellows)
      ctx.fillStyle = '#3a7f8c';
      ctx.beginPath();
      ctx.moveTo(-22, -16); ctx.lineTo(6, -11); ctx.lineTo(6, 11); ctx.lineTo(-22, 16); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#255861'; ctx.lineWidth = 2;
      for (var k = -14; k <= 0; k += 7) { ctx.beginPath(); ctx.moveTo(k, -14 + (k + 22) * 0.18); ctx.lineTo(k, 14 - (k + 22) * 0.18); ctx.stroke(); }
      ctx.fillStyle = '#c9a227';
      ctx.fillRect(6, -6, 14, 12);
      ctx.fillStyle = '#8c6d10';
      ctx.fillRect(18, -7, 4, 14);
      ctx.restore();
    });
  }

  function drawFirefly(x, y, phase) {
    var glow = 0.6 + 0.4 * Math.sin(time * 0.12 + phase);
    var g = ctx.createRadialGradient(x, y, 0, x, y, 22);
    g.addColorStop(0, 'rgba(255,240,150,' + (0.7 * glow) + ')'); g.addColorStop(1, 'rgba(255,240,150,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, 22, 0, Math.PI * 2); ctx.fill();
    var flap = Math.sin(time * 0.6 + phase) * 0.5;
    ctx.fillStyle = 'rgba(230,245,255,0.75)';
    ctx.beginPath(); ctx.ellipse(x - 5, y - 5, 6, 3, -0.7 - flap, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + 5, y - 5, 6, 3, 0.7 + flap, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#4a3b1f';
    ctx.beginPath(); ctx.ellipse(x, y - 2, 3, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff36b';
    ctx.beginPath(); ctx.arc(x, y + 4, 4.5, 0, Math.PI * 2); ctx.fill();
  }

  function drawBerry(x, y) {
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath(); ctx.arc(x + 2, y + 3, 16, 0, Math.PI * 2); ctx.fill();
    var g = ctx.createRadialGradient(x - 5, y - 6, 2, x, y, 17);
    g.addColorStop(0, '#ff8fc0'); g.addColorStop(0.5, '#d6246e'); g.addColorStop(1, '#7a0f3f');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, 16, 0, Math.PI * 2); ctx.fill();
    // seeds
    ctx.fillStyle = 'rgba(255,220,235,0.7)';
    [[-6, 2], [4, 5], [-1, 9], [7, -3], [-8, -5]].forEach(function (p) { ctx.beginPath(); ctx.arc(x + p[0], y + p[1], 1.2, 0, Math.PI * 2); ctx.fill(); });
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.beginPath(); ctx.ellipse(x - 6, y - 7, 4, 2.5, -0.6, 0, Math.PI * 2); ctx.fill();
    // leaves
    ctx.fillStyle = '#4caf50';
    ctx.beginPath(); ctx.ellipse(x - 5, y - 15, 7, 3, -0.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#7bd67f';
    ctx.beginPath(); ctx.ellipse(x + 5, y - 15, 7, 3, 0.4, 0, Math.PI * 2); ctx.fill();
  }

  function drawBird() {
    var gx = world.goal.x, gy = world.goal.y;
    var dx = world.berry.x - gx, dy = world.berry.y - gy, d = Math.sqrt(dx * dx + dy * dy);
    var wantOpen = world.state === 'play' && d < 150 ? 1 : 0;
    if (bird.happy > 0) wantOpen = 0;
    bird.open += (wantOpen - bird.open) * 0.2;
    if (Math.random() < 0.006) bird.blink = 1;
    bird.blink = Math.max(0, bird.blink - 0.12);
    var hop = bird.happy > 0 ? Math.abs(Math.sin(time * 0.25)) * 8 : Math.sin(time * 0.05) * 1.5;
    var by = gy - hop;

    // nest back
    ctx.fillStyle = '#6b4423';
    ctx.beginPath(); ctx.ellipse(gx, gy + 20, 42, 16, 0, 0, Math.PI * 2); ctx.fill();
    // body
    var g = ctx.createRadialGradient(gx - 8, by - 10, 4, gx, by, 30);
    g.addColorStop(0, '#9fdcff'); g.addColorStop(1, '#2f8fd8');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(gx, by, 27, 25, 0, 0, Math.PI * 2); ctx.fill();
    // tuft
    ctx.strokeStyle = '#2f8fd8'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(gx, by - 24); ctx.quadraticCurveTo(gx + 2, by - 36, gx + 9, by - 34); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(gx - 3, by - 24); ctx.quadraticCurveTo(gx - 8, by - 34, gx - 13, by - 31); ctx.stroke();
    // belly
    ctx.fillStyle = '#fff3d6';
    ctx.beginPath(); ctx.ellipse(gx, by + 9, 16, 13, 0, 0, Math.PI * 2); ctx.fill();
    // eyes
    var look = Math.min(1, d / 200);
    var ex = dx / (d || 1) * 2.5 * look, ey = dy / (d || 1) * 2.5 * look;
    [-10, 10].forEach(function (o) {
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.ellipse(gx + o, by - 7, 7, 8 * (1 - bird.blink), 0, 0, Math.PI * 2); ctx.fill();
      if (bird.blink < 0.5) {
        ctx.fillStyle = '#1c2333';
        if (bird.happy > 0) {
          ctx.strokeStyle = '#1c2333'; ctx.lineWidth = 2.5;
          ctx.beginPath(); ctx.arc(gx + o, by - 5, 4, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
        } else {
          ctx.beginPath(); ctx.arc(gx + o + ex, by - 6 + ey, 3.6, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.beginPath(); ctx.arc(gx + o + ex + 1.2, by - 7.5 + ey, 1.2, 0, Math.PI * 2); ctx.fill();
        }
      }
      if (bird.sad > 0) {
        ctx.strokeStyle = '#1c2333'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(gx + o - 6, by - 17 + (o < 0 ? 3 : 0)); ctx.lineTo(gx + o + 6, by - 17 + (o < 0 ? 0 : 3)); ctx.stroke();
      }
    });
    // beak
    var op = bird.open * 9;
    ctx.fillStyle = '#ff9f1c';
    ctx.beginPath(); ctx.moveTo(gx - 8, by + 1); ctx.lineTo(gx + 8, by + 1); ctx.lineTo(gx, by + 9 - op * 0.3); ctx.closePath(); ctx.fill();
    if (op > 0.5) {
      ctx.fillStyle = '#a3123a';
      ctx.beginPath(); ctx.moveTo(gx - 7, by + 2); ctx.lineTo(gx + 7, by + 2); ctx.lineTo(gx, by + 4 + op); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = '#e8850c';
    ctx.beginPath(); ctx.moveTo(gx - 7, by + 3 + op * 0.4); ctx.lineTo(gx + 7, by + 3 + op * 0.4); ctx.lineTo(gx, by + 11 + op); ctx.closePath(); ctx.fill();
    // wings
    var flap = bird.happy > 0 ? Math.sin(time * 0.6) * 0.5 : 0;
    ctx.fillStyle = '#2a7cc0';
    ctx.beginPath(); ctx.ellipse(gx - 25, by + 4, 6, 12, 0.5 + flap, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(gx + 25, by + 4, 6, 12, -0.5 - flap, 0, Math.PI * 2); ctx.fill();
    // nest front
    ctx.fillStyle = '#8b5a2b';
    ctx.beginPath(); ctx.ellipse(gx, gy + 24, 40, 12, 0, 0, Math.PI); ctx.fill();
    ctx.strokeStyle = '#5c3a1a'; ctx.lineWidth = 1.5;
    for (var i = -3; i <= 3; i++) {
      ctx.beginPath(); ctx.moveTo(gx + i * 11 - 8, gy + 22 + Math.abs(i)); ctx.lineTo(gx + i * 11 + 9, gy + 30 - Math.abs(i) * 0.5); ctx.stroke();
    }
  }

  function render() {
    ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
    drawBackground();
    if (!world) return;
    drawSpikes();
    drawAutoRopes();
    world.ropes.forEach(function (r) { drawPeg(r.ax, r.ay); });
    world.bubbles.forEach(function (b, i) { if (!b.taken) drawBubble(b.x, b.y + Math.sin(time * 0.05 + i) * 2, 24, i); });
    drawBlowers();
    world.stars.forEach(function (s, i) { if (!s.got) drawFirefly(s.x, s.y + Math.sin(time * 0.07 + i * 2) * 3, i * 2); });
    drawBird();
    drawRopes();
    var b = world.berry;
    if (!(world.state === 'won' && endTimer > 6)) {
      if (world.state === 'won') {
        // shrink into the beak
        var k = Math.max(0, 1 - endTimer / 6);
        ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(world.angle); ctx.scale(k, k); drawBerry(0, 0); ctx.restore();
      } else if (!(world.state === 'lost' && world.loseReason === 'spikes')) {
        ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(world.angle); drawBerry(0, 0); ctx.restore();
      }
    }
    if (world.bubbled && world.state === 'play') drawBubble(b.x, b.y, 27, 0);

    // particles
    particles.forEach(function (p) {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (p.puff ? (2 - p.life) : 1), 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 1;
    // fireflies flying to the HUD
    flyStars.forEach(function (f) {
      var t = Math.min(1, f.t / 30), tx = W - 70, ty = 24;
      var x = f.x + (tx - f.x) * t, y = f.y + (ty - f.y) * t - Math.sin(t * Math.PI) * 60;
      ctx.globalAlpha = 1 - t * 0.5;
      drawFirefly(x, y, 0);
    });
    ctx.globalAlpha = 1;
    // swipe trail
    if (trail.length > 1) {
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (var i = 1; i < trail.length; i++) {
        if (trail[i].start) continue;
        ctx.strokeStyle = 'rgba(255,255,255,' + (trail[i].life * 0.8) + ')';
        ctx.lineWidth = 4 * trail[i].life;
        ctx.beginPath(); ctx.moveTo(trail[i - 1].x, trail[i - 1].y); ctx.lineTo(trail[i].x, trail[i].y); ctx.stroke();
      }
    }
  }

  // plays the stored solution, showing a swipe or a tap for each move
  function playDemo() {
    while (demo.next < demo.acts.length && demo.acts[demo.next].t <= world.frame) {
      var a = demo.acts[demo.next++];
      if (a.cut !== undefined) {
        var r = world.ropes[a.cut];
        if (r) {
          var m = r.nodes[Math.floor(r.links.length / 2)];
          trail.push({ x: m.x - 30, y: m.y - 22, life: 1, start: true });
          trail.push({ x: m.x, y: m.y, life: 1 });
          trail.push({ x: m.x + 30, y: m.y + 22, life: 1 });
        }
        world.cutRope(a.cut);
      }
      if (a.pop) { burst(world.berry.x, world.berry.y, '#ffffff', 6, 1.5); world.pop(); }
      if (a.blow !== undefined) world.blow(a.blow);
    }
  }

  // ---------- loop ----------
  var last = performance.now(), acc = 0, STEP = 1000 / 60;
  function loop(now) {
    acc += Math.min(100, now - last); last = now;
    while (acc >= STEP) {
      acc -= STEP; time++;
      if (world && $('menu').classList.contains('hidden') && $('levels').classList.contains('hidden')) {
        if (demo && world.state === 'play') playDemo();
        if (world.state === 'play') world.step();
        handleEvents();
        if (world.state !== 'play') {
          endTimer++;
          if (endTimer === 55) finish();
        }
      }
      particles.forEach(function (p) { p.x += p.vx; p.y += p.vy; if (!p.puff) p.vy += 0.08; else { p.vx *= 0.94; p.vy *= 0.94; } p.life -= p.puff ? 0.035 : 0.025; });
      particles = particles.filter(function (p) { return p.life > 0; });
      trail.forEach(function (t) { t.life -= 0.08; });
      trail = trail.filter(function (t) { return t.life > 0; });
      flyStars.forEach(function (f) { f.t++; });
      flyStars = flyStars.filter(function (f) { return f.t < 30; });
      if (bird.happy > 0) bird.happy = Math.min(1, bird.happy + 0.01);
    }
    render();
    requestAnimationFrame(loop);
  }

  // small hook for automated screenshots/tests
  window.__snip = { start: function (i, watch) { startLevel(i, watch); }, world: function () { return world; } };

  resize();
  // menu background shows level 1 idle
  levelIndex = 0;
  world = new E.World(LEVELS[0]);
  show('menu');
  requestAnimationFrame(loop);
})();
