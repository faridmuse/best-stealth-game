// Level layouts for Moonlit Courier. Each level is an ASCII map, one character
// per tile:
//   # wall (solid, blocks sight)   C crate (solid, blocks sight)
//   B bookshelf (solid, blocks sight)   H hedge (walkable, hides the player)
//   o lamp post (decor, a pool of warm light)   . open floor
//   P player start   L a sealed letter to collect   E the exit door
// .uards are listed separately with their patrol waypoints in tile coordinates.
import { COLS, ROWS } from './config.js';

const LEVEL_1_MAP = [
  '################################',
  '#P.....C..........#......L.....#',
  '#................#.............#',
  '#..####..........#..C..........#',
  '#..####......L...#.............#',
  '#................#....L........#',
  '#......C....######.....###.....#',
  '#..............................#',
  '#..H..H..............C.........#',
  '#..............................#',
  '#....L..........#....####......#',
  '#..............#....#..........#',
  '#..C...........#....#....C.....#',
  '#..............#....#..........#',
  '#......H.......#....#....L.....#',
  '#..............#....#..........#',
  '#.........................E....#',
  '################################',
];

const LEVEL_2_MAP = [
  '################################',
  '#P....B.......#........L.......#',
  '#............#.................#',
  '#..C......L..#...####....C.....#',
  '#............#...#.............#',
  '#....####....#...#....L........#',
  '#....####....#...#.............#',
  '#............#...#..C....###...#',
  '#................#.............#',
  '#......C.....######....L.......#',
  '#..............................#',
  '#..H..H...........C.....##.....#',
  '#.....................##.......#',
  '#....L....####.....L....##.....#',
  '#........####..................#',
  '#..C.................C.........#',
  '#.........................E....#',
  '################################',
];

const LEVEL_3_MAP = [
  '################################',
  '#P...C....#......L.....#.......#',
  '#.........#............#....L..#',
  '#..####...#..C.........#.......#',
  '#..####...#............#.......#',
  '#.........#....L.......#.......#',
  '#.........#............####....#',
  '#.........#....................#',
  '#..H..H...######....C......L...#',
  '#..............................#',
  '#....C...................##....#',
  '#..............#.........##....#',
  '#..L....####...#....C....##....#',
  '#......####....#...............#',
  '#.............#..........L.....#',
  '#..H......C...#................#',
  '#.........................E....#',
  '################################',
];

export const LEVELS = [
  {
    name: 'Level 1 — The Quiet Stacks',
    brief: 'Collect 5 sealed letters, then slip out the green door unseen.',
    map: LEVEL_1_MAP,
    guards: [
      { x: 18, y: 8, speed: 55, path: [[18, 8], [26, 8], [26, 12], [18, 12]] },
      { x: 12, y: 12, speed: 55, path: [[12, 12], [12, 8], [6, 8], [6, 12]] },
    ],
  },
  {
    name: 'Level 2 — The Lamp .allery',
    brief: 'Six letters, three wardens, and lamps that leave nowhere to hide.',
    map: LEVEL_2_MAP,
    guards: [
      { x: 4, y: 8, speed: 62, path: [[4, 8], [12, 8], [12, 4], [4, 4]] },
      { x: 13, y: 11, speed: 62, path: [[13, 11], [22, 11], [22, 15], [13, 15]] },
      { x: 29, y: 4, speed: 70, path: [[29, 4], [29, 12], [24, 12], [24, 4]] },
    ],
  },
  {
    name: 'Level 3 — The Vault Door',
    brief: 'Six letters. The vault wardens walk fast and watch far.',
    map: LEVEL_3_MAP,
    guards: [
      { x: 5, y: 6, speed: 72, path: [[5, 6], [11, 6], [11, 2], [5, 2]] },
      { x: 28, y: 3, speed: 72, path: [[28, 3], [28, 9], [22, 9], [22, 3]] },
      { x: 16, y: 10, speed: 78, path: [[16, 10], [24, 10], [24, 14], [16, 14]] },
      { x: 19, y: 14, speed: 66, path: [[19, 14], [19, 10], [24, 14], [24, 10]] },
    ],
  },
];

/** Parse one ASCII map into walls, cover, hedges, lamps, letters and the spawn points. */
export function parseLevel(level) {
  const walls = [];
  const crates = [];
  const shelves = [];
  const hedges = [];
  const lamps = [];
  const letters = [];
  let player = { x: 1.5, y: 1.5 };
  let exit = { x: COLS - 2.5, y: ROWS - 2.5 };
  for (let row = 0; row < ROWS; row += 1) {
    const line = level.map[row] ?? '';
    for (let col = 0; col < COLS; col += 1) {
      const ch = line[col] ?? '#';
      const cx = col + 0.5;
      const cy = row + 0.5;
      if (ch === '#') walls.push({ col, row });
      else if (ch === 'C') crates.push({ col, row });
      else if (ch === 'B') shelves.push({ col, row });
      else if (ch === 'H') hedges.push({ col, row });
      else if (ch === 'o') lamps.push({ col, row });
      else if (ch === 'L') letters.push({ x: cx, y: cy, taken: false });
      else if (ch === 'P') player = { x: cx, y: cy };
      else if (ch === 'E') exit = { x: cx, y: cy };
    }
  }
  return { walls, crates, shelves, hedges, lamps, letters, player, exit };
}
