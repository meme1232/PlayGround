import * as THREE from '../vendor/three.module.js';
import { glowTexture, softTexture, rnd, TAU } from './util.js';

const MAX_PARTICLES = 700;
const MAX_RINGS = 18;
const MAX_SPLATS = 22;

export class FX {
  constructor(scene) {
    this.scene = scene;
    this.shake = 0;
    this.cursor = 0;
    this.time = 0;

    // ---------- particle points ----------
    const geo = new THREE.BufferGeometry();
    this.pos = new Float32Array(MAX_PARTICLES * 3);
    this.col = new Float32Array(MAX_PARTICLES * 3);
    this.siz = new Float32Array(MAX_PARTICLES);
    this.alp = new Float32Array(MAX_PARTICLES);
    this.vel = new Float32Array(MAX_PARTICLES * 3);
    this.life = new Float32Array(MAX_PARTICLES);
    this.maxLife = new Float32Array(MAX_PARTICLES);
    this.baseSize = new Float32Array(MAX_PARTICLES);
    this.drag = new Float32Array(MAX_PARTICLES);
    this.grav = new Float32Array(MAX_PARTICLES);

    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('aColor', new THREE.BufferAttribute(this.col, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(this.siz, 1));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(this.alp, 1));

    const mat = new THREE.ShaderMaterial({
      uniforms: { uMap: { value: softTexture() } },
      vertexShader: /* glsl */`
        attribute vec3 aColor;
        attribute float aSize;
        attribute float aAlpha;
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vColor = aColor;
          vAlpha = aAlpha;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * (320.0 / max(0.1, -mv.z));
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */`
        uniform sampler2D uMap;
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          float a = texture2D(uMap, gl_PointCoord).a;
          if (a < 0.01) discard;
          gl_FragColor = vec4(vColor, a * vAlpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 4;
    scene.add(this.points);
    this.pgeo = geo;

    // ---------- rings ----------
    this.rings = [];
    const ringGeo = new THREE.RingGeometry(0.72, 1.0, 56);
    ringGeo.rotateX(-Math.PI / 2);
    for (let i = 0; i < MAX_RINGS; i++) {
      const m = new THREE.MeshBasicMaterial({
        color: 0xb8ff3d, transparent: true, opacity: 0, side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
      });
      const mesh = new THREE.Mesh(ringGeo, m);
      mesh.visible = false;
      mesh.renderOrder = 3;
      scene.add(mesh);
      this.rings.push({ mesh, mat: m, t: 0, dur: 1, from: 1, to: 4 });
    }
    this.ringCursor = 0;

    // ---------- splats ----------
    this.splats = [];
    const splatGeo = new THREE.PlaneGeometry(1, 1);
    splatGeo.rotateX(-Math.PI / 2);
    for (let i = 0; i < MAX_SPLATS; i++) {
      const m = new THREE.MeshBasicMaterial({
        map: softTexture(), color: 0x8bff2e, transparent: true, opacity: 0,
        depthWrite: false, toneMapped: false,
      });
      const mesh = new THREE.Mesh(splatGeo, m);
      mesh.visible = false;
      scene.add(mesh);
      this.splats.push({ mesh, mat: m, t: 0, dur: 4, size: 2 });
    }
    this.splatCursor = 0;

    this._c = new THREE.Color();
  }

  spawn(x, y, z, color, opts = {}) {
    const {
      count = 1, speed = 4, size = 0.8, life = 0.6, gravity = -9,
      up = 1.5, spread = 0.25, drag = 1.6, sizeVar = 0.4,
    } = opts;
    const c = this._c.set(color);
    for (let n = 0; n < count; n++) {
      let idx = -1;
      for (let k = 0; k < MAX_PARTICLES; k++) {
        const i = (this.cursor + k) % MAX_PARTICLES;
        if (this.life[i] <= 0) { idx = i; this.cursor = (i + 1) % MAX_PARTICLES; break; }
      }
      if (idx === -1) return;

      const i3 = idx * 3;
      this.pos[i3] = x + rnd(-spread, spread);
      this.pos[i3 + 1] = y + rnd(-spread * 0.6, spread * 0.6);
      this.pos[i3 + 2] = z + rnd(-spread, spread);

      const theta = Math.random() * TAU;
      const phi = Math.acos(rnd(-1, 1));
      const sp = speed * rnd(0.35, 1);
      this.vel[i3] = Math.sin(phi) * Math.cos(theta) * sp;
      this.vel[i3 + 1] = Math.abs(Math.cos(phi)) * sp * 0.35 + rnd(0.2, up);
      this.vel[i3 + 2] = Math.sin(phi) * Math.sin(theta) * sp;

      const tint = 0.82 + Math.random() * 0.35;
      this.col[i3] = Math.min(1, c.r * tint);
      this.col[i3 + 1] = Math.min(1, c.g * tint);
      this.col[i3 + 2] = Math.min(1, c.b * tint);

      const l = life * rnd(0.65, 1.25);
      this.life[idx] = l;
      this.maxLife[idx] = l;
      this.baseSize[idx] = size * rnd(1 - sizeVar, 1 + sizeVar);
      this.siz[idx] = this.baseSize[idx];
      this.alp[idx] = 1;
      this.grav[idx] = gravity;
      this.drag[idx] = drag;
    }
    this.pgeo.attributes.position.needsUpdate = true;
    this.pgeo.attributes.aColor.needsUpdate = true;
    this.pgeo.attributes.aSize.needsUpdate = true;
    this.pgeo.attributes.aAlpha.needsUpdate = true;
  }

  burst(x, y, z, color, opts = {}) {
    this.spawn(x, y, z, color, { count: 16, speed: 6.5, size: 1.1, life: 0.55, ...opts });
  }

  ring(x, z, color, { size = 5, dur = 0.55, y = 0.06, from = 0.5 } = {}) {
    const r = this.rings[this.ringCursor];
    this.ringCursor = (this.ringCursor + 1) % MAX_RINGS;
    r.mesh.position.set(x, y, z);
    r.mesh.visible = true;
    r.mat.color.set(color);
    r.mat.opacity = 0.85;
    r.t = 0;
    r.dur = dur;
    r.from = from;
    r.to = size;
    r.mesh.scale.setScalar(from);
  }

  splat(x, z, color = 0x7ee02a, size = 2.4) {
    const s = this.splats[this.splatCursor];
    this.splatCursor = (this.splatCursor + 1) % MAX_SPLATS;
    s.mesh.position.set(x, 0.035, z);
    s.mesh.rotation.y = Math.random() * TAU;
    s.mesh.scale.set(size, 1, size * rnd(0.75, 1.1));
    s.mat.color.set(color);
    s.mat.opacity = 0.42;
    s.mesh.visible = true;
    s.t = 0;
    s.dur = rnd(3.6, 5.4);
    s.size = size;
  }

  addShake(amount) {
    this.shake = Math.min(1.6, this.shake + amount);
  }

  update(dt) {
    this.time += dt;
    this.shake = Math.max(0, this.shake - dt * 3.2);

    let any = false;
    for (let i = 0; i < MAX_PARTICLES; i++) {
      if (this.life[i] <= 0) continue;
      any = true;
      this.life[i] -= dt;
      const i3 = i * 3;
      if (this.life[i] <= 0) {
        this.alp[i] = 0;
        this.siz[i] = 0;
        continue;
      }
      const d = Math.exp(-this.drag[i] * dt);
      this.vel[i3] *= d;
      this.vel[i3 + 1] = this.vel[i3 + 1] * d + this.grav[i] * dt;
      this.vel[i3 + 2] *= d;
      this.pos[i3] += this.vel[i3] * dt;
      this.pos[i3 + 1] += this.vel[i3 + 1] * dt;
      this.pos[i3 + 2] += this.vel[i3 + 2] * dt;
      if (this.pos[i3 + 1] < 0.05) {
        this.pos[i3 + 1] = 0.05;
        this.vel[i3 + 1] *= -0.28;
      }
      const t = Math.max(0, this.life[i] / this.maxLife[i]);
      this.alp[i] = t * t;
      this.siz[i] = this.baseSize[i] * (0.35 + 0.75 * t);
    }
    if (any) {
      this.pgeo.attributes.position.needsUpdate = true;
      this.pgeo.attributes.aSize.needsUpdate = true;
      this.pgeo.attributes.aAlpha.needsUpdate = true;
    }

    for (const r of this.rings) {
      if (!r.mesh.visible) continue;
      r.t += dt;
      const k = Math.min(1, r.t / r.dur);
      const e = 1 - Math.pow(1 - k, 3);
      r.mesh.scale.setScalar(r.from + (r.to - r.from) * e);
      r.mat.opacity = 0.85 * (1 - k) * (1 - k);
      if (k >= 1) r.mesh.visible = false;
    }

    for (const s of this.splats) {
      if (!s.mesh.visible) continue;
      s.t += dt;
      const k = Math.min(1, s.t / s.dur);
      s.mat.opacity = 0.4 * (1 - k);
      if (k >= 1) s.mesh.visible = false;
    }
  }
}
