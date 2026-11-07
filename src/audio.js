const MUTE_KEY = 'gooning.muted';

export class Sfx {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.noiseBuffer = null;
    this.muted = false;
    try { this.muted = localStorage.getItem(MUTE_KEY) === '1'; } catch (e) { /* ignore */ }
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.knee.value = 20;
    comp.ratio.value = 8;
    comp.attack.value = 0.004;
    comp.release.value = 0.22;
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.5;
    comp.connect(this.master);
    this.master.connect(this.ctx.destination);

    // shared noise buffer
    const len = Math.floor(this.ctx.sampleRate * 1.2);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    this.noiseBuffer = buf;
    this.bus = comp;
  }

  resume() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
  }

  setMuted(m) {
    this.muted = !!m;
    try { localStorage.setItem(MUTE_KEY, this.muted ? '1' : '0'); } catch (e) { /* ignore */ }
    if (this.master && this.ctx) {
      const t = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(t);
      this.master.gain.linearRampToValueAtTime(this.muted ? 0 : 0.5, t + 0.12);
    }
  }

  tone({ freq = 440, to = null, type = 'sine', dur = 0.2, vol = 0.2, delay = 0, attack = 0.006 }) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, freq), t0);
    if (to !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(this.bus || this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.06);
  }

  noise({ dur = 0.25, vol = 0.25, from = 2400, to = 300, q = 1.2, type = 'lowpass', delay = 0 }) {
    if (!this.ctx || this.muted || !this.noiseBuffer) return;
    const t0 = this.ctx.currentTime + delay;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filt = this.ctx.createBiquadFilter();
    filt.type = type;
    filt.Q.value = q;
    filt.frequency.setValueAtTime(from, t0);
    filt.frequency.exponentialRampToValueAtTime(Math.max(40, to), t0 + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filt);
    filt.connect(g);
    g.connect(this.bus || this.master);
    src.start(t0);
    src.stop(t0 + dur + 0.03);
  }

  click() {
    this.init();
    this.tone({ freq: 620, to: 880, type: 'triangle', dur: 0.07, vol: 0.12 });
  }

  pickup(step = 0) {
    const semis = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
    const st = semis[Math.min(step, semis.length - 1)];
    const f = 523.25 * Math.pow(2, st / 12);
    this.tone({ freq: f, to: f * 1.02, type: 'triangle', dur: 0.14, vol: 0.16 });
    this.tone({ freq: f * 2, to: f * 2.04, type: 'sine', dur: 0.1, vol: 0.07, delay: 0.012 });
  }

  mega() {
    this.init();
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    notes.forEach((f, i) => {
      this.tone({ freq: f, type: 'triangle', dur: 0.22, vol: 0.14, delay: i * 0.055 });
      this.tone({ freq: f * 2, type: 'sine', dur: 0.16, vol: 0.05, delay: i * 0.055 + 0.01 });
    });
    this.noise({ dur: 0.4, vol: 0.08, from: 6000, to: 2000, type: 'bandpass' });
  }

  dash() {
    this.init();
    this.noise({ dur: 0.22, vol: 0.22, from: 900, to: 3800, type: 'bandpass', q: 0.9 });
    this.tone({ freq: 180, to: 90, type: 'sawtooth', dur: 0.16, vol: 0.08 });
  }

  slam() {
    this.init();
    this.noise({ dur: 0.24, vol: 0.3, from: 1800, to: 160, type: 'lowpass', q: 0.7 });
    this.tone({ freq: 140, to: 54, type: 'square', dur: 0.2, vol: 0.16 });
    this.tone({ freq: 320, to: 90, type: 'triangle', dur: 0.12, vol: 0.08 });
  }

  hit() {
    this.init();
    this.noise({ dur: 0.32, vol: 0.36, from: 1200, to: 90, type: 'lowpass', q: 1 });
    this.tone({ freq: 110, to: 40, type: 'square', dur: 0.3, vol: 0.22 });
    this.tone({ freq: 220, to: 60, type: 'sawtooth', dur: 0.22, vol: 0.1 });
  }

  wave() {
    this.init();
    this.tone({ freq: 196, to: 196, type: 'sawtooth', dur: 0.26, vol: 0.1 });
    this.tone({ freq: 293.66, type: 'triangle', dur: 0.3, vol: 0.12, delay: 0.14 });
    this.tone({ freq: 392, type: 'triangle', dur: 0.34, vol: 0.1, delay: 0.28 });
  }

  refill() {
    this.tone({ freq: 880, to: 1320, type: 'sine', dur: 0.09, vol: 0.06 });
  }

  over() {
    this.init();
    const notes = [392, 329.63, 261.63, 196, 130.81];
    notes.forEach((f, i) => {
      this.tone({ freq: f, type: 'sawtooth', dur: 0.42, vol: 0.09, delay: i * 0.13 });
      this.tone({ freq: f / 2, type: 'sine', dur: 0.5, vol: 0.13, delay: i * 0.13 });
    });
    this.noise({ dur: 1.1, vol: 0.1, from: 900, to: 60, type: 'lowpass' });
  }
}
