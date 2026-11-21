// The game world for Moonlit Courier: one level's grid, the player, the
// guards, letters, the exit, and the detection alarm. Pure logic, no DOM:
// a Node harness can import this file and play whole levels headlessly.
import {
  ALARM_SECONDS,
  COLS,
  NOISE_RADIUS_RUN,
  PEBBLE_MAX,
  PEBBLE_NOISE_RADIUS,
  PLAYER_RADIUS,
  ROWS,
  RUN_SPEED,
  TILE,
  WALK_SPEED,
} from './config.js';
import { Guard, GUARD_STATE } from './guards.js';
import { LEVELS, parseLevel } from './levels.js';

export const WORLD_EVENT = {
  LETTER: 'letter',
  LEVEL_DONE: 'level_done',
  CAUGHT: 'caught',
  ALARM: 'alarm',
  PEBBLE: 'pebble',
};

/** Tile kinds that are solid: nothing walks through them. */
export function isSolidTile(ch) {
  return ch === '#' || ch === 'C' || ch === 'B';
}

/** Tile kinds that block a guard's line of sight. */
export function blocksSightTile(ch) {
  return ch === '#' || ch === 'C' || ch === 'B';
}

export class World {
  constructor(levelIndex) {
    this.levelIndex = levelIndex;
    this.level = LEVELS[levelIndex];
    const parsed = parseLevel(this.level);
    this.walls = parsed.walls;
    this.crates = parsed.crates;
    this.shelves = parsed.shelves;
    this.hedges = parsed.hedges;
    this.lamps = parsed.lamps;
    this.letters = parsed.letters;
    this.playerStart = parsed.player;
    this.exit = parsed.exit;
    this.grid = this.level.map.map((line) => line.split(''));
    this.solid = new Set();
    this.sightBlock = new Set();
    for (let row = 0; row < ROWS; row += 1) {
      for (let col = 0; col < COLS; col += 1) {
        const ch = this.grid[row][col];
        if (isSolidTile(ch)) this.solid.add(`${col},${row}`);
        if (blocksSightTile(ch)) this.sightBlock.add(`${col},${row}`);
      }
    }
    this.reset();
  }

  /** Start (or restart) this level fresh: player, guards, letters, timer. */
  reset() {
    this.player = {
      x: this.playerStart.x * TILE,
      y: this.playerStart.y * TILE,
      radius: PLAYER_RADIUS,
      moving: false,
      running: false,
      hidden: false,
    };
    this.guards = this.level.guards.map((def) => new Guard(def));
    for (const letter of this.letters) letter.taken = false;
    this.lettersTaken = 0;
    this.pebbles = PEBBLE_MAX;
    this.pebblesThrown = [];
    this.alarm = false;
    this.alarmTimer = 0;
    this.time = 0;
    this.events = [];
    this.noise = { x: 0, y: 0, radius: 0, timer: 0 };
  }

  get lettersTotal() {
    return this.letters.length;
  }

  get detection() {
    return this.guards.reduce((max, guard) => Math.max(max, guard.suspicion), 0);
  }

  tileAt(col, row) {
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return '#';
    return this.grid[row][col];
  }

  /** True when a circle of `radius` at (x, y) touches no solid tile. */
  canStand(x, y, radius) {
    const left = Math.floor((x - radius) / TILE);
    const right = Math.floor((x + radius) / TILE);
    const top = Math.floor((y - radius) / TILE);
    const bottom = Math.floor((y + radius) / TILE);
    for (let row = top; row <= bottom; row += 1) {
      for (let col = left; col <= right; col += 1) {
        if (this.solid.has(`${col},${row}`)) return false;
      }
    }
    return true;
  }

  /** True when the player stands inside a hedge tile: unseen even in a cone. */
  isHiddenInHedge(x, y) {
    return this.tileAt(Math.floor(x / TILE), Math.floor(y / TILE)) === 'H';
  }

  /** True when no sight-blocking tile stands between two points. */
  hasLineOfSight(x1, y1, x2, y2) {
    const distance = Math.hypot(x2 - x1, y2 - y1);
    const steps = Math.ceil(distance / 8);
    for (let i = 1; i < steps; i += 1) {
      const t = i / steps;
      const col = Math.floor((x1 + (x2 - x1) * t) / TILE);
      const row = Math.floor((y1 + (y2 - y1) * t) / TILE);
      if (this.sightBlock.has(`${col},${row}`)) return false;
    }
    return true;
  }

  /** Distance from a point to the nearest sight-blocking tile along a ray. */
  rayDistance(x, y, angle, maxDistance) {
    const step = 8;
    for (let d = step; d <= maxDistance; d += step) {
      const col = Math.floor((x + Math.cos(angle) * d) / TILE);
      const row = Math.floor((y + Math.sin(angle) * d) / TILE);
      if (this.sightBlock.has(`${col},${row}`)) return d;
    }
    return maxDistance;
  }

  /**
   * One simulation step. `move` is {x, y} in -1..1, `run` is the Shift key,
   * `throwPebble` is a world point to toss a pebble at, or null.
   * Returns the events that fired this step.
   */
  step(dt, move, run, throwPebble) {
    this.events = [];
    this.time += dt;

    // Move the player, sliding along solid tiles.
    const speed = run ? RUN_SPEED : WALK_SPEED;
    const length = Math.hypot(move.x, move.y);
    this.player.moving = length > 0.1;
    this.player.running = run && this.player.moving;
    if (this.player.moving) {
      const nx = move.x / (length || 1);
      const ny = move.y / (length || 1);
      const px = this.player.x + nx * speed * dt;
      const py = this.player.y + ny * speed * dt;
      if (this.canStand(px, this.player.y, this.player.radius)) this.player.x = px;
      if (this.canStand(this.player.x, py, this.player.radius)) this.player.y = py;
    }
    this.player.hidden = this.isHiddenInHedge(this.player.x, this.player.y);

    // Running is loud: nearby guards come to look.
    if (this.player.running) {
      this.noise = { x: this.player.x, y: this.player.y, radius: NOISE_RADIUS_RUN, timer: 0.15 };
      for (const guard of this.guards) {
        if (Math.hypot(guard.x - this.player.x, guard.y - this.player.y) < NOISE_RADIUS_RUN) {
          guard.hearNoise(this.player.x, this.player.y);
        }
      }
    } else if (this.noise.timer > 0) {
      this.noise.timer -= dt;
    }

    // A thrown pebble clatters and pulls the nearest guard to its landing spot.
    if (throwPebble && this.pebbles > 0) {
      this.pebbles -= 1;
      this.pebblesThrown.push({ x: throwPebble.x, y: throwPebble.y, timer: 0.6 });
      this.noise = { x: throwPebble.x, y: throwPebble.y, radius: PEBBLE_NOISE_RADIUS, timer: 0.4 };
      let nearest = null;
      let nearestDistance = Infinity;
      for (const guard of this.guards) {
        const d = Math.hypot(guard.x - throwPebble.x, guard.y - throwPebble.y);
        if (d < nearestDistance) {
          nearestDistance = d;
          nearest = guard;
        }
      }
      if (nearest && nearestDistance < PEBBLE_NOISE_RADIUS * 2.2) nearest.hearNoise(throwPebble.x, throwPebble.y);
      this.events.push(WORLD_EVENT.PEBBLE);
    }
    for (const pebble of this.pebblesThrown) pebble.timer -= dt;
    this.pebblesThrown = this.pebblesThrown.filter((pebble) => pebble.timer > 0);

    // Guards watch and move; a full meter raises the alarm.
    for (const guard of this.guards) guard.step(dt, this.player, this, this.alarm);
    if (!this.alarm && this.detection >= 100) {
      this.alarm = true;
      this.alarmTimer = ALARM_SECONDS;
      this.events.push(WORLD_EVENT.ALARM);
    }
    if (this.alarm) {
      this.alarmTimer -= dt;
      if (this.alarmTimer <= 0) this.alarm = false;
    }

    // Caught: a chasing guard touches the player.
    for (const guard of this.guards) {
      if (guard.state === GUARD_STATE.CHASE && Math.hypot(guard.x - this.player.x, guard.y - this.player.y) < guard.radius + this.player.radius + 2) {
        this.events.push(WORLD_EVENT.CAUGHT);
        return this.events;
      }
    }

    // Letters: walk over one to pocket it.
    for (const letter of this.letters) {
      if (!letter.taken && Math.hypot(letter.x * TILE - this.player.x, letter.y * TILE - this.player.y) < 26) {
        letter.taken = true;
        this.lettersTaken += 1;
        this.events.push(WORLD_EVENT.LETTER);
      }
    }

    // Exit: open only once every letter is pocketed.
    const exitX = this.exit.x * TILE;
    const exitY = this.exit.y * TILE;
    if (this.lettersTaken === this.lettersTotal && Math.hypot(exitX - this.player.x, exitY - this.player.y) < 30) {
      this.events.push(WORLD_EVENT.LEVEL_DONE);
    }
    return this.events;
  }
}
