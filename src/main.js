import * as THREE from '../vendor/three.module.js';
import { FX } from './fx.js';
import { Sfx } from './audio.js';
import { damp, rnd, pick, TAU, makeArenaTexture } from './util.js';

const $ = (id) => document.getElementById(id);
const ui = {
  canvas: $('game'), title: $('titleScreen'), pause: $('pauseScreen'), over: $('overScreen'),
  hud: $('hud'), controls: $('controls'), score: $('score'), best: $('bestScore'), bestInline: $('bestInline'),
  hearts: $('hearts'), wave: $('wave'), combo: $('combo'), comboMult: $('comboMult'), announce: $('announce'),
  dash: $('dashBtn'), pips: [...document.querySelectorAll('#dashPips i')], stick: $('stick'), knob: $('stickKnob'),
  flash: $('damageFlash'), gooFlash: $('gooFlash'),
};
const ARENA = 12.4;
const MAX_LIVES = 3;
const sfx = new Sfx();
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050a10);
scene.fog = new THREE.FogExp2(0x050a10, 0.024);
const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
camera.position.set(0, 25, 30);
camera.lookAt(0, 0, 0);
const renderer = new THREE.WebGLRenderer({ canvas: ui.canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.22;
scene.add(new THREE.HemisphereLight(0xb9ffd9, 0x142125, 2.0));
const keyLight = new THREE.DirectionalLight(0xe4ffd3, 3.2);
keyLight.position.set(-7, 16, 8);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(1024, 1024);
keyLight.shadow.camera.left = -16; keyLight.shadow.camera.right = 16;
keyLight.shadow.camera.top = 16; keyLight.shadow.camera.bottom = -16;
scene.add(keyLight);
const pinkLight = new THREE.PointLight(0xff3d81, 24, 20, 2);
pinkLight.position.set(7, 5, -5); scene.add(pinkLight);
const tealLight = new THREE.PointLight(0x20e9c2, 20, 18, 2);
tealLight.position.set(-8, 4, 4); scene.add(tealLight);
const fx = new FX(scene);

const shared = {
  blobGeo: new THREE.SphereGeometry(1, 32, 24),
  eyeGeo: new THREE.SphereGeometry(0.105, 16, 12),
  pupilGeo: new THREE.SphereGeometry(0.052, 12, 10),
  shadowGeo: new THREE.CircleGeometry(1, 32),
  orbGeo: new THREE.IcosahedronGeometry(0.27, 1),
  ringGeo: new THREE.TorusGeometry(1, 0.045, 8, 64),
};
shared.shadowGeo.rotateX(-Math.PI / 2);
shared.ringGeo.rotateX(Math.PI / 2);
const materials = {
  goo: new THREE.MeshStandardMaterial({ color: 0x9df634, roughness: 0.24, metalness: 0.02 }),
  enemy: [0xff4c82, 0xff9b3d, 0xb47cff, 0x38d8e9].map(color => new THREE.MeshStandardMaterial({ color, roughness: 0.3 })),
  eye: new THREE.MeshStandardMaterial({ color: 0xf6fff0, roughness: 0.22 }),
  pupil: new THREE.MeshStandardMaterial({ color: 0x10201c, roughness: 0.2 }),
};

function makeArena() {
  const floor = new THREE.Mesh(new THREE.CircleGeometry(ARENA, 96), new THREE.MeshStandardMaterial({ map: makeArenaTexture(), roughness: 0.78, metalness: 0.05 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -0.08; floor.receiveShadow = true; scene.add(floor);
  const under = new THREE.Mesh(new THREE.CylinderGeometry(ARENA, ARENA, 0.48, 96), new THREE.MeshStandardMaterial({ color: 0x102320, roughness: 0.5, metalness: 0.25 }));
  under.position.y = -0.34; under.receiveShadow = true; under.castShadow = true; scene.add(under);
  const rim = new THREE.Mesh(shared.ringGeo, new THREE.MeshStandardMaterial({ color: 0x65ef9a, emissive: 0x1c8b45, emissiveIntensity: 1.7, roughness: 0.28, metalness: 0.55 }));
  rim.position.y = 0.04; rim.scale.setScalar(ARENA); scene.add(rim);
  for (let i = 0; i < 32; i++) {
    const a = i / 32 * TAU;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.13, 0.38, 8), new THREE.MeshStandardMaterial({ color: i % 4 === 0 ? 0x54f3c6 : 0x426b5d, emissive: i % 4 === 0 ? 0x0b7056 : 0x071410, emissiveIntensity: 1.2 }));
    post.position.set(Math.cos(a) * (ARENA - 0.18), 0.14, Math.sin(a) * (ARENA - 0.18)); post.castShadow = true; scene.add(post);
  }
  // Little reactor plinths around the edge give the arena a readable scale.
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * TAU + Math.PI / 6;
    const x = Math.cos(a) * 8.9, z = Math.sin(a) * 8.9;
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.72, 0.34, 8), new THREE.MeshStandardMaterial({ color: 0x203a34, roughness: 0.45, metalness: 0.45 }));
    base.position.set(x, 0.12, z); base.castShadow = true; base.receiveShadow = true; scene.add(base);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.52, 0.12, 8), new THREE.MeshStandardMaterial({ color: i % 2 ? 0x2ce8c5 : 0xb8ff3d, emissive: i % 2 ? 0x08745e : 0x5da321, emissiveIntensity: 1.5 }));
    cap.position.set(x, 0.35, z); scene.add(cap);
    const halo = new THREE.Mesh(shared.ringGeo, new THREE.MeshBasicMaterial({ color: i % 2 ? 0x2ce8c5 : 0xb8ff3d, transparent: true, opacity: 0.62 }));
    halo.position.set(x, 0.07, z); halo.scale.setScalar(0.8); scene.add(halo);
  }
  // Distant stars / city-like silhouettes
  for (let i = 0; i < 85; i++) {
    const a = rnd(0, TAU), r = rnd(15, 30);
    const star = new THREE.Mesh(new THREE.SphereGeometry(rnd(0.025, 0.07), 6, 6), new THREE.MeshBasicMaterial({ color: pick([0x59d9b1, 0xff4c82, 0x9df634]), transparent: true, opacity: rnd(0.25, 0.7) }));
    star.position.set(Math.cos(a) * r, rnd(1, 10), Math.sin(a) * r); scene.add(star);
  }
}
makeArena();

function makeBlob(color, isPlayer = false) {
  const group = new THREE.Group();
  const bodyMat = isPlayer ? materials.goo : color;
  const body = new THREE.Mesh(shared.blobGeo, bodyMat);
  body.scale.set(0.64, 0.58, 0.66); body.position.y = 0.62; body.castShadow = true; body.receiveShadow = true; group.add(body);
  const sheen = new THREE.Mesh(new THREE.SphereGeometry(0.34, 20, 16), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.19 }));
  sheen.scale.set(0.9, 0.24, 0.62); sheen.position.set(-0.15, 0.99, 0.21); group.add(sheen);
  for (const x of [-0.205, 0.205]) {
    const eye = new THREE.Mesh(shared.eyeGeo, materials.eye); eye.position.set(x, 0.72, 0.51); eye.scale.set(1, 1.18, 0.68); group.add(eye);
    const pupil = new THREE.Mesh(shared.pupilGeo, materials.pupil); pupil.position.set(x + 0.025, 0.70, 0.568); group.add(pupil);
  }
  const shadow = new THREE.Mesh(shared.shadowGeo, new THREE.MeshBasicMaterial({ color: 0x010b0a, transparent: true, opacity: 0.43, depthWrite: false }));
  shadow.position.y = 0.015; shadow.scale.set(0.92, 0.75, 1); group.add(shadow);
  group.userData.body = body; group.userData.sheen = sheen;
  scene.add(group);
  return group;
}
const player = { mesh: makeBlob(0, true), x: 0, z: 0, vx: 0, vz: 0, facing: new THREE.Vector2(0, -1), dashTime: 0, dashCooldown: 0, charges: 3, invuln: 0, wobble: 0 };
const pickups = [];
const enemies = [];
function makePickup(x, z) {
  const g = new THREE.Group();
  const orb = new THREE.Mesh(shared.orbGeo, new THREE.MeshStandardMaterial({ color: 0xb8ff3d, emissive: 0x5da321, emissiveIntensity: 1.6, roughness: 0.22, metalness: 0.12 }));
  orb.castShadow = true; g.add(orb);
  const ring = new THREE.Mesh(shared.ringGeo, new THREE.MeshBasicMaterial({ color: 0xd8ffa0, transparent: true, opacity: 0.8 })); ring.scale.setScalar(0.47); g.add(ring);
  const glow = new THREE.PointLight(0x9dff3a, 1.1, 2.3); g.add(glow);
  g.position.set(x, 0.74, z); scene.add(g);
  pickups.push({ mesh: g, phase: rnd(0, TAU) });
}
function randomSpot(min = 2.2, max = 9.5) {
  const a = rnd(0, TAU), r = Math.sqrt(rnd(min * min, max * max));
  return { x: Math.cos(a) * r, z: Math.sin(a) * r };
}
function spawnPickup() {
  let p = randomSpot();
  for (let n = 0; n < 8 && Math.hypot(p.x - player.x, p.z - player.z) < 3; n++) p = randomSpot();
  makePickup(p.x, p.z);
}
function spawnEnemy() {
  const edge = rnd(0, TAU), radius = rnd(9.4, 10.7);
  const mesh = makeBlob(pick(materials.enemy));
  mesh.scale.setScalar(rnd(0.88, 1.12));
  mesh.position.set(Math.cos(edge) * radius, 0, Math.sin(edge) * radius);
  enemies.push({ mesh, x: mesh.position.x, z: mesh.position.z, vx: 0, vz: 0, speed: rnd(1.05, 1.5) + Math.min(state.wave * 0.055, 0.55), phase: rnd(0, TAU), stun: 0 });
}

const state = { mode: 'title', score: 0, best: 0, wave: 1, lives: MAX_LIVES, elapsed: 0, combo: 0, comboTimer: 0, spawnTimer: 1.5, pickupTimer: 1.4, waveTimer: 18, announceTimer: 0, time: 0, scoreLabel: '0' };
try { state.best = Number(localStorage.getItem('gooning.best') || 0); } catch {}
ui.best.textContent = state.best;
$('bestInline').textContent = `BEST ${state.best}`;
function setMode(mode) {
  state.mode = mode;
  ui.title.classList.toggle('hidden', mode !== 'title');
  ui.pause.classList.toggle('hidden', mode !== 'pause');
  ui.over.classList.toggle('hidden', mode !== 'over');
  ui.hud.classList.toggle('hidden', mode === 'title' || mode === 'over');
  ui.controls.classList.toggle('hidden', mode !== 'play');
  ui.title.setAttribute('aria-hidden', mode !== 'title');
  ui.pause.setAttribute('aria-hidden', mode !== 'pause');
  ui.over.setAttribute('aria-hidden', mode !== 'over');
  ui.hud.setAttribute('aria-hidden', mode === 'title' || mode === 'over');
  ui.controls.setAttribute('aria-hidden', mode !== 'play');
}
function announce(text, danger = false) {
  ui.announce.textContent = text; ui.announce.classList.toggle('danger', danger); ui.announce.classList.add('show');
  state.announceTimer = 1.3;
}
function updateHearts(lost = false) {
  ui.hearts.innerHTML = '';
  for (let i = 0; i < MAX_LIVES; i++) {
    const el = document.createElement('span'); el.className = `heart${i >= state.lives ? ' empty' : ''}${lost && i === state.lives ? ' lost' : ''}`;
    el.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="fill" d="M12 21s-8.5-5.2-9.6-10.2C1.4 6 4.1 3.3 7.3 3.3c2 0 3.7 1.2 4.7 3 1-1.8 2.7-3 4.7-3 3.2 0 5.9 2.7 4.9 7.5C20.5 15.8 12 21 12 21Z"/><path class="rim" d="M12 21s-8.5-5.2-9.6-10.2C1.4 6 4.1 3.3 7.3 3.3c2 0 3.7 1.2 4.7 3 1-1.8 2.7-3 4.7-3 3.2 0 5.9 2.7 4.9 7.5C20.5 15.8 12 21 12 21Z"/></svg>';
    ui.hearts.appendChild(el);
  }
}
function updateHud() {
  ui.score.textContent = state.score.toLocaleString();
  $('bestInline').textContent = `BEST ${state.best.toLocaleString()}`;
  ui.wave.textContent = state.wave;
  ui.pips.forEach((pip, i) => pip.classList.toggle('on', i < player.charges));
  ui.dash.classList.toggle('no-charge', player.charges <= 0);
  ui.combo.classList.toggle('show', state.combo > 1 && state.comboTimer > 0);
  ui.comboMult.textContent = `x${Math.min(state.combo, 9)}`;
}
function addScore(points) {
  state.score += points * Math.max(1, Math.min(state.combo, 9));
  ui.score.classList.remove('bump'); void ui.score.offsetWidth; ui.score.classList.add('bump');
  if (state.score > state.best) {
    state.best = state.score;
    try { localStorage.setItem('gooning.best', String(state.best)); } catch {}
  }
}
function startGame() {
  sfx.resume(); sfx.click();
  for (const e of enemies) scene.remove(e.mesh);
  for (const p of pickups) scene.remove(p.mesh);
  enemies.length = 0; pickups.length = 0;
  Object.assign(state, { score: 0, wave: 1, lives: MAX_LIVES, elapsed: 0, combo: 0, comboTimer: 0, spawnTimer: 1.2, pickupTimer: 0.8, waveTimer: 18, announceTimer: 0 });
  Object.assign(player, { x: 0, z: 0, vx: 0, vz: 0, dashTime: 0, dashCooldown: 0, charges: 3, invuln: 1.3 });
  player.mesh.position.set(0, 0, 0);
  for (let i = 0; i < 4; i++) spawnPickup();
  spawnEnemy(); spawnEnemy();
  updateHearts(); updateHud(); setMode('play'); announce('GET GOOING!');
  sfx.wave();
}
function endGame() {
  if (state.mode !== 'play') return;
  setMode('over'); sfx.over();
  $('finalScore').textContent = state.score.toLocaleString(); $('finalBest').textContent = state.best.toLocaleString();
  $('finalWave').textContent = state.wave; $('finalTime').textContent = `${Math.floor(state.elapsed)}s`;
  $('newBest').classList.toggle('hidden', state.score < state.best || state.score === 0);
}
function pauseGame() { if (state.mode === 'play') { setMode('pause'); sfx.click(); } }
function resumeGame() { if (state.mode === 'pause') { sfx.resume(); setMode('play'); } }

const input = { x: 0, y: 0, keys: new Set(), pointerId: null, dash: false };
function setStick(x, y) {
  const len = Math.hypot(x, y), scale = len > 1 ? 1 / len : 1;
  input.x = x * scale; input.y = y * scale;
  ui.knob.style.transform = `translate(${input.x * 32}px, ${input.y * 32}px)`;
}
function startStick(ev) {
  if (state.mode !== 'play' || ev.button > 0) return;
  const target = ev.target;
  if (target.closest('button')) return;
  if (ev.clientX > innerWidth * 0.58) return;
  input.pointerId = ev.pointerId;
  ui.stick.style.left = `${ev.clientX}px`; ui.stick.style.top = `${ev.clientY}px`; ui.stick.classList.add('active');
  ui.stick.setPointerCapture?.(ev.pointerId);
  moveStick(ev); ev.preventDefault();
}
function moveStick(ev) {
  if (input.pointerId !== ev.pointerId) return;
  const rect = ui.stick.getBoundingClientRect();
  setStick((ev.clientX - (rect.left + rect.width / 2)) / 42, (ev.clientY - (rect.top + rect.height / 2)) / 42);
}
function endStick(ev) {
  if (input.pointerId !== ev.pointerId) return;
  input.pointerId = null; setStick(0, 0); ui.stick.classList.remove('active');
}
ui.canvas.addEventListener('pointerdown', startStick);
window.addEventListener('pointermove', moveStick);
window.addEventListener('pointerup', endStick);
window.addEventListener('pointercancel', endStick);
function dash() {
  if (state.mode !== 'play' || player.charges <= 0 || player.dashCooldown > 0) return;
  sfx.dash(); player.charges--; player.dashTime = 0.23; player.dashCooldown = 0.48;
  const ix = input.x + (input.keys.has('ArrowRight') || input.keys.has('d') ? 1 : 0) - (input.keys.has('ArrowLeft') || input.keys.has('a') ? 1 : 0);
  const iz = input.y + (input.keys.has('ArrowDown') || input.keys.has('s') ? 1 : 0) - (input.keys.has('ArrowUp') || input.keys.has('w') ? 1 : 0);
  if (Math.hypot(ix, iz) > 0.12) player.facing.set(ix, iz).normalize();
  player.vx = player.facing.x * 17; player.vz = player.facing.y * 17;
  fx.ring(player.x, player.z, 0xb8ff3d, { size: 3.2, dur: 0.35, from: 0.45 });
}
ui.dash.addEventListener('pointerdown', ev => { ev.preventDefault(); ev.stopPropagation(); dash(); ui.dash.classList.add('pressed'); });
ui.dash.addEventListener('pointerup', () => ui.dash.classList.remove('pressed'));
ui.dash.addEventListener('pointercancel', () => ui.dash.classList.remove('pressed'));
window.addEventListener('keydown', ev => {
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(ev.key)) ev.preventDefault();
  input.keys.add(ev.key.toLowerCase());
  if (ev.key === ' ' || ev.key.toLowerCase() === 'shift') dash();
  if (ev.key.toLowerCase() === 'p' || ev.key === 'Escape') state.mode === 'play' ? pauseGame() : resumeGame();
  if (ev.key === 'Enter' && state.mode === 'title') startGame();
});
window.addEventListener('keyup', ev => input.keys.delete(ev.key.toLowerCase()));
$('playBtn').addEventListener('click', startGame);
$('againBtn').addEventListener('click', startGame);
$('restartBtn').addEventListener('click', startGame);
$('resumeBtn').addEventListener('click', resumeGame);
$('pauseBtn').addEventListener('click', pauseGame);
$('quitBtn').addEventListener('click', () => { setMode('title'); sfx.click(); });
$('menuBtn').addEventListener('click', () => setMode('title'));
function toggleSound() {
  sfx.setMuted(!sfx.muted);
  for (const id of ['soundBtnTitle', 'soundBtnPause']) $(id).textContent = `SOUND: ${sfx.muted ? 'OFF' : 'ON'}`;
  sfx.click();
}
$('soundBtnTitle').textContent = `SOUND: ${sfx.muted ? 'OFF' : 'ON'}`;
$('soundBtnPause').textContent = `SOUND: ${sfx.muted ? 'OFF' : 'ON'}`;
$('soundBtnTitle').addEventListener('click', toggleSound);
$('soundBtnPause').addEventListener('click', toggleSound);

function hitPlayer() {
  if (player.invuln > 0 || state.mode !== 'play') return;
  state.lives--; player.invuln = 1.55; player.vx = -player.vx * 0.65; player.vz = -player.vz * 0.65;
  state.combo = 0; state.comboTimer = 0; updateHearts(true); updateHud();
  ui.flash.classList.remove('on'); void ui.flash.offsetWidth; ui.flash.classList.add('on');
  fx.burst(player.x, 0.65, player.z, 0xff3d81, { count: 24, speed: 5.5, size: 1.2, life: 0.7 }); fx.addShake(0.7); sfx.hit();
  announce(state.lives ? 'OUCH!' : 'SPLATTED!', true);
  if (state.lives <= 0) endGame();
}
function defeatEnemy(enemy, index) {
  scene.remove(enemy.mesh); enemies.splice(index, 1);
  state.combo = state.comboTimer > 0 ? state.combo + 1 : 1; state.comboTimer = 2.5;
  addScore(100); fx.burst(enemy.x, 0.7, enemy.z, 0xff5791, { count: 28, speed: 6.8, size: 1.25, life: 0.72 });
  fx.splat(enemy.x, enemy.z, 0xb83268, 1.8); fx.ring(enemy.x, enemy.z, 0xff5791, { size: 3.2, dur: 0.42 }); fx.addShake(0.25); sfx.slam();
  if (state.combo >= 3) { sfx.mega(); announce(`${state.combo}X GOO COMBO!`); }
  updateHud();
}
let elapsedClock = 0;
const clock = new THREE.Clock();
function update(dt) {
  state.time += dt;
  if (state.mode === 'play') {
    state.elapsed += dt; state.waveTimer -= dt;
    if (state.waveTimer <= 0) {
      state.wave++; state.waveTimer = 18; sfx.wave(); announce(`WAVE ${state.wave}`);
      if (state.wave % 2 === 0 && state.lives < MAX_LIVES) { state.lives++; }
      if (state.wave % 3 === 0) { player.charges = Math.min(3, player.charges + 1); }
      updateHearts();
    }
    let ax = input.x + (input.keys.has('arrowright') || input.keys.has('d') ? 1 : 0) - (input.keys.has('arrowleft') || input.keys.has('a') ? 1 : 0);
    let az = input.y + (input.keys.has('arrowdown') || input.keys.has('s') ? 1 : 0) - (input.keys.has('arrowup') || input.keys.has('w') ? 1 : 0);
    const al = Math.hypot(ax, az); if (al > 1) { ax /= al; az /= al; }
    if (al > 0.1) player.facing.set(ax, az).normalize();
    player.dashTime = Math.max(0, player.dashTime - dt); player.dashCooldown = Math.max(0, player.dashCooldown - dt); player.invuln = Math.max(0, player.invuln - dt);
    const speed = player.dashTime > 0 ? 17 : 6.25;
    const friction = player.dashTime > 0 ? 0.5 : 11;
    player.vx = damp(player.vx, ax * speed, friction, dt); player.vz = damp(player.vz, az * speed, friction, dt);
    player.x += player.vx * dt; player.z += player.vz * dt;
    const radius = Math.hypot(player.x, player.z);
    if (radius > ARENA - 1) { const f = (ARENA - 1) / radius; player.x *= f; player.z *= f; player.vx *= -0.25; player.vz *= -0.25; }
    player.mesh.position.set(player.x, 0, player.z);
    player.mesh.rotation.y = Math.atan2(player.facing.x, player.facing.y);
    player.wobble += dt * (player.dashTime > 0 ? 18 : 8);
    const b = player.mesh.userData.body; b.scale.y = 0.58 + Math.sin(player.wobble) * 0.035 + (player.dashTime > 0 ? 0.12 : 0);
    player.mesh.visible = player.invuln <= 0 || Math.floor(state.time * 14) % 2 === 0;
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0 && enemies.length < Math.min(4 + state.wave, 12)) { spawnEnemy(); state.spawnTimer = Math.max(0.8, 2.45 - state.wave * 0.08); }
    state.pickupTimer -= dt;
    if (state.pickupTimer <= 0 && pickups.length < 6) { spawnPickup(); state.pickupTimer = rnd(3.2, 4.8); }
    if (state.comboTimer > 0) { state.comboTimer -= dt; if (state.comboTimer <= 0) state.combo = 0; }
    if (state.announceTimer > 0 && (state.announceTimer -= dt) <= 0) ui.announce.classList.remove('show');
    for (const p of pickups) {
      p.phase += dt * 2.2; p.mesh.position.y = 0.72 + Math.sin(p.phase) * 0.12; p.mesh.rotation.y += dt * 1.3;
      if (Math.hypot(p.mesh.position.x - player.x, p.mesh.position.z - player.z) < 0.95) {
        fx.burst(p.mesh.position.x, 0.7, p.mesh.position.z, 0xb8ff3d, { count: 15, speed: 3.6, size: 0.8, life: 0.58, gravity: -4 });
        fx.ring(player.x, player.z, 0xb8ff3d, { size: 2.6, dur: 0.42 }); fx.splat(player.x, player.z, 0x71bc2d, 1.1);
        scene.remove(p.mesh); pickups.splice(pickups.indexOf(p), 1);
        player.charges = Math.min(3, player.charges + 1); addScore(25); sfx.pickup(Math.min(state.combo, 10));
        ui.gooFlash.classList.remove('on'); void ui.gooFlash.offsetWidth; ui.gooFlash.classList.add('on'); updateHud();
      }
    }
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i]; e.phase += dt * 7; e.stun = Math.max(0, e.stun - dt);
      const dx = player.x - e.x, dz = player.z - e.z, dist = Math.max(0.001, Math.hypot(dx, dz));
      const targetSpeed = e.stun > 0 ? 0 : e.speed;
      e.vx = damp(e.vx, dx / dist * targetSpeed, 2.2, dt); e.vz = damp(e.vz, dz / dist * targetSpeed, 2.2, dt);
      e.x += e.vx * dt; e.z += e.vz * dt;
      const er = Math.hypot(e.x, e.z); if (er > ARENA - 1.1) { const f = (ARENA - 1.1) / er; e.x *= f; e.z *= f; }
      e.mesh.position.set(e.x, 0, e.z); e.mesh.rotation.y = Math.atan2(dx, dz);
      e.mesh.userData.body.scale.y = 0.58 + Math.sin(e.phase) * 0.045;
      const contact = Math.hypot(e.x - player.x, e.z - player.z);
      if (player.dashTime > 0 && contact < 1.18) { defeatEnemy(e, i); continue; }
      if (contact < 0.9) { hitPlayer(); e.vx = -dx / dist * 5; e.vz = -dz / dist * 5; }
    }
    updateHud();
  }
  // Ambient animation also runs on title and pause screens.
  if (state.mode !== 'play') {
    for (const p of pickups) { p.phase += dt * 1.7; p.mesh.position.y = 0.72 + Math.sin(p.phase) * 0.12; p.mesh.rotation.y += dt * 0.8; }
  }
  fx.update(dt);
  const targetX = player.x * 0.22, targetZ = player.z * 0.2;
  camera.position.x = damp(camera.position.x, targetX, 2.4, dt);
  camera.position.z = damp(camera.position.z, 30 + targetZ, 2.4, dt);
  camera.lookAt(targetX * 0.35, 0, targetZ * 0.35);
  pinkLight.intensity = 22 + Math.sin(state.time * 1.7) * 4;
  tealLight.intensity = 17 + Math.cos(state.time * 1.3) * 4;
}
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false); camera.aspect = w / h;
  camera.fov = w < h ? 48 : 42; camera.updateProjectionMatrix();
  $('rotateHint').classList.toggle('hidden', !(w < 700 && h > w * 1.38 && state.mode === 'play'));
}
window.addEventListener('resize', resize); resize();
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.04);
  update(dt);
  renderer.render(scene, camera);
}
updateHearts(); updateHud(); setMode('title');
// Add an inviting attract scene behind the title card.
for (let i = 0; i < 6; i++) { const p = randomSpot(3, 8); makePickup(p.x, p.z); }
for (let i = 0; i < 3; i++) { const e = randomSpot(5, 9); const mesh = makeBlob(pick(materials.enemy)); mesh.position.set(e.x, 0, e.z); enemies.push({ mesh, x: e.x, z: e.z, vx: 0, vz: 0, speed: 0, phase: rnd(0, TAU), stun: 0 }); }
frame();
