// World loot: chests, ammo boxes and floor items. Logical objects everywhere; meshes only near the player (pooled).
window.FN = window.FN || {};
(function () {
  const C = FN.CONFIG, U = FN.U;
  const L = { items: [], chests: [], boxes: [], hash: new Map(), HCELL: 24, visible: new Set(), meshRange: 140, nextId: 1 };
  function hk(x, z) { return Math.floor(x / L.HCELL) + ',' + Math.floor(z / L.HCELL); }
  function hadd(o) { const k = hk(o.x, o.z); let a = L.hash.get(k); if (!a) { a = []; L.hash.set(k, a); } a.push(o); o.hk = k; }
  function hrem(o) { const a = L.hash.get(o.hk); if (a) { const i = a.indexOf(o); if (i >= 0) a.splice(i, 1); } }
  function hmove(o) { const k = hk(o.x, o.z); if (k === o.hk) return; hrem(o); hadd(o); }
  L.init = function (scene) { L.scene = scene; L.items = []; L.chests = []; L.boxes = []; L.hash.clear(); L.visible.clear(); L.group = new THREE.Group(); L.group.name = 'loot'; scene.add(L.group); };

  // ---------- generation ----------
  L.rollRarity = function (table) { const items = Object.keys(table).map(k => ({ id: k, w: table[k] })).filter(i => i.w > 0); return U.weightedPick(items).id; };
  L.rollWeapon = function (rarityTable) {
    const ids = Object.keys(C.LOOT.WEAPON_WEIGHTS); const w = U.weightedPick(ids.map(id => ({ id, w: C.LOOT.WEAPON_WEIGHTS[id] }))).id;
    const def = C.WEAPONS[w];
    // rarity restricted to the weapon's available rarities
    const table = {}; for (const r of def.rarities) table[r] = rarityTable[r] || 0;
    let sum = 0; for (const r in table) sum += table[r]; if (sum === 0) for (const r of def.rarities) table[r] = 1;
    const rarity = L.rollRarity(table);
    return { kind: 'weapon', id: w, rarity, ammo: def.mag };
  };
  L.rollConsumable = function () { const id = L.rollRarity(C.LOOT.CONSUMABLE_WEIGHTS); const def = C.CONSUMABLES[id]; return { kind: 'consumable', id, count: id === 'bandage' ? 5 : (id === 'minishield' ? 3 : (id === 'shield' || id === 'medkit' ? 1 : 1)) }; };
  L.rollAmmo = function (type) { type = type || U.pick(['light', 'medium', 'heavy', 'shells', 'rockets']); const box = C.AMMO[type].box; return { kind: 'ammo', id: type, count: type === 'rockets' ? 2 : Math.round(box * (0.8 + U.rand() * 0.6)) }; };
  L.chestContents = function () {
    const out = []; const w = L.rollWeapon(C.LOOT.CHEST_WEAPON_RARITY); out.push(w);
    // more ammo for the weapon it gives
    out.push({ kind: 'ammo', id: C.WEAPONS[w.id].ammo, count: Math.round(C.WEAPONS[w.id].pickupAmmo * 1.6) });
    // + a second, random ammo pool (very common now)
    if (U.rand() < 0.9) out.push(L.rollAmmo());
    if (U.rand() < 0.65) out.push(L.rollConsumable());
    out.push({ kind: 'material', id: U.pick(['wood', 'brick', 'metal']), count: C.LOOT.CHEST_MATS });
    return out;
  };
  L.ammoBoxContents = function () { const types = ['light', 'medium', 'shells', 'heavy', 'rockets']; const n = U.rand() < 0.5 ? 1 : 2; const out = []; const used = new Set(); for (let i = 0; i < n; i++) { const t = U.weightedPick([{ id: 'light', w: 30 }, { id: 'medium', w: 34 }, { id: 'shells', w: 22 }, { id: 'heavy', w: 10 }, { id: 'rockets', w: 4 }]).id; if (used.has(t)) continue; used.add(t); out.push({ kind: 'ammo', id: t, count: C.AMMO[t].box }); } return out; };
  L.floorItem = function () {
    const k = L.rollRarity(C.LOOT.FLOOR_KIND);
    if (k === 'weapon') { const w = L.rollWeapon(C.LOOT.FLOOR_WEAPON_RARITY); return [w, { kind: 'ammo', id: C.WEAPONS[w.id].ammo, count: Math.round(C.WEAPONS[w.id].pickupAmmo * 0.6) }]; }
    if (k === 'consumable') return [L.rollConsumable()];
    return [L.rollAmmo()];
  };

  // ---------- population ----------
  L.populate = function () {
    const spots = FN.POI.lootSpots; let nc = 0, na = 0, nf = 0;
    for (const s of spots) {
      if (s.kind === 'chest') {
        if (U.rand() < (s.p || C.LOOT.CHEST_SPAWN)) {
          // 80% of upper spots become ground/ground-floor chests, 20% stay on
          // a second floor, and roof-marked spots are never used as roofs.
          const groundSpawn = !!s.roof || (!!s.upper && U.rand() < 0.8);
          const y = groundSpawn ? FN.Terrain.heightAt(s.x, s.z) + 0.25 : s.y;
          L.addChest(s.x, y, s.z, Object.assign({}, s, { groundSpawn })); nc++;
        }
      }
      else if (s.kind === 'ammo') { if (U.rand() < (s.p || C.LOOT.AMMO_SPAWN)) { L.addAmmoBox(s.x, s.y, s.z, s); na++; } }
      else if (s.kind === 'floor') { if (U.rand() < (s.p || C.LOOT.FLOOR_SPAWN)) { const its = L.floorItem(); L.dropItems(its, s.x, s.y, s.z, 0.0, s); nf++; } }
      else if (s.kind === 'island') { L.dropItems([Object.assign({}, s.item)], s.x, s.y, s.z, 0, s); }
    }
    L.counts = { chests: nc, ammo: na, floor: nf };
    // extra chests in open / plain areas (away from buildings, POIs, water and the spawn island)
    L.scatterPlainChests();
  };
  // Scatter a healthy number of chests across empty open ground so looting isn't only in towns.
  L.scatterPlainChests = function () {
    const W = C.WORLD_SIZE, lim = W / 2 - 240; const bld = FN.POI.buildings || []; const pois = (FN.MapData && FN.MapData.pois) || [];
    const t = FN.Terrain;
    let placed = 0, guard = 0; const target = 55;
    while (placed < target && guard < 1400) {
      guard++;
      const x = (U.rand() * 2 - 1) * lim, z = (U.rand() * 2 - 1) * lim;
      // skip water
      const h = t.heightAt(x, z); if (t.waterLevelAt && h < t.waterLevelAt(x, z) + 0.4) continue;
      // skip any named POI footprint (incl. the spawn island) and any building footprint
      let near = false;
      for (const p of pois) if (p && p.r && U.dist2(x, z, p.p[0], p.p[1]) < p.r + 20) { near = true; break; }
      if (!near) for (const bu of bld) { if (Math.abs(x - bu.x) < bu.w / 2 + 16 && Math.abs(z - bu.z) < bu.d / 2 + 16) { near = true; break; } }
      if (near) continue;
      if (h < 2) continue; // keep away from low beaches
      L.addChest(x, h + 0.2, z, { p: 1, plain: true }); placed++;
    }
  };
  function surfaceY(x, y, z, spot) {
    if (spot && spot.groundSpawn) return FN.Terrain.heightAt(x, z) + 0.22;
    // Stay near the source floor. Searching from a global lower bound lets a
    // lower-story chest incorrectly choose the roof as its landing surface.
    const g = FN.Physics.groundAt(x, z, y + 2.5, y - 2.5);
    return g && Number.isFinite(g.y) ? g.y + 0.22 : y + 0.12;
  }
  L.addChest = function (x, y, z, spot) { y = surfaceY(x, y, z, spot); const c = { id: L.nextId++, type: 'chest', x, y, z, rot: (spot && spot.rot) || (U.rand() < 0.5 ? 0 : Math.PI / 2), opened: false, spot, mesh: null, contents: null }; L.chests.push(c); hadd(c); return c; };
  L.addAmmoBox = function (x, y, z, spot) { y = surfaceY(x, y, z); const b = { id: L.nextId++, type: 'ammobox', x, y, z, rot: U.rand() * Math.PI, opened: false, spot, mesh: null }; L.boxes.push(b); hadd(b); return b; };
  // Resolve a drop against the nearby building floor first. Terrain can be
  // slightly above an embedded wooden floor, which used to put loot inside
  // the floor and make it appear to vanish.
  L.dropSurface = function (x, y, z) {
    // Cast from just above the source position so a lower-story drop cannot
    // accidentally land on a ceiling or upper floor. The first hit is the
    // actual surface directly underneath the item.
    if (FN.Physics && FN.Physics.raycast) {
      const ro = { x, y: y + 0.8, z }; const hit = FN.Physics.raycast(ro, { x: 0, y: -1, z: 0 }, 12, { entities: [] });
      if (hit && Number.isFinite(hit.t)) return ro.y - hit.t;
    }
    const s = FN.Structures && FN.Structures.groundAt ? FN.Structures.groundAt(x, z, y + 4, y - 4) : null;
    if (s && Number.isFinite(s.y)) return s.y;
    const g = FN.Physics.groundAt(x, z, y + 4, 4);
    return g && Number.isFinite(g.y) ? g.y : FN.Terrain.heightAt(x, z);
  };
  // Drop item objects onto the ground around (x,y,z). spread in metres. Items land on the surface.
  L.dropItems = function (items, x, y, z, spread, spot, scatter, settle) {
    const out = [];
    items.forEach((it, i) => {
      const a = (i / items.length) * Math.PI * 2 + U.rand(); const r = spread ? spread * (0.5 + U.rand() * 0.5) : 0;
      const ix = x + Math.cos(a) * r, iz = z + Math.sin(a) * r;
      // Every item is settled to the nearest floor around its source height;
      // this prevents manually dropped items from falling through buildings.
      let iy = L.dropSurface(ix, y, iz) + 0.22;
      const o = { id: L.nextId++, type: 'item', item: Object.assign({}, it), x: ix, y: iy, z: iz, rot: U.rand() * 6.28, mesh: null, spot, t: 0, pickupDelay: scatter ? 1.0 : 0, dropFloorY: iy - 0.22, fly: scatter && !settle ? { vx: Math.cos(a) * 1.4, vy: 3.2 + U.rand() * 1.0, vz: Math.sin(a) * 1.4, y0: y + 0.6 } : null };
      if (o.fly) { o.x = x; o.z = z; o.y = y + 0.6; o.tx = ix; o.tz = iz; }
      L.items.push(o); hadd(o); out.push(o);
    });
    return out;
  };
  L.remove = function (o) {
    hrem(o); if (o.mesh) { L.group.remove(o.mesh); o.mesh = null; } L.visible.delete(o);
    const arr = o.type === 'item' ? L.items : (o.type === 'chest' ? L.chests : L.boxes); const i = arr.indexOf(o); if (i >= 0) arr.splice(i, 1); o.dead = true;
  };
  L.nearby = function (x, z, r, out) {
    out = out || []; const c0 = Math.floor((x - r) / L.HCELL), c1 = Math.floor((x + r) / L.HCELL), z0 = Math.floor((z - r) / L.HCELL), z1 = Math.floor((z + r) / L.HCELL);
    for (let cz = z0; cz <= z1; cz++) for (let cx = c0; cx <= c1; cx++) { const a = L.hash.get(cx + ',' + cz); if (a) for (const o of a) out.push(o); }
    return out;
  };
  // ---------- opening ----------
  L.openChest = function (c, opener) {
    if (c.opened) return []; c.opened = true; c.contents = L.chestContents();
    const items = L.dropItems(c.contents, c.x, c.y, c.z, 1.1, null, true, true);
    if (FN.Audio) FN.Audio.play('chest_open', { x: c.x, y: c.y, z: c.z }, 1, 60);
    if (c.mesh) { c.mesh.userData.openT = 0; }
    return items;
  };
  L.openAmmoBox = function (b) {
    if (b.opened) return []; b.opened = true; const its = L.ammoBoxContents();
    const items = L.dropItems(its, b.x, b.y, b.z, 0.8, null, true, true);
    if (FN.Audio) FN.Audio.play('ammo_open', { x: b.x, y: b.y, z: b.z }, 1, 40);
    if (b.mesh) b.mesh.userData.openT = 0;
    return items;
  };
  // ---------- rendering (pooled by distance) ----------
  function buildMesh(o) {
    let m;
    if (o.type === 'chest') { m = FN.ItemModels.chest(); m.userData.openT = o.opened ? 1 : -1; }
    else if (o.type === 'ammobox') { m = FN.ItemModels.ammoBox(); m.userData.openT = o.opened ? 1 : -1; }
    else {
      const it = o.item; const g = new THREE.Group();
      let inner;
      if (it.kind === 'weapon') { inner = FN.WeaponModels.build(C.WEAPONS[it.id].model); inner.rotation.z = 0; inner.rotation.x = 0; inner.position.y = 0.15; }
      else if (it.kind === 'consumable') inner = FN.ItemModels.consumable(it.id);
      else if (it.kind === 'ammo') inner = FN.ItemModels.ammoPickup(it.id);
      else inner = FN.ItemModels.materialPickup(it.id);
      g.add(inner); g.userData.inner = inner;
      const col = it.kind === 'weapon' ? C.RARITY[it.rarity].hex : (it.kind === 'consumable' ? C.RARITY[C.CONSUMABLES[it.id].rarity].hex : 0xd0d0d0);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: FN.Tex.glow(), color: col, transparent: true, opacity: it.kind === 'weapon' ? 0.75 : 0.45, depthWrite: false, blending: THREE.AdditiveBlending })); glow.scale.set(it.kind === 'weapon' ? 1.9 : 1.1, it.kind === 'weapon' ? 1.9 : 1.1, 1); glow.position.y = 0.3; g.add(glow);
      if (it.kind === 'weapon') { const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 2.2, 8, 1, true), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.16, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })); beam.position.y = 1.2; g.add(beam); }
      m = g;
    }
    m.position.set(o.x, o.y, o.z); m.rotation.y = o.rot;
    // lift chests/ammo boxes a touch so their base sits clearly on top of floors
    // (before they were level with the floor top, which made them look half-buried)
    if (o.type === 'chest') m.position.y += 0.12; else if (o.type === 'ammobox') m.position.y += 0.08;
    return m;
  }
  L.update = function (dt, px, pz) {
    // flying items (chest pop) + dropped items pick-up delay
    for (const o of L.items) {
      if (o.pickupDelay > 0) o.pickupDelay = Math.max(0, o.pickupDelay - dt);
      if (o.fly) { o.t += dt; const f = o.fly; o.y += f.vy * dt; f.vy -= 12 * dt; o.x += (o.tx - o.x) * Math.min(1, dt * 5); o.z += (o.tz - o.z) * Math.min(1, dt * 5); hmove(o); const gy = L.dropSurface(o.x, o.dropFloorY, o.z); if (o.y <= gy && f.vy < 0) { o.y = gy + 0.08; o.fly = null; o.t = 0; hmove(o); } if (o.mesh) o.mesh.position.set(o.x, o.y, o.z); }
    }
    // visibility management (every few frames)
    L._vt = (L._vt || 0) + dt; if (L._vt > 0.25) {
      L._vt = 0; const near = L.nearby(px, pz, L.meshRange, []); const set = new Set();
      for (const o of near) { if (U.dist2sq(o.x, o.z, px, pz) < L.meshRange * L.meshRange) set.add(o); }
      for (const o of L.visible) if (!set.has(o)) { if (o.mesh) { L.group.remove(o.mesh); o.mesh = null; } L.visible.delete(o); }
      for (const o of set) if (!L.visible.has(o)) { if (o.training) continue; o.mesh = buildMesh(o); L.group.add(o.mesh); L.visible.add(o); }
    }
    const t = FN.Engine.time;
    if (FN.Audio && FN.Audio.ready) { let best = 1e9, bc = null; for (const o of L.visible) { if (o.type !== 'chest' || o.opened) continue; const d = U.dist3({ x: o.x, y: o.y, z: o.z }, { x: px, y: FN.Player ? FN.Player.pos.y : o.y, z: pz }); if (d < best) { best = d; bc = o; } } FN.Audio.loop('chest_hum', !!bc && best < 24, { gain: bc ? U.clamp(0.35 - best / 70, 0.04, 0.35) : 0 }); }
    for (const o of L.visible) {
      const m = o.mesh; if (!m) continue;
      if (o.type === 'item') { if (o.training) continue; m.rotation.y += dt * 1.2; m.position.set(o.x, o.y + 0.25 + Math.sin(t * 2 + o.id) * 0.06, o.z); }
      else if (o.type === 'chest' || o.type === 'ammobox') {
        if (m.userData.openT >= 0 && m.userData.openT < 1) { m.userData.openT = Math.min(1, m.userData.openT + dt * 2.5); }
        const ot = Math.max(0, m.userData.openT); m.lid.rotation.x = -ot * 1.9;
        if (o.type === 'chest') { m.glow.material.opacity = o.opened ? 0.15 : 0.45 + Math.sin(t * 3) * 0.12; m.beam.visible = !o.opened; m.inner.visible = ot > 0.3; m.glow.scale.setScalar(o.opened ? 1.2 : 2.2 + Math.sin(t * 3) * 0.2); }
      }
    }
  };
  // Nearest interactable to a ray (for the E prompt)
  L.findInteract = function (ro, rd, maxDist, px, py, pz) {
    let best = null;
    const near = L.nearby(px, pz, maxDist + 2, []);
    for (const o of near) {
      if (o.dead) continue; if ((o.type === 'chest' || o.type === 'ammobox') && o.opened) continue;
      const cx = o.x, cy = o.y + 0.35, cz = o.z; const dx = cx - px, dy = cy - (py + 1.2), dz = cz - pz; const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (d > maxDist) continue;
      // angle to view direction
      const dot = (dx * rd.x + dy * rd.y + dz * rd.z) / d; if (dot < 0.55 && d > 1.4) continue;
      if (!FN.Physics.lineOfSight(ro, { x: o.x, y: o.y + 0.4, z: o.z })) continue;
      const score = d - dot; if (!best || score < best.score) best = { o, d, score };
    }
    return best ? best.o : null;
  };
  L.registerItem = function (o) { L.items.push(o); hadd(o); };
  L.clear = function () { for (const o of Array.from(L.visible)) { if (o.mesh) L.group.remove(o.mesh); } L.visible.clear(); L.items = []; L.chests = []; L.boxes = []; L.hash.clear(); };
  L.setQuality = function (range) { L.meshRange = range || 35; };
  FN.Loot = L;
})();
