import * as THREE from '../vendor/three.module.js';

export const TAU = Math.PI * 2;
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));
export const rnd = (a = 0, b = 1) => a + Math.random() * (b - a);
export const rndInt = (a, b) => Math.floor(rnd(a, b + 1));
export const pick = (arr) => arr[(Math.random() * arr.length) | 0];
export const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
export const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
export const easeOutBack = (t) => {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

let _glowTex = null;
export function glowTexture() {
  if (_glowTex) return _glowTex;
  const size = 128;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.18, 'rgba(255,255,255,0.85)');
  g.addColorStop(0.45, 'rgba(255,255,255,0.32)');
  g.addColorStop(0.72, 'rgba(255,255,255,0.08)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  _glowTex = new THREE.CanvasTexture(c);
  _glowTex.colorSpace = THREE.SRGBColorSpace;
  return _glowTex;
}

let _softTex = null;
export function softTexture() {
  if (_softTex) return _softTex;
  const size = 64;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.85)');
  g.addColorStop(0.75, 'rgba(255,255,255,0.18)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  _softTex = new THREE.CanvasTexture(c);
  _softTex.colorSpace = THREE.SRGBColorSpace;
  return _softTex;
}

export function makeArenaTexture() {
  const size = 1024;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');

  // base
  const bg = ctx.createRadialGradient(size * 0.5, size * 0.46, size * 0.05, size * 0.5, size * 0.5, size * 0.55);
  bg.addColorStop(0, '#14322c');
  bg.addColorStop(0.45, '#0f2a26');
  bg.addColorStop(0.8, '#0a1d1d');
  bg.addColorStop(1, '#071317');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);

  // mottled goo stains
  for (let i = 0; i < 460; i++) {
    const a = Math.random() * TAU;
    const r = Math.sqrt(Math.random()) * size * 0.49;
    const x = size / 2 + Math.cos(a) * r;
    const y = size / 2 + Math.sin(a) * r;
    const rad = 6 + Math.random() * 54;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    const hue = 120 + Math.random() * 50;
    const light = 12 + Math.random() * 18;
    const flip = Math.random();
    const col = flip > 0.55 ? `hsla(${hue}, 55%, ${light}%, 0.30)` : `hsla(190, 40%, ${light}%, 0.20)`;
    g.addColorStop(0, col);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, TAU);
    ctx.fill();
  }

  // concentric ritual rings
  ctx.strokeStyle = 'rgba(80,255,170,0.10)';
  for (const rr of [0.16, 0.32, 0.45, 0.475]) {
    ctx.lineWidth = rr > 0.46 ? 3 : 2;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size * rr, 0, TAU);
    ctx.stroke();
  }
  // tick marks on outer ring
  ctx.strokeStyle = 'rgba(100,255,180,0.14)';
  ctx.lineWidth = 3;
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * TAU;
    const r1 = size * 0.468;
    const r2 = size * (i % 4 === 0 ? 0.485 : 0.478);
    ctx.beginPath();
    ctx.moveTo(size / 2 + Math.cos(a) * r1, size / 2 + Math.sin(a) * r1);
    ctx.lineTo(size / 2 + Math.cos(a) * r2, size / 2 + Math.sin(a) * r2);
    ctx.stroke();
  }

  // bright center pad
  const pad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size * 0.09);
  pad.addColorStop(0, 'rgba(150,255,110,0.20)');
  pad.addColorStop(0.7, 'rgba(120,255,140,0.05)');
  pad.addColorStop(1, 'rgba(120,255,140,0)');
  ctx.fillStyle = pad;
  ctx.fillRect(0, 0, size, size);

  // speckles
  for (let i = 0; i < 900; i++) {
    const a = Math.random() * TAU;
    const r = Math.sqrt(Math.random()) * size * 0.49;
    ctx.fillStyle = `rgba(180,255,200,${0.02 + Math.random() * 0.07})`;
    ctx.fillRect(size / 2 + Math.cos(a) * r, size / 2 + Math.sin(a) * r, 1.5, 1.5);
  }

  // dark rim vignette
  const rim = ctx.createRadialGradient(size / 2, size / 2, size * 0.36, size / 2, size / 2, size * 0.5);
  rim.addColorStop(0, 'rgba(0,0,0,0)');
  rim.addColorStop(1, 'rgba(0,0,0,0.72)');
  ctx.fillStyle = rim;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function makeTextSprite(text, opts = {}) {
  const {
    fontSize = 64,
    color = '#ffffff',
    weight = 900,
    font = 'Arial Black, Arial, sans-serif',
    padding = 24,
  } = opts;
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d');
  ctx.font = `${weight} ${fontSize}px ${font}`;
  const w = Math.ceil(ctx.measureText(text).width + padding * 2);
  const h = fontSize + padding * 2;
  c.width = w;
  c.height = h;
  const ctx2 = c.getContext('2d');
  ctx2.font = `${weight} ${fontSize}px ${font}`;
  ctx2.textAlign = 'center';
  ctx2.textBaseline = 'middle';
  ctx2.fillStyle = color;
  ctx2.shadowColor = color;
  ctx2.shadowBlur = fontSize * 0.35;
  ctx2.fillText(text, w / 2, h / 2);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(w / h * 1.2, 1.2, 1);
  return sprite;
}
