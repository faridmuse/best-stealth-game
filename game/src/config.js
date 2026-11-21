// Shared constants for Moonlit Courier: tile size, speeds, detection tuning.
// Every number that shapes how the game feels lives here, so levels and guards
// only describe layout and patrols.
export const TILE = 40;
export const COLS = 32;
export const ROWS = 18;
export const VIEW_WIDTH = COLS * TILE;
export const VIEW_HEIGHT = ROWS * TILE;

// Player movement: walk is quiet, run is fast but loud.
export const PLAYER_RADIUS = 13;
export const WALK_SPEED = 175;
export const RUN_SPEED = 265;
export const NOISE_RADIUS_WALK = 0;
export const NOISE_RADIUS_RUN = 130;

// Guard senses.
export const GUARD_RADIUS = 13;
export const GUARD_VIEW_RANGE = 270;
export const GUARD_VIEW_HALF_ANGLE = 0.61; // ~35 degrees each side
export const SUSPICION_RISE_PER_SECOND = 60;
export const SUSPICION_RISE_CLOSE_PER_SECOND = 95;
export const SUSPICION_FALL_PER_SECOND = 26;
export const ALARM_SECONDS = 4;
export const SEARCH_SECONDS = 5;

// Pebbles: click to throw one; the nearest guard investigates the landing spot.
export const PEBBLE_MAX = 3;
export const PEBBLE_NOISE_RADIUS = 170;

export const STEP = 1 / 60;

export const SCREENS = {
  TITLE: 'title',
  PLAY: 'play',
  LEVEL_DONE: 'level_done',
  CAUGHT: 'caught',
  VICTORY: 'victory',
  GAME_OVER: 'game_over',
};
