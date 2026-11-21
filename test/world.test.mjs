// Headless play-test for Moonlit Courier: imports the game's own world logic
// (no DOM) and proves each level is laid out sanely and beatable, that cover
// and hedges hide the player, and that standing in a cone raises the alarm.
// Run: node test/world.test.mjs
import { COLS, ROWS, STEP, TILE } from '../game/src/config.js';
import { LEVELS, parseLevel } from '../game/src/levels.js';
import { stageShot } from '../game/src/shots.js';
import { WORLD_EVENT, World, isSolidTile } from '../game/src/world.js';

let failures = 0;
function check(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures += 1;
}

/** Flood fill from the player start over walkable tiles; returns a Set of "col,row". */
function floodFill(level) {
  const parsed = parseLevel(level);
  const start = { col: Math.floor(parsed.player.x), row: Math.floor(parsed.player.y) };
  const seen = new Set([`${start.col},${start.row}`]);
  const queue = [start];
  while (queue.length > 0) {
    const { col, row } = queue.pop();
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nc = col + dc;
      const nr = row + dr;
      if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS) continue;
      if (seen.has(`${nc},${nr}`)) continue;
      if (isSolidTile(level.map[nr][nc])) continue;
      seen.add(`${nc},${nr}`);
      queue.push({ col: nc, row: nr });
    }
  }
  return seen;
}

/** BFS path (list of tile centres in pixels) from tile A to tile B, avoiding solid and `blocked` tiles. */
function findPath(level, from, to, blocked = new Set()) {
  const start = { col: Math.floor(from.x / TILE), row: Math.floor(from.y / TILE) };
  const goal = { col: Math.floor(to.x / TILE), row: Math.floor(to.y / TILE) };
  const prev = new Map([[`${start.col},${start.row}`, null]]);
  const queue = [start];
  while (queue.length > 0) {
    const current = queue.shift();
    if (current.col === goal.col && current.row === goal.row) break;
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nc = current.col + dc;
      const nr = current.row + dr;
      if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS) continue;
      if (prev.has(`${nc},${nr}`)) continue;
      if (blocked.has(`${nc},${nr}`)) continue;
      if (isSolidTile(level.map[nr][nc])) continue;
      prev.set(`${nc},${nr}`, current);
      queue.push({ col: nc, row: nr });
    }
  }
  if (!prev.has(`${goal.col},${goal.row}`)) return null;
  const tiles = [];
  let current = goal;
  while (current) {
    tiles.unshift({ x: (current.col + 0.5) * TILE, y: (current.row + 0.5) * TILE });
    current = prev.get(`${current.col},${current.row}`);
  }
  return tiles;
}

/** Tiles a guard can currently see, from the centre of each tile. */
function dangerTiles(world) {
  const danger = new Set();
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const probe = { x: (col + 0.5) * TILE, y: (row + 0.5) * TILE };
      if (world.guards.some((guard) => guard.canSee(probe, world))) danger.add(`${col},${row}`);
    }
  }
  return danger;
}

// --- Layout checks -----------------------------------------------------------
for (let index = 0; index < LEVELS.length; index += 1) {
  const level = LEVELS[index];
  check(`level ${index + 1}: ${ROWS} rows`, level.map.length === ROWS, `${level.map.length} rows`);
  check(`level ${index + 1}: every row ${COLS} wide`, level.map.every((line) => line.length === COLS));
  const reachable = floodFill(level);
  const parsed = parseLevel(level);
  const lettersOk = parsed.letters.every((letter) => reachable.has(`${Math.floor(letter.x)},${Math.floor(letter.y)}`));
  check(`level ${index + 1}: all ${parsed.letters.length} letters reachable`, lettersOk);
  check(`level ${index + 1}: exit reachable`, reachable.has(`${Math.floor(parsed.exit.x)},${Math.floor(parsed.exit.y)}`));
  const waypointsOk = level.guards.every((guard) =>
    guard.path.every(([tx, ty]) => !isSolidTile(level.map[ty][tx])));
  check(`level ${index + 1}: guard waypoints on floor`, waypointsOk);
}

// --- Stealth mechanics -------------------------------------------------------
{
  const world = new World(0);
  const guard = world.guards[0];
  // Stand in front of the guard, in range, with a clear line of sight.
  // Row 8, columns 10-13 are open floor on level 1.
  guard.x = (10 + 0.5) * TILE;
  guard.y = (8 + 0.5) * TILE;
  guard.direction = 0;
  world.player.x = (13 + 0.5) * TILE;
  world.player.y = (8 + 0.5) * TILE;
  guard.suspicion = 0;
  for (let i = 0; i < 180; i += 1) world.step(STEP, { x: 0, y: 0 }, false, null);
  check('detection: standing in a cone raises suspicion to alarm', world.alarm && world.detection >= 100, `detection=${world.detection.toFixed(0)}`);
}

{
  const world = new World(0);
  const guard = world.guards[0];
  // Stand behind a crate, inside the cone's range and angle: the crate blocks sight.
  guard.x = (5 + 0.5) * TILE;
  guard.y = (1 + 0.5) * TILE;
  guard.direction = 0;
  world.player.x = (9 + 0.5) * TILE;
  world.player.y = (1 + 0.5) * TILE;
  guard.suspicion = 0;
  guard.pause = 999;
  // Park the other guard far away so only this guard can see the player.
  world.guards[1].x = (28 + 0.5) * TILE;
  world.guards[1].y = (16 + 0.5) * TILE;
  world.guards[1].direction = Math.PI;
  for (let i = 0; i < 120; i += 1) world.step(STEP, { x: 0, y: 0 }, false, null);
  check('cover: a crate between guard and player blocks detection', world.detection < 5, `detection=${world.detection.toFixed(1)}`);
}

{
  const world = new World(0);
  const guard = world.guards[0];
  // Stand in a hedge inside the cone: hidden even with a clear line.
  guard.x = (3 + 0.5) * TILE;
  guard.y = (6 + 0.5) * TILE;
  guard.direction = Math.PI / 2;
  world.player.x = (3 + 0.5) * TILE;
  world.player.y = (8 + 0.5) * TILE;
  guard.suspicion = 0;
  world.guards[1].x = (28 + 0.5) * TILE;
  world.guards[1].y = (16 + 0.5) * TILE;
  world.guards[1].direction = Math.PI;
  for (let i = 0; i < 120; i += 1) world.step(STEP, { x: 0, y: 0 }, false, null);
  check('hedge: hiding in a hedge blocks detection', world.detection < 5, `detection=${world.detection.toFixed(1)}`);
}

// --- Full win path -----------------------------------------------------------
/** Autopilot: follow a BFS path to each letter then the exit, replanning
 * around the guards' current vision cones; back off when spotted. */
function playLevelToWin(levelIndex, maxSeconds = 300) {
  const world = new World(levelIndex);
  const level = LEVELS[levelIndex];
  const targets = [...world.letters.map((letter) => ({ x: letter.x * TILE, y: letter.y * TILE })), { x: world.exit.x * TILE, y: world.exit.y * TILE }];
  let targetIndex = 0;
  let path = null;
  let pathIndex = 0;
  let replanIn = 0;
  for (let step = 0; step < maxSeconds / STEP; step += 1) {
    if (targetIndex >= targets.length) return { won: false, reason: 'no targets left' };
    const target = targets[targetIndex];
    const arrived = Math.hypot(target.x - world.player.x, target.y - world.player.y) < 24;
    if (arrived) {
      targetIndex += 1;
      path = null;
      continue;
    }
    replanIn -= 1;
    if (!path || replanIn <= 0) {
      const danger = dangerTiles(world);
      // The player's own tile and the target tile are never blocked.
      danger.delete(`${Math.floor(world.player.x / TILE)},${Math.floor(world.player.y / TILE)}`);
      danger.delete(`${Math.floor(target.x / TILE)},${Math.floor(target.y / TILE)}`);
      path = findPath(level, world.player, target, danger) ?? findPath(level, world.player, target);
      pathIndex = 0;
      replanIn = 45;
      if (!path) return { won: false, reason: `no path to target ${targetIndex}` };
    }
    while (pathIndex < path.length - 1 && Math.hypot(path[pathIndex].x - world.player.x, path[pathIndex].y - world.player.y) < 14) pathIndex += 1;
    const waypoint = path[pathIndex];
    let move = { x: 0, y: 0 };
    const seenBy = world.guards.find((guard) => guard.canSee(world.player, world));
    if (seenBy && world.detection > 25) {
      // Back away from the guard that sees us and replan.
      const dx = world.player.x - seenBy.x;
      const dy = world.player.y - seenBy.y;
      const length = Math.hypot(dx, dy) || 1;
      move = { x: dx / length, y: dy / length };
      path = null;
    } else {
      const dx = waypoint.x - world.player.x;
      const dy = waypoint.y - world.player.y;
      const length = Math.hypot(dx, dy) || 1;
      move = { x: dx / length, y: dy / length };
    }
    const events = world.step(STEP, move, false, null);
    if (events.includes(WORLD_EVENT.CAUGHT)) return { won: false, reason: `caught at ${world.time.toFixed(1)}s (target ${targetIndex})` };
    if (events.includes(WORLD_EVENT.LEVEL_DONE)) return { won: true, time: world.time, letters: world.lettersTaken };
  }
  return { won: false, reason: `timed out at target ${targetIndex}/${targets.length}` };
}

for (let index = 0; index < LEVELS.length; index += 1) {
  const result = playLevelToWin(index);
  check(`win path: level ${index + 1} is beatable by the autopilot`, result.won, result.won ? `in ${result.time.toFixed(1)}s` : result.reason);
}

// --- Staged screenshot scenes ----------------------------------------------
for (const name of ['1', '2', '3', '4']) {
  const staged = stageShot(name);
  const playerTile = `${Math.floor(staged.world.player.x / TILE)},${Math.floor(staged.world.player.y / TILE)}`;
  const playerOnFloor = !isSolidTile(staged.world.grid[Math.floor(staged.world.player.y / TILE)][Math.floor(staged.world.player.x / TILE)]);
  const guardsOnFloor = staged.world.guards.every((guard) => !isSolidTile(staged.world.grid[Math.floor(guard.y / TILE)][Math.floor(guard.x / TILE)]));
  check(`shot ${name}: stages with player and guards on floor`, playerOnFloor && guardsOnFloor, `player tile ${playerTile}`);
}

console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
