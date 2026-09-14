// Match flow: lobby -> spawn island -> battle bus -> drop -> game -> end. Owns entities, the bus, kill feed and win/lose.
window.FN = window.FN || {};
(function () {
  const C = FN.CONFIG, U = FN.U;
  const M = { phase: 'lobby', mode: 'solo', entities: [], teammates: [], bus: null, busDoorT: 0, busCanJump: false, busEnding: false, islandT: 0, islandJoined: 1, noDamage: false, time: 0, endT: -1, placement: 0 };
  M.init = function (scene) { M.scene = scene; M.busMesh = FN.ItemModels.battleBus(); M.busMesh.visible = false; scene.add(M.busMesh); };
  M.aliveCount = function () { let n = FN.Player.dead ? 0 : 1; for (const b of FN.Bots.list) if (!b.dead) n++; return n; };
  M.enemiesAlive = function () { let n = 0; for (const b of FN.Bots.list) if (!b.dead && b.team !== 0) n++; return n; };
  M.stormTimerText = function () { if (M.phase === 'island') return U.fmtTime(M.islandT); if (FN.Storm.active) return FN.Storm.timerText(); return '0:00'; };
  M.refreshAudio = function () {
    if (!FN.Audio) return;
    FN.Audio.resume();
    if (M.phase === 'bus' && M.bus && M.bus.alive && FN.Player && FN.Player.state === 'bus') FN.Audio.loop('bus', true, { gain: 0.35 });
  };

  M.start = function (mode) {
    M.mode = mode || 'solo'; M.phase = 'island'; M.time = 0; M.endT = -1; M.noDamage = true; M.busEnding = false; M.bus = null; M.placement = 0;
    const teamSize = mode === 'squad' ? 4 : (mode === 'duo' ? 2 : 1);
    U.setSeed((Date.now() & 0xffff) + 7);
    // fresh world state
    M.rebuildWorld();
    const PL = FN.Player; PL.reset(); PL.team = 0;
    // Allow any number in Settings, then randomly add or remove enough bots so
    // the selected bots plus the player form complete duo/squad-sized groups.
    const configuredBots = FN.Settings && FN.Settings.adjustBotCountForMode
      ? FN.Settings.adjustBotCountForMode(FN.Settings.get('botCount'), mode)
      : Math.floor((C.BOTS.TOTAL_PLAYERS - 1) / teamSize) * teamSize;
    const teamMates = Math.min(teamSize - 1, configuredBots);
    // The setting counts enemy bots; add the player's teammates separately.
    FN.Bots.create(configuredBots + teamMates, teamSize, teamMates);
    M.teammates = FN.Bots.teammates(); M.entities = [PL].concat(FN.Bots.list);
    FN.Loot.clear(); FN.Loot.populate();
    // spawn island
    const isl = FN.MapData.poiById.spawnisland; const a = U.rand() * 6.28, r = 10 + U.rand() * 30;
    const sx = isl.p[0] + Math.cos(a) * r, sz = isl.p[1] + Math.sin(a) * r; PL.teleport(sx, FN.Physics.groundAt(sx, sz, 200, 200).y, sz); PL.state = 'ground'; PL.camYaw = a + Math.PI; PL.camPitch = -0.1; PL.yaw = PL.camYaw;
    FN.Bots.placeOnIsland(isl);
    M.islandT = C.ISLAND_COUNTDOWN; M.islandJoined = 1;
    FN.Storm.stop();
    FN.HUD.show(true); FN.HUD.hideEnd(); FN.HUD.feed = []; FN.HUD.dirtyFeed = true; FN.HUD.dirtyHotbar = true;
    if (FN.Audio) { FN.Audio.stopMusic(); }
    FN.Input.lock();
  };
  M.rebuildWorld = function () {
    FN.Structures.clear(); FN.Props.init(FN.Engine.scene); FN.Props.defineAll(); // props: instances re-added by builders
    if (FN.POI.signGroup) FN.Engine.scene.remove(FN.POI.signGroup);
    FN.POI.buildAll(); FN.World.scatter(); FN.Structures.flush();
    // Debug: verify prop state after rebuild
    const summary = {};
    for (const k in FN.Props.defs) { const d = FN.Props.defs[k]; const live = d.items.filter(Boolean).length; if (live > 0) summary[k] = live; }
    console.log('[rebuild] props:', FN.Props.list.length, 'byType:', summary);
  };
  // ---------- per-frame ----------
  M.update = function (dt) {
    if (M.phase === 'lobby') return;
    if (FN.Training && FN.Training.active) return;
    M.time += dt;
    if (M.phase === 'island') {
      M.islandT -= dt; M.islandJoined = Math.min(100, Math.floor(1 + (C.ISLAND_COUNTDOWN - M.islandT) / (C.ISLAND_COUNTDOWN - C.ISLAND_LAUNCH_COUNT) * 110));
      if (M.islandT <= C.ISLAND_LAUNCH_COUNT && !M._tick) M._tick = Math.ceil(M.islandT);
      if (M._tick && Math.ceil(M.islandT) < M._tick) { M._tick = Math.ceil(M.islandT); if (FN.Audio) FN.Audio.play(M._tick <= 0 ? 'countdown_go' : 'countdown_tick', null, 0.5); }
      if (M.islandT <= 0) M.launchBus();
    } else if (M.phase === 'bus' || M.phase === 'drop' || M.phase === 'game') {
      M.updateBus(dt);
      if (M.phase !== 'end' && FN.Player.dead === false && M.time > 3 && M.enemiesAlive() === 0 && M.endT < 0 && !(FN.Training && FN.Training.active)) { M.endT = 1.5; }
      if (M.endT >= 0) { M.endT -= dt; if (M.endT < 0) { M.endT = -999; M.finish(!FN.Player.dead); } }
    }
    if (FN.Input.wasPressed(C.KEYS.map) && (M.phase === 'game' || M.phase === 'drop' || M.phase === 'bus')) FN.HUD.toggleMap();
  };
  // ---------- bus ----------
  M.launchBus = function () {
    M.phase = 'bus'; M.noDamage = false; M._tick = null;
    // Do NOT force a high render distance on the bus. Remember what the player
    // has selected and load it ~1 second after boarding (handled in updateBus),
    // so the game keeps the distance they chose instead of jumping to "high".
    M._busRdPending = 1.0;
    FN.Vehicles.init();
    const ang = U.rand() * Math.PI * 2; const dir = { x: Math.cos(ang), z: Math.sin(ang) }; const off = (U.rand() - 0.5) * 900; const px = -dir.z, pz = dir.x;
    const start = { x: px * off - dir.x * 1650, z: pz * off - dir.z * 1650 }, end = { x: px * off + dir.x * 1650, z: pz * off + dir.z * 1650 };
    M.bus = { start, end, dir, pos: { x: start.x, y: C.BUS.ALT, z: start.z }, s: 0, len: 3300, alive: true, over: false, wasOver: false };
    M._busLodReady = false;
    M.busMesh.visible = true; M.busMesh.position.set(start.x, C.BUS.ALT, start.z); M.busMesh.rotation.y = Math.atan2(-dir.z, dir.x);
    if (M.busMesh.flame) { M.busMesh.flame.scale.set(2, 3, 1); M.busMesh.flame.material.opacity = 1; }
    M.busDoorT = C.BUS.DOOR_COUNTDOWN; M.busCanJump = false; M.busEnding = false;
    const PL = FN.Player; PL.state = 'bus'; PL.char.group.visible = false; PL.pos.set(start.x, C.BUS.ALT, start.z); PL.camPitch = -0.25;
    PL.camYaw = Math.atan2(-dir.x, -dir.z); // look along the route
    FN.Bots.boardBus(M.bus);
    FN.Storm.start();
    if (FN.Audio) { FN.Audio.loop('bus', true, { gain: 0.35 }); FN.Audio.loop('wind', false); }
    if (FN.HUD) FN.HUD.center('', 0.1);
  };
  M.updateBus = function (dt) {
    const b = M.bus; if (!b || !b.alive) return;
    // ~1s after boarding, load the player's own selected render distance while
    // keeping the terrain LOD tied to the camera (no forced "high" jump).
    if (M._busRdPending > 0) {
      M._busRdPending -= dt;
      if (M._busRdPending <= 0) { M._busRdPending = -1; if (FN.Engine && FN.Engine.reloadRenderDistance) FN.Engine.reloadRenderDistance(); }
    }
    b.s += C.BUS.SPEED * dt; b.pos.x = b.start.x + b.dir.x * b.s; b.pos.z = b.start.z + b.dir.z * b.s;
    M.busMesh.position.set(b.pos.x, b.pos.y, b.pos.z);
    if (M.busDoorT > 0) M.busDoorT -= dt;
    const land = U.polyEdgeDist(b.pos.x, b.pos.z, FN.MapData.coast); b.over = land > -120;
    if (b.over) b.wasOver = true;
    M.busCanJump = M.busDoorT <= 0 && b.over;
    if (b.wasOver && !b.over && !M.busEnding) { M.busEnding = true; if (FN.Player.state === 'bus') M.leaveBus(); }
    if (b.s > b.len + 600) { b.alive = false; M.busMesh.visible = false; if (FN.Audio) FN.Audio.loop('bus', false); }
    if (FN.Player.state === 'bus') { FN.Player.pos.set(b.pos.x, b.pos.y - 2, b.pos.z); FN.Player.syncXYZ(); }
    if (FN.Audio && FN.Player.state !== 'bus') { const d = U.dist3(FN.Player.pos, b.pos); FN.Audio.loop('bus', b.alive && d < 600, { gain: U.clamp(0.4 - d / 1500, 0, 0.4) }); }
  };
  M.busCamera = function (dt) {
    const PL = FN.Player; const cam = FN.Engine.camera; const b = M.bus; if (!b) return;
    const f = PL.forward(); const dist = 26; const pivot = { x: b.pos.x, y: b.pos.y + 6, z: b.pos.z };
    cam.position.set(pivot.x - f.x * dist, pivot.y - f.y * dist, pivot.z - f.z * dist); cam.lookAt(pivot.x + f.x * 10, pivot.y + f.y * 10, pivot.z + f.z * 10);
    PL.fov = U.damp(PL.fov, 80, 5, dt); cam.fov = PL.fov; cam.updateProjectionMatrix();
    FN.Sky.update(dt, cam.position);
    // The render-distance reload runs before this camera is moved. Force the
    // first bus-camera LOD pass at the actual route position, otherwise the
    // old throttled pass can leave the ground chunks hidden.
    if (!M._busLodReady) { FN.Terrain.updateLOD(cam.position, true); M._busLodReady = true; }
    else FN.Terrain.updateLOD(cam.position);
    if (FN.Audio) FN.Audio.setListener(cam.position.x, cam.position.y, cam.position.z, f.x, f.z);
  };
  M.leaveBus = function () {
    const b = M.bus; const PL = FN.Player; PL.char.group.visible = true; PL.startSkydive(b.pos.x, b.pos.y - 4, b.pos.z); M.phase = 'drop';
    if (FN.Audio) FN.Audio.loop('bus', false);
    FN.Bots.list.forEach(bt => { if (bt.isTeammate && bt.aboard) FN.Bots.jumpFromBus(bt, b); });
  };
  M.onPlayerLanded = function () { if (M.phase === 'drop') M.phase = 'game'; };
  // ---------- kills ----------
  function nameHtml(e) { if (!e) return ''; return e.isPlayer ? '<span class="me">' + e.name + '</span>' : '<span class="k">' + e.name + '</span>'; }
  M.onKill = function (source, target, info) {
    info = info || {}; const PL = FN.Player;
    let text;
    const vic = target.isPlayer ? '<span class="me">' + target.name + '</span>' : '<span class="v">' + target.name + '</span>';
    if (info.storm) text = vic + ' was eliminated by the storm';
    else if (info.fall) text = vic + ' fell to their death';
    else if (!source) text = vic + ' was eliminated';
    else {
      const w = info.weapon; const def = w && w.kind === 'weapon' ? C.WEAPONS[w.id] : null;
      if (info.melee || (w && w.id === 'pickaxe')) text = nameHtml(source) + ' eliminated ' + vic + ' with a pickaxe';
      else if (def && def.kind === 'shotgun') text = nameHtml(source) + ' shotgunned ' + vic;
      else if (def && def.kind === 'sniper') text = nameHtml(source) + ' sniped ' + vic;
      else if (def && def.kind === 'smg') text = nameHtml(source) + ' SMG&#39;d ' + vic;
      else if (def && def.kind === 'launcher') text = nameHtml(source) + ' blew up ' + vic;
      else if (def) text = nameHtml(source) + ' eliminated ' + vic + ' with a ' + (def.kind === 'pistol' ? 'pistol' : 'assault rifle');
      else text = nameHtml(source) + ' eliminated ' + vic;
    }
    FN.HUD.killFeed(text);
    if (source && source.isPlayer && target !== source) { PL.stats.kills++; FN.HUD.center('ELIMINATED ' + target.name.toUpperCase(), 2.5, 'elim'); if (FN.Audio) FN.Audio.play('elim', null, 0.8); FN.HUD.dirtyHotbar = true; }
    if (target.isPlayer) { M.placement = M.aliveCount() + 1; PL.deathInfo = { by: source, info }; PL.onDeath(info); M.endT = 2.5; }
    else FN.Bots.onDeath(target, source);
    if (source && !source.isPlayer && source.stats) source.stats.kills++;
  };
  // ---------- end ----------
  M.finish = function (victory) {
    M.phase = 'end'; const PL = FN.Player; FN.Input.unlock(); FN.Build.exit();
    const prog = FN.Progress; if (prog) prog.record({ win: victory, kills: PL.stats.kills, placement: victory ? 1 : M.placement, survived: M.time });
    if (FN.Audio) { FN.Audio.stopAllLoops(); FN.Audio.play(victory ? 'victory' : 'death', null, 0.8); }
    const mins = Math.floor(M.time / 60), secs = Math.floor(M.time % 60);
    const by = PL.deathInfo && PL.deathInfo.by ? 'Eliminated by ' + PL.deathInfo.by.name : (PL.deathInfo && PL.deathInfo.info.storm ? 'Eliminated by the storm' : (PL.deathInfo && PL.deathInfo.info.fall ? 'Fell to your death' : ''));
    const html = victory ? `<div class="victory">#1 VICTORY ROYALE</div><div class="sub">${M.mode.toUpperCase()} &middot; ${PL.stats.kills} ELIMINATIONS</div>` : `<div class="placed">#${M.placement} PLACED</div><div class="sub">${by}</div>`;
    FN.HUD.showEnd(html + `<div class="stats"><span>Eliminations: ${PL.stats.kills}</span><span>Damage: ${PL.stats.damage}</span><span>Survived: ${mins}:${U.pad2(secs)}</span></div><div class="btn" id="btn-lobby">RETURN TO LOBBY</div>`);
    document.getElementById('btn-lobby').addEventListener('click', () => M.toLobby());
  };
  M.toLobby = function () {
    if (FN.Training && FN.Training.active) FN.Training.stop();
    M.phase = 'lobby'; FN.HUD.hideEnd(); FN.HUD.show(false); FN.Storm.stop(); FN.Bots.reset(); FN.Loot.clear(); FN.Player.state = 'lobby'; FN.Player.char.group.visible = false; M.busMesh.visible = false; if (FN.Audio) FN.Audio.stopAllLoops();
    FN.Input.unlock(); if (FN.Settings) { FN.Settings.applyAll(); if (FN.Settings.render) FN.Settings.render(); } else if (FN.Engine && FN.Engine.applyQuality) FN.Engine.applyQuality(); FN.Lobby.show();
  };
  FN.Match = M;
})();
