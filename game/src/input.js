// Keyboard and mouse input for Moonlit Courier. WASD or arrows move, Shift
// runs, Space or a mouse click throws a pebble, P pauses, M mutes.
export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.click = null;
    this.onPause = null;
    this.onMute = null;
    this.onAnyKey = null;
    window.addEventListener('keydown', (event) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) event.preventDefault();
      if (event.repeat) return;
      this.keys.add(event.key.toLowerCase());
      if (event.key.toLowerCase() === 'p' && this.onPause) this.onPause();
      if (event.key.toLowerCase() === 'm' && this.onMute) this.onMute();
      if (this.onAnyKey) this.onAnyKey();
    });
    window.addEventListener('keyup', (event) => {
      this.keys.delete(event.key.toLowerCase());
    });
    window.addEventListener('blur', () => this.keys.clear());
    canvas.addEventListener('mousedown', (event) => {
      const rect = canvas.getBoundingClientRect();
      this.click = {
        x: ((event.clientX - rect.left) / rect.width) * canvas.width,
        y: ((event.clientY - rect.top) / rect.height) * canvas.height,
      };
      if (this.onAnyKey) this.onAnyKey();
    });
  }

  /** Movement vector from the held keys, -1..1 on each axis. */
  moveVector() {
    let x = 0;
    let y = 0;
    if (this.keys.has('a') || this.keys.has('arrowleft')) x -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) x += 1;
    if (this.keys.has('w') || this.keys.has('arrowup')) y -= 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) y += 1;
    return { x, y };
  }

  get runHeld() {
    return this.keys.has('shift');
  }

  get pebbleKeyHeld() {
    return this.keys.has(' ');
  }

  /** Take the queued mouse click, if any, and clear it. */
  takeClick() {
    const click = this.click;
    this.click = null;
    return click;
  }

  /** Take a queued pebble throw: Space key or mouse click. */
  takePebbleThrow() {
    if (this.pebbleKeyHeld) return 'ahead';
    return this.takeClick();
  }
}
