// POI layouts: builds every named location from grid pieces + props, registers loot spots and nav points,
// then dresses the streets (lamps, parked cars, bins) so towns read as real places.
window.FN = window.FN || {};
(function () {
  const C = FN.CONFIG, U = FN.U, S = () => FN.Structures, P = () => FN.Props;
  const CELL = C.CELL, H = C.WALL_H;
  const POI = { lootSpots: [], navSpots: [], buildings: [], signs: [] };
  const rnd = () => U.rng();

  // ---------- low-level helpers ----------
  const wallX = (cx, ly, cz, o) => S().add(Object.assign({ type: 'wall', axis: 'x', cx, ly, cz }, o || {}));
  const wallZ = (cx, ly, cz, o) => S().add(Object.assign({ type: 'wall', axis: 'z', cx, ly, cz }, o || {}));
  const floor = (cx, ly, cz, o) => S().add(Object.assign({ type: 'floor', cx, ly, cz }, o || {}));
  const stairs = (cx, ly, cz, rot, o) => S().add(Object.assign({ type: 'stairs', cx, ly, cz, rot }, o || {}));
  const roof = (cx, ly, cz, variant, rot, o) => S().add(Object.assign({ type: 'roof', variant, cx, ly, cz, rot }, o || {}));
  const cellX = (cx) => cx * CELL + CELL / 2, cellZ = (cz) => cz * CELL + CELL / 2;
  POI.cellX = cellX; POI.cellZ = cellZ;
  const toCell = (v) => Math.floor(v / CELL);

  function addLoot(kind, x, y, z, extra) { const s = Object.assign({ kind, x, y, z }, extra || {}); POI.lootSpots.push(s); return s; }
  function addNav(x, z, tag) { POI.navSpots.push({ x, z, tag }); }

  function perimeter(cx0, cz0, w, d, ly, opts, variantFn) {
    for (let i = 0; i < w; i++) {
      const vn = variantFn ? variantFn('N', i, w) : {}; wallX(cx0 + i, ly, cz0, Object.assign({}, opts, vn));
      const vs = variantFn ? variantFn('S', i, w) : {}; wallX(cx0 + i, ly, cz0 + d, Object.assign({}, opts, vs));
    }
    for (let j = 0; j < d; j++) {
      const vw = variantFn ? variantFn('W', j, d) : {}; wallZ(cx0, ly, cz0 + j, Object.assign({}, opts, vw));
      const ve = variantFn ? variantFn('E', j, d) : {}; wallZ(cx0 + w, ly, cz0 + j, Object.assign({}, opts, ve));
    }
  }
  function floorRect(cx0, cz0, w, d, ly, opts, skip) {
    for (let j = 0; j < d; j++) for (let i = 0; i < w; i++) { if (skip && skip(i, j)) continue; floor(cx0 + i, ly, cz0 + j, opts); }
  }
  function gableRoof(cx0, cz0, w, d, ly, opts) {
    const o = Object.assign({ skin: 'roof', mat: 'wood', color: 0x8a5a48 }, opts || {});
    const endOpts = Object.assign({}, o, { skin: o.wallSkin || 'siding', color: o.wallColor !== undefined ? o.wallColor : 0xffffff });
    if (o.ridge === 'z') {
      const half = w / 2;
      for (let i = 0; i < w; i++) {
        const k = i < half ? i : (w - 1 - i); const rot = i < half ? 1 : 3;
        for (let j = 0; j < d; j++) roof(cx0 + i, ly, cz0 + j, 'slope', rot, Object.assign({}, o, { yOff: k * H / 2 }));
        const hiEast = i < half;
        for (const zz of [cz0, cz0 + d]) {
          if (k > 0) wallX(cx0 + i, ly, zz, Object.assign({}, endOpts, { variant: 'half', slot: 2 }));
          for (let s = 1; s < k; s++) wallX(cx0 + i, ly, zz, Object.assign({}, endOpts, { variant: 'half', slot: 2 + s, yOff: s * H / 2 }));
          wallX(cx0 + i, ly, zz, Object.assign({}, endOpts, { variant: 'wedge', rot: hiEast ? 0 : 1, slot: 1, yOff: k * H / 2 }));
        }
      }
    } else {
      const half = d / 2;
      for (let j = 0; j < d; j++) {
        const k = j < half ? j : (d - 1 - j); const rot = j < half ? 2 : 0;
        for (let i = 0; i < w; i++) roof(cx0 + i, ly, cz0 + j, 'slope', rot, Object.assign({}, o, { yOff: k * H / 2 }));
        const hiSouth = j < half;
        for (const xx of [cx0, cx0 + w]) {
          if (k > 0) wallZ(xx, ly, cz0 + j, Object.assign({}, endOpts, { variant: 'half', slot: 2 }));
          for (let s = 1; s < k; s++) wallZ(xx, ly, cz0 + j, Object.assign({}, endOpts, { variant: 'half', slot: 2 + s, yOff: s * H / 2 }));
          wallZ(xx, ly, cz0 + j, Object.assign({}, endOpts, { variant: 'wedge', rot: hiSouth ? 1 : 0, slot: 1, yOff: k * H / 2 }));
        }
      }
    }
  }
  function flatRoof(cx0, cz0, w, d, ly, opts) { floorRect(cx0, cz0, w, d, ly, Object.assign({ skin: 'concrete', mat: 'brick', color: 0xbdbdb8 }, opts || {})); if (opts && opts.railing) perimeter(cx0, cz0, w, d, ly, { variant: 'railing', mat: 'metal', skin: 'metal', color: 0x777777, hp: 60 }); }
  function clearProps(x, z, r) { const near = P().nearby(x, z, r, []); return near.length === 0; }
  function clearStruct(x, z, r) { const near = S().nearby(x, z, r, []); for (const p of near) { const a = p.aabb; if (x > a.min.x - r && x < a.max.x + r && z > a.min.z - r && z < a.max.z + r) return false; } return true; }
  // door outside/inside points for a rect facing `side`
  function doorOf(cx0, cz0, w, d, side, cell) {
    const doorX = side === 'N' || side === 'S' ? cellX(cx0 + cell) : (side === 'W' ? cx0 * CELL : (cx0 + w) * CELL);
    const doorZ = side === 'N' || side === 'S' ? (side === 'N' ? cz0 * CELL : (cz0 + d) * CELL) : cellZ(cz0 + cell);
    const out = side === 'N' ? [0, -3] : side === 'S' ? [0, 3] : side === 'W' ? [-3, 0] : [3, 0];
    return { x: doorX + out[0], z: doorZ + out[1], ix: doorX - out[0], iz: doorZ - out[1], wx: doorX, wz: doorZ, side };
  }
  // yard details: doorstep, mailbox, bushes, chimney
  function houseExtras(cx0, cz0, w, d, ly, door, LT, ridge, roofY) {
    const out = door.side === 'N' ? [0, -1] : door.side === 'S' ? [0, 1] : door.side === 'W' ? [-1, 0] : [1, 0];
    P().add('step', door.wx + out[0] * 0.6, door.wz + out[1] * 0.6, { y: ly * H, rot: door.side === 'N' || door.side === 'S' ? 0 : Math.PI / 2 });
    if (rnd() < 0.7) P().add('mailbox', door.wx + out[0] * 4.2 + out[1] * 2.2, door.wz + out[1] * 4.2 - out[0] * 2.2, { y: ly * H, rot: door.side === 'N' || door.side === 'S' ? 0 : Math.PI / 2 });
    // bushes along walls (skip the door wall)
    const sides = ['N', 'S', 'W', 'E'].filter(s => s !== door.side);
    const n = 2 + U.randInt(0, 2);
    for (let k = 0; k < n; k++) {
      const s = U.pick(sides); let x, z;
      if (s === 'N') { x = cx0 * CELL + rnd() * w * CELL; z = cz0 * CELL - 1.0; } else if (s === 'S') { x = cx0 * CELL + rnd() * w * CELL; z = (cz0 + d) * CELL + 1.0; }
      else if (s === 'W') { x = cx0 * CELL - 1.0; z = cz0 * CELL + rnd() * d * CELL; } else { x = (cx0 + w) * CELL + 1.0; z = cz0 * CELL + rnd() * d * CELL; }
      P().add('bush', x, z, { y: ly * H, scale: 0.6 + rnd() * 0.4 });
    }
    // chimney near the ridge
    if (roofY !== undefined) {
      if (ridge === 'x') P().add('chimney', cellX(cx0 + w - 1) - 0.9, (cz0 + d / 2) * CELL, { y: roofY, rot: 0 });
      else P().add('chimney', (cx0 + w / 2) * CELL, cellZ(cz0 + d - 1) - 0.9, { y: roofY, rot: 0 });
    }
  }

  // ---------- Buildings ----------
  function house(cx0, cz0, w, d, ly, o) {
    o = Object.assign({ stories: 2, skin: 'siding', color: 0xf2f2f2, roofColor: 0x7a4a3a, doorSide: 'S', ridge: 'x', attic: true, mat: 'wood', extras: true }, o || {});
    const wallOpts = { mat: o.mat, skin: o.skin, color: o.color };
    const doorCell = Math.floor((o.doorSide === 'N' || o.doorSide === 'S' ? w : d) / 2);
    for (let s = 0; s < o.stories; s++) {
      const L = ly + s;
      perimeter(cx0, cz0, w, d, L, wallOpts, (side, i, n) => {
        if (s === 0 && side === o.doorSide && i === doorCell) return { variant: 'door' };
        if (s === 0 && i === doorCell && side !== o.doorSide && rnd() < 0.25) return { variant: 'door' };
        return { variant: rnd() < (s === 0 ? 0.55 : 0.7) ? 'window' : 'solid' };
      });
      floorRect(cx0, cz0, w, d, L, { mat: 'wood', skin: 'planks', color: 0xcfa66a }, (i, j) => (s > 0 && o.stories > 1 && i === w - 1 && j === d - 1));
    }
    if (o.stories > 1) {
      stairs(cx0 + w - 1, ly, cz0 + d - 1, 0, { mat: 'wood', skin: 'planks', color: 0xcfa66a });
      if (o.stories > 2) stairs(cx0 + w - 1, ly + 1, cz0 + d - 1, 0, { mat: 'wood', skin: 'planks', color: 0xcfa66a });
      if (w >= 3) for (let j = 0; j < d; j++) wallZ(cx0 + Math.floor(w / 2), ly, cz0 + j, { mat: 'wood', skin: 'siding', color: 0xf7f0e0, variant: j === 0 ? 'door' : 'solid' });
    }
    const LT = ly + o.stories;
    if (o.attic) floorRect(cx0, cz0, w, d, LT, { mat: 'wood', skin: 'planks', color: 0xb98d55 });
    gableRoof(cx0, cz0, w, d, LT, { ridge: o.ridge, color: o.roofColor, wallSkin: o.skin, wallColor: o.color });
    const gx = cellX(cx0 + Math.floor(w / 2)), gz = cellZ(cz0 + Math.floor(d / 2));
    const door = doorOf(cx0, cz0, w, d, o.doorSide, doorCell);
    addNav(door.x, door.z, 'door');
    const chestSpots = [];
    if (o.attic) chestSpots.push({ x: gx, y: LT * H + 0.15, z: gz, floor: LT, attic: true });
    chestSpots.push({ x: cellX(cx0), y: ly * H + 0.15, z: cellZ(cz0), floor: ly });
    if (o.stories > 1) chestSpots.push({ x: cellX(cx0 + w - 1), y: (ly + 1) * H + 0.15, z: cellZ(cz0), floor: ly + 1 });
    for (const cs of chestSpots) addLoot('chest', cs.x, cs.y, cs.z, { door, p: cs.attic ? 0.5 : 0.35, upper: cs.floor > ly });
    for (let s = 0; s < o.stories; s++) { const L = ly + s; for (let k = 0; k < 2; k++) { const i = U.randInt(0, w - 1), j = U.randInt(0, d - 1); addLoot('floor', cellX(cx0 + i), L * H + 0.15, cellZ(cz0 + j), { door, p: 0.45 }); } }
    addLoot('ammo', cellX(cx0 + w - 1), ly * H + 0.15, cellZ(cz0 + Math.max(0, d - 2)), { door, p: 0.5 });
    if (o.extras) houseExtras(cx0, cz0, w, d, ly, door, LT, o.ridge, LT * H + H / 2 - 0.55);
    const b = { kind: 'house', x: gx, z: gz, w: w * CELL, d: d * CELL, door, ly, name: o.name }; POI.buildings.push(b); return b;
  }
  // centre-based placement helper: house centred at (poi + dx, poi + dz)
  function houseAt(poi, dx, dz, w, d, ly, o) { const cx0 = toCell(poi.p[0] + dx) - Math.floor(w / 2), cz0 = toCell(poi.p[1] + dz) - Math.floor(d / 2); return house(cx0, cz0, w, d, ly, o); }
  function barn(cx0, cz0, w, d, ly, o) {
    o = Object.assign({ color: 0xb8362a, roofColor: 0x6a4a3a, ridge: 'x' }, o || {});
    const wo = { mat: 'wood', skin: 'planks', color: o.color };
    for (let s = 0; s < 2; s++) perimeter(cx0, cz0, w, d, ly + s, wo, (side, i, n) => {
      if (s === 0 && (side === 'S' || side === 'N') && (i === Math.floor(n / 2) || i === Math.floor(n / 2) - 1)) return { variant: 'garage' };
      if (s === 1 && rnd() < 0.3) return { variant: 'window' }; return {};
    });
    floorRect(cx0, cz0, w, d, ly, { mat: 'wood', skin: 'darkwood', color: 0x9a7a4a });
    const loftD = Math.floor(d / 2);
    floorRect(cx0, cz0, w, loftD, ly + 1, { mat: 'wood', skin: 'planks', color: 0xb98d55 });
    stairs(cx0, ly, cz0 + loftD, 0, { mat: 'wood', skin: 'planks', color: 0xb98d55 });
    for (let i = 0; i < w; i++) wallX(cx0 + i, ly + 1, cz0 + loftD, { variant: 'railing', mat: 'wood', skin: 'planks', color: 0x9a7a4a, hp: 60 });
    const LT = ly + 2; gableRoof(cx0, cz0, w, d, LT, { ridge: o.ridge, color: o.roofColor, wallSkin: 'planks', wallColor: o.color });
    const gx = cellX(cx0 + Math.floor(w / 2)), gz = cellZ(cz0 + Math.floor(d / 2));
    const door = { x: gx, z: (cz0 + d) * CELL + 4, ix: gx, iz: (cz0 + d) * CELL - 4 }; addNav(door.x, door.z, 'door');
    addLoot('chest', cellX(cx0 + 1), (ly + 1) * H + 0.15, cellZ(cz0 + 1), { door, p: 0.55, upper: true });
    addLoot('chest', cellX(cx0 + w - 2), ly * H + 0.15, cellZ(cz0 + d - 1), { door, p: 0.35 });
    addLoot('floor', cellX(cx0 + 1), ly * H + 0.15, cellZ(cz0 + d - 2), { door, p: 0.5 }); addLoot('floor', cellX(cx0 + w - 2), (ly + 1) * H + 0.15, cellZ(cz0), { door, p: 0.5 });
    addLoot('ammo', cellX(cx0 + w - 1), ly * H + 0.15, cellZ(cz0 + Math.floor(d / 2)), { door, p: 0.6 });
    for (let k = 0; k < 3; k++) P().add('hay', cellX(cx0 + U.randInt(1, w - 2)), cellZ(cz0 + U.randInt(loftD, d - 1)), { y: ly * H + 0.15, rot: rnd() });
    POI.buildings.push({ kind: 'barn', x: gx, z: gz, w: w * CELL, d: d * CELL, door, ly });
  }
  function warehouse(cx0, cz0, w, d, ly, o) {
    o = Object.assign({ color: 0x9aa4ad, roofColor: 0x6b7178, skin: 'metal' }, o || {});
    const wo = { mat: 'metal', skin: o.skin, color: o.color };
    for (let s = 0; s < 2; s++) perimeter(cx0, cz0, w, d, ly + s, wo, (side, i, n) => {
      if (s === 0 && (side === 'S' || side === 'N') && (i === 1 || i === n - 2)) return { variant: 'garage' };
      if (s === 0 && (side === 'E' || side === 'W') && i === Math.floor(n / 2)) return { variant: 'door' };
      if (s === 1 && rnd() < 0.5) return { variant: 'window' }; return {};
    });
    floorRect(cx0, cz0, w, d, ly, { mat: 'brick', skin: 'concrete', color: 0xa9a9a4 });
    floorRect(cx0, cz0, 2, d, ly + 1, { mat: 'metal', skin: 'metal', color: 0x9aa4ad });
    stairs(cx0 + 1, ly, cz0 + d - 1, 0, { mat: 'metal', skin: 'metal', color: 0x9aa4ad, replace: true });
    S().remove(S().get(S().floorKey(cx0 + 1, ly + 1, cz0 + d - 1)));
    for (let j = 0; j < d; j++) wallZ(cx0 + 2, ly + 1, cz0 + j, { variant: 'railing', mat: 'metal', skin: 'metal', color: 0x777777, hp: 60 });
    flatRoof(cx0, cz0, w, d, ly + 2, { color: o.roofColor, skin: 'metal', mat: 'metal', railing: false });
    const gx = cellX(cx0 + Math.floor(w / 2)), gz = cellZ(cz0 + Math.floor(d / 2));
    const door = { x: cellX(cx0 + 1), z: (cz0 + d) * CELL + 4, ix: cellX(cx0 + 1), iz: (cz0 + d) * CELL - 4 }; addNav(door.x, door.z, 'door');
    addLoot('chest', cellX(cx0), (ly + 1) * H + 0.15, cellZ(cz0), { door, p: 0.5, upper: true });
    addLoot('chest', cellX(cx0 + w - 1), ly * H + 0.15, cellZ(cz0 + d - 1), { door, p: 0.4 });
    addLoot('chest', gx, (ly + 2) * H + 0.15, gz, { door, p: 0.35, upper: true, roof: true });
    for (let k = 0; k < 3; k++) addLoot('floor', cellX(cx0 + U.randInt(2, w - 1)), ly * H + 0.15, cellZ(cz0 + U.randInt(0, d - 1)), { door, p: 0.5 });
    addLoot('ammo', cellX(cx0 + 1), (ly + 1) * H + 0.15, cellZ(cz0 + Math.floor(d / 2)), { door, p: 0.6 });
    for (let k = 0; k < 4; k++) P().add('crate', cellX(cx0 + U.randInt(2, w - 1)) + (rnd() - 0.5) * 2, cellZ(cz0 + U.randInt(0, d - 1)) + (rnd() - 0.5) * 2, { y: ly * H + 0.15, rot: rnd() * 0.5 });
    POI.buildings.push({ kind: 'warehouse', x: gx, z: gz, w: w * CELL, d: d * CELL, door, ly });
  }
  function shop(cx0, cz0, w, d, ly, o) {
    o = Object.assign({ color: 0xc9a27a, stories: 2, front: 'S', awning: 0xd8452f, sign: '' }, o || {});
    const wo = { mat: 'brick', skin: 'brick', color: o.color };
    const n = (o.front === 'N' || o.front === 'S') ? w : d; const dc = Math.floor(n / 2);
    for (let s = 0; s < o.stories; s++) perimeter(cx0, cz0, w, d, ly + s, wo, (side, i, nn) => {
      if (s === 0 && side === o.front) return { variant: i === dc ? 'door' : 'shopfront' };
      if (s === 0 && side !== o.front && i === Math.floor(nn / 2) && rnd() < 0.5) return { variant: 'door' };
      return { variant: rnd() < 0.5 ? 'window' : 'solid' };
    });
    for (let s = 0; s < o.stories; s++) floorRect(cx0, cz0, w, d, ly + s, { mat: 'wood', skin: 'planks', color: 0xd0b080 }, (i, j) => (s > 0 && i === w - 1 && j === d - 1));
    if (o.stories > 1) stairs(cx0 + w - 1, ly, cz0 + d - 1, 0, { mat: 'wood', skin: 'planks', color: 0xd0b080 });
    flatRoof(cx0, cz0, w, d, ly + o.stories, { railing: true });
    // awning along the front
    if (o.front === 'S' || o.front === 'N') { for (let i = 0; i < w; i++) S().add({ type: 'floor', cx: cx0 + i, ly: ly + 1, cz: o.front === 'S' ? cz0 + d : cz0 - 1, mat: 'wood', skin: 'flat', color: o.awning, hp: 60, yOff: -0.4 }); }
    else { for (let j = 0; j < d; j++) S().add({ type: 'floor', cx: o.front === 'E' ? cx0 + w : cx0 - 1, ly: ly + 1, cz: cz0 + j, mat: 'wood', skin: 'flat', color: o.awning, hp: 60, yOff: -0.4 }); }
    const gx = cellX(cx0 + Math.floor(w / 2)), gz = cellZ(cz0 + Math.floor(d / 2));
    const door = doorOf(cx0, cz0, w, d, o.front, dc); addNav(door.x, door.z, 'door');
    addLoot('chest', cellX(cx0), (ly + o.stories - 1) * H + 0.15, cellZ(cz0), { door, p: 0.45, upper: o.stories > 1 });
    addLoot('chest', gx, (ly + o.stories) * H + 0.15, gz, { door, p: 0.3, upper: true, roof: true });
    addLoot('floor', cellX(cx0 + U.randInt(0, w - 1)), ly * H + 0.15, cellZ(cz0 + U.randInt(0, d - 1)), { door, p: 0.55 });
    addLoot('floor', cellX(cx0 + U.randInt(0, w - 1)), ly * H + 0.15, cellZ(cz0 + U.randInt(0, d - 1)), { door, p: 0.45 });
    addLoot('ammo', cellX(cx0 + w - 1), ly * H + 0.15, cellZ(cz0), { door, p: 0.55 });
    if (o.sign) {
      const sx = o.front === 'E' ? (cx0 + w) * CELL + 0.2 : o.front === 'W' ? cx0 * CELL - 0.2 : gx, sz = o.front === 'S' ? (cz0 + d) * CELL + 0.2 : o.front === 'N' ? cz0 * CELL - 0.2 : gz;
      const rot = o.front === 'S' ? 0 : o.front === 'N' ? Math.PI : o.front === 'E' ? Math.PI / 2 : -Math.PI / 2;
      POI.signs.push({ text: o.sign, x: sx, y: (ly + o.stories) * H + 1.2, z: sz, rot, w: Math.min(n * CELL - 1, 12), color: o.signColor || '#ffffff', bg: o.signBg || '#c9302c' });
    }
    P().add('step', door.wx + (door.x - door.wx) * 0.2, door.wz + (door.z - door.wz) * 0.2, { y: ly * H, rot: o.front === 'N' || o.front === 'S' ? 0 : Math.PI / 2 });
    if (rnd() < 0.6) P().add('bin', door.wx + (door.x - door.wx) * 0.6 + (o.front === 'N' || o.front === 'S' ? 3.5 : 0), door.wz + (door.z - door.wz) * 0.6 + (o.front === 'E' || o.front === 'W' ? 3.5 : 0), { y: ly * H });
    POI.buildings.push({ kind: 'shop', x: gx, z: gz, w: w * CELL, d: d * CELL, door, ly });
  }
  // Restaurant: one storey, shopfront on `front`, roof deck with a topper prop and a sign
  function restaurant(cx0, cz0, w, d, ly, o) {
    o = Object.assign({ color: 0xf7f0e0, front: 'S', deck: 0xd8452f, topper: null, sign: '', signBg: '#d8452f' }, o || {});
    const n = (o.front === 'N' || o.front === 'S') ? w : d; const dc = Math.floor(n / 2);
    perimeter(cx0, cz0, w, d, ly, { mat: 'brick', skin: 'siding', color: o.color }, (side, i) => side === o.front ? { variant: i === dc ? 'door' : 'shopfront' } : { variant: rnd() < 0.5 ? 'window' : 'solid' });
    floorRect(cx0, cz0, w, d, ly, { mat: 'wood', skin: 'planks', color: 0xd0b080 }); flatRoof(cx0, cz0, w, d, ly + 1, { railing: true, color: o.deck });
    const gx = cellX(cx0 + Math.floor(w / 2)), gz = cellZ(cz0 + Math.floor(d / 2));
    if (o.topper) P().add(o.topper, gx, gz, { y: (ly + 1) * H + 0.2, rot: 0 });
    const door = doorOf(cx0, cz0, w, d, o.front, dc); addNav(door.x, door.z, 'door');
    if (o.sign) {
      const sx = o.front === 'E' ? (cx0 + w) * CELL + 0.2 : o.front === 'W' ? cx0 * CELL - 0.2 : gx, sz = o.front === 'S' ? (cz0 + d) * CELL + 0.2 : o.front === 'N' ? cz0 * CELL - 0.2 : gz;
      const rot = o.front === 'S' ? 0 : o.front === 'N' ? Math.PI : o.front === 'E' ? Math.PI / 2 : -Math.PI / 2;
      POI.signs.push({ text: o.sign, x: sx, y: (ly + 1) * H + 1.0, z: sz, rot, w: Math.min(n * CELL - 1, 14), color: '#ffffff', bg: o.signBg });
    }
    addLoot('chest', cellX(cx0), ly * H + 0.15, cellZ(cz0), { door, p: 0.5 }); addLoot('chest', cellX(cx0 + w - 1), (ly + 1) * H + 0.15, cellZ(cz0 + d - 1), { door, p: 0.4, upper: true, roof: true });
    addLoot('floor', gx, ly * H + 0.15, cellZ(cz0 + 1), { door, p: 0.5 }); addLoot('ammo', cellX(cx0 + w - 1), ly * H + 0.15, cellZ(cz0), { door, p: 0.6 });
    // tables and bins
    for (let k = 0; k < 3; k++) P().add('bench', cellX(cx0 + U.randInt(0, w - 1)), cellZ(cz0 + U.randInt(0, d - 1)), { y: ly * H + 0.15, rot: rnd() * 3 });
    P().add('step', door.wx + (door.x - door.wx) * 0.2, door.wz + (door.z - door.wz) * 0.2, { y: ly * H, rot: o.front === 'N' || o.front === 'S' ? 0 : Math.PI / 2 });
    P().add('bin', door.x + 3, door.z, { y: ly * H });
    POI.buildings.push({ kind: 'restaurant', x: gx, z: gz, w: w * CELL, d: d * CELL, door, ly });
  }
  // Gas station: canopy (4x2) over pumps + a 3x2 shop behind it. facing = side of the canopy the road is on
  function gasStation(cx0, cz0, ly, o) {
    o = Object.assign({ color: 0xf4f4f4, roofColor: 0xd8452f }, o || {});
    floorRect(cx0, cz0, 4, 2, ly + 1, { mat: 'metal', skin: 'metal', color: o.roofColor, hp: 200, yOff: 0.9 });
    for (const [x, z] of [[cx0, cz0], [cx0 + 3, cz0], [cx0, cz0 + 1], [cx0 + 3, cz0 + 1]]) P().add('lamp', cellX(x), cellZ(z), { y: ly * H, rot: 0, scale: 0.85 });
    P().add('gaspump', cellX(cx0 + 1), cellZ(cz0) + 2.5, { y: ly * H, rot: 0 }); P().add('gaspump', cellX(cx0 + 2), cellZ(cz0) + 2.5, { y: ly * H, rot: 0 });
    const sx = cx0, sz = cz0 + 3;
    perimeter(sx, sz, 3, 2, ly, { mat: 'brick', skin: 'siding', color: o.color }, (side, i) => side === 'N' ? { variant: i === 1 ? 'door' : 'shopfront' } : { variant: rnd() < 0.5 ? 'window' : 'solid' });
    floorRect(sx, sz, 3, 2, ly, { mat: 'wood', skin: 'planks', color: 0xd0b080 }); flatRoof(sx, sz, 3, 2, ly + 1, { railing: false });
    const door = { x: cellX(sx + 1), z: sz * CELL - 3, ix: cellX(sx + 1), iz: sz * CELL + 2.5 }; addNav(door.x, door.z, 'door');
    addLoot('chest', cellX(sx), ly * H + 0.15, cellZ(sz + 1), { door, p: 0.45 }); addLoot('floor', cellX(sx + 2), ly * H + 0.15, cellZ(sz), { door, p: 0.5 }); addLoot('ammo', cellX(sx + 2), ly * H + 0.15, cellZ(sz + 1), { door, p: 0.6 });
    addLoot('floor', cellX(cx0 + 1), ly * H + 0.15, cellZ(cz0 + 1), { p: 0.5 });
    POI.signs.push({ text: 'GAS', x: cellX(cx0 + 2), y: (ly + 1) * H + 2.2, z: cz0 * CELL - 0.3, rot: 0, w: 6, color: '#ffffff', bg: '#d8452f' });
    P().add('bin', cellX(sx + 2) + 1.5, sz * CELL - 1.2, { y: ly * H });
    POI.buildings.push({ kind: 'gas', x: cellX(cx0 + 2), z: cellZ(cz0 + 2), w: 4 * CELL, d: 5 * CELL, door, ly });
  }
  function tower(cx0, cz0, ly, n, o) {
    o = Object.assign({ skin: 'darkwood', color: 0x9a7a4a, mat: 'wood' }, o || {});
    for (let s = 0; s < n; s++) {
      perimeter(cx0, cz0, 2, 2, ly + s, { mat: o.mat, skin: o.skin, color: o.color }, (side, i) => (s === 0 && side === 'S' && i === 0) ? { variant: 'door' } : (s === n - 1 ? { variant: 'railing', hp: 60 } : { variant: rnd() < 0.5 ? 'window' : 'solid' }));
      floorRect(cx0, cz0, 2, 2, ly + s, { mat: o.mat, skin: 'planks', color: 0xb98d55 }, (i, j) => s > 0 && ((s % 2 === 1 && i === 1 && j === 1) || (s % 2 === 0 && i === 0 && j === 0)));
      if (s < n - 1) stairs(s % 2 === 0 ? cx0 + 1 : cx0, ly + s, s % 2 === 0 ? cz0 + 1 : cz0, s % 2 === 0 ? 0 : 2, { mat: o.mat, skin: 'planks', color: 0xb98d55 });
    }
    floorRect(cx0, cz0, 2, 2, ly + n, { mat: o.mat, skin: 'planks', color: 0xb98d55 }, (i, j) => (n % 2 === 1 && i === 1 && j === 1) || (n % 2 === 0 && i === 0 && j === 0));
    for (let i = 0; i < 2; i++) { wallX(cx0 + i, ly + n, cz0, { variant: 'railing', mat: o.mat, skin: o.skin, color: o.color, hp: 60 }); wallX(cx0 + i, ly + n, cz0 + 2, { variant: 'railing', mat: o.mat, skin: o.skin, color: o.color, hp: 60 }); wallZ(cx0, ly + n, cz0 + i, { variant: 'railing', mat: o.mat, skin: o.skin, color: o.color, hp: 60 }); wallZ(cx0 + 2, ly + n, cz0 + i, { variant: 'railing', mat: o.mat, skin: o.skin, color: o.color, hp: 60 }); }
    const door = { x: cellX(cx0), z: (cz0 + 2) * CELL + 3, ix: cellX(cx0), iz: (cz0 + 2) * CELL - 2 }; addNav(door.x, door.z, 'door');
    addLoot('chest', cellX(cx0), (ly + n) * H + 0.15, cellZ(cz0 + 1), { door, p: 0.7, upper: true, roof: true });
    addLoot('ammo', cellX(cx0 + 1), (ly + Math.floor(n / 2)) * H + 0.15, cellZ(cz0), { door, p: 0.5 });
    POI.buildings.push({ kind: 'tower', x: cellX(cx0) + CELL / 2, z: cellZ(cz0) + CELL / 2, w: 2 * CELL, d: 2 * CELL, door, ly });
  }
  function shed(cx0, cz0, w, d, ly, o) {
    o = Object.assign({ color: 0x8a6a4a, skin: 'darkwood', roofColor: 0x5a4a3a }, o || {});
    perimeter(cx0, cz0, w, d, ly, { mat: 'wood', skin: o.skin, color: o.color }, (side, i, n) => side === 'S' && i === Math.floor(n / 2) ? { variant: 'door' } : { variant: rnd() < 0.3 ? 'window' : 'solid' });
    floorRect(cx0, cz0, w, d, ly, { mat: 'wood', skin: 'planks', color: 0xb98d55 });
    if (d % 2 === 0) gableRoof(cx0, cz0, w, d, ly + 1, { ridge: 'x', color: o.roofColor, wallSkin: o.skin, wallColor: o.color }); else flatRoof(cx0, cz0, w, d, ly + 1, { skin: 'darkwood', mat: 'wood', color: 0x6a5a4a });
    const gx = cellX(cx0 + Math.floor(w / 2)), gz = cellZ(cz0 + Math.floor(d / 2));
    const door = { x: gx, z: (cz0 + d) * CELL + 3, ix: gx, iz: (cz0 + d) * CELL - 2.5 }; addNav(door.x, door.z, 'door');
    addLoot('chest', cellX(cx0), ly * H + 0.15, cellZ(cz0), { door, p: 0.4 }); addLoot('floor', cellX(cx0 + w - 1), ly * H + 0.15, cellZ(cz0 + d - 1), { door, p: 0.5 });
    POI.buildings.push({ kind: 'shed', x: gx, z: gz, w: w * CELL, d: d * CELL, door, ly });
  }
  function hedgeMaze(cx0, cz0, n, ly) {
    const ho = { mat: 'wood', skin: 'hedge', color: 0x3f8f2c, hp: 200 };
    for (let i = 0; i < n; i++) { if (i !== Math.floor(n / 2)) { wallX(cx0 + i, ly, cz0, ho); wallX(cx0 + i, ly, cz0 + n, ho); } if (i !== Math.floor(n / 2)) { wallZ(cx0, ly, cz0 + i, ho); wallZ(cx0 + n, ly, cz0 + i, ho); } }
    const r = U.mulberry32(77);
    for (let j = 1; j < n; j++) for (let i = 0; i < n; i++) { if (r() < 0.42 && !(i >= n / 2 - 2 && i < n / 2 + 2 && j >= n / 2 - 2 && j < n / 2 + 2)) wallX(cx0 + i, ly, cz0 + j, ho); }
    for (let i = 1; i < n; i++) for (let j = 0; j < n; j++) { if (r() < 0.42 && !(i >= n / 2 - 2 && i < n / 2 + 2 && j >= n / 2 - 2 && j < n / 2 + 2)) wallZ(cx0 + i, ly, cz0 + j, ho); }
    const hc = cx0 + n / 2 - 1, hz = cz0 + n / 2 - 1; shed(hc, hz, 2, 2, ly, { color: 0x7a5a3a });
    for (let k = 0; k < 6; k++) addLoot('chest', cellX(cx0 + U.randInt(0, n - 1)), ly * H + 0.15, cellZ(cz0 + U.randInt(0, n - 1)), { p: 0.35 });
    for (let k = 0; k < 6; k++) addLoot('floor', cellX(cx0 + U.randInt(0, n - 1)), ly * H + 0.15, cellZ(cz0 + U.randInt(0, n - 1)), { p: 0.5 });
  }
  function motel(cx0, cz0, w, ly) {
    const wo = { mat: 'brick', skin: 'siding', color: 0xf0e2c8 };
    for (let s = 0; s < 2; s++) perimeter(cx0, cz0, w, 2, ly + s, wo, (side, i, n) => side === 'S' ? { variant: i % 2 === 0 ? 'door' : 'window' } : { variant: rnd() < 0.4 ? 'window' : 'solid' });
    for (let s = 0; s < 2; s++) floorRect(cx0, cz0, w, 2, ly + s, { mat: 'wood', skin: 'planks', color: 0xd0b080 });
    for (let i = 1; i < w; i += 2) for (let j = 0; j < 2; j++) { wallZ(cx0 + i, ly, cz0 + j, { mat: 'wood', skin: 'siding', color: 0xf7f0e0 }); wallZ(cx0 + i, ly + 1, cz0 + j, { mat: 'wood', skin: 'siding', color: 0xf7f0e0 }); }
    floorRect(cx0, cz0 + 2, w, 1, ly + 1, { mat: 'metal', skin: 'concrete', color: 0xb0b0aa });
    for (let i = 0; i < w; i++) wallX(cx0 + i, ly + 1, cz0 + 3, { variant: 'railing', mat: 'metal', skin: 'metal', color: 0x777777, hp: 60 });
    stairs(cx0 + w, ly, cz0 + 2, 0, { mat: 'metal', skin: 'concrete', color: 0xb0b0aa }); floor(cx0 + w, ly + 1, cz0 + 1, { mat: 'metal', skin: 'concrete', color: 0xb0b0aa });
    flatRoof(cx0, cz0, w, 2, ly + 2, { railing: false });
    POI.signs.push({ text: 'MOTEL', x: cellX(cx0 + 1), y: (ly + 2) * H + 4.5, z: (cz0 + 3) * CELL + 5, rot: 0, w: 9, color: '#ffe680', bg: '#2a3a6a' });
    P().add('bigsign', cellX(cx0 + 1), (cz0 + 3) * CELL + 5, { y: ly * H, rot: 0, colorSeed: 0.9 });
    for (let i = 0; i < w; i += 2) { const door = { x: cellX(cx0 + i), z: (cz0 + 2) * CELL + 4, ix: cellX(cx0 + i), iz: (cz0 + 2) * CELL - 2.5 }; addNav(door.x, door.z, 'door'); addLoot(rnd() < 0.5 ? 'chest' : 'floor', cellX(cx0 + i), ly * H + 0.15, cellZ(cz0), { door, p: 0.45 }); addLoot('floor', cellX(cx0 + i), (ly + 1) * H + 0.15, cellZ(cz0), { door, p: 0.45 }); }
    addLoot('chest', cellX(cx0 + w - 1), (ly + 2) * H + 0.15, cellZ(cz0), { p: 0.4, upper: true, roof: true });
    addLoot('ammo', cellX(cx0 + 2), (ly + 1) * H + 0.15, cellZ(cz0 + 1), { p: 0.6 });
    POI.buildings.push({ kind: 'motel', x: cellX(cx0 + w / 2), z: cellZ(cz0 + 1), w: w * CELL, d: 3 * CELL, door: { x: cellX(cx0), z: (cz0 + 2) * CELL + 4, ix: cellX(cx0), iz: (cz0 + 2) * CELL - 2.5 }, ly });
  }
  function fenceLine(x0, z0, x1, z1, ly, opts) {
    if (z0 === z1) { const a = Math.min(x0, x1), b = Math.max(x0, x1); for (let i = a; i < b; i++) wallX(i, ly, z0, Object.assign({ variant: 'fence', mat: 'wood', skin: 'planks', color: 0xd8c8a0, hp: 80 }, opts || {})); }
    else { const a = Math.min(z0, z1), b = Math.max(z0, z1); for (let j = a; j < b; j++) wallZ(x0, ly, j, Object.assign({ variant: 'fence', mat: 'wood', skin: 'planks', color: 0xd8c8a0, hp: 80 }, opts || {})); }
  }
  function cars(px, pz, n, r, ly) { for (let k = 0; k < n; k++) { const type = rnd() < 0.8 ? 'car' : 'truck'; const clearance = type === 'truck' ? 5.2 : 3.8; const x = px + (rnd() - 0.5) * r, z = pz + (rnd() - 0.5) * r; if (!clearStruct(x, z, clearance) || !clearProps(x, z, clearance)) continue; P().add(type, x, z, { y: ly * H, rot: rnd() < 0.5 ? 0 : Math.PI / 2 }); } }
  function trees(poi, n, r, ly) { for (let k = 0; k < n; k++) { const x = poi.p[0] + (rnd() - 0.5) * r, z = poi.p[1] + (rnd() - 0.5) * r; if (FN.MapData.roadDist(x, z) < 8 || !clearStruct(x, z, 3) || !clearProps(x, z, 3)) continue; P().add('tree', x, z, { y: FN.Terrain.heightAt(x, z), scale: 0.9 + rnd() * 0.4 }); } }
  function lyOf(poi) { return Math.round(poi.padH / H); }
  const cc = (poi, dx, dz) => [toCell(poi.p[0] + dx), toCell(poi.p[1] + dz)];
  const HC = [0xf2f2f2, 0xf5e6c8, 0xc8dff2, 0xf2d9d0, 0xe0f0d8, 0xf7f0e0, 0xdcdcdc, 0xf2e2b8, 0xe8d8f0, 0xd8e8f8];
  const RC = [0x7a4a3a, 0x4a5a7a, 0x5a5a5a, 0x8a3a2a, 0x3a5a3a];

  // ---------- POI compositions ----------
  const BUILDERS = {
    suburb(poi) { // Pleasant Park: ring road (±60/±80) around the field, houses outside facing the loop
      const ly = lyOf(poi);
      const spots = [[-75, -112, 'S'], [0, -112, 'S'], [75, -112, 'S'], [-75, 112, 'N'], [0, 112, 'N'], [75, 112, 'N'], [112, -40, 'W'], [112, 40, 'W'], [-112, -40, 'E'], [-112, 40, 'E']];
      spots.forEach((s, i) => {
        const w = 3 + (i % 2), d = 2; const b = houseAt(poi, s[0], s[1], w, d, ly, { doorSide: s[2], color: HC[i % HC.length], roofColor: RC[i % RC.length], ridge: (s[2] === 'N' || s[2] === 'S') ? 'x' : 'z' });
        // driveway car between the house and the ring road
        if (rnd() < 0.7) { const out = s[2] === 'S' ? [0, 1] : s[2] === 'N' ? [0, -1] : s[2] === 'W' ? [-1, 0] : [1, 0]; const cx = poi.p[0] + s[0] + out[0] * 14 + (out[1] ? 8 : 0), cz = poi.p[1] + s[1] + out[1] * 14 + (out[0] ? 8 : 0); P().add('car', cx, cz, { y: ly * H, rot: out[1] ? Math.PI / 2 : 0 }); }
      });
      // gazebo north of the pitch, goals, park trees, benches
      const [gx, gz] = cc(poi, 0, -64); floor(gx, ly + 1, gz, { mat: 'wood', skin: 'planks', color: 0xf0f0f0, yOff: -0.6 }); roof(gx, ly + 1, gz, 'pyramid', 0, { mat: 'wood', skin: 'roof', color: 0x6a4a3a });
      for (const [x, z] of [[gx - 1, gz - 1], [gx + 1, gz - 1], [gx - 1, gz + 1], [gx + 1, gz + 1]]) P().add('lamp', cellX(x), cellZ(z), { y: ly * H, scale: 0.6 });
      addLoot('chest', cellX(gx), (ly + 1) * H - 0.45, cellZ(gz), { p: 0.5 });
      P().add('goal', poi.p[0], poi.p[1] - 48, { y: ly * H, rot: 0 }); P().add('goal', poi.p[0], poi.p[1] + 48, { y: ly * H, rot: Math.PI });
      for (let k = 0; k < 6; k++) P().add('bench', poi.p[0] + (k < 3 ? -42 : 42), poi.p[1] - 30 + (k % 3) * 30, { y: ly * H, rot: k < 3 ? Math.PI / 2 : -Math.PI / 2 });
      for (const [x, z] of [[-50, -66], [50, -66], [-50, 66], [50, 66], [-50, 0], [50, 0]]) P().add('tree', poi.p[0] + x, poi.p[1] + z, { y: ly * H, scale: 1.0 + rnd() * 0.3 });
      for (let k = 0; k < 10; k++) { const x = poi.p[0] + (rnd() - 0.5) * 300, z = poi.p[1] + (rnd() - 0.5) * 300; if (Math.abs(x - poi.p[0]) < 130 && Math.abs(z - poi.p[1]) < 130) continue; if (FN.MapData.roadDist(x, z) > 8 && clearStruct(x, z, 3)) P().add('tree', x, z, { y: FN.Terrain.heightAt(x, z) }); }
    },
    salty(poi) { // highway N-S through town, cross street at z+15
      const ly = lyOf(poi);
      [[-45, -80, 'E'], [-45, -20, 'E'], [-45, 60, 'E'], [45, -60, 'W'], [45, 45, 'W'], [45, 105, 'W'], [-100, 30, 'N'], [100, 40, 'N']].forEach((s, i) => {
        houseAt(poi, s[0], s[1], 3, 2, ly, { doorSide: s[2], color: HC[(i + 3) % HC.length], roofColor: RC[i % RC.length], ridge: (s[2] === 'N' || s[2] === 'S') ? 'x' : 'z', stories: i === 3 || i === 7 ? 1 : 2 });
      });
      const [gx, gz] = cc(poi, 38, -142); gasStation(gx, gz, ly);
      trees(poi, 10, 260, ly);
    },
    town(poi) { // Tomato Town: crossroads (E-W at z+70, N-S at x+10)
      const ly = lyOf(poi);
      const [rx, rz] = cc(poi, -60, -52); restaurant(rx, rz, 5, 4, ly, { front: 'E', deck: 0xd8452f, topper: 'tomatohead', sign: 'TOMATOHEAD', signBg: '#d8452f' });
      const [gx, gz] = cc(poi, 38, -82); gasStation(gx, gz, ly);
      const [dx, dz] = cc(poi, 45, 40); shop(dx, dz, 4, 2, ly, { stories: 1, color: 0xd8d8d8, awning: 0x2f6fd8, front: 'S', sign: 'DINER', signBg: '#2f6fd8' });
      const [wx, wz] = cc(poi, -75, 25); warehouse(wx, wz, 5, 4, ly, { color: 0xb9c0c8 });
      for (let k = 0; k < 6; k++) P().add('container', poi.p[0] - 105 + (k % 3) * 7, poi.p[1] + 55 + Math.floor(k / 3) * 3.2, { y: ly * H, rot: 0 });
      [[-70, 100, 'N'], [-20, 100, 'N'], [40, 100, 'N'], [90, 100, 'N'], [95, -30, 'W']].forEach((s, i) => houseAt(poi, s[0], s[1], 3, 2, ly, { doorSide: s[2], color: HC[(i + 5) % HC.length], roofColor: RC[(i + 1) % RC.length], ridge: s[2] === 'W' ? 'z' : 'x' }));
      P().add('truck', poi.p[0] - 20, poi.p[1] - 25, { y: ly * H, rot: 1.5, colorSeed: 0.3 }); cars(poi.p[0] - 55, poi.p[1] + 5, 3, 24, ly);
      trees(poi, 8, 260, ly);
    },
    greasy(poi) { // highway N-S, cross street at z+5
      const ly = lyOf(poi);
      const [rx, rz] = cc(poi, 48, -50); restaurant(rx, rz, 5, 4, ly, { front: 'W', color: 0xfff4d0, deck: 0xe0b040, topper: 'burger', sign: 'DURRR BURGER', signBg: '#e0b040' });
      const [gx, gz] = cc(poi, -82, 30); gasStation(gx, gz, ly);
      const [sx, sz] = cc(poi, -85, -62); shop(sx, sz, 5, 3, ly, { stories: 1, color: 0xe8dcc0, awning: 0x3aa35a, front: 'E', sign: 'GROCERY', signBg: '#3aa35a' });
      [[50, 52, 'N'], [100, 52, 'N'], [-45, 55, 'N'], [110, -45, 'S'], [-110, -110, 'S'], [45, 105, 'N']].forEach((s, i) => houseAt(poi, s[0], s[1], 3, 2, ly, { doorSide: s[2], color: HC[(i + 1) % HC.length], roofColor: RC[(i + 2) % RC.length] }));
      cars(poi.p[0] + 50, poi.p[1] - 12, 3, 30, ly);
      trees(poi, 8, 260, ly);
    },
    retail(poi) { // main street at z+55; shops face south onto the lot
      const ly = lyOf(poi);
      const [sx, sz] = cc(poi, -72, -62);
      const awn = [0xd8452f, 0x2f6fd8, 0x3aa35a, 0xf2b632, 0xb15be2, 0xd8452f]; const names = ['NOMS', 'TACO', 'PIZZA', 'TOOLS', 'DONUTS', 'BOOKS'];
      for (let i = 0; i < 6; i++) shop(sx + i * 3, sz, 3, 3, ly, { color: [0xc9a27a, 0xb08a6a, 0xd0b090][i % 3], awning: awn[i], front: 'S', stories: i % 3 === 1 ? 1 : 2, sign: names[i], signBg: '#' + awn[i].toString(16).padStart(6, '0') });
      const [gx, gz] = cc(poi, 58, -66); shop(gx - 3, gz, 7, 4, ly, { stories: 1, color: 0xe8dcc0, awning: 0x3aa35a, front: 'S', sign: 'NOMS', signBg: '#3aa35a' });
      cars(poi.p[0] + 5, poi.p[1] + 10, 8, 200, ly);
      [[-95, 88, 'N'], [-35, 88, 'N'], [25, 88, 'N'], [85, 88, 'N'], [135, 88, 'N']].forEach((s, i) => houseAt(poi, s[0], s[1], 3, 2, ly, { doorSide: s[2], color: HC[(i + 2) % HC.length], roofColor: RC[i % RC.length] }));
      P().add('watertower', poi.p[0] + 140, poi.p[1] - 95, { y: FN.Terrain.heightAt(poi.p[0] + 140, poi.p[1] - 95), rot: 0 });
      trees(poi, 6, 300, ly);
    },
    depot(poi) { // Dusty Depot: three warehouses, containers, access street at z+95
      const ly = lyOf(poi);
      const cols = [0xc9382b, 0xb8bfc6, 0x2f5fb8];
      for (let i = 0; i < 3; i++) { const [wx, wz] = cc(poi, -95 + i * 80, -40); warehouse(wx, wz, 6, 9, ly, { color: cols[i], roofColor: 0x6b7178 }); }
      for (let k = 0; k < 10; k++) P().add('container', poi.p[0] - 80 + (k % 5) * 14, poi.p[1] + 55 + Math.floor(k / 5) * 8, { y: ly * H, rot: 0, colorSeed: rnd() });
      for (let k = 0; k < 4; k++) P().add('truck', poi.p[0] - 60 + k * 40, poi.p[1] + 30, { y: ly * H, rot: Math.PI / 2 });
      cars(poi.p[0] + 90, poi.p[1] + 50, 3, 30, ly);
    },
    factory(poi) {
      const ly = lyOf(poi);
      const [fx, fz] = cc(poi, -20, -20);
      const wo = { mat: 'brick', skin: 'brick', color: 0xb98a6a };
      for (let s = 0; s < 2; s++) perimeter(fx, fz, 10, 6, ly + s, wo, (side, i, n) => (s === 0 && side === 'S' && (i === 2 || i === 5 || i === 8)) ? { variant: 'garage' } : (s === 0 && side === 'N' && i === 5 ? { variant: 'door' } : { variant: rnd() < 0.5 ? 'window' : 'solid' }));
      floorRect(fx, fz, 10, 6, ly, { mat: 'brick', skin: 'concrete', color: 0xa9a9a4 });
      floorRect(fx, fz, 10, 2, ly + 1, { mat: 'metal', skin: 'metal', color: 0x9aa4ad }); stairs(fx + 9, ly, fz + 2, 0, { mat: 'metal', skin: 'metal', color: 0x9aa4ad });
      for (let i = 0; i < 10; i++) wallX(fx + i, ly + 1, fz + 2, { variant: 'railing', mat: 'metal', skin: 'metal', color: 0x777777, hp: 60 });
      flatRoof(fx, fz, 10, 6, ly + 2, { railing: true, color: 0x9a9a95 });
      P().add('toilet', cellX(fx + 5), cellZ(fz + 3), { y: (ly + 2) * H + 0.2, rot: 0, scale: 1.4 });
      POI.signs.push({ text: 'FLUSH FACTORY', x: cellX(fx + 5), y: (ly + 2) * H + 1.2, z: (fz + 6) * CELL + 0.2, rot: 0, w: 20, color: '#ffffff', bg: '#2f5fb8' });
      const door = { x: cellX(fx + 5), z: (fz + 6) * CELL + 4, ix: cellX(fx + 5), iz: (fz + 6) * CELL - 3 }; addNav(door.x, door.z, 'door');
      addLoot('chest', cellX(fx), (ly + 1) * H + 0.15, cellZ(fz), { door, p: 0.5, upper: true }); addLoot('chest', cellX(fx + 9), ly * H + 0.15, cellZ(fz + 5), { door, p: 0.45 }); addLoot('chest', cellX(fx + 2), (ly + 2) * H + 0.15, cellZ(fz + 1), { door, p: 0.4, upper: true, roof: true });
      for (let k = 0; k < 4; k++) addLoot('floor', cellX(fx + U.randInt(0, 9)), ly * H + 0.15, cellZ(fz + U.randInt(2, 5)), { door, p: 0.5 });
      addLoot('ammo', cellX(fx + 8), (ly + 1) * H + 0.15, cellZ(fz + 1), { door, p: 0.6 });
      for (let k = 0; k < 6; k++) P().add('crate', cellX(fx + U.randInt(1, 8)), cellZ(fz + U.randInt(2, 5)), { y: ly * H + 0.15, rot: rnd() });
      POI.buildings.push({ kind: 'factory', x: cellX(fx + 5), z: cellZ(fz + 3), w: 10 * CELL, d: 6 * CELL, door, ly });
      const [wx, wz] = cc(poi, 60, 45); warehouse(wx, wz, 4, 4, ly, { color: 0xb8bfc6 });
      for (let k = 0; k < 6; k++) P().add('container', poi.p[0] - 80 + (k % 3) * 7, poi.p[1] + 55 + Math.floor(k / 3) * 3.5, { y: ly * H, rot: 0 });
      for (let k = 0; k < 3; k++) P().add('truck', poi.p[0] - 50 + k * 25, poi.p[1] + 25, { y: ly * H, rot: 0 });
    },
    farm(poi) {
      const ly = lyOf(poi);
      const [bx, bz] = cc(poi, 60, -60); barn(bx - 2, bz - 4, 5, 8, ly, { color: 0xb8362a });
      const [hx, hz] = cc(poi, -70, 40); house(hx, hz, 4, 2, ly, { doorSide: 'S', color: 0xffffff, roofColor: 0x5a5a5a, ridge: 'x' });
      P().add('silo', poi.p[0] + 100, poi.p[1] - 50, { y: ly * H, rot: 0 }); P().add('silo', poi.p[0] + 108, poi.p[1] - 42, { y: ly * H, rot: 0 });
      P().add('watertower', poi.p[0] - 20, poi.p[1] - 100, { y: FN.Terrain.heightAt(poi.p[0] - 20, poi.p[1] - 100), rot: 0 });
      P().add('tractor', poi.p[0] - 30, poi.p[1] + 0, { y: ly * H, rot: 1 }); P().add('tractor', poi.p[0] + 20, poi.p[1] + 70, { y: ly * H, rot: 2.4 });
      for (let k = 0; k < 14; k++) P().add('hay', poi.p[0] - 100 + (k % 7) * 9, poi.p[1] + 110 + Math.floor(k / 7) * 6, { y: FN.Terrain.heightAt(poi.p[0] - 100 + (k % 7) * 9, poi.p[1] + 110), rot: rnd() });
      const [sx, sz] = cc(poi, 70, 60); shed(sx, sz, 2, 2, ly, {});
      fenceLine(toCell(poi.p[0] - 140), toCell(poi.p[1] - 30), toCell(poi.p[0] - 40), toCell(poi.p[1] - 30), ly); fenceLine(toCell(poi.p[0] - 140), toCell(poi.p[1] - 30), toCell(poi.p[0] - 140), toCell(poi.p[1] + 110), ly);
      trees(poi, 6, 280, ly);
    },
    farm2(poi) {
      const ly = lyOf(poi);
      const [bx, bz] = cc(poi, -10, -20); barn(bx, bz, 6, 8, ly, { color: 0xc23a2e, ridge: 'x' });
      const [hx, hz] = cc(poi, 70, 65); house(hx, hz, 3, 2, ly, { doorSide: 'W', color: 0xf7f0e0, roofColor: 0x4a5a7a });
      const [sx, sz] = cc(poi, -80, 50); shed(sx, sz, 3, 2, ly, { color: 0x8a5a3a });
      P().add('silo', poi.p[0] + 45, poi.p[1] - 30, { y: ly * H, rot: 0 });
      P().add('tractor', poi.p[0] - 60, poi.p[1] - 20, { y: ly * H, rot: 0.5, colorSeed: 0.7 });
      for (let k = 0; k < 16; k++) P().add('hay', poi.p[0] + 90 + (k % 8) * 8, poi.p[1] - 20 + Math.floor(k / 8) * 7, { y: FN.Terrain.heightAt(poi.p[0] + 90 + (k % 8) * 8, poi.p[1] - 20), rot: rnd() });
      fenceLine(toCell(poi.p[0] + 60), toCell(poi.p[1] - 60), toCell(poi.p[0] + 180), toCell(poi.p[1] - 60), ly); fenceLine(toCell(poi.p[0] + 180), toCell(poi.p[1] - 60), toCell(poi.p[0] + 180), toCell(poi.p[1] + 100), ly);
      trees(poi, 6, 280, ly);
    },
    woods(poi) { const ly = lyOf(poi); const [mx, mz] = cc(poi, -30, -30); hedgeMaze(mx, mz, 12, ly); },
    lodge(poi) {
      const ly = lyOf(poi);
      const [lx, lz] = cc(poi, -20, -20); house(lx - 3, lz - 2, 6, 4, ly, { stories: 3, skin: 'darkwood', color: 0x9a6a3a, roofColor: 0x4a3a2a, doorSide: 'S', ridge: 'x', extras: false });
      POI.signs.push({ text: 'LONELY LODGE', x: cellX(lx), y: (ly + 3) * H + 0.6, z: (lz + 2) * CELL + 0.2, rot: 0, w: 14, color: '#f7e8c8', bg: '#4a3a2a' });
      const [tx, tz] = cc(poi, 80, 40); tower(tx, tz, ly, 7, {});
      [[-90, 40, 'E'], [40, 90, 'N'], [-60, -90, 'S']].forEach((s, i) => { const [cx, cz] = cc(poi, s[0], s[1]); shed(cx, cz, 3, 2, ly, { color: [0x8a6a4a, 0x7a5a3a, 0x9a7a5a][i] }); });
      for (let k = 0; k < 3; k++) P().add('truck', poi.p[0] + 30 + k * 12, poi.p[1] - 60, { y: FN.Terrain.heightAt(poi.p[0] + 30 + k * 12, poi.p[1] - 60), rot: 0.3, colorSeed: 0.05 });
    },
    swamp(poi) {
      const ly = lyOf(poi);
      [[-40, -30], [50, 20], [-10, 70], [70, -60]].forEach((s) => { const [cx, cz] = cc(poi, s[0], s[1]); shed(cx, cz, 2, 2, ly, { color: 0x5a4a3a, skin: 'darkwood' }); });
      for (let k = 0; k < 10; k++) P().add('stump', poi.p[0] + (rnd() - 0.5) * 200, poi.p[1] + (rnd() - 0.5) * 200, {});
      P().add('tree', poi.p[0] + 20, poi.p[1] - 10, { y: ly * H, scale: 2.4 });
    },
    motel(poi) { const ly = lyOf(poi); const [mx, mz] = cc(poi, -40, -15); motel(mx, mz, 8, ly); cars(poi.p[0], poi.p[1] + 30, 4, 60, ly); },
    prison(poi) {
      const ly = lyOf(poi);
      const [px, pz] = cc(poi, -20, -12); const wo = { mat: 'brick', skin: 'concrete', color: 0xb5b5ae };
      for (let s = 0; s < 2; s++) perimeter(px, pz, 8, 4, ly + s, wo, (side, i, n) => (s === 0 && side === 'S' && i === 4) ? { variant: 'door' } : { variant: rnd() < 0.4 ? 'window' : 'solid' });
      for (let s = 0; s < 2; s++) floorRect(px, pz, 8, 4, ly + s, { mat: 'brick', skin: 'concrete', color: 0xa9a9a4 }, (i, j) => s > 0 && i === 7 && j === 3);
      stairs(px + 7, ly, pz + 3, 0, { mat: 'brick', skin: 'concrete', color: 0xa9a9a4 });
      for (let i = 1; i < 8; i += 2) for (let j = 0; j < 2; j++) { wallZ(px + i, ly, pz + j, { mat: 'metal', skin: 'metal', color: 0x777777, variant: 'railing', hp: 100 }); wallX(px + i, ly, pz + 2, { mat: 'metal', skin: 'metal', color: 0x777777, variant: 'railing', hp: 100 }); }
      flatRoof(px, pz, 8, 4, ly + 2, { railing: true });
      const door = { x: cellX(px + 4), z: (pz + 4) * CELL + 4, ix: cellX(px + 4), iz: (pz + 4) * CELL - 3 }; addNav(door.x, door.z, 'door');
      addLoot('chest', cellX(px), ly * H + 0.15, cellZ(pz), { door, p: 0.5 }); addLoot('chest', cellX(px + 7), (ly + 1) * H + 0.15, cellZ(pz), { door, p: 0.45, upper: true }); addLoot('chest', cellX(px + 3), (ly + 2) * H + 0.15, cellZ(pz + 2), { door, p: 0.4, upper: true, roof: true });
      for (let k = 0; k < 3; k++) addLoot('floor', cellX(px + U.randInt(0, 7)), ly * H + 0.15, cellZ(pz + U.randInt(0, 3)), { door, p: 0.5 });
      addLoot('ammo', cellX(px + 6), (ly + 1) * H + 0.15, cellZ(pz + 3), { door, p: 0.6 });
      for (let i = -3; i < 11; i++) { wallX(px + i, ly, pz - 3, { variant: 'fence', mat: 'metal', skin: 'metal', color: 0x999999, hp: 80 }); wallX(px + i, ly, pz + 7, { variant: 'fence', mat: 'metal', skin: 'metal', color: 0x999999, hp: 80 }); }
      for (let j = -3; j < 7; j++) { wallZ(px - 3, ly, pz + j, { variant: 'fence', mat: 'metal', skin: 'metal', color: 0x999999, hp: 80 }); wallZ(px + 11, ly, pz + j, { variant: 'fence', mat: 'metal', skin: 'metal', color: 0x999999, hp: 80 }); }
      tower(px - 3, pz - 3, ly, 3, { skin: 'concrete', color: 0xb5b5ae, mat: 'brick' }); tower(px + 9, pz + 5, ly, 3, { skin: 'concrete', color: 0xb5b5ae, mat: 'brick' });
      POI.buildings.push({ kind: 'prison', x: cellX(px + 4), z: cellZ(pz + 2), w: 8 * CELL, d: 4 * CELL, door, ly });
    },
    track(poi) { const ly = lyOf(poi); const [sx, sz] = cc(poi, -30, -70); shed(sx, sz, 4, 2, ly, { color: 0xd8d8d8, skin: 'siding' }); for (let k = 0; k < 10; k++) P().add('hay', poi.p[0] + Math.cos(k * 0.63) * 62, poi.p[1] + Math.sin(k * 0.63) * 45, { y: ly * H, rot: k }); cars(poi.p[0], poi.p[1] - 90, 3, 40, ly); },
    factories(poi) { const ly = lyOf(poi); for (let i = 0; i < 3; i++) { const [wx, wz] = cc(poi, -55 + i * 45, -35); warehouse(wx, wz, 4, 6, ly, { color: [0x9aa4ad, 0x8a9aa8, 0xb0b8c0][i] }); } cars(poi.p[0], poi.p[1] + 45, 3, 60, ly); },
    lakehouse(poi) {
      const L = FN.MapData.lake; const y = FN.Terrain.heightAt(L.x, L.z); const ly = Math.round(y / H);
      const cx = toCell(L.x) - 1, cz = toCell(L.z) - 1; house(cx, cz, 3, 2, ly, { doorSide: 'S', color: 0xf2f2f2, roofColor: 0x4a5a7a });
      for (let k = 0; k < 6; k++) floor(cx + 1, Math.round(L.level / H), cz + 2 + k, { mat: 'wood', skin: 'planks', color: 0xc8a070, yOff: L.level - Math.round(L.level / H) * H + 0.5 });
      P().add('boat', L.x + 8, L.z + 30, { y: L.level - 0.2, rot: 0.3 }); P().add('boat', L.x - 40, L.z - 120, { y: L.level - 0.2, rot: 2 });
      P().add('tree', L.x + 12, L.z - 15, { scale: 1.2 });
    },
    containers(poi) { const y = FN.Terrain.heightAt(poi.p[0], poi.p[1]); for (let k = 0; k < 12; k++) P().add('container', poi.p[0] - 20 + (k % 4) * 7, poi.p[1] - 8 + Math.floor(k / 4) * 3.2, { y: Math.round(y / H) * H + (k >= 8 ? 2.6 : 0), rot: 0 }); for (let k = 0; k < 3; k++) addLoot('chest', poi.p[0] - 20 + k * 12, Math.round(y / H) * H + 2.75, poi.p[1] + 1, { p: 0.45 }); addLoot('ammo', poi.p[0] + 6, Math.round(y / H) * H + 0.1, poi.p[1] - 6, { p: 0.6 }); },
    tower(poi) { },
    shack(poi) { const ly = lyOf(poi); const [cx, cz] = cc(poi, 0, 0); if (rnd() < 0.5) shed(cx - 1, cz - 1, 2 + U.randInt(0, 1), 2, ly, { color: [0x8a6a4a, 0xd8d8d8, 0xf2e2b8][U.randInt(0, 2)], skin: rnd() < 0.5 ? 'darkwood' : 'siding' }); else house(cx - 1, cz - 1, 3, 2, ly, { doorSide: ['N', 'S', 'E', 'W'][U.randInt(0, 3)], color: HC[U.randInt(0, HC.length - 1)], roofColor: RC[U.randInt(0, RC.length - 1)], stories: rnd() < 0.5 ? 1 : 2 }); if (rnd() < 0.5) P().add('car', poi.p[0] + 14, poi.p[1] + 8, { y: ly * H, rot: rnd() * 3 }); },
    lake(poi) { },
     spawnisland(poi) {
      const ly = lyOf(poi);
      const [wx, wz] = cc(poi, -35, -45); warehouse(wx, wz, 6, 4, ly, { color: 0xb8bfc6, roofColor: 0x6b7178 });
      const [tx, tz] = cc(poi, 45, -40); tower(tx, tz, ly, 4, { skin: 'concrete', color: 0xd0d0cc, mat: 'brick' });
      for (let k = 0; k < 6; k++) P().add('container', poi.p[0] + 30 + (k % 3) * 7, poi.p[1] + 30 + Math.floor(k / 3) * 3.3, { y: ly * H, rot: 0 });
      for (let k = 0; k < 8; k++) P().add('crate', poi.p[0] - 60 + k * 5, poi.p[1] + 55, { y: ly * H, rot: k * 0.3 });
      for (let k = 0; k < 7; k++) P().add('tree', poi.p[0] + Math.cos(k * 0.9) * 62, poi.p[1] + Math.sin(k * 0.9) * 62, { y: ly * H, scale: 0.9 + (k % 3) * 0.15 });
      for (let k = 0; k < 4; k++) P().add('lamp', poi.p[0] - 60 + k * 40, poi.p[1] + 32, { y: ly * H, scale: 0.8 });
      // no pickable weapons/ammo on the spawn island (waiting lobby) - loot must be
      // earned on the main island so it can't be carried into the battle from here
      POI.buildings.push({ kind: 'spawnisland', x: poi.p[0], z: poi.p[1], w: 180, d: 180, ly, door: null });
    },
  };

  // ---------- Street dressing: lamps, parked cars, bins along the roads inside towns ----------
  const TOWN_KINDS = { suburb: 1, salty: 1, town: 1, greasy: 1, retail: 1, depot: 1, motel: 1, factory: 1, factories: 1, prison: 1 };
  POI.dressRoads = function () {
    const M = FN.MapData;
    for (const poi of M.pois) {
      if (!TOWN_KINDS[poi.kind]) continue; const ly = lyOf(poi); const R2 = (poi.r + 20) * (poi.r + 20);
      const dense = poi.kind !== 'depot' && poi.kind !== 'factory' && poi.kind !== 'factories' && poi.kind !== 'prison';
      for (const path of M.roadPaths) {
        let acc = 12, carAcc = 20, side = 1;
        for (let i = 1; i < path.length; i++) {
          const a = path[i - 1], b = path[i]; const dx = b[0] - a[0], dz = b[1] - a[1]; const len = Math.hypot(dx, dz); if (len < 0.01) continue;
          acc += len; carAcc += len;
          const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2; if ((mx - poi.p[0]) ** 2 + (mz - poi.p[1]) ** 2 > R2) continue;
          const nx = -dz / len, nz = dx / len; // left normal
          if (acc >= 27) {
            acc = 0; side = -side; const x = mx + nx * 6.4 * side, z = mz + nz * 6.4 * side;
            if (M.roadDist(x, z) > 5.3 && clearStruct(x, z, 2.0) && clearProps(x, z, 2.5)) P().add('lamp', x, z, { y: FN.Terrain.heightAt(x, z), rot: Math.atan2(-dz, dx) + (side > 0 ? Math.PI : 0), scale: 0.9 });
          }
          if (dense && carAcc >= 34) {
            carAcc = 0;
            if (rnd() < 0.45) { const s = rnd() < 0.5 ? 1 : -1; const x = mx + nx * 6.6 * s, z = mz + nz * 6.6 * s; if (M.roadDist(x, z) > 5.5 && clearStruct(x, z, 3.8) && clearProps(x, z, 3.8)) P().add('car', x, z, { y: FN.Terrain.heightAt(x, z), rot: Math.atan2(-dz, dx) + (rnd() < 0.5 ? 0 : Math.PI) }); }
            else if (rnd() < 0.3) { const s = rnd() < 0.5 ? 1 : -1; const x = mx + nx * 7 * s, z = mz + nz * 7 * s; if (clearStruct(x, z, 1.5) && clearProps(x, z, 2)) P().add('bin', x, z, { y: FN.Terrain.heightAt(x, z) }); }
          }
        }
      }
    }
  };

  POI.buildAll = function () {
    POI.lootSpots = []; POI.navSpots = []; POI.buildings = []; POI.signs = [];
    const propsBefore = FN.Props.list.length;
    for (const poi of FN.MapData.pois) { const b = BUILDERS[poi.kind]; if (b) { try { b(poi); } catch (e) { console.error('POI build failed', poi.id, e); } } }
    try { POI.dressRoads(); } catch (e) { console.error('dress failed', e); }
    console.log('[POI] builders done. props added:', FN.Props.list.length - propsBefore, 'total:', FN.Props.list.length);
    POI.signGroup = new THREE.Group(); POI.signGroup.name = 'signs';
    for (const s of POI.signs) {
      const tex = FN.Tex.label(s.text, s.text, s.bg, s.color, 512, 128);
      const m = new THREE.Mesh(new THREE.BoxGeometry(s.w, s.w / 4, 0.25), [new THREE.MeshLambertMaterial({ color: s.bg }), new THREE.MeshLambertMaterial({ color: s.bg }), new THREE.MeshLambertMaterial({ color: s.bg }), new THREE.MeshLambertMaterial({ color: s.bg }), new THREE.MeshLambertMaterial({ map: tex }), new THREE.MeshLambertMaterial({ map: tex })]);
      m.position.set(s.x, s.y, s.z); m.rotation.y = s.rot; m.castShadow = true; POI.signGroup.add(m);
    }
    // Reusable routes for every building: outside door, inside door, and two
    // interior waypoints. Looting bots follow these instead of cutting through walls.
    for (const b of POI.buildings) if (b.door) {
      const dx = b.x - b.door.ix, dz = b.z - b.door.iz;
      const len = Math.hypot(dx, dz) || 1, px = -dz / len, pz = dx / len;
      b.navPath = [{ x: b.door.x, z: b.door.z }, { x: b.door.ix, z: b.door.iz },
        { x: b.x + px * Math.min(4, b.w * 0.12), z: b.z + pz * Math.min(4, b.d * 0.12) },
        { x: b.x - px * Math.min(4, b.w * 0.12), z: b.z - pz * Math.min(4, b.d * 0.12) }];
    }
    FN.Engine.scene.add(POI.signGroup);
    FN.Structures.flush();
  };
  FN.POI = POI;
})();
