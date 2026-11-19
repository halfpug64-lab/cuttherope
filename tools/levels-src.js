// Level layouts. Board is 400 x 640. `solve` is a timing template the builder
// searches ({t:[from,to,step]}); fireflies go on the winning path at `starAt`.
module.exports = [
  // ---------- Chapter 1: Ropes ----------
  { name: 'First Snip', hint: 'Swipe across the rope to cut it.',
    berry: { x: 200, y: 190 }, ropes: [{ x: 200, y: 60 }], goal: { x: 200, y: 565 },
    solve: [{ cut: 0, t: [20, 80, 5] }] },

  { name: 'Swing Time', hint: 'Let it swing, then cut.',
    berry: { x: 300, y: 300 }, ropes: [{ x: 180, y: 260 }], goal: { x: 330, y: 560 },
    solve: [{ cut: 0, t: [5, 260, 1] }] },

  { name: 'Lefty', berry: { x: 110, y: 310 }, ropes: [{ x: 220, y: 280 }], goal: { x: 90, y: 560 },
    solve: [{ cut: 0, t: [5, 260, 1] }] },

  { name: 'Double Knot', hint: 'Two ropes. Which one first?',
    berry: { x: 224, y: 373 }, ropes: [{ x: 104, y: 267 }, { x: 292, y: 220 }], goal: { x: 334, y: 552 },
    solve: [{ cut: 0, t: [20, 40, 5] }, { cut: 1, t: [30, 260, 2] }] },

  { name: 'Triple Tie', berry: { x: 200, y: 200 },
    ropes: [{ x: 60, y: 80 }, { x: 200, y: 60 }, { x: 340, y: 80 }], goal: { x: 80, y: 565 },
    solve: [{ cut: 2, t: [20, 40, 5] }, { cut: 1, t: [30, 200, 2] }, { cut: 0, t: [40, 300, 3] }] },

  { name: 'Long Drop', berry: { x: 320, y: 100 }, ropes: [{ x: 60, y: 60, len: 280 }],
    spikes: [{ x: 0, y: 600, w: 230, h: 40 }], goal: { x: 330, y: 560 },
    solve: [{ cut: 0, t: [5, 300, 1] }] },

  // ---------- Chapter 2: Pegs ----------
  { name: 'Peg Catch', hint: 'Dashed circles grab the berry with a new rope.',
    berry: { x: 110, y: 170 }, ropes: [{ x: 110, y: 60 }], autoRopes: [{ x: 230, y: 290, r: 125 }],
    goal: { x: 330, y: 565 },
    solve: [{ cut: 0, t: [10, 40, 5] }, { cut: 1, t: [30, 300, 2] }] },

  { name: 'Hand to Hand', berry: { x: 70, y: 120 }, ropes: [{ x: 70, y: 40 }],
    autoRopes: [{ x: 170, y: 250, r: 120 }, { x: 300, y: 360, r: 120 }], goal: { x: 330, y: 575 },
    solve: [{ cut: 0, t: [10, 30, 5] }, { cut: 1, t: [30, 260, 2] }, { cut: 2, t: [40, 400, 3] }] },

  { name: 'Spike Pit', berry: { x: 200, y: 160 }, ropes: [{ x: 200, y: 50 }],
    autoRopes: [{ x: 150, y: 330, r: 110 }],
    spikes: [{ x: 170, y: 480, w: 230, h: 22 }], goal: { x: 70, y: 570 },
    solve: [{ cut: 0, t: [5, 300, 1] }, { cut: 1, t: [30, 400, 2] }] },

  { name: 'Zig Zag', berry: { x: 330, y: 90 }, ropes: [{ x: 330, y: 30 }],
    autoRopes: [{ x: 250, y: 220, r: 110 }, { x: 120, y: 360, r: 110 }],
    spikes: [{ x: 0, y: 470, w: 160, h: 20 }], goal: { x: 300, y: 575 },
    solve: [{ cut: 0, t: [5, 30, 5] }, { cut: 1, t: [20, 300, 2] }, { cut: 2, t: [40, 420, 3] }] },

  // ---------- Chapter 3: Bubbles ----------
  { name: 'Float On', hint: 'Bubbles carry the berry up.',
    berry: { x: 200, y: 330 }, ropes: [{ x: 200, y: 230 }], bubbles: [{ x: 200, y: 450 }],
    goal: { x: 200, y: 90 },
    solve: [{ cut: 0, t: [10, 60, 5] }] },

  { name: 'Pop!', hint: 'Tap the bubble to pop it.',
    berry: { x: 120, y: 520 }, bubbles: [{ x: 120, y: 520 }], ropes: [{ x: 120, y: 620, len: 150 }],
    spikes: [{ x: 0, y: 0, w: 400, h: 24 }], goal: { x: 120, y: 600 },
    stars: [{ x: 120, y: 400 }, { x: 120, y: 250 }, { x: 120, y: 110 }],
    solve: [{ cut: 0, t: [20, 40, 5] }, { pop: true, t: [40, 400, 2] }] },

  { name: 'Lift Off', berry: { x: 220, y: 90 }, ropes: [{ x: 80, y: 60 }],
    bubbles: [{ x: 290, y: 440 }], autoRopes: [{ x: 290, y: 300, r: 100 }],
    spikes: [{ x: 0, y: 0, w: 400, h: 20 }], goal: { x: 290, y: 120 },
    solve: [{ cut: 0, t: [5, 300, 1] }, { cut: 1, t: [20, 500, 3] }] },

  { name: 'Bubble Swing', hint: 'Fling the berry into the bubble.',
    berry: { x: 300, y: 330 }, ropes: [{ x: 170, y: 330, len: 130 }],
    bubbles: [{ x: 260, y: 500 }], spikes: [{ x: 0, y: 0, w: 400, h: 20 }], goal: { x: 260, y: 120 },
    solve: [{ cut: 0, t: [5, 400, 1] }] },

  { name: 'Up and Over', berry: { x: 80, y: 420 }, ropes: [{ x: 80, y: 320 }],
    bubbles: [{ x: 80, y: 540 }], autoRopes: [{ x: 180, y: 150, r: 105 }],
    spikes: [{ x: 0, y: 0, w: 400, h: 18 }, { x: 0, y: 622, w: 220, h: 18 }], goal: { x: 330, y: 560 },
    solve: [{ cut: 0, t: [10, 40, 5] }, { pop: true, t: [20, 500, 3] }, { cut: 1, t: [40, 700, 3] }] },

  // ---------- Chapter 4: Air Puffs ----------
  { name: 'Puff Puff', hint: 'Tap the blower to push the berry.',
    berry: { x: 300, y: 160 }, ropes: [{ x: 300, y: 40 }], blowers: [{ x: 380, y: 160, angle: 180 }],
    goal: { x: 110, y: 565 },
    solve: [{ blow: 0, t: [5, 60, 5] }, { cut: 0, t: [10, 300, 1] }] },

  { name: 'Crosswind', hint: 'Blowers push bubbles too.',
    berry: { x: 90, y: 520 }, bubbles: [{ x: 90, y: 520 }], ropes: [{ x: 90, y: 630, len: 110 }],
    blowers: [{ x: 20, y: 300, angle: 0 }], spikes: [{ x: 0, y: 0, w: 400, h: 18 }],
    goal: { x: 350, y: 570 },
    solve: [{ cut: 0, t: [10, 40, 5] }, { blow: 0, t: [15, 300, 2] }, { pop: true, t: [20, 600, 3] }] },

  { name: 'Bubble Taxi', hint: 'Puff the bubble over the nest, then pop it.', berry: { x: 80, y: 420 }, ropes: [{ x: 80, y: 330 }],
    bubbles: [{ x: 80, y: 530 }], blowers: [{ x: 20, y: 300, angle: 0 }],
    spikes: [{ x: 0, y: 0, w: 400, h: 18 }], goal: { x: 240, y: 565 },
    solve: [{ cut: 0, t: [10, 40, 5] }, { blow: 0, t: [20, 400, 2] }, { pop: true, t: [30, 700, 3] }] },

  { name: 'Updraft', berry: { x: 200, y: 169 }, ropes: [{ x: 200, y: 40 }],
    blowers: [{ x: 38, y: 294, angle: -19 }], autoRopes: [{ x: 281, y: 183, r: 107 }],
    spikes: [{ x: 0, y: 451, w: 228, h: 20 }], goal: { x: 331, y: 573 },
    solve: [{ cut: 0, t: [10, 40, 5] }, { blow: 0, t: [15, 160, 1] }, { cut: 1, t: [40, 500, 3] }] },

  // ---------- Chapter 5: Everything ----------
  { name: 'Gauntlet', berry: { x: 190, y: 70 }, ropes: [{ x: 60, y: 40 }],
    autoRopes: [{ x: 200, y: 210, r: 110 }],
    bubbles: [{ x: 300, y: 460 }],
    spikes: [{ x: 0, y: 0, w: 400, h: 16 }, { x: 140, y: 370, w: 90, h: 18 }],
    goal: { x: 300, y: 130 },
    solve: [{ cut: 0, t: [0, 200, 3] }, { cut: 1, t: [5, 400, 3] }] },

  { name: 'Ping Pong', berry: { x: 200, y: 540 }, bubbles: [{ x: 200, y: 540 }],
    ropes: [{ x: 200, y: 640, len: 100 }],
    blowers: [{ x: 20, y: 425, angle: 0 }, { x: 380, y: 211, angle: 180 }],
    spikes: [{ x: 0, y: 0, w: 400, h: 16 }, { x: 161, y: 306, w: 100, h: 16 }], goal: { x: 87, y: 556 },
    solve: [{ cut: 0, t: [10, 30, 5] }, { blow: 0, t: [15, 200, 3] }, { blow: 1, t: [20, 400, 3] }, { pop: true, t: [30, 700, 3] }] },

  { name: 'Sky Hook', berry: { x: 330, y: 540 }, bubbles: [{ x: 330, y: 540 }],
    ropes: [{ x: 330, y: 630, len: 120 }], autoRopes: [{ x: 200, y: 150, r: 110 }],
    blowers: [{ x: 380, y: 260, angle: 180 }],
    spikes: [{ x: 0, y: 0, w: 400, h: 16 }], goal: { x: 80, y: 565 },
    solve: [{ cut: 0, t: [10, 30, 5] }, { blow: 0, t: [20, 400, 3] }, { pop: true, t: [30, 500, 3] }, { cut: 1, t: [40, 700, 4] }] },

  { name: 'Needle', hint: 'Thread it through the gap.',
    berry: { x: 140, y: 170 }, ropes: [{ x: 60, y: 60 }, { x: 340, y: 60 }],
    autoRopes: [{ x: 200, y: 330, r: 90 }],
    spikes: [{ x: 0, y: 500, w: 165, h: 20 }, { x: 235, y: 500, w: 165, h: 20 }], goal: { x: 200, y: 590 },
    solve: [{ cut: 0, t: [10, 30, 5] }, { cut: 1, t: [15, 200, 2] }, { cut: 2, t: [20, 500, 2] }] },

  { name: 'Grand Finale', berry: { x: 330, y: 90 }, ropes: [{ x: 200, y: 40 }],
    autoRopes: [{ x: 120, y: 260, r: 100 }],
    bubbles: [{ x: 250, y: 470 }],
    blowers: [{ x: 380, y: 200, angle: 180 }],
    spikes: [{ x: 0, y: 0, w: 400, h: 14 }, { x: 0, y: 400, w: 190, h: 18 }],
    goal: { x: 60, y: 300 },
    solve: [{ cut: 0, t: [0, 200, 3] }, { cut: 1, t: [5, 400, 3] }, { blow: 0, t: [10, 700, 5] }, { pop: true, t: [20, 800, 5] }] }
];
