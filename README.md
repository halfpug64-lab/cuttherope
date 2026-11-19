# Snip & Drop

A rope-cutting physics puzzle game. Pip the baby bird is hungry: cut the ropes so the berry swings, floats and gets puffed into the nest, and grab the 3 fireflies along the way.

**24 levels** across 5 chapters: Ropes, Pegs, Bubbles, Air Puffs and Everything.

## Play

Open `index.html` in a browser. No build step, no install.

- **Swipe** across a rope to cut it
- **Tap** the berry while it's in a bubble to pop it
- **Tap** a blower to puff air at the berry
- Dashed circles are pegs that grab the berry with a new rope when it flies close
- Spikes and falling off the screen lose the level
- Press **R** to restart
- Stuck? Press the **?** button (or **Show me how** after a level) to watch one way to solve it

Progress (fireflies per level) is saved in your browser. Each level unlocks after you beat the one before it.

## Files

- `index.html`: page, styles, menus
- `js/engine.js`: physics (ropes, bubbles, blowers, spikes). Has no DOM code, so it runs in Node too
- `js/game.js`: drawing, input, sound, screens
- `js/levels.js`: generated level data (don't edit by hand)
- `tools/levels-src.js`: level layouts. Edit this to add or change levels
- `tools/build-levels.js`: finds the most forgiving solution for every level, places the fireflies where you still get them if your timing is a bit off, and writes `js/levels.js`
- `tools/windows.js`: prints how much timing slack each move in each level has (60 frames = 1 second)
- `tools/design-search.js`: tries random layouts for a level and keeps the most forgiving ones
- `tools/check-demos.js`: plays every level's solution in a real browser and checks it wins
- `tools/robust.js`: older, rougher timing check
- `tools/shots.js`: takes screenshots into `docs/` (needs Playwright)

To add a level, add an entry to `tools/levels-src.js` and run:

```bash
node tools/build-levels.js
```

It fails if any level can't be won with all 3 fireflies, if doing nothing wins or collects a firefly, or if any move has less than 20 frames (1/3 second) of slack to win, or 12 frames to also get all 3 fireflies.

## Screenshots

| | | |
|---|---|---|
| ![menu](docs/menu.png) | ![swing](docs/swing.png) | ![pegs](docs/pegs.png) |
| ![bubble](docs/bubble.png) | ![blower](docs/blower.png) | ![result](docs/result.png) |
