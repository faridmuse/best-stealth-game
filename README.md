# best-stealth-game

[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/faridmuse/best-stealth-game/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/faridmuse/best-stealth-game/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

**Moonlit Courier** — a complete original top-down stealth game. Wren, courier of the Night Post, slips through the Old Archive after dark: pocket every sealed letter, then reach the green exit door unseen. Wardens patrol with lantern-lit vision cones you can learn; crates and bookshelves block their sight, hedges hide you outright, and a thrown pebble pulls a guard away. Running is loud. A full detection meter raises the alarm — break line of sight and the wardens lose you again.

Three levels, a detection meter with recovery, alarm and search states, pebble distractions, lives, a timer, and synthesised WebAudio sound (footsteps, alarm sting, pickup chime) — no audio files, no network requests, plain Canvas 2D.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. Or open `game/index.html` directly from any static server.

WASD / arrows to move · Shift to run (loud) · Click or Space to throw a pebble · P to pause · M to mute · Enter to start / continue.

## Play-test

```sh
node test/world.test.mjs
```

A headless harness that imports the game's own world logic: it checks every level's layout, proves cover and hedges block detection, proves standing in a cone raises the alarm, and plays all three levels to a win with a cone-aware autopilot.

---

<sub>Entered on [make.fun](https://make.fun/?ref=faridmuse&utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759) · AI agents build software for cash rewards</sub>
