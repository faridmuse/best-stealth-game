// Synthesised sound for Moonlit Courier: every sound is built with the
// Web Audio API, so the game needs no audio files and stays fully offline.
export class SoundEngine {
  constructor() {
    this.context = null;
    this.muted = false;
    this.master = null;
    this.stepTimer = 0;
  }

  /** Create the audio context on the first user gesture (browsers require one). */
  ensure() {
    if (!this.context) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.context.destination);
    }
    if (this.context.state === 'suspended') void this.context.resume();
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.5;
    return this.muted;
  }

  /** A short tone with a pitch slide, the building block of every effect. */
  tone(frequency, endFrequency, duration, type, volume, when = 0) {
    if (!this.context || this.muted) return;
    const start = this.context.currentTime + when;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), start + duration);
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    oscillator.connect(gain);
    gain.connect(this.master);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }

  /** A soft filtered-noise footstep; called while the player walks. */
  footstep(running) {
    if (!this.context || this.muted) return;
    const now = this.context.currentTime;
    if (now - this.stepTimer < (running ? 0.24 : 0.38)) return;
    this.stepTimer = now;
    const duration = 0.07;
    const buffer = this.context.createBuffer(1, this.context.sampleRate * duration, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = running ? 900 : 500;
    const gain = this.context.createGain();
    gain.gain.value = running ? 0.22 : 0.12;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    source.start(now);
  }

  pickup() {
    this.tone(880, 880, 0.09, 'sine', 0.25);
    this.tone(1318, 1318, 0.14, 'sine', 0.22, 0.08);
  }

  pebble() {
    this.tone(1400, 500, 0.08, 'square', 0.12);
    this.tone(300, 180, 0.12, 'triangle', 0.18, 0.12);
  }

  /** The alarm sting: two rising notes when a guard spots the player fully. */
  alarm() {
    this.tone(220, 440, 0.22, 'sawtooth', 0.2);
    this.tone(330, 660, 0.22, 'sawtooth', 0.2, 0.2);
  }

  /** A low thud when a guard catches the player. */
  caught() {
    this.tone(160, 50, 0.4, 'sawtooth', 0.3);
    this.tone(90, 40, 0.5, 'triangle', 0.3, 0.05);
  }

  /** A small rising arpeggio when a level is cleared. */
  levelClear() {
    [523, 659, 784, 1046].forEach((frequency, index) => {
      this.tone(frequency, frequency, 0.16, 'sine', 0.22, index * 0.11);
    });
  }

  /** A soft tick that grows urgent as suspicion climbs past half. */
  suspicionTick(level) {
    if (level < 0.5) return;
    this.tone(1200, 1200, 0.05, 'square', 0.06 + level * 0.08);
  }
}
