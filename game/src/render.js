// Canvas rendering for Moonlit Courier: the top-down night archive, lamp
// pools, raycast vision cones, cover, the HUD and the menu screens.
import { COLS, ROWS, SCREENS, TILE, VIEW_HEIGHT, VIEW_WIDTH } from './config.js';
import { GUARD_STATE } from './guards.js';

const CONE_RAYS = 26;

function coneColor(state, suspicion) {
  if (state === GUARD_STATE.CHASE) return 'rgba(255, 64, 64, 0.30)';
  if (state === GUARD_STATE.SUSPICIOUS || suspicion > 70) return 'rgba(255, 140, 60, 0.28)';
  if (suspicion > 30) return 'rgba(255, 210, 90, 0.26)';
  return 'rgba(255, 220, 110, 0.20)';
}

function drawFloor(ctx, world) {
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const shade = (col + row) % 2 === 0 ? '#1d2333' : '#1a1f2d';
      ctx.fillStyle = shade;
      ctx.fillRect(col * TILE, row * TILE, TILE, TILE);
    }
  }
  // Faint stone seams.
  ctx.strokeStyle = 'rgba(255,255,255,0.03)';
  ctx.lineWidth = 1;
  for (let col = 0; col <= COLS; col += 1) {
    ctx.beginPath();
    ctx.moveTo(col * TILE, 0);
    ctx.lineTo(col * TILE, VIEW_HEIGHT);
    ctx.stroke();
  }
  for (let row = 0; row <= ROWS; row += 1) {
    ctx.beginPath();
    ctx.moveTo(0, row * TILE);
    ctx.lineTo(VIEW_WIDTH, row * TILE);
    ctx.stroke();
  }
}

function drawLampPools(ctx, world) {
  for (const lamp of world.lamps) {
    const x = lamp.col * TILE + TILE / 2;
    const y = lamp.row * TILE + TILE / 2;
    const glow = ctx.createRadialGradient(x, y, 8, x, y, 130);
    glow.addColorStop(0, 'rgba(255, 190, 90, 0.30)');
    glow.addColorStop(1, 'rgba(255, 190, 90, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(x - 130, y - 130, 260, 260);
  }
}

function drawVisionCone(ctx, guard, world) {
  const points = [];
  for (let i = 0; i <= CONE_RAYS; i += 1) {
    const angle = guard.direction - guard.halfAngle + (2 * guard.halfAngle * i) / CONE_RAYS;
    const distance = world.rayDistance(guard.x, guard.y, angle, guard.range);
    points.push([guard.x + Math.cos(angle) * distance, guard.y + Math.sin(angle) * distance]);
  }
  ctx.beginPath();
  ctx.moveTo(guard.x, guard.y);
  for (const [x, y] of points) ctx.lineTo(x, y);
  ctx.closePath();
  ctx.fillStyle = coneColor(guard.state, guard.suspicion);
  ctx.fill();
  ctx.strokeStyle = coneColor(guard.state, guard.suspicion).replace(/0\.\d+\)$/, '0.55)');
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawWallsAndCover(ctx, world) {
  for (const { col, row } of world.walls) {
    ctx.fillStyle = '#39415c';
    ctx.fillRect(col * TILE, row * TILE, TILE, TILE);
    ctx.fillStyle = '#4a5478';
    ctx.fillRect(col * TILE, row * TILE, TILE, 6);
  }
  for (const { col, row } of world.shelves) {
    ctx.fillStyle = '#2c2417';
    ctx.fillRect(col * TILE + 2, row * TILE + 2, TILE - 4, TILE - 4);
    ctx.fillStyle = '#6b4f2a';
    for (let i = 0; i < 4; i += 1) {
      ctx.fillRect(col * TILE + 6 + i * 8, row * TILE + 7, 5, TILE - 14);
    }
  }
  for (const { col, row } of world.crates) {
    ctx.fillStyle = '#7a5a33';
    ctx.fillRect(col * TILE + 3, row * TILE + 3, TILE - 6, TILE - 6);
    ctx.strokeStyle = '#5a3f1e';
    ctx.lineWidth = 2;
    ctx.strokeRect(col * TILE + 3, row * TILE + 3, TILE - 6, TILE - 6);
    ctx.beginPath();
    ctx.moveTo(col * TILE + 3, row * TILE + 3);
    ctx.lineTo(col * TILE + TILE - 3, row * TILE + TILE - 3);
    ctx.moveTo(col * TILE + TILE - 3, row * TILE + 3);
    ctx.lineTo(col * TILE + 3, row * TILE + TILE - 3);
    ctx.stroke();
  }
}

function drawHedges(ctx, world, top) {
  for (const { col, row } of world.hedges) {
    const x = col * TILE;
    const y = row * TILE;
    ctx.fillStyle = top ? 'rgba(24, 68, 38, 0.75)' : '#173d29';
    ctx.beginPath();
    ctx.arc(x + 12, y + 14, 13, 0, Math.PI * 2);
    ctx.arc(x + 28, y + 12, 14, 0, Math.PI * 2);
    ctx.arc(x + 20, y + 28, 14, 0, Math.PI * 2);
    ctx.fill();
    if (!top) {
      ctx.fillStyle = '#2c6b44';
      ctx.beginPath();
      ctx.arc(x + 12, y + 12, 5, 0, Math.PI * 2);
      ctx.arc(x + 28, y + 26, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawLettersAndExit(ctx, world, time) {
  const pulse = 0.6 + Math.sin(time * 3) * 0.25;
  for (const letter of world.letters) {
    if (letter.taken) continue;
    const x = letter.x * TILE;
    const y = letter.y * TILE;
    const glow = ctx.createRadialGradient(x, y, 2, x, y, 30);
    glow.addColorStop(0, `rgba(255, 240, 180, ${0.5 * pulse})`);
    glow.addColorStop(1, 'rgba(255, 240, 180, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(x - 30, y - 30, 60, 60);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.2);
    ctx.fillStyle = '#f2e6c4';
    ctx.fillRect(-11, -8, 22, 16);
    ctx.strokeStyle = '#c0392b';
    ctx.lineWidth = 2;
    ctx.strokeRect(-11, -8, 22, 16);
    ctx.beginPath();
    ctx.moveTo(-11, -8);
    ctx.lineTo(0, 2);
    ctx.lineTo(11, -8);
    ctx.stroke();
    ctx.fillStyle = '#c0392b';
    ctx.beginPath();
    ctx.arc(0, 1, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  const exitX = world.exit.x * TILE;
  const exitY = world.exit.y * TILE;
  const open = world.lettersTaken === world.lettersTotal;
  const glow = ctx.createRadialGradient(exitX, exitY, 4, exitX, exitY, 60);
  glow.addColorStop(0, open ? `rgba(80, 255, 140, ${0.55 * pulse})` : 'rgba(120, 130, 120, 0.25)');
  glow.addColorStop(1, 'rgba(80, 255, 140, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(exitX - 60, exitY - 60, 120, 120);
  ctx.fillStyle = open ? '#1f7a44' : '#3a4038';
  ctx.fillRect(exitX - 16, exitY - 18, 32, 36);
  ctx.fillStyle = open ? '#7dffab' : '#6b7268';
  ctx.fillRect(exitX - 16, exitY - 18, 32, 5);
  ctx.fillStyle = open ? '#eafff0' : '#9aa093';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(open ? 'EXIT' : 'LOCKED', exitX, exitY + 30);
}

function drawGuard(ctx, guard) {
  ctx.fillStyle = '#8e2f2f';
  ctx.beginPath();
  ctx.arc(guard.x, guard.y, guard.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#d8b25c';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(guard.x, guard.y, guard.radius - 3, guard.direction - 1.1, guard.direction + 1.1);
  ctx.stroke();
  // Helmet brim and facing tick.
  ctx.fillStyle = '#5c1d1d';
  ctx.beginPath();
  ctx.arc(guard.x + Math.cos(guard.direction) * 6, guard.y + Math.sin(guard.direction) * 6, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffd76a';
  ctx.beginPath();
  ctx.arc(guard.x + Math.cos(guard.direction) * (guard.radius - 2), guard.y + Math.sin(guard.direction) * (guard.radius - 2), 2.5, 0, Math.PI * 2);
  ctx.fill();
  if (guard.state === GUARD_STATE.CHASE || guard.state === GUARD_STATE.SUSPICIOUS || guard.suspicion > 30) {
    const mark = guard.state === GUARD_STATE.CHASE ? '!' : '?';
    const color = guard.state === GUARD_STATE.CHASE ? '#ff4040' : '#ffd76a';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = color;
    ctx.fillText(mark, guard.x, guard.y - guard.radius - 8);
  }
}

function drawPlayer(ctx, world) {
  const player = world.player;
  const glow = ctx.createRadialGradient(player.x, player.y, 2, player.x, player.y, 44);
  glow.addColorStop(0, 'rgba(90, 220, 200, 0.25)');
  glow.addColorStop(1, 'rgba(90, 220, 200, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(player.x - 44, player.y - 44, 88, 88);
  ctx.fillStyle = '#2fae9e';
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1d7a6e';
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.radius - 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e8f6f2';
  ctx.beginPath();
  ctx.arc(player.x - 4, player.y - 2, 2.2, 0, Math.PI * 2);
  ctx.arc(player.x + 4, player.y - 2, 2.2, 0, Math.PI * 2);
  ctx.fill();
  if (player.hidden) {
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#9be8c8';
    ctx.fillText('HIDDEN', player.x, player.y - player.radius - 8);
  }
}

function drawNoiseRings(ctx, world) {
  if (world.noise.timer > 0) {
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.5 * (world.noise.timer / 0.4)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(world.noise.x, world.noise.y, world.noise.radius, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (const pebble of world.pebblesThrown) {
    ctx.fillStyle = '#cfd6e4';
    ctx.beginPath();
    ctx.arc(pebble.x, pebble.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawHud(ctx, world, ui) {
  ctx.fillStyle = 'rgba(8, 10, 18, 0.82)';
  ctx.fillRect(0, 0, VIEW_WIDTH, 52);
  ctx.fillStyle = '#e8ecf4';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(world.level.name, 14, 22);
  ctx.font = '14px sans-serif';
  ctx.fillStyle = '#aab4c8';
  ctx.fillText(world.level.brief, 14, 42);
  // Objective: letters.
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffe9a8';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText(`Letters ${world.lettersTaken}/${world.lettersTotal}`, 640, 22);
  ctx.fillStyle = '#aab4c8';
  ctx.font = '14px sans-serif';
  ctx.fillText(`Pebbles ${world.pebbles}  ·  Lives ${'♥'.repeat(ui.lives)}  ·  ${formatTime(world.time)}`, 640, 42);
  // Detection meter.
  const detection = world.detection;
  const meterX = 680;
  const meterWidth = 300;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#aab4c8';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText(world.alarm ? 'ALARM!' : 'DETECTION', meterX, 22);
  ctx.fillStyle = '#222838';
  ctx.fillRect(meterX, 28, meterWidth, 12);
  const color = detection >= 100 ? '#ff4040' : detection > 70 ? '#ff8c3c' : detection > 30 ? '#ffd76a' : '#5ad6a0';
  ctx.fillStyle = color;
  ctx.fillRect(meterX, 28, meterWidth * (detection / 100), 12);
  ctx.strokeStyle = '#4a5478';
  ctx.strokeRect(meterX, 28, meterWidth, 12);
  // Controls hint, on its own strip along the bottom so it never collides
  // with the detection meter.
  ctx.fillStyle = 'rgba(8, 10, 18, 0.82)';
  ctx.fillRect(0, VIEW_HEIGHT - 20, VIEW_WIDTH, 20);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#7c86a0';
  ctx.font = '12px sans-serif';
  ctx.fillText('WASD / arrows move · Shift run (loud) · Click / Space throw a pebble · P pause · M mute', VIEW_WIDTH / 2, VIEW_HEIGHT - 6);
  if (ui.message) {
    ctx.textAlign = 'center';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillStyle = '#ffe9a8';
    ctx.fillText(ui.message, VIEW_WIDTH / 2, 92);
  }
}

export function formatTime(seconds) {
  const total = Math.floor(seconds);
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${minutes}:${String(rest).padStart(2, '0')}`;
}

function drawVignette(ctx) {
  const gradient = ctx.createRadialGradient(VIEW_WIDTH / 2, VIEW_HEIGHT / 2, VIEW_HEIGHT * 0.45, VIEW_WIDTH / 2, VIEW_HEIGHT / 2, VIEW_HEIGHT * 0.85);
  gradient.addColorStop(0, 'rgba(0,0,0,0)');
  gradient.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
}

function overlayPanel(ctx, title, lines, hint) {
  ctx.fillStyle = 'rgba(6, 8, 16, 0.78)';
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffe9a8';
  ctx.font = 'bold 44px sans-serif';
  ctx.fillText(title, VIEW_WIDTH / 2, 250);
  ctx.fillStyle = '#e8ecf4';
  ctx.font = '19px sans-serif';
  lines.forEach((line, index) => {
    ctx.fillText(line, VIEW_WIDTH / 2, 300 + index * 30);
  });
  if (hint) {
    ctx.fillStyle = '#aab4c8';
    ctx.font = '16px sans-serif';
    ctx.fillText(hint, VIEW_WIDTH / 2, 300 + lines.length * 30 + 30);
  }
}

/** Draw the whole frame for the current screen. */
export function render(ctx, world, screen, ui) {
  ctx.clearRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  drawFloor(ctx, world);
  drawLampPools(ctx, world);
  for (const guard of world.guards) drawVisionCone(ctx, guard, world);
  drawLettersAndExit(ctx, world, ui.time);
  drawHedges(ctx, world, false);
  drawWallsAndCover(ctx, world);
  drawPlayer(ctx, world);
  for (const guard of world.guards) drawGuard(ctx, guard);
  drawHedges(ctx, world, true);
  drawNoiseRings(ctx, world);
  drawVignette(ctx);
  drawHud(ctx, world, ui);

  if (screen === SCREENS.TITLE) {
    overlayPanel(ctx, 'MOONLIT COURIER', [
      'Wren, courier of the Night Post, must slip through the Old Archive.',
      'Pocket every sealed letter, then reach the green exit door — unseen.',
      'Wardens patrol with lanterns. Their cones are their eyes: stay out of them,',
      'hide in the hedges, and throw a pebble (click) to pull a guard away.',
      'Walk quietly. Running is loud. A full detection meter raises the alarm.',
    ], 'Press Enter or click to begin  ·  WASD / arrows to move');
  } else if (screen === SCREENS.LEVEL_DONE) {
    overlayPanel(ctx, 'LEVEL CLEAR', [
      `${world.level.name} — all letters delivered.`,
      `Time ${formatTime(world.time)}  ·  Pebbles left ${world.pebbles}`,
    ], 'Press Enter for the next level');
  } else if (screen === SCREENS.CAUGHT) {
    overlayPanel(ctx, 'CAUGHT!', [
      'A warden laid hands on the courier. The letters scatter —',
      'but the Night Post always tries again.',
    ], `Press Enter to retry the level  ·  Lives left: ${ui.lives}`);
  } else if (screen === SCREENS.VICTORY) {
    overlayPanel(ctx, 'ALL LETTERS DELIVERED', [
      'Wren slips out into the moonlight, satchel empty, unseen to the last.',
      `Total time ${formatTime(ui.totalTime)}  ·  Thank you for playing.`,
    ], 'Press Enter to play again');
  } else if (screen === SCREENS.GAME_OVER) {
    overlayPanel(ctx, 'THE POST FAILS', [
      'Three times caught, and the archive keeps its letters tonight.',
    ], 'Press Enter to start over');
  }
}
