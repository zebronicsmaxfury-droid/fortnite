// Instanced world props: trees, rocks, bushes, cars, fences etc. Harvestable + collidable.
window.FN = window.FN || {};
(function () {
  const C = FN.CONFIG, U = FN.U, G = FN.GeoUtil;
  const P = { defs: {}, list: [], hash: new Map(), dirty: new Set(), HCELL: 16 };
  const TMPM = new THREE.Matrix4(), TMPQ = new THREE.Quaternion(), TMPQ2 = new THREE.Quaternion(), TMPV = new THREE.Vector3(), TMPS = new THREE.Vector3(), TMPC = new THREE.Color(), YAXIS = new THREE.Vector3(0, 1, 0), ZAXIS = new THREE.Vector3(0, 0, 1);
  const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);

  // Define prop type: parts = [{geo, color, colors?:[hex...] (random variant), shadow}] ; shape = {kind:'cyl', r, h} | {kind:'box', w, h, d}
  P.define = function (name, def) { def.name = name; def.parts.forEach(pt => { pt.group = null; }); def.cap = def.cap || 256; def.count = 0; def.free = []; def.items = []; P.defs[name] = def; };
  function ensure(def) {
    if (def.parts[0].mesh) return;
    for (const pt of def.parts) {
      const mat = new THREE.MeshLambertMaterial(Object.assign({ color: 0xffffff }, pt.mat || {}));
      const mesh = new THREE.InstancedMesh(pt.geo, mat, def.cap); mesh.castShadow = false; mesh.receiveShadow = false; mesh.frustumCulled = false; mesh.count = 0; mesh.visible = false;
      for (let i = 0; i < def.cap; i++) mesh.setMatrixAt(i, ZERO);
      mesh.setColorAt(0, new THREE.Color(1, 1, 1)); for (let i = 0; i < def.cap; i++) mesh.setColorAt(i, new THREE.Color(1, 1, 1));
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mesh.instanceMatrix.needsUpdate = true;
      pt.mesh = mesh; P.scene.add(mesh);
    }
  }
  function grow(def) {
    const cap = def.cap * 2;
    for (const pt of def.parts) {
      const old = pt.mesh; const mesh = new THREE.InstancedMesh(pt.geo, old.material, cap); mesh.castShadow = false; mesh.receiveShadow = false; mesh.frustumCulled = false;
      for (let i = 0; i < cap; i++) mesh.setMatrixAt(i, ZERO);
      mesh.setColorAt(0, new THREE.Color(1, 1, 1)); for (let i = 0; i < cap; i++) mesh.setColorAt(i, new THREE.Color(1, 1, 1));
      for (let i = 0; i < old.count; i++) { old.getMatrixAt(i, TMPM); mesh.setMatrixAt(i, TMPM); old.getColorAt(i, TMPC); mesh.setColorAt(i, TMPC); }
      mesh.count = def.items.length; mesh.visible = def.items.length > 0;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mesh.instanceMatrix.needsUpdate = true; mesh.instanceColor.needsUpdate = true;
      P.scene.remove(old); old.dispose(); pt.mesh = mesh;
    }
    def.cap = cap;
  }
  P.init = function (scene) { P.scene = scene; P.list = []; P.hash.clear(); };
  function hkey(x, z) { return Math.floor(x / P.HCELL) + ',' + Math.floor(z / P.HCELL); }

  P.add = function (type, x, z, opts) {
    opts = opts || {}; const def = P.defs[type]; if (!def) return null; ensure(def);
    if (def.drivable) {
      const clearance = (def.shape && def.shape.w ? def.shape.w : 3) * 0.5 + 1.2;
      for (const other of P.list) if (other.alive && other.def.drivable) {
        const otherClearance = (other.def.shape && other.def.shape.w ? other.def.shape.w : 3) * 0.5 + 1.2;
        if (U.dist2(x, z, other.x, other.z) < clearance + otherClearance) return null;
      }
    }
    let idx; if (def.free.length) idx = def.free.pop(); else { idx = def.items.length; if (idx >= def.cap) grow(def); }
    const terrainY = FN.Terrain.heightAt(x, z);
    // Ground props may receive a POI/grid Y. Prevent those props from being
    // buried when the local terrain is slightly higher than that grid level;
    // upper-story props remain untouched because they are already above it.
    const y = opts.y !== undefined ? Math.max(opts.y, terrainY) : terrainY;
    const scale = opts.scale || 1; const rot = opts.rot !== undefined ? opts.rot : U.rand() * Math.PI * 2;
    const hv = def.harvest ? C.HARVEST[def.harvest] : null;
    const p = { type, def, idx, x, y, z, rot, scale, hp: hv ? hv.hp * (opts.hpMul || 1) : 0, maxHp: hv ? hv.hp : 0, alive: true, harvest: def.harvest, colorSeed: opts.colorSeed !== undefined ? opts.colorSeed : U.rand(), tint: opts.tint, drivable: !!def.drivable, vehicleType: def.vehicleType || null, wheelSpin: 0 };
    p.shape = def.shape; def.items[idx] = p; P.list.push(p);
    const k = hkey(x, z); let arr = P.hash.get(k); if (!arr) { arr = []; P.hash.set(k, arr); } arr.push(p); p.hk = k;
    write(p); return p;
  };
  function write(p) {
    const def = p.def;
    for (let i = 0; i < def.parts.length; i++) {
      const pt = def.parts[i]; const mesh = pt.mesh;
      if (!p.alive) { mesh.setMatrixAt(p.idx, ZERO); }
      else {
        TMPQ.setFromAxisAngle(YAXIS, p.rot); if (pt.spin) { TMPQ2.setFromAxisAngle(ZAXIS, p.wheelSpin || 0); TMPQ.multiply(TMPQ2); } const ox = pt.ox || 0, oy = pt.oy || pt.y || 0, oz = pt.oz || 0; TMPV.set(p.x + (ox * Math.cos(p.rot) + oz * Math.sin(p.rot)) * p.scale, p.y + oy * p.scale, p.z + (-ox * Math.sin(p.rot) + oz * Math.cos(p.rot)) * p.scale); const s = p.scale * (pt.scale || 1); TMPS.set(s * (pt.sx || 1), s * (pt.sy || 1), s * (pt.sz || 1));
        TMPM.compose(TMPV, TMPQ, TMPS); mesh.setMatrixAt(p.idx, TMPM);
        let col = pt.color; if (pt.colors) col = pt.colors[Math.floor(p.colorSeed * pt.colors.length) % pt.colors.length]; if (p.tint && pt.tintable) col = p.tint;
        TMPC.setHex(col === undefined ? 0xffffff : col); if (pt.vary) { const v = 1 + (U.hash2(p.idx * 7, i * 13) - 0.5) * pt.vary; TMPC.multiplyScalar(v); } mesh.setColorAt(p.idx, TMPC);
      }
      mesh.count = def.items.length;
      mesh.visible = def.items.length > 0;
      mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  }
  P.remove = function (p) {
    if (!p.alive) return; p.alive = false; write(p);
    const arr = P.hash.get(p.hk); if (arr) { const i = arr.indexOf(p); if (i >= 0) arr.splice(i, 1); }
    p.def.items[p.idx] = null; p.def.free.push(p.idx);

    // After removing an item, we need to update the mesh.count for all parts
    // of this definition to reflect the actual number of active instances.
    let activeCount = 0;
    for (const item of p.def.items) {
      if (item !== null && item.alive) {
        activeCount++;
      }
    }

    for (const pt of p.def.parts) {
      const mesh = pt.mesh;
      mesh.count = activeCount; // Update the count of active instances
      mesh.visible = activeCount > 0; // Update visibility based on active instances
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  };
  P.nearby = function (x, z, r, out) {
    out = out || []; const c0 = Math.floor((x - r) / P.HCELL), c1 = Math.floor((x + r) / P.HCELL), z0 = Math.floor((z - r) / P.HCELL), z1 = Math.floor((z + r) / P.HCELL);
    for (let cz = z0; cz <= z1; cz++) for (let cx = c0; cx <= c1; cx++) { const arr = P.hash.get(cx + ',' + cz); if (arr) for (const p of arr) if (p.alive) out.push(p); }
    return out;
  };
  // Collision shape in world space
  P.shapeOf = function (p) {
    const s = p.shape; if (!s) return null;
    if (s.kind === 'cyl') return { kind: 'cyl', x: p.x, z: p.z, r: s.r * p.scale, y0: p.y + (s.y0 || 0), y1: p.y + s.h * p.scale };
    if (s.kind === 'box') { const hw = s.w / 2 * p.scale, hd = s.d / 2 * p.scale; const cs = Math.abs(Math.cos(p.rot)), sn = Math.abs(Math.sin(p.rot)); const ex = hw * cs + hd * sn, ez = hw * sn + hd * cs; return { kind: 'box', min: { x: p.x - ex, y: p.y, z: p.z - ez }, max: { x: p.x + ex, y: p.y + s.h * p.scale, z: p.z + ez } }; }
    return null;
  };
  P.raycast = function (ro, rd, maxT, opts) {
    opts = opts || {};
    
    let best = null; const steps = Math.ceil(maxT / P.HCELL) + 1; const visited = new Set();
    for (let i = 0; i <= steps; i++) {
      const t = Math.min(i * P.HCELL, maxT); const x = ro.x + rd.x * t, z = ro.z + rd.z * t; const cx = Math.floor(x / P.HCELL), cz = Math.floor(z / P.HCELL);
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
        const k = (cx + dx) + ',' + (cz + dz); if (visited.has(k)) continue; visited.add(k); const arr = P.hash.get(k); if (!arr) continue;
        for (const p of arr) {
          if (!p.alive || p === opts.skipProp) continue; const sh = P.shapeOf(p); if (!sh) continue; let tt = -1;
          if (sh.kind === 'cyl') tt = U.rayCapsuleY(ro, rd, sh.x, sh.z, sh.y0, sh.y1, sh.r, maxT); else tt = U.rayAABB(ro, rd, sh.min, sh.max, maxT);
          if (tt >= 0 && (!best || tt < best.t)) best = { t: tt, prop: p };
        }
      }
      if (best && best.t < t) break;
    }
    if (best) best.point = { x: ro.x + rd.x * best.t, y: ro.y + rd.y * best.t, z: ro.z + rd.z * best.t };
    return best;
  };
  P.damage = function (p, amount) {
    if (!p.alive || !p.harvest) return false; p.hp -= amount;
    if (p.hp <= 0) { if (FN.FX) FN.FX.propBreak(p); P.remove(p); return true; }
    if (FN.FX && (p.type === 'tree' || p.type === 'pine' || p.type === 'deadtree')) FN.FX.shake(p);
    return false;
  };
  P.writeInstance = write;

  // ---------- Definitions ----------
  P.defineAll = function () {
    const trunkGeo = G.cyl(0.32, 0.5, 5.5, 7, 0, 2.75, 0);
    const canopy = G.merge([G.sphere(2.6, 7, 0, 6.6, 0, 1, 0.85, 1), G.sphere(2.0, 6, 1.6, 5.4, 0.6, 1, 0.8, 1), G.sphere(1.9, 6, -1.5, 5.6, -0.7, 1, 0.8, 1), G.sphere(1.7, 6, 0.3, 5.2, 1.7, 1, 0.75, 1)]);
    P.define('tree', { parts: [{ geo: trunkGeo, color: 0x6b4a2b, vary: 0.2 }, { geo: canopy, colors: [0x3e9a2f, 0x4aa836, 0x379128, 0x5ab53c], vary: 0.25 }], shape: { kind: 'cyl', r: 0.55, h: 8.5 }, harvest: 'tree', cap: 2048 });
    const pineTrunk = G.cyl(0.25, 0.42, 4.0, 6, 0, 2.0, 0);
    const pineCanopy = G.merge([G.cone(2.6, 4.0, 7, 0, 4.4, 0), G.cone(2.1, 3.6, 7, 0, 6.6, 0), G.cone(1.5, 3.2, 7, 0, 8.6, 0), G.cone(0.9, 2.4, 6, 0, 10.4, 0)]);
    P.define('pine', { parts: [{ geo: pineTrunk, color: 0x5a3d22, vary: 0.2 }, { geo: pineCanopy, colors: [0x2f7a2c, 0x2a6e28, 0x3a8a33, 0x266424], vary: 0.25 }], shape: { kind: 'cyl', r: 0.5, h: 11 }, harvest: 'pine', cap: 2048 });
    const deadGeo = G.merge([G.cyl(0.2, 0.5, 6, 6, 0, 3, 0), G.cyl(0.1, 0.2, 2.6, 5, 0.9, 5.8, 0.2, 0, 0, -0.9), G.cyl(0.08, 0.18, 2.2, 5, -0.8, 5.2, -0.3, 0.4, 0, 0.9), G.cyl(0.06, 0.14, 1.8, 5, 0.2, 6.6, -0.8, 0.9, 0, 0)]);
    P.define('deadtree', { parts: [{ geo: deadGeo, color: 0x4a3a2a, vary: 0.3 }], shape: { kind: 'cyl', r: 0.45, h: 7 }, harvest: 'tree', cap: 512 });
    const rockGeo = new THREE.DodecahedronGeometry(1.6, 0); rockGeo.scale(1, 0.75, 1); rockGeo.translate(0, 0.9, 0);
    P.define('rock', { parts: [{ geo: rockGeo, colors: [0x8d8d8a, 0x9a9895, 0x7f827f, 0xa5a29c], vary: 0.2 }], shape: { kind: 'cyl', r: 1.5, h: 2.2 }, harvest: 'rock', cap: 1024 });
    const bigRock = G.merge([new THREE.DodecahedronGeometry(3.2, 1).scale(1, 0.7, 1.15).translate(0, 1.6, 0), new THREE.DodecahedronGeometry(2.0, 0).translate(2.2, 1.0, 1.0)]);
    P.define('bigrock', { parts: [{ geo: bigRock, colors: [0x8d8d8a, 0x9a9895, 0x858883], vary: 0.2 }], shape: { kind: 'cyl', r: 3.2, h: 4.2 }, harvest: 'rock', cap: 256 });
    const bushGeo = G.merge([G.sphere(1.0, 6, 0, 0.8, 0, 1, 0.8, 1), G.sphere(0.8, 6, 0.7, 0.6, 0.3, 1, 0.8, 1), G.sphere(0.75, 6, -0.6, 0.65, -0.4, 1, 0.8, 1)]);
    P.define('bush', { parts: [{ geo: bushGeo, colors: [0x3f8f2c, 0x4c9c34, 0x367f27], vary: 0.25 }], shape: null, harvest: 'bush', cap: 2048 });
    // Car: body + cabin + wheels
    const carBody = G.merge([
      G.box(4.0, 0.9, 1.9, 0, 0.8, 0),
      G.box(2.3, 0.7, 1.6, -0.1, 1.55, 0),
      G.box(1.0, 0.25, 1.6, 1.7, 1.25, 0),
      G.box(0.45, 0.5, 1.9, 2.2, 0.9, 0),
      G.box(0.38, 0.45, 1.8, -2.1, 0.82, 0),
    ]);
    const carWheels = [[1.45, 1.06], [-1.45, 1.06], [1.45, -1.06], [-1.45, -1.06]].map(([ox, oz]) => ({ geo: G.cyl(0.38, 0.38, 0.32, 10, 0, 0, 0, Math.PI / 2, 0, 0), ox, oz, y: 0.38 }));
    const carGlass = G.merge([
      G.box(0.08, 0.62, 1.42, 0.9, 1.62, 0),
      G.box(2.2, 0.5, 0.08, -0.2, 1.65, 0.82),
      G.box(2.2, 0.5, 0.08, -0.2, 1.65, -0.82),
      G.box(2.2, 0.08, 1.45, -0.2, 1.92, 0),
    ]);
    const carTrim = G.merge([G.box(2.7, 0.08, 0.08, 0, 1.12, 0.97), G.box(2.7, 0.08, 0.08, 0, 1.12, -0.97), G.box(0.12, 0.15, 1.55, 2.38, 0.98, 0)]);
    const carLights = G.merge([G.box(0.12, 0.18, 0.42, 2.43, 1.12, 0.58), G.box(0.12, 0.18, 0.42, 2.43, 1.12, -0.58), G.box(0.1, 0.16, 0.38, -2.3, 1.1, 0.58), G.box(0.1, 0.16, 0.38, -2.3, 1.1, -0.58)]);
    P.define('car', { drivable: true, vehicleType: 'car', parts: [{ geo: carBody, colors: [0xd23b3b, 0x3b6fd2, 0xe8e8e8, 0xf0c040, 0x3aa35a, 0xd77a2b], vary: 0.1 }, ...carWheels.map(w => ({ geo: w.geo, ox: w.ox, oy: w.y, oz: w.oz, color: 0x17191c, spin: true })), { geo: carGlass, color: 0x79b9d9 }, { geo: carTrim, color: 0x20252b }, { geo: carLights, color: 0xffe5a3 }], shape: { kind: 'box', w: 4.3, h: 2.0, d: 2.0 }, harvest: 'car', cap: 256 });
    const truckBody = G.merge([
      G.box(2.2, 1.2, 2.3, 2.6, 1.3, 0),
      G.box(5.5, 2.2, 2.4, -0.8, 1.9, 0),
      G.box(2.0, 0.5, 2.25, 4.45, 1.65, 0), // hood sits flush on the cab roof (no float)
      G.box(0.6, 0.8, 2.3, -3.7, 1.0, 0), // rear bumper overlaps the cargo box (no float)
    ]);
    // Truck: box-van shape â€” cab at the front (+x), tall cargo box in the middle,
    // flat bed/rear panel, with wheels, glass, trim and lights matching the car.
    // Proportions are not stretched: collision box matches the visual footprint.
    truckBody.translate(0, -0.28, 0);
    const truckWheels = [[2.8, 1.15], [2.8, -1.15], [-2.3, 1.15], [-2.3, -1.15]].map(([ox, oz]) => ({ geo: G.cyl(0.52, 0.52, 0.4, 10, 0, 0, 0, Math.PI / 2, 0, 0), ox, oz, y: 0.52 }));
    const truckTrim = G.merge([G.box(3.8, 0.12, 0.08, -0.7, 0.87, 1.22), G.box(3.8, 0.12, 0.08, -0.7, 0.87, -1.22), G.box(0.12, 0.85, 1.9, 3.75, 1.14, 0)]);
    const truckLights = G.merge([G.box(0.12, 0.24, 0.48, 3.75, 1.27, 0.72), G.box(0.12, 0.24, 0.48, 3.75, 1.27, -0.72)]);
    // Keep the visible truck unchanged, but make its side collision fit the
    // body instead of extending too far to the left and right.
    P.define('truck', { drivable: true, vehicleType: 'truck', parts: [{ geo: truckBody, colors: [0xffffff, 0xd8452f, 0x4a86c8, 0xf2b632], vary: 0.1 }, ...truckWheels.map(w => ({ geo: w.geo, ox: w.ox, oy: w.y, oz: w.oz, color: 0x17191c, spin: true })), { geo: truckTrim, color: 0x252a2e }, { geo: truckLights, color: 0xffe5a3 }], shape: { kind: 'box', w: 7.4, h: 3.0, d: 2.4 }, harvest: 'car', cap: 128 });
    const contGeo = G.box(6.0, 2.6, 2.4, 0, 1.3, 0);
    P.define('container', { parts: [{ geo: contGeo, colors: [0xd8452f, 0x2f6fd8, 0x3aa35a, 0xf2b632, 0xe0e0e0], vary: 0.12, mat: { map: FN.Tex.metal() } }], shape: { kind: 'box', w: 6.0, h: 2.6, d: 2.4 }, harvest: 'car', cap: 256 });
    const hayGeo = G.cyl(0.9, 0.9, 1.4, 10, 0, 0.9, 0, 0, 0, Math.PI / 2);
    P.define('hay', { parts: [{ geo: hayGeo, color: 0xd9b45a, vary: 0.15, mat: { map: FN.Tex.wood() } }], shape: { kind: 'cyl', r: 0.9, h: 1.8 }, harvest: 'hay', cap: 256 });
    const lampGeo = G.merge([G.cyl(0.08, 0.12, 6, 6, 0, 3, 0), G.box(1.2, 0.12, 0.12, 0.5, 6, 0), G.box(0.5, 0.25, 0.3, 1.0, 5.9, 0)]);
    P.define('lamp', { parts: [{ geo: lampGeo, color: 0x3a3f44 }], shape: { kind: 'cyl', r: 0.15, h: 6 }, harvest: 'car', cap: 256 });
    const barrelGeo = G.cyl(0.45, 0.45, 1.1, 10, 0, 0.55, 0);
    P.define('barrel', { parts: [{ geo: barrelGeo, colors: [0x3a5ea8, 0xb03a2a, 0x555a60], vary: 0.15 }], shape: { kind: 'cyl', r: 0.45, h: 1.1 }, harvest: 'car', cap: 256 });
    const crateGeo = G.box(1.2, 1.2, 1.2, 0, 0.6, 0);
    P.define('crate', { parts: [{ geo: crateGeo, color: 0xc09a58, vary: 0.15, mat: { map: FN.Tex.wood() } }], shape: { kind: 'box', w: 1.2, h: 1.2, d: 1.2 }, harvest: 'fence', cap: 512 });
    const siloGeo = G.merge([G.cyl(2.4, 2.4, 11, 14, 0, 5.5, 0), G.cone(2.6, 2.2, 14, 0, 12.1, 0)]);
    P.define('silo', { parts: [{ geo: siloGeo, color: 0xc8ccd0, mat: { map: FN.Tex.metal() } }], shape: { kind: 'cyl', r: 2.5, h: 13 }, harvest: 'car', cap: 32 });
    const towerGeo = G.merge([G.cyl(0.18, 0.18, 12, 6, 2.5, 6, 2.5), G.cyl(0.18, 0.18, 12, 6, -2.5, 6, 2.5), G.cyl(0.18, 0.18, 12, 6, 2.5, 6, -2.5), G.cyl(0.18, 0.18, 12, 6, -2.5, 6, -2.5), G.cyl(3.4, 3.4, 4.5, 14, 0, 14.2, 0), G.cone(3.7, 1.6, 14, 0, 17.2, 0)]);
    P.define('watertower', { parts: [{ geo: towerGeo, colors: [0x8a8f94, 0xb7bcc0], mat: { map: FN.Tex.metal() } }], shape: { kind: 'cyl', r: 3.4, h: 18 }, harvest: 'car', cap: 32 });

    const boatGeo = G.merge([G.box(4.0, 0.7, 1.6, 0, 0.35, 0), G.box(0.9, 0.4, 1.2, 1.0, 0.9, 0)]);
    P.define('boat', { parts: [{ geo: boatGeo, colors: [0xffffff, 0x3b6fd2, 0xd23b3b] }], shape: { kind: 'box', w: 4.0, h: 1.0, d: 1.6 }, harvest: 'fence', cap: 32 });
    const gasGeo = G.merge([G.box(0.9, 1.8, 0.6, 0, 0.9, 0), G.box(0.3, 0.5, 0.2, 0.2, 1.2, 0.35)]);
    P.define('gaspump', { parts: [{ geo: gasGeo, colors: [0xd8452f, 0x2f6fd8] }], shape: { kind: 'box', w: 0.9, h: 1.8, d: 0.6 }, harvest: 'car', cap: 64 });
    const mailGeo = G.merge([G.cyl(0.06, 0.06, 1.1, 5, 0, 0.55, 0), G.box(0.5, 0.35, 0.3, 0, 1.25, 0)]);
    P.define('mailbox', { parts: [{ geo: mailGeo, colors: [0x2f3f5a, 0x8a1a1a, 0x555] }], shape: null, harvest: 'car', cap: 256 });
    const benchGeo = G.merge([G.box(1.8, 0.08, 0.5, 0, 0.5, 0), G.box(1.8, 0.4, 0.08, 0, 0.8, -0.22), G.box(0.08, 0.5, 0.5, -0.8, 0.25, 0), G.box(0.08, 0.5, 0.5, 0.8, 0.25, 0)]);
    P.define('bench', { parts: [{ geo: benchGeo, color: 0x8a6a3a, mat: { map: FN.Tex.wood() } }], shape: { kind: 'box', w: 1.8, h: 0.9, d: 0.5 }, harvest: 'fence', cap: 256 });
    const treeStump = G.cyl(0.5, 0.6, 0.6, 7, 0, 0.3, 0);
    P.define('stump', { parts: [{ geo: treeStump, color: 0x7a5a3a }], shape: null, harvest: 'fence', cap: 256 });
    const tomatoHead = G.merge([G.sphere(3.2, 12, 0, 3.2, 0, 1.05, 1, 1.05), G.cyl(0.3, 0.2, 1.2, 6, 0, 6.6, 0), G.box(3.8, 0.9, 0.6, 0, 3.0, 3.0), G.sphere(0.5, 6, -1.1, 4.1, 2.9), G.sphere(0.5, 6, 1.1, 4.1, 2.9)]);
    P.define('tomatohead', { parts: [{ geo: tomatoHead, color: 0xe2352b }], shape: { kind: 'cyl', r: 3.2, h: 7 }, harvest: null, cap: 4 });
    const burgerGeo = G.merge([G.cyl(3.0, 3.0, 1.0, 16, 0, 0.5, 0), G.cyl(3.2, 3.2, 0.5, 16, 0, 1.25, 0), G.cyl(3.1, 3.1, 0.5, 16, 0, 1.75, 0), G.sphere(3.0, 12, 0, 2.0, 0, 1, 0.75, 1)]);
    P.define('burger', { parts: [{ geo: G.cyl(3.0, 3.0, 1.0, 16, 0, 0.5, 0), color: 0xd9a24a }, { geo: G.cyl(3.2, 3.2, 0.5, 16, 0, 1.25, 0), color: 0x5a3a1a }, { geo: G.cyl(3.1, 3.1, 0.5, 16, 0, 1.75, 0), color: 0x3aa35a }, { geo: G.sphere(3.0, 12, 0, 2.0, 0, 1, 0.75, 1), color: 0xd9a24a }], shape: { kind: 'cyl', r: 3.2, h: 4.5 }, harvest: null, cap: 4 });
    const toiletGeo = G.merge([G.box(3.0, 2.6, 3.4, 0, 1.3, 0), G.box(3.4, 1.0, 1.0, 0, 3.1, -1.2), G.cyl(1.3, 1.6, 1.2, 12, 0, 3.2, 0.4), G.cyl(1.8, 1.8, 0.4, 12, 0, 3.4, 0.4)]);
    P.define('toilet', { parts: [{ geo: toiletGeo, color: 0xf4f4f4 }], shape: { kind: 'box', w: 3.4, h: 4, d: 3.6 }, harvest: null, cap: 4 });
    const signPost = G.merge([G.cyl(0.12, 0.12, 6, 6, 0, 3, 0), G.box(5, 2.2, 0.2, 0, 6.5, 0)]);
    P.define('bigsign', { parts: [{ geo: signPost, colors: [0xe8e0c0, 0xd8452f, 0x2f6fd8] }], shape: { kind: 'cyl', r: 0.15, h: 7 }, harvest: 'car', cap: 32 });
    const goalGeo = G.merge([G.cyl(0.08, 0.08, 2.4, 6, -3.6, 1.2, 0), G.cyl(0.08, 0.08, 2.4, 6, 3.6, 1.2, 0), G.box(7.4, 0.12, 0.12, 0, 2.4, 0)]);
    P.define('goal', { parts: [{ geo: goalGeo, color: 0xffffff }], shape: null, harvest: 'car', cap: 8 });
    P.define('chimney', { parts: [{ geo: G.box(0.9, 1.7, 0.9, 0, 0.85, 0), color: 0x9a6a5a, mat: { map: FN.Tex.brick() } }, { geo: G.box(1.05, 0.15, 1.05, 0, 1.75, 0), color: 0x6a4a3a }], shape: null, harvest: null, cap: 256 });
    P.define('step', { parts: [{ geo: G.box(1.7, 0.24, 1.0, 0, 0.12, 0), color: 0xbdbdb8, mat: { map: FN.Tex.concrete() } }], shape: null, harvest: null, cap: 256 });
    P.define('hedge', { parts: [{ geo: G.box(2.4, 1.0, 0.7, 0, 0.5, 0), colors: [0x3d8a2c, 0x357f28], vary: 0.2, mat: { map: FN.Tex.hedge() } }], shape: { kind: 'box', w: 2.4, h: 1.0, d: 0.7 }, harvest: 'bush', cap: 256 });
    P.define('bin', { parts: [{ geo: G.cyl(0.32, 0.28, 0.9, 10, 0, 0.45, 0), colors: [0x3a3f44, 0x2f6fd8, 0x3aa35a] }], shape: { kind: 'cyl', r: 0.32, h: 0.9 }, harvest: 'car', cap: 256 });
    const powerGeo = G.merge([G.cyl(0.3, 0.5, 30, 6, 0, 15, 0), G.box(8, 0.3, 0.3, 0, 26, 0), G.box(6, 0.3, 0.3, 0, 22, 0)]);
    P.define('pylon', { parts: [{ geo: powerGeo, color: 0x5a6068 }], shape: { kind: 'cyl', r: 0.5, h: 30 }, harvest: 'car', cap: 32 });
  };
  FN.Props = P;
})();
