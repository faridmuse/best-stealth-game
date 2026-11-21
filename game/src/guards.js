// Guard patrols, vision and suspicion for Moonlit Courier. A guard walks its
// waypoint loop, watches a cone in front of it, and grows suspicious when the
// player is inside that cone with a clear line of sight. Suspicion decays
// when the player is hidden, so a near miss can be recovered from.
import {
  ALARM_SECONDS,
  GUARD_RADIUS,
  GUARD_VIEW_HALF_ANGLE,
  GUARD_VIEW_RANGE,
  SEARCH_SECONDS,
  SUSPICION_FALL_PER_SECOND,
  SUSPICION_RISE_CLOSE_PER_SECOND,
  SUSPICION_RISE_PER_SECOND,
  TILE,
} from './config.js';

export const GUARD_STATE = {
  PATROL: 'patrol',
  SUSPICIOUS: 'suspicious',
  CHASE: 'chase',
  SEARCH: 'search',
  INVESTIGATE: 'investigate',
};

/** Angle of the segment from (x1, y1) to (x2, y2), in radians. */
export function angleTo(x1, y1, x2, y2) {
  return Math.atan2(y2 - y1, x2 - x1);
}

/** Smallest absolute difference between two angles, in radians. */
export function angleDifference(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return Math.abs(d);
}

export class Guard {
  constructor(def) {
    this.path = def.path.map(([tx, ty]) => ({ x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE }));
    this.x = (def.x + 0.5) * TILE;
    this.y = (def.y + 0.5) * TILE;
    this.speed = def.speed;
    this.range = GUARD_VIEW_RANGE;
    this.halfAngle = GUARD_VIEW_HALF_ANGLE;
    this.radius = GUARD_RADIUS;
    this.direction = this.path.length > 1 ? angleTo(this.x, this.y, this.path[1].x, this.path[1].y) : 0;
    this.waypoint = 1 % this.path.length;
    this.state = GUARD_STATE.PATROL;
    this.suspicion = 0;
    this.pause = 0;
    this.alarmTimer = 0;
    this.searchTimer = 0;
    this.lastSeen = { x: this.x, y: this.y };
    this.investigate = null;
    this.chaseSpeed = def.speed * 1.9;
    this.sweep = 0;
  }

  /** True when the player stands inside this guard's cone with nothing solid between. */
  canSee(player, world) {
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const distance = Math.hypot(dx, dy);
    if (distance > this.range) return false;
    if (angleDifference(angleTo(this.x, this.y, player.x, player.y), this.direction) > this.halfAngle) return false;
    if (world.isHiddenInHedge(player.x, player.y)) return false;
    return world.hasLineOfSight(this.x, this.y, player.x, player.y);
  }

  /** One simulation step: move, watch, and update suspicion and state. */
  step(dt, player, world, alarm) {
    const seen = this.canSee(player, world);
    if (seen) {
      const close = Math.hypot(player.x - this.x, player.y - this.y) < this.range * 0.45;
      this.suspicion = Math.min(100, this.suspicion + (close ? SUSPICION_RISE_CLOSE_PER_SECOND : SUSPICION_RISE_PER_SECOND) * dt);
      this.lastSeen = { x: player.x, y: player.y };
    } else if (this.state !== GUARD_STATE.CHASE) {
      this.suspicion = Math.max(0, this.suspicion - SUSPICION_FALL_PER_SECOND * dt);
    }

    if (alarm && this.state !== GUARD_STATE.CHASE) {
      this.state = GUARD_STATE.CHASE;
      this.alarmTimer = ALARM_SECONDS;
    }

    if (this.state === GUARD_STATE.CHASE) {
      this.alarmTimer -= dt;
      this.moveToward(this.lastSeen.x, this.lastSeen.y, this.chaseSpeed, dt, world);
      this.direction = angleTo(this.x, this.y, this.lastSeen.x, this.lastSeen.y);
      if (this.alarmTimer <= 0) {
        this.state = GUARD_STATE.SEARCH;
        this.searchTimer = SEARCH_SECONDS;
        this.suspicion = 45;
      }
      return;
    }

    if (this.state === GUARD_STATE.SEARCH) {
      this.searchTimer -= dt;
      this.sweep += dt * 1.6;
      this.direction += Math.sin(this.sweep) * dt * 1.4;
      if (this.searchTimer <= 0) {
        this.state = GUARD_STATE.PATROL;
        this.suspicion = 0;
      }
      if (this.suspicion > 70) this.state = GUARD_STATE.SUSPICIOUS;
      return;
    }

    if (this.state === GUARD_STATE.INVESTIGATE && this.investigate) {
      const arrived = this.moveToward(this.investigate.x, this.investigate.y, this.speed * 1.4, dt, world);
      this.direction = angleTo(this.x, this.y, this.investigate.x, this.investigate.y);
      if (arrived) {
        this.investigate = null;
        this.state = GUARD_STATE.SEARCH;
        this.searchTimer = SEARCH_SECONDS * 0.6;
      }
      return;
    }

    if (this.suspicion > 70) {
      this.state = GUARD_STATE.SUSPICIOUS;
      this.direction = angleTo(this.x, this.y, this.lastSeen.x, this.lastSeen.y);
      return;
    }
    if (this.suspicion > 30) {
      // Uneasy: turn toward the last glimpse and watch a moment.
      this.direction = angleTo(this.x, this.y, this.lastSeen.x, this.lastSeen.y);
      return;
    }

    this.state = GUARD_STATE.PATROL;
    if (this.pause > 0) {
      this.pause -= dt;
      return;
    }
    const target = this.path[this.waypoint];
    const arrived = this.moveToward(target.x, target.y, this.speed, dt, world);
    this.direction = angleTo(this.x, this.y, target.x, target.y);
    if (arrived) {
      this.waypoint = (this.waypoint + 1) % this.path.length;
      this.pause = 0.7;
    }
  }

  /** Walk toward (tx, ty), sliding along solid tiles; true when arrived. */
  moveToward(tx, ty, speed, dt, world) {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 4) return true;
    const step = Math.min(distance, speed * dt);
    const nx = this.x + (dx / distance) * step;
    const ny = this.y + (dy / distance) * step;
    if (world.canStand(nx, this.y, this.radius)) this.x = nx;
    if (world.canStand(this.x, ny, this.radius)) this.y = ny;
    return Math.hypot(tx - this.x, ty - this.y) < 4;
  }

  /** Send this guard to look at a thrown pebble's landing spot. */
  hearNoise(x, y) {
    if (this.state === GUARD_STATE.CHASE) return;
    this.investigate = { x, y };
    this.state = GUARD_STATE.INVESTIGATE;
  }
}
