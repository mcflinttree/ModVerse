export class AudioManager {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.buffers = new Map(); // key -> AudioBuffer (from mods)
    this.musicSource = null;
    this._unlocked = false;
    const unlock = () => this._ensureContext();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('touchstart', unlock, { once: true });
  }

  _ensureContext() {
    if (this._unlocked) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.6;
    this.masterGain.connect(this.ctx.destination);
    this._unlocked = true;
  }

  setVolume(v) { if (this.masterGain) this.masterGain.gain.value = Math.max(0, Math.min(1, v)); }

  /** Simple synthesized blip/tone SFX so the engine has audio feedback with zero binary assets */
  playTone({ freq = 440, duration = 0.12, type = 'sine', gain = 0.3 } = {}) {
    if (!this._unlocked) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.value = gain;
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    osc.connect(g).connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  playSfx(name) {
    const presets = {
      step: { freq: 180, duration: 0.06, type: 'square', gain: 0.08 },
      hit: { freq: 120, duration: 0.15, type: 'sawtooth', gain: 0.25 },
      craft: { freq: 660, duration: 0.18, type: 'triangle', gain: 0.2 },
      pickup: { freq: 880, duration: 0.1, type: 'sine', gain: 0.2 },
      ui: { freq: 520, duration: 0.05, type: 'square', gain: 0.12 },
    };
    if (this.buffers.has(name)) return this.playBuffer(name);
    this.playTone(presets[name] || presets.ui);
  }

  /** Register a mod-provided decoded audio sample */
  registerBuffer(key, audioBuffer) { this.buffers.set(key, audioBuffer); }

  async loadFromArrayBuffer(key, arrayBuffer) {
    this._ensureContext();
    const decoded = await this.ctx.decodeAudioData(arrayBuffer);
    this.registerBuffer(key, decoded);
  }

  playBuffer(key, { loop = false, gain = 0.5 } = {}) {
    if (!this._unlocked || !this.buffers.has(key)) return null;
    const src = this.ctx.createBufferSource();
    src.buffer = this.buffers.get(key);
    src.loop = loop;
    const g = this.ctx.createGain();
    g.gain.value = gain;
    src.connect(g).connect(this.masterGain);
    src.start();
    return src;
  }
}
