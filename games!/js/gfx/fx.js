// Particles, tracers, muzzle flashes, debris, impact effects. One InstancedMesh for debris cubes, sprites for puffs.
window.FN = window.FN || {};
(function () {
  const U = FN.U;
  const FX = { debris: [], puffs: [], tracers: [], shakes: [], MAX_DEBRIS: 600, MAX_PUFF: 200, scale: 1, liveDebris: 0, livePuff: 0, EX_MAX: 8, expPool: [] };
  const TMPM = new THREE.Matrix4(), TMPQ = new THREE.Quaternion(), TMPV = new THREE.Vector3(), TMPS = new THREE.Vector3(), TMPC = new THREE.Color(), ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
  const MATCOL = { wood: [0xc99a55, 0x8a5a2b, 0xd9b070], brick: [0x9a9a9a, 0x7a7a7a, 0xb0a090], metal: [0x9aa4ad, 0x6b7178, 0xc0c8d0], leaf: [0x3e9a2f, 0x2f7a2c, 0x5ab53c], rock: [0x8d8d8a, 0x6f6f6c], flesh: [0xff6a6a, 0xffffff], glass: [0x9fd0ee, 0xffffff] };
  // Adaptive particle scaling: shrink pool caps + spawn counts when quality drops.
  FX.setScale = function (maxDebris, maxPuff, scale) {
    FX.scale = U.clamp(scale === undefined ? 1 : scale, 0.25, 1);
    const nd = Math.max(8, Math.floor(maxDebris)), np = Math.max(8, Math.floor(maxPuff));
    if (nd !== FX.MAX_DEBRIS) {
      for (let i = nd; i < FX.debrisPool.length; i++) { const d = FX.debrisPool[i]; if (d.alive) { d.alive = false; FX.debrisMesh.setMatrixAt(d.idx, ZERO); FX.liveDebris--; if (FX.liveDebris < 0) FX.liveDebris = 0; } }
      FX.MAX_DEBRIS = nd;
      if (FX.debrisMesh) FX.debrisMesh.instanceMatrix.needsUpdate = true;
    }
    if (np !== FX.MAX_PUFF) {
      for (let i = np; i < FX.puffPool.length; i++) { const q = FX.puffPool[i]; if (q.alive) { q.alive = false; q.sp.visible = false; FX.livePuff--; if (FX.livePuff < 0) FX.livePuff = 0; } }
      FX.MAX_PUFF = np;
    }
  };
  FX.init = function (scene) {
    FX.scene = scene;
    const geo = new THREE.BoxGeometry(0.20, 0.20, 0.20);
    FX.debrisMesh = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: 0xffffff }), FX.MAX_DEBRIS); FX.debrisMesh.frustumCulled = false; FX.debrisMesh.castShadow = false;
    for (let i = 0; i < FX.MAX_DEBRIS; i++) FX.debrisMesh.setMatrixAt(i, ZERO); FX.debrisMesh.setColorAt(0, new THREE.Color(1, 1, 1)); for (let i = 0; i < FX.MAX_DEBRIS; i++) FX.debrisMesh.setColorAt(i, new THREE.Color(1, 1, 1));
    FX.debrisMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(FX.debrisMesh);
    FX.debrisPool = []; for (let i = 0; i < FX.MAX_DEBRIS; i++) FX.debrisPool.push({ idx: i, alive: false });
    FX.debrisHead = 0;
    // puffs (sprites)
    FX.puffMat = new THREE.SpriteMaterial({ map: FN.Tex.softDot(), color: 0xffffff, transparent: true, opacity: 0.8, depthWrite: false });
    FX.puffGroup = new THREE.Group(); scene.add(FX.puffGroup); FX.puffPool = [];
    for (let i = 0; i < FX.MAX_PUFF; i++) { const s = new THREE.Sprite(FX.puffMat.clone()); s.visible = false; FX.puffGroup.add(s); FX.puffPool.push({ sp: s, alive: false }); }
    FX.puffHead = 0;
    // tracers: thin boxes
    FX.tracerGroup = new THREE.Group(); scene.add(FX.tracerGroup); FX.tracerPool = [];
    const tg = new THREE.BoxGeometry(1, 1, 1);
    for (let i = 0; i < 40; i++) { const m = new THREE.Mesh(tg, new THREE.MeshBasicMaterial({ color: 0xfff1b0, transparent: true, opacity: 0.9 })); m.visible = false; FX.tracerGroup.add(m); FX.tracerPool.push({ m, alive: false }); }
    FX.tracerHead = 0;
    // muzzle sprites
    FX.muzzleMat = new THREE.SpriteMaterial({ map: FN.Tex.muzzle(), color: 0xffffff, transparent: true, opacity: 1, depthWrite: false, blending: THREE.AdditiveBlending });
    FX.muzzles = []; for (let i = 0; i < 12; i++) { const s = new THREE.Sprite(FX.muzzleMat); s.visible = false; scene.add(s); FX.muzzles.push({ sp: s, t: 0 }); }
    FX.muzzleHead = 0;
    // explosions: sphere flash (pooled to avoid per-blast GC churn)
    FX.explosions = [];
    if (!FX.expPool.length) { for (let i = 0; i < FX.EX_MAX; i++) { const g = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffb040, transparent: true, opacity: 0.9 })); g.visible = false; scene.add(g); FX.expPool.push({ m: g, t: 0, r: 5, on: false }); } }
    FX.explosions.push.apply(FX.explosions, FX.expPool);
    FX.liveDebris = 0; FX.livePuff = 0;
    FX.floatTexts = [];
  };
  FX.spawnDebris = function (x, y, z, colors, count, spread, speed) {
    count = Math.max(0, Math.round(count * FX.scale));
    for (let k = 0; k < count && FX.liveDebris < FX.MAX_DEBRIS; k++) {
      const d = FX.debrisPool[FX.debrisHead]; FX.debrisHead = (FX.debrisHead + 1) % FX.MAX_DEBRIS;
      d.alive = true; FX.liveDebris++;
      d.x = x + (Math.random() - 0.5) * spread; d.y = y + (Math.random() - 0.5) * spread; d.z = z + (Math.random() - 0.5) * spread;
      d.vx = (Math.random() - 0.5) * speed; d.vy = Math.random() * speed * 0.9 + 1; d.vz = (Math.random() - 0.5) * speed;
      d.life = 0.7 + Math.random() * 0.8; d.t = 0; d.rot = Math.random() * 6; d.rs = (Math.random() - 0.5) * 12; d.size = 0.6 + Math.random() * 1.2;
      TMPC.setHex(colors[Math.floor(Math.random() * colors.length)]); FX.debrisMesh.setColorAt(d.idx, TMPC);
    }
    FX.debrisMesh.instanceColor.needsUpdate = true;
  };
  FX.debris = function (x, y, z, mat) { FX.spawnDebris(x, y, z, MATCOL[mat] || MATCOL.wood, 18, 1.5, 7); };
  FX.hitDebris = function (x, y, z, mat, n) { FX.spawnDebris(x, y, z, MATCOL[mat] || MATCOL.wood, n || 6, 0.3, 4); FX.puff(x, y, z, mat === 'metal' ? 0xdddddd : 0xc8b090, 0.6); };
  FX.propBreak = function (p) {
    const kind = p.harvest === 'rock' ? 'rock' : (p.harvest === 'car' ? 'metal' : 'wood');
    const y = p.y + (p.shape ? (p.shape.h || 2) * 0.4 : 1);
    FX.spawnDebris(p.x, y, p.z, MATCOL[kind], 26, 2.5, 8);
    if (p.type === 'tree' || p.type === 'pine') FX.spawnDebris(p.x, p.y + 6, p.z, MATCOL.leaf, 30, 4, 6);
    if (FN.Audio) FN.Audio.play('tree_fall', { x: p.x, y, z: p.z }, 0.8, 80);
  };
  FX.shake = function (p) { FX.shakes.push({ p, t: 0 }); };
  FX.puff = function (x, y, z, color, size) {
    if (FX.livePuff >= FX.MAX_PUFF) return;
    const q = FX.puffPool[FX.puffHead]; FX.puffHead = (FX.puffHead + 1) % FX.MAX_PUFF;
    q.alive = true; FX.livePuff++;
    q.t = 0; q.life = 0.35 + Math.random() * 0.2; q.sp.visible = true; q.sp.position.set(x, y, z); q.sp.material.color.setHex(color === undefined ? 0xffffff : color); q.sp.material.opacity = 0.8; q.size = size || 0.8; q.sp.scale.set(q.size, q.size, 1);
    q.vx = (Math.random() - 0.5) * 1.2; q.vy = 0.8 + Math.random(); q.vz = (Math.random() - 0.5) * 1.2;
  };
  FX.smoke = function (x, y, z, n) { const m = Math.max(1, Math.round((n || 6) * FX.scale)); for (let i = 0; i < m && FX.livePuff < FX.MAX_PUFF; i++) FX.puff(x + (Math.random() - 0.5) * 1.5, y + Math.random() * 1.5, z + (Math.random() - 0.5) * 1.5, 0x555555, 2 + Math.random() * 2); };
  FX.tracer = function (a, b, color) {
    const t = FX.tracerPool[FX.tracerHead]; FX.tracerHead = (FX.tracerHead + 1) % FX.tracerPool.length;
    t.alive = true; t.t = 0; t.life = 0.07; const m = t.m; m.visible = true; m.material.color.setHex(color || 0xfff1b0); m.material.opacity = 0.85;
    const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z; const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
    m.position.set((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2); m.scale.set(0.05, 0.05, Math.max(len, 0.1));
    m.lookAt(b.x, b.y, b.z);
  };
  FX.muzzle = function (x, y, z, size) { const m = FX.muzzles[FX.muzzleHead]; FX.muzzleHead = (FX.muzzleHead + 1) % FX.muzzles.length; m.t = 0.05; m.sp.visible = true; m.sp.position.set(x, y, z); const s = size || 0.9; m.sp.scale.set(s, s, 1); m.sp.material.rotation = Math.random() * 6; };
  FX.explosion = function (x, y, z, radius) {
    // reuse a pooled flash mesh instead of allocating/disposing every blast
    let e = FX.explosions[0];
    for (let i = 0; i < FX.explosions.length; i++) { const c = FX.explosions[i]; if (!c.on) { e = c; break; } }
    if (e.on) { const last = FX.explosions[FX.explosions.length - 1]; if (last.on) { last.on = false; last.m.visible = false; e = last; } }
    e.on = true; e.t = 0; e.r = radius || 5; const g = e.m; g.visible = true; g.position.set(x, y, z); g.scale.set(0.4, 0.4, 0.4); g.material.opacity = 0.9;
    if (FX.explosions.indexOf(e) < 0) FX.explosions.push(e);
    FX.spawnDebris(x, y, z, [0x333333, 0x666666, 0xff9a30], 12, 0.9, 11); FX.smoke(x, y, z, 5);
    if (FN.Audio) FN.Audio.play('explosion', { x, y, z }, 1.2, 400);
  };
  FX.update = function (dt) {
    // debris (skip the whole loop when nothing is alive — big CPU save when idle)
    let anyDebris = false;
    if (FX.liveDebris > 0) {
      for (let i = 0; i < FX.debrisPool.length; i++) {
        const d = FX.debrisPool[i];
        if (!d.alive) continue; anyDebris = true;
        d.t += dt; if (d.t > d.life) { d.alive = false; FX.liveDebris--; FX.debrisMesh.setMatrixAt(d.idx, ZERO); continue; }
        d.vy -= 20 * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.z += d.vz * dt; d.rot += d.rs * dt;
        const g = FN.Terrain && FN.Terrain.generated ? FN.Terrain.heightAt(d.x, d.z) : 0; if (d.y < g) { d.y = g; d.vy *= -0.3; d.vx *= 0.6; d.vz *= 0.6; }
        const s = d.size * (1 - Math.pow(d.t / d.life, 3)); TMPS.set(s, s, s); TMPQ.setFromAxisAngle(TMPV.set(0.3, 1, 0.5).normalize(), d.rot); TMPV.set(d.x, d.y, d.z); TMPM.compose(TMPV, TMPQ, TMPS); FX.debrisMesh.setMatrixAt(d.idx, TMPM);
      }
      if (anyDebris || FX._hadDebris) FX.debrisMesh.instanceMatrix.needsUpdate = true; FX._hadDebris = anyDebris;
    } else if (FX._hadDebris) { FX._hadDebris = false; }
    if (FX.livePuff > 0) {
      for (let i = 0; i < FX.puffPool.length; i++) { const q = FX.puffPool[i]; if (!q.alive) continue; q.t += dt; if (q.t > q.life) { q.alive = false; FX.livePuff--; q.sp.visible = false; continue; } const f = q.t / q.life; q.sp.position.x += q.vx * dt; q.sp.position.y += q.vy * dt; q.sp.position.z += q.vz * dt; const s = q.size * (1 + f * 1.5); q.sp.scale.set(s, s, 1); q.sp.material.opacity = 0.8 * (1 - f); }
    }
    for (const t of FX.tracerPool) { if (!t.alive) continue; t.t += dt; if (t.t > t.life) { t.alive = false; t.m.visible = false; } }
    for (const m of FX.muzzles) { if (m.t > 0) { m.t -= dt; if (m.t <= 0) m.sp.visible = false; } }
    for (let i = FX.explosions.length - 1; i >= 0; i--) { const e = FX.explosions[i]; if (!e.on) continue; e.t += dt; const f = e.t / 0.35; if (f >= 1) { e.on = false; e.m.visible = false; continue; } const s = e.r * (0.3 + f * 0.9); e.m.scale.set(s, s, s); e.m.material.opacity = 0.9 * (1 - f); }
    for (let i = FX.shakes.length - 1; i >= 0; i--) { const s = FX.shakes[i]; s.t += dt; const p = s.p; if (!p.alive || s.t > 0.35) { if (p.alive) { p.shakeOff = 0; FN.Props.writeInstance(p); } FX.shakes.splice(i, 1); continue; } const base = p.rot; p.rot = base + Math.sin(s.t * 40) * 0.05 * (1 - s.t / 0.35); FN.Props.writeInstance(p); p.rot = base; }
  };
  FN.FX = FX;
})();
