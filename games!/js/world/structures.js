// Grid-based destructible building pieces (walls / floors / stairs / roofs) rendered with InstancedMesh.
// Both POI buildings and player builds live here, exactly like Fortnite's 512-unit grid.
window.FN = window.FN || {};
(function () {
  const C = FN.CONFIG, U = FN.U; const CELL = C.CELL, H = C.WALL_H;
  const S = { pieces: new Map(), groups: {}, hash: new Map(), dirty: new Set(), growing: new Set(), count: 0 };
  const SKINS = {
    planks: () => ({ map: FN.Tex.wood() }), darkwood: () => ({ map: FN.Tex.woodDark() }), siding: () => ({ map: FN.Tex.siding() }), brick: () => ({ map: FN.Tex.brick() }),
    metal: () => ({ map: FN.Tex.metal() }), concrete: () => ({ map: FN.Tex.concrete() }), roof: () => ({ map: FN.Tex.roofShingle() }), hedge: () => ({ map: FN.Tex.hedge() }), flat: () => ({}),
  };
  S.SKIN_FOR_MAT = { wood: 'planks', brick: 'brick', metal: 'metal' };

  // ---------- Geometry builders (local space: cell centre at origin, y=0 at piece base) ----------
  function box(w, h, d, x, y, z) { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); return g; }
  function merge(geos) { return FN.GeoUtil.merge(geos); }
  const TH = 0.26; // wall thickness
  const GEO = {};
  function wallGeo(variant) {
    const key = 'w_' + variant; if (GEO[key]) return GEO[key];
    let g;
    if (variant === 'solid') g = box(CELL, H, TH, 0, H / 2, 0);
    else if (variant === 'window') {
      const wy0 = 1.1, wy1 = 2.6, wx = 1.5;
      g = merge([box(CELL, wy0, TH, 0, wy0 / 2, 0), box(CELL, H - wy1, TH, 0, (H + wy1) / 2, 0), box((CELL - 2 * wx) / 2, wy1 - wy0, TH, -(CELL - (CELL - 2 * wx) / 2) / 2, (wy0 + wy1) / 2, 0), box((CELL - 2 * wx) / 2, wy1 - wy0, TH, (CELL - (CELL - 2 * wx) / 2) / 2, (wy0 + wy1) / 2, 0),
      box(2 * wx + 0.16, 0.08, TH + 0.08, 0, wy0, 0), box(2 * wx + 0.16, 0.08, TH + 0.08, 0, wy1, 0), box(0.08, wy1 - wy0, TH + 0.08, -wx, (wy0 + wy1) / 2, 0), box(0.08, wy1 - wy0, TH + 0.08, wx, (wy0 + wy1) / 2, 0), box(0.06, wy1 - wy0, 0.04, 0, (wy0 + wy1) / 2, 0), box(2 * wx, 0.06, 0.04, 0, (wy0 + wy1) / 2, 0)]);
    } else if (variant === 'door') {
      const dw = 1.3, dh = 2.5;
      g = merge([box((CELL - dw) / 2, H, TH, -(CELL + dw) / 4, H / 2, 0), box((CELL - dw) / 2, H, TH, (CELL + dw) / 4, H / 2, 0), box(dw, H - dh, TH, 0, (H + dh) / 2, 0), box(dw + 0.2, 0.1, TH + 0.1, 0, dh, 0), box(0.1, dh, TH + 0.1, -dw / 2, dh / 2, 0), box(0.1, dh, TH + 0.1, dw / 2, dh / 2, 0)]);
    } else if (variant === 'garage') {
      const dw = 4.0, dh = 3.0;
      g = merge([box((CELL - dw) / 2, H, TH, -(CELL + dw) / 4, H / 2, 0), box((CELL - dw) / 2, H, TH, (CELL + dw) / 4, H / 2, 0), box(dw, H - dh, TH, 0, (H + dh) / 2, 0)]);
    } else if (variant === 'half') g = box(CELL, H * 0.4, TH, 0, H * 0.2, 0);
     else if (variant === 'wedge') { // right-triangle prism under roof slope: base CELL wide at y=0, rising to H/2 at x=+CELL/2
       const shape = new THREE.Shape(); shape.moveTo(-CELL / 2, 0); shape.lineTo(CELL / 2, 0); shape.lineTo(CELL / 2, H / 2); shape.closePath();
       g = new THREE.ExtrudeGeometry(shape, { depth: TH, bevelEnabled: false }); g.translate(0, 0, -TH / 2);
     } else if (variant === 'gable') { // triangle prism: base CELL wide at y=0, apex at H/2
       const shape = new THREE.Shape(); shape.moveTo(-CELL / 2, 0); shape.lineTo(CELL / 2, 0); shape.lineTo(0, H / 2); shape.closePath();
       g = new THREE.ExtrudeGeometry(shape, { depth: TH, bevelEnabled: false }); g.translate(0, 0, -TH / 2);
    } else if (variant === 'fence') { g = merge([box(CELL, 0.12, 0.08, 0, 0.55, 0), box(CELL, 0.12, 0.08, 0, 1.05, 0), box(0.12, 1.2, 0.12, -CELL / 2 + 0.1, 0.6, 0), box(0.12, 1.2, 0.12, 0, 0.6, 0), box(0.12, 1.2, 0.12, CELL / 2 - 0.1, 0.6, 0)]); }
    else if (variant === 'railing') { g = merge([box(CELL, 0.08, 0.08, 0, 1.0, 0), box(0.08, 1.0, 0.08, -CELL / 2 + 0.05, 0.5, 0), box(0.08, 1.0, 0.08, 0, 0.5, 0), box(0.08, 1.0, 0.08, CELL / 2 - 0.05, 0.5, 0)]); }
    else if (variant === 'shopfront') { // big window
      const wy0 = 0.6, wy1 = 3.0;
      g = merge([box(CELL, wy0, TH, 0, wy0 / 2, 0), box(CELL, H - wy1, TH, 0, (H + wy1) / 2, 0), box(0.14, wy1 - wy0, TH, -CELL / 2 + 0.07, (wy0 + wy1) / 2, 0), box(0.14, wy1 - wy0, TH, CELL / 2 - 0.07, (wy0 + wy1) / 2, 0), box(CELL, wy1 - wy0, 0.03, 0, (wy0 + wy1) / 2, 0)]);
    } else g = box(CELL, H, TH, 0, H / 2, 0);
    GEO[key] = g; return g;
  }
  function floorGeo() { if (GEO.f) return GEO.f; GEO.f = box(CELL, 0.3, CELL, 0, 0, 0); return GEO.f; }
  function stairsGeo() {
    if (GEO.s) return GEO.s;
    const parts = []; const steps = 8;
    for (let i = 0; i < steps; i++) { const t0 = i / steps, t1 = (i + 1) / steps; const y = t1 * H; const z = CELL / 2 - (t0 + t1) / 2 * CELL; parts.push(box(CELL, Math.max(y, 0.3), CELL / steps + 0.02, 0, y / 2, z)); }
    // side rails
    parts.push(box(0.12, 0.9, CELL, -CELL / 2 + 0.06, H / 2 + 0.45, 0).rotateX(-Math.atan2(H, CELL)));
    GEO.s = merge(parts); return GEO.s;
  }
  function roofGeo(variant) {
    const key = 'r_' + variant; if (GEO[key]) return GEO[key];
    let g;
    if (variant === 'pyramid') { g = new THREE.ConeGeometry(CELL / Math.SQRT2, H / 2, 4, 1, false); g.rotateY(Math.PI / 4); g.translate(0, H / 4, 0); }
    else if (variant === 'slope') { // rises toward -Z by H/2 across the cell
      const ang = Math.atan2(H / 2, CELL); const len = Math.sqrt(CELL * CELL + (H / 2) * (H / 2));
      g = new THREE.BoxGeometry(CELL + 0.1, 0.22, len); g.rotateX(ang); g.translate(0, H / 4, 0);
    } else if (variant === 'flat') g = box(CELL, 0.25, CELL, 0, 0.1, 0);
    else if (variant === 'ridge') { g = box(CELL, 0.3, 0.6, 0, H / 2 - 0.1, 0); }
    GEO[key] = g; return g;
  }
  S.geometryFor = function (type, variant) {
    if (type === 'wall') return wallGeo(variant); if (type === 'floor') return floorGeo(); if (type === 'stairs') return stairsGeo(); if (type === 'roof') return roofGeo(variant); return floorGeo();
  };

  // ---------- Instanced groups ----------
  function groupKey(type, variant, skin) { return type + '|' + variant + '|' + skin; }
  function getGroup(type, variant, skin) {
    const k = groupKey(type, variant, skin); let g = S.groups[k]; if (g) return g;
    const geo = S.geometryFor(type, variant);
    const skinDef = SKINS[skin] ? SKINS[skin]() : {};
    const mat = new THREE.MeshLambertMaterial(Object.assign({ color: 0xffffff }, skinDef));
    if (variant === 'shopfront' || variant === 'window') mat.transparent = false;
    g = { key: k, type, variant, skin, geo, mat, cap: 128, mesh: null, items: [], free: [] };
    allocMesh(g, 128); S.groups[k] = g; return g;
  }
  function allocMesh(g, cap) {
    const old = g.mesh; const mesh = new THREE.InstancedMesh(g.geo, g.mat, cap);
    mesh.castShadow = false; mesh.receiveShadow = false; mesh.frustumCulled = false; mesh.count = 0; mesh.visible = false;
    const zero = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < cap; i++) mesh.setMatrixAt(i, zero);
    mesh.setColorAt(0, new THREE.Color(1, 1, 1)); // create instanceColor buffer
    for (let i = 0; i < cap; i++) mesh.setColorAt(i, WHITE);
    if (old) {
      const copyCount = g.items.length;
      for (let i = 0; i < copyCount; i++) {
        old.getMatrixAt(i, TMPM);
        mesh.setMatrixAt(i, TMPM);
        if (old.instanceColor) { old.getColorAt(i, TMPC); mesh.setColorAt(i, TMPC); }
      }
      mesh.count = copyCount;
      mesh.visible = old.visible;
      S.scene.remove(old);
      old.dispose();
    }
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mesh.instanceMatrix.needsUpdate = true; mesh.instanceColor.needsUpdate = true;
    g.mesh = mesh; g.cap = cap; S.scene.add(mesh);
  }
  const WHITE = new THREE.Color(1, 1, 1), TMPM = new THREE.Matrix4(), TMPC = new THREE.Color(), TMPQ = new THREE.Quaternion(), TMPV = new THREE.Vector3(), TMPS = new THREE.Vector3(1, 1, 1), YAXIS = new THREE.Vector3(0, 1, 0);

  S.init = function (scene) { S.scene = scene; S.pieces.clear(); S.hash.clear(); S.count = 0; };

  // ---------- Keys / placement ----------
  S.cellOf = (v) => Math.floor(v / CELL);
  S.levelOf = (y) => Math.round(y / H);
  function key(type, a, cx, ly, cz) { return type + ',' + a + ',' + cx + ',' + ly + ',' + cz; }
  function hashKey(cx, cz) { return cx + ',' + cz; }
  function hashAdd(p) { const k = hashKey(p.hx, p.hz); let arr = S.hash.get(k); if (!arr) { arr = []; S.hash.set(k, arr); } arr.push(p); }
  function hashRemove(p) { const k = hashKey(p.hx, p.hz); const arr = S.hash.get(k); if (!arr) return; const i = arr.indexOf(p); if (i >= 0) arr.splice(i, 1); if (!arr.length) S.hash.delete(k); }

  // opts: {type:'wall', axis:'x'|'z' (walls), variant, mat:'wood'|'brick'|'metal', skin, cx, ly, cz, rot, color, hp, grow:bool, yOff}
  S.add = function (o) {
    const type = o.type; let k, px, pz, rotY = 0;
    const variant = o.variant || (type === 'roof' ? 'pyramid' : 'solid');
    const mat = o.mat || 'wood'; const skin = o.skin || S.SKIN_FOR_MAT[mat];
    const yOff = o.yOff || 0; const ly = o.ly;
    if (type === 'wall') {
      const axis = o.axis || 'x';
      k = key('w', axis, o.cx, ly, o.cz);
      if (axis === 'x') { px = o.cx * CELL + CELL / 2; pz = o.cz * CELL; rotY = 0; } else { px = o.cx * CELL; pz = o.cz * CELL + CELL / 2; rotY = Math.PI / 2; }
      if ((variant === 'gable' || variant === 'wedge') && o.rot) rotY += Math.PI; // gable/wedge orientation flip
    } else {
      k = key(type[0], variant === 'slope' ? 'sl' : (type === 'roof' ? 'r' : 0), o.cx, ly, o.cz);
      if (type === 'wall' || type === 'floor' || type === 'stairs' || type === 'roof') { px = o.cx * CELL + CELL / 2; pz = o.cz * CELL + CELL / 2; rotY = -(o.rot || 0) * Math.PI / 2; }
    }
    if (S.pieces.has(k)) { if (o.replace) S.remove(S.pieces.get(k)); else return null; }
    const g = getGroup(type, variant, skin);
    let idx; if (g.free.length) idx = g.free.pop(); else { idx = g.items.length; if (idx >= g.cap) allocMesh(g, g.cap * 2); }
    const matDef = C.BUILD.MAT[mat] || C.BUILD.MAT.wood;
    const maxHp = o.hp || (variant === 'fence' || variant === 'railing' || variant === 'half' ? 100 : matDef.hp);
    // Keep ground-level pieces above the terrain when a grid cell sits on a
    // small height variation. Higher floors keep their requested Y level.
    const baseY = Math.max(ly * H + yOff, FN.Terrain.heightAt(px, pz));
    const p = { key: k, type, variant, mat, skin, cx: o.cx, ly, cz: o.cz, rot: o.rot || 0, axis: o.axis, x: px, y: baseY, z: pz, rotY, color: o.color !== undefined ? o.color : 0xffffff,
      hp: o.grow ? maxHp * matDef.startFrac : maxHp, maxHp, group: g, idx, hx: S.cellOf(px), hz: S.cellOf(pz), grow: !!o.grow, growT: 0, team: o.team, playerBuilt: !!o.grow };
    if (type === 'wall') { const ax = p.axis; p.hx = o.cx; p.hz = o.cz; if (ax === 'x') { p.hz = o.cz; } }
    computeAABB(p);
    g.items[idx] = p; S.pieces.set(k, p); hashAdd(p); S.count++;
    writeInstance(p); S.dirty.add(g);
    if (p.grow) S.growing.add(p);
    return p;
  };
  function computeAABB(p) {
    const y0 = p.y, y1 = p.y + H;
    if (p.type === 'wall') {
      const half = p.variant === 'half' ? H * 0.4 : (p.variant === 'gable' ? H / 2 : (p.variant === 'fence' || p.variant === 'railing' ? 1.2 : H));
      if (p.axis === 'x') p.aabb = { min: { x: p.x - CELL / 2, y: y0, z: p.z - TH / 2 }, max: { x: p.x + CELL / 2, y: y0 + half, z: p.z + TH / 2 } };
      else p.aabb = { min: { x: p.x - TH / 2, y: y0, z: p.z - CELL / 2 }, max: { x: p.x + TH / 2, y: y0 + half, z: p.z + CELL / 2 } };
      if (p.variant === 'door' || p.variant === 'garage') { // split into two side boxes + header
        const dw = p.variant === 'door' ? 1.3 : 4.0, dh = p.variant === 'door' ? 2.5 : 3.0;
        p.sub = [];
        if (p.axis === 'x') { p.sub.push({ min: { x: p.x - CELL / 2, y: y0, z: p.z - TH / 2 }, max: { x: p.x - dw / 2, y: y1, z: p.z + TH / 2 } }, { min: { x: p.x + dw / 2, y: y0, z: p.z - TH / 2 }, max: { x: p.x + CELL / 2, y: y1, z: p.z + TH / 2 } }, { min: { x: p.x - dw / 2, y: y0 + dh, z: p.z - TH / 2 }, max: { x: p.x + dw / 2, y: y1, z: p.z + TH / 2 } }); }
        else { p.sub.push({ min: { x: p.x - TH / 2, y: y0, z: p.z - CELL / 2 }, max: { x: p.x + TH / 2, y: y1, z: p.z - dw / 2 } }, { min: { x: p.x - TH / 2, y: y0, z: p.z + dw / 2 }, max: { x: p.x + TH / 2, y: y1, z: p.z + CELL / 2 } }, { min: { x: p.x - TH / 2, y: y0 + dh, z: p.z - CELL / 2 }, max: { x: p.x + TH / 2, y: y1, z: p.z + CELL / 2 } }); }
      }
    } else if (p.type === 'floor') p.aabb = { min: { x: p.x - CELL / 2, y: y0 - 0.15, z: p.z - CELL / 2 }, max: { x: p.x + CELL / 2, y: y0 + 0.15, z: p.z + CELL / 2 } };
    else if (p.type === 'stairs') { p.aabb = { min: { x: p.x - CELL / 2, y: y0, z: p.z - CELL / 2 }, max: { x: p.x + CELL / 2, y: y1, z: p.z + CELL / 2 } }; p.sub = rampSubs(p, H); }
     else if (p.type === 'roof') {
       const top = p.variant === 'flat' ? 0.25 : (p.variant === 'slope' ? H / 4 + 0.11 : H / 2);
       p.aabb = { min: { x: p.x - CELL / 2, y: y0, z: p.z - CELL / 2 }, max: { x: p.x + CELL / 2, y: y0 + top, z: p.z + CELL / 2 } };
       if (p.variant === 'slope') p.sub = rampSubs(p, H / 4 + 0.11);
       else if (p.variant === 'pyramid') {
         p.sub = [];
         for (let i = 0; i < 3; i++) {
           const t = (i + 0.5) / 3;
           const hw = CELL / 2 * (1 - t);
           p.sub.push({
             min: { x: p.x - hw, y: y0 + i * H / 6, z: p.z - hw }, 
             max: { x: p.x + hw, y: y0 + (i + 1) * H / 6, z: p.z + hw }
           });
         }
       }
     }
     // Gable / wedge wall pieces are thin triangular prisms on the roof ends.
     // Their full bounding box would act as an invisible wall poking out of the
     // roof, so collision uses stacked strips that follow the triangle instead.
     if (p.type === 'wall' && (p.variant === 'gable' || p.variant === 'wedge')) {
       const n = 6, sw = CELL / n, half = H / 2, wedge = p.variant === 'wedge';
       // The wedge prism rises toward local +x; map world strips onto the local
       // profile direction using the piece's quarter-turn instance rotation.
       const q = Math.round(p.rotY / (Math.PI / 2)) & 3;
       const flipped = wedge && (q === 1 || q === 2);
       p.sub = [];
       for (let i = 0; i < n; i++) {
         const t = (i + 0.5) / n;
         const tt = flipped ? 1 - t : t;
         const h = Math.max(0.12, wedge ? half * tt : half * (1 - Math.abs(2 * t - 1)));
         const a0 = -CELL / 2 + sw * i, a1 = a0 + sw;
         if (p.axis === 'x') p.sub.push({ min: { x: p.x + a0, y: y0, z: p.z - TH / 2 }, max: { x: p.x + a1, y: y0 + h, z: p.z + TH / 2 } });
         else p.sub.push({ min: { x: p.x - TH / 2, y: y0, z: p.z + a0 }, max: { x: p.x + TH / 2, y: y0 + h, z: p.z + a1 } });
       }
     }
   }
  function rampSubs(p, rise) { // match the eight visible stair steps
    const subs = []; const n = 8;
    for (let i = 0; i < n; i++) {
      const t0 = i / n, t1 = (i + 1) / n; const yTop = p.y + t1 * rise;
      // The visible stair steps are solid from their base. Keeping the
      // collision boxes solid underneath also closes the old back-face gap.
      const yBot = p.y;
      // local z from +CELL/2 (low) to -CELL/2 (high); rotate by rot
      const lz0 = CELL / 2 - t0 * CELL, lz1 = CELL / 2 - t1 * CELL;
      const r = p.rot & 3; let minx, maxx, minz, maxz;
      if (r === 0) { minx = p.x - CELL / 2; maxx = p.x + CELL / 2; minz = p.z + lz1; maxz = p.z + lz0; }
      else if (r === 2) { minx = p.x - CELL / 2; maxx = p.x + CELL / 2; minz = p.z - lz0; maxz = p.z - lz1; }
      else if (r === 1) { minz = p.z - CELL / 2; maxz = p.z + CELL / 2; minx = p.x - lz0; maxx = p.x - lz1; }
      else { minz = p.z - CELL / 2; maxz = p.z + CELL / 2; minx = p.x + lz1; maxx = p.x + lz0; }
      subs.push({ min: { x: minx, y: yBot, z: minz }, max: { x: maxx, y: yTop, z: maxz } });
    }
    return subs;
  }
  function writeInstance(p) {
    const g = p.group; const mesh = g.mesh;
    TMPQ.setFromAxisAngle(YAXIS, p.rotY); TMPV.set(p.x, p.y, p.z); TMPS.set(1, 1, 1);
    if (p.grow && p.hp < p.maxHp) { const f = 0.6 + 0.4 * (p.hp / p.maxHp); TMPS.set(1, f, 1); }
    TMPM.compose(TMPV, TMPQ, TMPS); mesh.setMatrixAt(p.idx, TMPM);
    TMPC.setHex(p.color); if (p.grow && p.hp < p.maxHp) TMPC.multiplyScalar(0.7).add(new THREE.Color(0.15, 0.3, 0.6)); mesh.setColorAt(p.idx, TMPC);
  }
  S.remove = function (p) {
    if (!p || !S.pieces.has(p.key)) return;
    S.pieces.delete(p.key); hashRemove(p); S.count--; S.growing.delete(p);
    const g = p.group; g.mesh.setMatrixAt(p.idx, new THREE.Matrix4().makeScale(0, 0, 0)); g.items[p.idx] = null; g.free.push(p.idx); S.dirty.add(g);
    p.dead = true;
  };
  S.flush = function () {
    for (const g of S.dirty) {
      g.mesh.count = g.items.length;
      g.mesh.visible = g.items.length > 0;
      g.mesh.instanceMatrix.needsUpdate = true;
      if (g.mesh.instanceColor) g.mesh.instanceColor.needsUpdate = true;
    }
    S.dirty.clear();
  };
  S.get = (k) => S.pieces.get(k);
  S.wallKey = (axis, cx, ly, cz) => key('w', axis, cx, ly, cz);
  S.floorKey = (cx, ly, cz) => key('f', 0, cx, ly, cz);

  S.update = function (dt) {
    if (S.growing.size) {
      for (const p of S.growing) {
        const md = C.BUILD.MAT[p.mat]; p.hp += (p.maxHp * (1 - md.startFrac)) * dt / md.time;
        if (p.hp >= p.maxHp) { p.hp = p.maxHp; p.grow = false; S.growing.delete(p); }
        writeInstance(p); S.dirty.add(p.group);
      }
    }
    S.flush();
  };

  // ---------- Queries ----------
  S.cellPieces = function (cx, cz) { return S.hash.get(hashKey(cx, cz)); };
  S.nearby = function (x, z, r, out) { // pieces whose hash cells are within r
    out = out || []; const c0 = S.cellOf(x - r), c1 = S.cellOf(x + r), z0 = S.cellOf(z - r), z1 = S.cellOf(z + r);
    for (let cz = z0 - 1; cz <= z1; cz++) for (let cx = c0 - 1; cx <= c1; cx++) { const arr = S.hash.get(hashKey(cx, cz)); if (arr) for (const p of arr) out.push(p); }
    return out;
  };
  S.boxes = function (p, out) { if (p.sub) { for (const b of p.sub) out.push(b); } else out.push(p.aabb); return out; };
  // Highest walkable surface at (x,z) with top <= yMax, among pieces near; returns {y, piece} or null
  S.groundAt = function (x, z, yMax, yMin) {
    let best = null; const cx = S.cellOf(x), cz = S.cellOf(z);
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      const arr = S.hash.get(hashKey(cx + dx, cz + dz)); if (!arr) continue;
      for (const p of arr) {
        if (p.type === 'wall') { // wall tops are walkable (thin) - only when x,z within its thin footprint
          const a = p.aabb; if (x < a.min.x || x > a.max.x || z < a.min.z || z > a.max.z) continue;
          const top = a.max.y; if (top <= yMax && top >= yMin && (!best || top > best.y)) best = { y: top, piece: p, kind: 'wall' };
          continue;
        }
        const a = p.aabb; if (x < a.min.x || x > a.max.x || z < a.min.z || z > a.max.z) continue;
        let top;
        if (p.type === 'floor') top = a.max.y;
        else if (p.type === 'stairs' || (p.type === 'roof' && p.variant === 'slope')) {
          const rise = p.type === 'stairs' ? H : H / 2; const t = rampT(p, x, z); top = p.y + t * rise + 0.15;
        } else if (p.type === 'roof' && p.variant === 'pyramid') { const u = Math.abs(x - p.x) / (CELL / 2), v = Math.abs(z - p.z) / (CELL / 2); top = p.y + (H / 2) * (1 - Math.max(u, v)) + 0.05; }
        else top = a.max.y;
        if (top <= yMax && top >= yMin && (!best || top > best.y)) best = { y: top, piece: p, kind: p.type };
      }
    }
    return best;
  };
  function rampT(p, x, z) { // 0 at low edge, 1 at high edge
    const r = p.rot & 3; let t;
    if (r === 0) t = (p.z + CELL / 2 - z) / CELL; else if (r === 2) t = (z - (p.z - CELL / 2)) / CELL; else if (r === 1) t = (x - (p.x - CELL / 2)) / CELL; else t = (p.x + CELL / 2 - x) / CELL;
    return U.clamp(t, 0, 1);
  }
  S.rampT = rampT;
  // Ray vs structures. ro, rd objects {x,y,z}; returns {t, piece, point} or null
  S.raycast = function (ro, rd, maxT, skipPlayerBuilt) {
    let best = null; const visited = new Set();
    const stepLen = CELL * 0.5; const n = Math.ceil(maxT / stepLen) + 1;
    for (let i = 0; i <= n; i++) {
      const t = Math.min(i * stepLen, maxT); const x = ro.x + rd.x * t, z = ro.z + rd.z * t;
      const cx = S.cellOf(x), cz = S.cellOf(z);
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
        const hk = hashKey(cx + dx, cz + dz); if (visited.has(hk)) continue; visited.add(hk);
        const arr = S.hash.get(hk); if (!arr) continue;
        for (const p of arr) {
          if (p.sub) { for (const b of p.sub) { const tt = U.rayAABB(ro, rd, b.min, b.max, maxT); if (tt >= 0 && (!best || tt < best.t)) best = { t: tt, piece: p }; } }
          else { const tt = U.rayAABB(ro, rd, p.aabb.min, p.aabb.max, maxT); if (tt >= 0 && (!best || tt < best.t)) best = { t: tt, piece: p }; }
        }
      }
      if (best && best.t < t) break;
    }
    if (best) best.point = { x: ro.x + rd.x * best.t, y: ro.y + rd.y * best.t, z: ro.z + rd.z * best.t };
    return best;
  };
  // Damage a piece; returns true if destroyed
  S.damage = function (p, amount, source) {
    if (!p || p.dead) return false; p.hp -= amount;
    if (p.hp <= 0) { if (FN.FX) FN.FX.debris(p.x, p.y + (p.type === 'wall' ? H / 2 : 0.3), p.z, p.mat); S.remove(p); if (FN.Audio) FN.Audio.play('build_destroy', { x: p.x, y: p.y, z: p.z }, 0.8, 90); return true; }
    if (!p.grow) { writeInstance(p); S.dirty.add(p.group); }
    return false;
  };
  S.clear = function () { for (const p of Array.from(S.pieces.values())) S.remove(p); S.flush(); };
  FN.Structures = S;
})();
