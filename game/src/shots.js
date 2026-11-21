// Staged screenshot scenes for Moonlit Courier (?shot=1..4). Each scene builds
// a real world from the level data and poses it at a fixed moment — the same
// code that renders live play draws the frame, so every screenshot is a true
// render of the game's own code. Shot mode never steps the simulation, so
// the posed moment stays exactly as staged.
import { SCREENS, TILE } from './config.js';
import { GUARD_STATE } from './guards.js';
import { World } from './world.js';

function tilePoint(col, row) {
  return { x: (col + 0.5) * TILE, y: (row + 0.5) * TILE };
}

function poseGuard(world, index, col, row, direction, state, suspicion) {
  const guard = world.guards[index];
  const point = tilePoint(col, row);
  guard.x = point.x;
  guard.y = point.y;
  guard.direction = direction;
  guard.state = state;
  guard.suspicion = suspicion;
  guard.lastSeen = { x: world.player.x, y: world.player.y };
  guard.pause = 999;
  return guard;
}

function posePlayer(world, col, row) {
  const point = tilePoint(col, row);
  world.player.x = point.x;
  world.player.y = point.y;
}

/** Build the staged scene for `name` ("1".."4"); returns world, screen and a caption. */
export function stageShot(name) {
  if (name === '1') {
    // Cover: the courier crouches behind a crate while a warden's cone sweeps past.
    const world = new World(0);
    posePlayer(world, 9, 6);
    poseGuard(world, 0, 5, 6, 0, GUARD_STATE.PATROL, 0);
    poseGuard(world, 1, 12, 12, -Math.PI / 2, GUARD_STATE.PATROL, 0);
    return { world, screen: SCREENS.PLAY, message: 'Stay behind cover — the cone cannot see through crates' };
  }
  if (name === '2') {
    // Near-detection: a warden has half-spotted the courier by the letters.
    const world = new World(1);
    world.letters[0].taken = true;
    world.lettersTaken = 1;
    posePlayer(world, 11, 3);
    poseGuard(world, 0, 12, 5, Math.atan2(3.5 - 5.5, 11.5 - 12.5), GUARD_STATE.SUSPICIOUS, 65);
    poseGuard(world, 1, 20, 13, Math.PI, GUARD_STATE.PATROL, 0);
    poseGuard(world, 2, 27, 8, -Math.PI / 2, GUARD_STATE.PATROL, 0);
    return { world, screen: SCREENS.PLAY, message: 'Spotted — break line of sight before the meter fills' };
  }
  if (name === '3') {
    // Alarm: the meter is full, wardens chase, the courier runs for the door.
    const world = new World(2);
    for (let i = 0; i < 4; i += 1) {
      world.letters[i].taken = true;
    }
    world.lettersTaken = 4;
    world.pebbles = 1;
    posePlayer(world, 24, 15);
    world.alarm = true;
    world.alarmTimer = 3.2;
    poseGuard(world, 0, 22, 13, Math.atan2(15.5 - 13.5, 24.5 - 22.5), GUARD_STATE.CHASE, 100);
    poseGuard(world, 1, 24, 12, Math.atan2(15.5 - 12.5, 24.5 - 24.5), GUARD_STATE.CHASE, 100);
    poseGuard(world, 2, 18, 14, 0, GUARD_STATE.SEARCH, 45);
    poseGuard(world, 3, 20, 11, Math.PI / 2, GUARD_STATE.PATROL, 0);
    return { world, screen: SCREENS.PLAY, message: 'ALARM — run! The wardens know where you were seen' };
  }
  // Exit: every letter pocketed, the courier stands in the open green doorway.
  const world = new World(0);
  for (const letter of world.letters) letter.taken = true;
  world.lettersTaken = world.lettersTotal;
  posePlayer(world, 26, 16);
  poseGuard(world, 0, 18, 8, Math.PI / 2, GUARD_STATE.PATROL, 0);
  poseGuard(world, 1, 8, 10, 0, GUARD_STATE.PATROL, 0);
  return { world, screen: SCREENS.PLAY, message: 'LEVEL CLEAR — all letters delivered, unseen' };
}
