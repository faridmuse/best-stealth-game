// Entry point for Moonlit Courier: the game loop, screen flow, HUD state and
// sound triggers. Shot mode (?shot=1..4) stages one fixed scene and renders
// it without stepping, for screenshots.
import { SCREENS, STEP, TILE, VIEW_HEIGHT, VIEW_WIDTH } from './config.js';
import { SoundEngine } from './audio.js';
import { Input } from './input.js';
import { render } from './render.js';
import { stageShot } from './shots.js';
import { WORLD_EVENT, World } from './world.js';

const canvas = document.getElementById('game');
const statusLine = document.getElementById('status');
const ctx = canvas.getContext('2d');
canvas.width = VIEW_WIDTH;
canvas.height = VIEW_HEIGHT;

const input = new Input(canvas);
const sound = new SoundEngine();
const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');

let world = new World(0);
let screen = SCREENS.TITLE;
let lives = 3;
let totalTime = 0;
let message = '';
let messageTimer = 0;
let lastTick = 0;
let facing = { x: 1, y: 0 };
let paused = false;
let shotMessage = '';

if (shotName) {
  const staged = stageShot(shotName);
  world = staged.world;
  screen = staged.screen;
  shotMessage = staged.message;
}

input.onAnyKey = () => sound.ensure();
input.onPause = () => {
  if (screen === SCREENS.PLAY) paused = !paused;
};
input.onMute = () => {
  sound.ensure();
  message = sound.toggleMute() ? 'Muted' : 'Sound on';
  messageTimer = 1.5;
};

function setStatus(text) {
  statusLine.textContent = text;
}

function startLevel(index) {
  world = new World(index);
  screen = SCREENS.PLAY;
  paused = false;
  message = '';
  setStatus(`${world.level.name}. ${world.level.brief}`);
}

function advance() {
  sound.ensure();
  if (screen === SCREENS.TITLE) {
    lives = 3;
    totalTime = 0;
    startLevel(0);
  } else if (screen === SCREENS.LEVEL_DONE) {
    if (world.levelIndex + 1 < 3) startLevel(world.levelIndex + 1);
    else screen = SCREENS.VICTORY;
  } else if (screen === SCREENS.CAUGHT) {
    if (lives > 0) startLevel(world.levelIndex);
    else screen = SCREENS.GAME_OVER;
  } else if (screen === SCREENS.VICTORY || screen === SCREENS.GAME_OVER) {
    lives = 3;
    totalTime = 0;
    startLevel(0);
  }
}

window.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && screen !== SCREENS.PLAY) advance();
});
canvas.addEventListener('mousedown', () => {
  if (screen !== SCREENS.PLAY) advance();
});

function handleEvents(events) {
  for (const event of events) {
    if (event === WORLD_EVENT.LETTER) {
      sound.pickup();
      message = `Letter pocketed — ${world.lettersTaken}/${world.lettersTotal}`;
      messageTimer = 1.6;
    } else if (event === WORLD_EVENT.PEBBLE) {
      sound.pebble();
    } else if (event === WORLD_EVENT.ALARM) {
      sound.alarm();
      message = 'ALARM! Break line of sight!';
      messageTimer = 2;
    } else if (event === WORLD_EVENT.CAUGHT) {
      sound.caught();
      lives -= 1;
      totalTime += world.time;
      screen = lives > 0 ? SCREENS.CAUGHT : SCREENS.GAME_OVER;
      setStatus(lives > 0 ? 'Caught by a warden.' : 'Game over. The archive keeps its letters.');
    } else if (event === WORLD_EVENT.LEVEL_DONE) {
      sound.levelClear();
      totalTime += world.time;
      if (world.levelIndex + 1 < 3) screen = SCREENS.LEVEL_DONE;
      else screen = SCREENS.VICTORY;
      setStatus('Level clear. All letters delivered.');
    }
  }
}

let lastTime = performance.now();

/** One animation frame: step the world, then draw it. */
function frame(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;

  if (!shotName && screen === SCREENS.PLAY && !paused) {
    const move = input.moveVector();
    if (Math.hypot(move.x, move.y) > 0.1) {
      facing = { x: move.x / Math.hypot(move.x, move.y), y: move.y / Math.hypot(move.x, move.y) };
    }
    const throwTarget = input.takePebbleThrow();
    let throwPoint = null;
    if (throwTarget === 'ahead') {
      throwPoint = { x: world.player.x + facing.x * 190, y: world.player.y + facing.y * 190 };
    } else if (throwTarget) {
      throwPoint = { x: throwTarget.x, y: throwTarget.y };
    }
    const events = world.step(dt, move, input.runHeld, throwPoint);
    if (world.player.moving) sound.footstep(world.player.running);
    if (world.detection > 50 && now - lastTick > 500) {
      lastTick = now;
      sound.suspicionTick(world.detection / 100);
    }
    handleEvents(events);
  }
  if (messageTimer > 0) messageTimer -= dt;

  render(ctx, world, screen, {
    lives,
    totalTime,
    time: performance.now() / 1000,
    message: shotName ? shotMessage : messageTimer > 0 ? message : paused ? 'Paused — press P to resume' : '',
  });
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
