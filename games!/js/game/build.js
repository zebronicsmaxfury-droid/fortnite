// Building mode: ghost preview + placement on the grid (walls / floors / stairs / roof), material selection.
window.FN = window.FN || {};
(function () {
  const C = FN.CONFIG, U = FN.U, CELL = C.CELL, H = C.WALL_H;
  const BD = { active: false, piece: 'wall', mat: 'wood', rot: 0, ghost: null, valid: false, target: null };
  BD.init = function (scene) {
    BD.scene = scene;
    BD.ghostMats = { ok: new THREE.MeshBasicMaterial({ color: 0x4ec3ff, transparent: true, opacity: 0.45, depthWrite: false }), bad: new THREE.MeshBasicMaterial({ color: 0xff4040, transparent: true, opacity: 0.45, depthWrite: false }) };
    BD.ghosts = {};
    for (const [k, g] of [['wall', FN.Structures.geometryFor('wall', 'solid')], ['floor', FN.Structures.geometryFor('floor', 'solid')], ['stairs', FN.Structures.geometryFor('stairs', 'solid')], ['roof', FN.Structures.geometryFor('roof', 'pyramid')]]) { const m = new THREE.Mesh(g, BD.ghostMats.ok); m.visible = false; scene.add(m); BD.ghosts[k] = m; }
  };
  BD.enter = function (piece) { BD.active = true; if (piece) BD.piece = piece; };
  BD.exit = function () { BD.active = false; for (const k in BD.ghosts) BD.ghosts[k].visible = false; BD.target = null; };
  BD.cycleMat = function () { const order = ['wood', 'brick', 'metal']; BD.mat = order[(order.indexOf(BD.mat) + 1) % 3]; };
  BD.cyclePiece = function (dir) { // L1/R1 in build mode (controller)
    const order = ['wall', 'floor', 'stairs', 'roof'];
    const i = order.indexOf(BD.piece); if (i < 0) return;
    BD.piece = order[(i + dir + 4) % 4];
    if (FN.Audio) FN.Audio.play('ui_click', null, 0.4);
  };
  BD.rotate = function () { BD.rot = (BD.rot + 1) & 3; };
  // Compute target placement from the player's position/yaw/pitch
  BD.computeTarget = function (pl) {
    const yaw = pl.camYaw, pitch = pl.camPitch;
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
    const ly0 = FN.Structures.levelOf(pl.pos.y + 0.6);
    let ly = ly0; if (pitch > 0.55) ly = ly0 + 1; if (pitch < -0.7 && BD.piece !== 'stairs') ly = ly0 - (BD.piece === 'floor' ? 1 : 0);
    const dirIdx = ((Math.round(Math.atan2(fx, -fz) / (Math.PI / 2)) % 4) + 4) % 4; // 0 north(-z),1 east(+x),2 south(+z),3 west(-x)
    const tx = pl.pos.x + fx * CELL * 1.05, tz = pl.pos.z + fz * CELL * 1.05;
    const cx = FN.Structures.cellOf(tx), cz = FN.Structures.cellOf(tz);
    const px = pl.pos.x, pz = pl.pos.z; const pcx = FN.Structures.cellOf(px), pcz = FN.Structures.cellOf(pz);
    let t;
    if (BD.piece === 'wall') {
      // edge of the player's cell in the facing direction
      if (dirIdx === 0) t = { type: 'wall', axis: 'x', cx: pcx, cz: pcz, ly }; // north edge of my cell
      else if (dirIdx === 2) t = { type: 'wall', axis: 'x', cx: pcx, cz: pcz + 1, ly };
      else if (dirIdx === 1) t = { type: 'wall', axis: 'z', cx: pcx + 1, cz: pcz, ly };
      else t = { type: 'wall', axis: 'z', cx: pcx, cz: pcz, ly };
    } else if (BD.piece === 'floor') t = { type: 'floor', cx, cz, ly };
    else if (BD.piece === 'stairs') t = { type: 'stairs', cx, cz, ly: ly0, rot: (dirIdx + BD.rot) & 3 };
    else t = { type: 'roof', cx, cz, ly, rot: BD.rot };
    // Match ground-level builds to the player's actual feet on uneven terrain;
    // upper-story pieces remain aligned to the building grid.
    t.yOff = t.ly === ly0 ? pl.pos.y - t.ly * H : 0;
    t.mat = BD.mat; return t;
  };
  BD.keyOf = function (t) { return t.type === 'wall' ? FN.Structures.wallKey(t.axis, t.cx, t.ly, t.cz) : (t.type + ',' + (t.type === 'roof' ? 'r' : 0) + ',' + t.cx + ',' + t.ly + ',' + t.cz); };
  BD.update = function (pl, dt) {
    if (!BD.active) return;
    const t = BD.computeTarget(pl); BD.target = t;
    for (const k in BD.ghosts) BD.ghosts[k].visible = (k === t.type);
    const g = BD.ghosts[t.type];
    // position ghost like the structure would be
    if (t.type === 'wall') { if (t.axis === 'x') { g.position.set(t.cx * CELL + CELL / 2, t.ly * H + t.yOff, t.cz * CELL); g.rotation.y = 0; } else { g.position.set(t.cx * CELL, t.ly * H + t.yOff, t.cz * CELL + CELL / 2); g.rotation.y = Math.PI / 2; } }
    else { g.position.set(t.cx * CELL + CELL / 2, t.ly * H + t.yOff, t.cz * CELL + CELL / 2); g.rotation.y = -(t.rot || 0) * Math.PI / 2; }
    // A floor, stair, roof, and wall can share a cell when their slots are
    // compatible. Only reject the exact slot occupied by the selected type.
    // Using one key builder here also keeps preview validation in sync with
    // Structures.add(), which is what actually stores the piece.
    const existing = FN.Structures.pieces.get(BD.keyOf(t));
    let valid = !existing && pl.inv.mats[BD.mat] >= C.BUILD.COST;
    // don't place a wall through the player
    if (valid && t.type === 'wall') { const wx = g.position.x, wz = g.position.z; const d = t.axis === 'x' ? Math.abs(pl.pos.z - wz) : Math.abs(pl.pos.x - wx); if (d < 0.5 && Math.abs(pl.pos.y - t.ly * H) < H) valid = false; }
    BD.valid = valid; g.material = valid ? BD.ghostMats.ok : BD.ghostMats.bad;
  };
  BD.place = function (pl) {
    if (!BD.active || !BD.target || !BD.valid) { if (BD.active && !BD.valid && pl.inv.mats[BD.mat] < C.BUILD.COST && FN.HUD) FN.HUD.notify('Not enough ' + BD.mat); return false; }
    // Player builds appear at full size and health immediately.
    const t = BD.target; const o = Object.assign({}, t, { grow: false, team: pl.team, replace: false });
    const p = FN.Structures.add(o); if (!p) return false;
    pl.inv.mats[BD.mat] -= C.BUILD.COST;
    if (FN.Audio) FN.Audio.play('build', null, 0.8);
    FN.Structures.flush();
    return true;
  };
  FN.Build = BD;
})();
