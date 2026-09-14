// Entry point + game loop wiring. Nothing heavy runs until the player clicks the launch screen (or ?autostart=1).
// Debug: ?autostart=1&debug=fly | debug=models&view=poses|weapons|items | debug=game&mode=solo
window.FN = window.FN || {};
(function () {
  const U = FN.U, C = FN.CONFIG;
  const params = new URLSearchParams(location.search);
  FN.params = params;
  function setLoad(text, f) { const e = document.getElementById('load-text'); if (e) e.textContent = text; const b = document.getElementById('load-fill'); if (b) b.style.width = Math.round(f * 100) + '%'; }
  const frame = () => new Promise(r => requestAnimationFrame(() => setTimeout(r, 10)));

  async function boot() {
    const E = FN.Engine; E.init(); if (params.get('fixeddt')) E.fixedDt = parseFloat(params.get('fixeddt')); if (params.get('renderskip')) E.renderSkip = parseInt(params.get('renderskip'), 10);
    FN.Input.init(E.canvas); if (params.get('nolock') || params.get('debug')) FN.Input.forceLocked = true;
    FN.Sky.create(E.scene);
    FN.FX.init(E.scene);
    const dbg = document.createElement('div'); dbg.id = 'debug'; document.body.appendChild(dbg); FN.debugEl = dbg; if (!params.get('debug')) dbg.style.display = 'none';
    await frame();
    if (params.get('debug') === 'models') { document.getElementById('loading').style.display = 'none'; return startModels(); }
    const t0 = performance.now();
    setLoad('Generating island...', 0.05); await frame();
    FN.World.build(E.scene, (txt, f) => { setLoad(txt, f * 0.7); });
    await frame();
    setLoad('Preparing systems...', 0.75); await frame();
    FN.Grass.init(E.scene); FN.Loot.init(E.scene); FN.Combat.init(E.scene); FN.Build.init(E.scene); FN.Storm.init(E.scene); FN.Bots.init(E.scene); FN.Match.init(E.scene); FN.Player.init(E.scene); FN.Vehicles.init(E.scene);
    FN.HUD.build(); FN.HUD.renderIcons();
    setLoad('Rendering map...', 0.85); await frame();
    // Minimap: 1024 is sufficient; minimap panel is tiny on screen, 2048 wastes GPU memory.
    FN.World.renderMap(E.renderer, E.scene, 1024);
    setLoad('Loading lobby...', 0.95); await frame();
    FN.Lobby.init();
    FN.Settings.init(); FN.Settings.applyAll();
    FN.TeamChat.init();
    buildPause();
    console.log('boot in', Math.round(performance.now() - t0), 'ms | pieces', FN.Structures.count, '| props', FN.Props.list.length, JSON.stringify(FN.World.counts));
    document.getElementById('loading').style.display = 'none';
    FN.Player.state = 'lobby'; FN.Player.char.group.visible = false;
    const dm = params.get('debug');
    if (dm === 'fly') { startFly(); return; }
    E.start(tick);
    if (dm === 'game') { FN.Player.name = 'Player'; FN.Audio.init(); FN.Match.start(params.get('mode') || 'solo'); }
    else FN.Lobby.show();
    // click on the canvas locks the mouse during a match
    E.canvas.addEventListener('mousedown', () => { if (FN.Match.phase !== 'lobby' && FN.Match.phase !== 'end' && !FN.Input.isLocked()) { FN.Input.lock(); } });
    FN.Input.onLockChange = (locked) => { if (FN.TeamChat && FN.TeamChat.isOpen && FN.TeamChat.isOpen()) { showPause(false); return; } if (!locked && FN.Match.phase !== 'lobby' && FN.Match.phase !== 'end' && !FN.Input.forceLocked) showPause(true); if (locked) showPause(false); };
  }

  function tick(dt) {
    const I = FN.Input; const E = FN.Engine;
    I.pollGamepad(dt); // lightweight controller poll (bindings: js/core/input.js)
    if (I.gpPressed('pause') && !FN.Lobby.visible && !FN.Settings.open && FN.Match.phase !== 'lobby' && FN.Match.phase !== 'end') showPause(!FN.paused);
    if (FN.Lobby.visible) { FN.Lobby.update(dt); I.endFrame(); return; }
    if (!FN.paused) {
      handleGamepadActions();
      if (FN.TeamChat && FN.TeamChat.update) FN.TeamChat.update(dt);
      FN.Match.update(dt); FN.Player.update(dt); FN.Bots.update(dt); FN.Storm.update(dt); FN.Combat.updateProjectiles(dt); FN.Vehicles.update(dt); if (FN.Training && FN.Training.active) FN.Training.update(dt);
      FN.Loot.update(dt, FN.Player.pos.x, FN.Player.pos.z); FN.Structures.update(dt); FN.FX.update(dt); if (FN.Player.state !== 'bus') FN.Grass.update(FN.Player.pos.x, FN.Player.pos.z);
      if (FN.Player.equip.reloadT > 0) FN.HUD.updateReloadBar(FN.Player.equip.reloadT, FN.Inventory.reloadTime(FN.Player.equip.item));
    } else { FN.Sky.update(dt, E.camera.position); }
    FN.HUD.update(dt);
    if (I.wasPressed('Escape') && FN.Input.forceLocked && FN.Match.phase !== 'lobby' && FN.Match.phase !== 'end') showPause(!FN.paused);
    if (FN.debugEl && FN.debugEl.style.display !== 'none') { const P = FN.Player; FN.debugEl.textContent = 'fps ' + E.fps + ' | ' + FN.Match.phase + '/' + P.state + ' | pos ' + P.pos.x.toFixed(0) + ',' + P.pos.y.toFixed(1) + ',' + P.pos.z.toFixed(0) + ' | alive ' + FN.Match.aliveCount() + ' | calls ' + E.renderer.info.render.calls + ' tris ' + (E.renderer.info.render.triangles / 1000 | 0) + 'k'; }
    I.endFrame();
  }

  // ---------- controller action dispatch (state-dependent; the raw bindings live in js/core/input.js) ----------
  function handleGamepadActions() {
    const I = FN.Input, P = FN.Player, M = FN.Match, B = FN.Build;
    if (M.phase !== 'island' && M.phase !== 'bus' && M.phase !== 'drop' && M.phase !== 'game') return;
    if (P.dead) return;
    // A = jump (goes through the keyboard jump path so bus jump / ground jump / glider all behave identically)
    if (I.gpPressed('jump')) I.injectKey(FN.CONFIG.KEYS.jump, true);
    if (I.gpReleased('jump')) I.injectKey(FN.CONFIG.KEYS.jump, false);
    // B = open/close glider while airborne, toggle building mode after landing
    if (I.gpPressed('glider')) {
      if (P.state === 'skydive') P.deployGlider();
      else if (P.state === 'glide') P.retractGlider();
      else if (P.state === 'ground' && M.phase === 'game') { if (B.active) B.exit(); else B.enter(); }
    }
    // X = jump off the Battle Bus / airborne deploy; after landing = drop weapon
    if (I.gpPressed('drop')) {
      if (P.state === 'bus') { if (M.busCanJump) M.leaveBus(); }
      else if (P.state === 'ground') P.dropWeapon();
    }
    // Y = reload
    if (I.gpPressed('reload') && P.state === 'ground' && !B.active) P.startReload();
    // L1 / R1 = previous / next building piece in build mode, weapon cycling otherwise
    if (I.gpPressed('prev') || I.gpPressed('next')) {
      const dir = I.gpPressed('next') ? 1 : -1;
      if (B.active && P.state === 'ground') B.cyclePiece(dir);
      else if (P.state === 'ground' && !B.active) {
        let s = P.equip.slot;
        for (let k = 0; k < 6; k++) { s = (s + dir + 6) % 6; if (s === 0 || P.inv.slots[s - 1]) break; }
        P.equipSlot(s);
      }
    }
  }

  // ---------- pause menu ----------
  function buildPause() {
    const p = document.createElement('div'); p.id = 'pause';
    p.innerHTML = `<h1>PAUSED</h1><div class="btn" id="pause-resume">RESUME</div><div class="btn" id="pause-settings">SETTINGS</div><div class="btn" id="pause-lobby">RETURN TO LOBBY</div><div class="ctrls" id="pause-ctrls"></div>`;
    document.body.appendChild(p);
    document.getElementById('pause-settings').addEventListener('click', () => { FN.Settings.show(); });
    document.getElementById('pause-resume').addEventListener('click', () => { showPause(false); FN.Input.lock(); });
    document.getElementById('pause-lobby').addEventListener('click', () => { showPause(false); FN.Match.toLobby(); });
  }
  function showPause(on) { FN.paused = on; const p = document.getElementById('pause'); if (p) p.style.display = on ? 'flex' : 'none'; if (on) { const c = document.getElementById('pause-ctrls'); if (c && FN.Settings) c.innerHTML = FN.Settings.controlsHtml(); } if (on && FN.Audio) FN.Audio.stopAllLoops(); if (!on && FN.Match && FN.Match.refreshAudio) FN.Match.refreshAudio(); }

  // ---------- debug helpers (used by the headless test harness) ----------
  FN.debug = {
    toGround(x, z) { const PL = FN.Player; const y = FN.Physics.surfaceHeight(x, z); PL.state = 'ground'; PL.char.group.visible = true; PL.teleport(x, y + 0.2, z); PL.skydive = null; PL.glide = null; if (PL.glider) PL.char.group.remove(PL.glider); for (const t of PL.trails) t.line.visible = false; FN.Match.phase = 'game'; PL.equipSlot(0, true); FN.Match.busEnding = true; FN.Match.noDamage = false; FN.Vehicles.init(); if (!FN.Storm.active) FN.Storm.start(); if (FN.Match.bus) { FN.Bots.list.forEach(b => { if (b.aboard) FN.Bots.jumpFromBus(b, FN.Match.bus); }); } },
    give(id, rarity) { const def = C.WEAPONS[id]; const it = { kind: 'weapon', id, rarity: rarity || def.rarities[0], ammo: def.mag }; const r = FN.Inventory.add(FN.Player.inv, it); FN.Player.inv.ammo[def.ammo] += 90; FN.HUD.dirtyHotbar = true; return r; },
    giveAll() { FN.debug.give('scar', 'legendary'); FN.debug.give('tac', 'rare'); FN.debug.give('sniper', 'epic'); FN.Inventory.add(FN.Player.inv, { kind: 'consumable', id: 'minishield', count: 6 }); FN.Inventory.add(FN.Player.inv, { kind: 'consumable', id: 'medkit', count: 2 }); FN.Player.inv.mats.wood = 500; FN.Player.inv.mats.brick = 300; FN.Player.inv.mats.metal = 200; FN.HUD.dirtyHotbar = true; },
    look(yaw, pitch) { FN.Player.camYaw = yaw; FN.Player.camPitch = pitch; },
    bots() { return FN.Bots.list.filter(b => !b.dead).map(b => ({ n: b.name, s: b.state, x: b.x | 0, z: b.z | 0, hp: b.health, m: !!b.char, air: !!b.air, aboard: b.aboard })); },
    stats() { return { phase: FN.Match.phase, alive: FN.Match.aliveCount(), fps: FN.Engine.fps, calls: FN.Engine.renderer.info.render.calls, tris: FN.Engine.renderer.info.render.triangles, pos: [FN.Player.pos.x | 0, FN.Player.pos.y | 0, FN.Player.pos.z | 0], state: FN.Player.state, hp: FN.Player.health, storm: FN.Storm.active ? [FN.Storm.cx | 0, FN.Storm.cz | 0, FN.Storm.radius | 0, FN.Storm.phase] : null, loot: FN.Loot.counts }; },
    spawnBotNear(d) { const PL = FN.Player; const b = FN.Bots.list.find(x => !x.dead && !x.isTeammate); if (!b) return null; b.aboard = false; b.air = null; b.x = PL.pos.x - Math.sin(PL.camYaw) * (d || 12); b.z = PL.pos.z - Math.cos(PL.camYaw) * (d || 12); b.y = FN.Physics.surfaceHeight(b.x, b.z); b.state = 'roam'; b.landedT = FN.Bots.matchTime - 60; b.yaw = PL.camYaw + Math.PI; FN.debug.giveBot(b, 'ar'); return b.name; },
    simulate(seconds, step, withPlayer) { step = step || 0.5; const inv = FN.Player.invulnerable; FN.Player.invulnerable = true; for (let t = 0; t < seconds; t += step) { FN.Match.update(step); if (withPlayer) FN.Player.update(step); FN.Bots.update(step); FN.Storm.update(step); FN.Loot.update(step, FN.Player.pos.x, FN.Player.pos.z); FN.Structures.update(step); FN.Input.endFrame(); } FN.Player.invulnerable = inv; return { alive: FN.Match.aliveCount(), t: Math.round(FN.Bots.matchTime), phase: FN.Match.phase, storm: [FN.Storm.phase, FN.Storm.radius | 0], fights: FN.Bots.fights.length }; },
    giveBot(b, id) { const def = C.WEAPONS[id]; FN.Inventory.add(b.inv, { kind: 'weapon', id, rarity: def.rarities[0], ammo: def.mag }); b.inv.ammo[def.ammo] += 90; FN.Bots.chooseWeapon(b, 20); },
  };

  // ---------- fly cam ----------
  function startFly() {
    const E = FN.Engine; const cam = E.camera;
    const st = { x: +(params.get('x') || 0), y: +(params.get('y') || 300), z: +(params.get('z') || 600), yaw: +(params.get('yaw') || 0), pitch: +(params.get('pitch') || -0.5), speed: +(params.get('speed') || 60) };
    FN.fly = st; FN.debugEl.style.display = '';
    E.start((dt) => {
      const I = FN.Input; const m = I.consumeMouse(); st.yaw -= m.x * 0.0025; st.pitch = U.clamp(st.pitch - m.y * 0.0025, -1.5, 1.5);
      const a = I.axis(); const sp = st.speed * (I.isDown('ShiftLeft') ? 4 : 1);
      const fx = -Math.sin(st.yaw) * Math.cos(st.pitch), fy = Math.sin(st.pitch), fz = -Math.cos(st.yaw) * Math.cos(st.pitch);
      const rx = Math.cos(st.yaw), rz = -Math.sin(st.yaw);
      st.x += (fx * a.z + rx * a.x) * sp * dt; st.y += (fy * a.z) * sp * dt + (I.isDown('Space') ? sp * dt : 0) - (I.isDown('ControlLeft') ? sp * dt : 0); st.z += (fz * a.z + rz * a.x) * sp * dt;
      cam.position.set(st.x, st.y, st.z); cam.rotation.set(0, 0, 0); cam.rotation.order = 'YXZ'; cam.rotation.y = st.yaw; cam.rotation.x = st.pitch;
      FN.Sky.update(dt, cam.position); FN.Terrain.updateLOD(cam.position); FN.Structures.update(dt); FN.FX.update(dt); FN.Loot.update(dt, st.x, st.z);
      FN.debugEl.textContent = 'fps ' + E.fps + '  pos ' + st.x.toFixed(0) + ',' + st.y.toFixed(0) + ',' + st.z.toFixed(0) + '  yaw ' + st.yaw.toFixed(2) + ' pitch ' + st.pitch.toFixed(2) + '\ncalls ' + E.renderer.info.render.calls + ' tris ' + E.renderer.info.render.triangles;
      I.endFrame();
    });
  }

  // ---------- model viewer ----------
  function startModels() {
    const E = FN.Engine; const cam = E.camera; const scene = E.scene;
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshLambertMaterial({ color: 0x6fae3a })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
    const view = params.get('view') || 'all';
    const chars = []; const skins = FN.Character.SKINS;
    const poses = [
      { move: 0, grounded: true, weapon: 'none' }, { move: 1, sprint: true, grounded: true, weapon: 'none' }, { move: 0, grounded: true, weapon: 'rifle', aim: true, pitch: 0 }, { move: 0, grounded: true, weapon: 'pickaxe', swing: 0.5 },
      { move: 0, grounded: true, weapon: 'pistol' }, { move: 0, grounded: true, crouch: true, weapon: 'rifle', aim: true, pitch: -0.3 }, { move: 0, grounded: true, weapon: 'launcher' }, { move: 1, grounded: true, weapon: 'sniper', pitch: 0.2 },
    ];
    const wmodels = ['m16', 'scar', 'tac', 'bolt', 'scopedar', 'pistol', 'rpg', 'pickaxe'];
    for (let i = 0; i < skins.length; i++) {
      const ch = FN.Character.create(skins[i]); ch.group.position.set(i * 1.3, poses[i].skydive || poses[i].glide ? 2.2 : 0, 0); ch.group.rotation.y = view === 'poses' ? Math.PI * 0.72 : Math.PI; scene.add(ch.group); chars.push(ch);
      const w = poses[i].weapon === 'rifle' ? (i === 5 ? 'scar' : 'm16') : poses[i].weapon === 'pistol' ? 'pistol' : poses[i].weapon === 'pickaxe' ? 'pickaxe' : poses[i].weapon === 'launcher' ? 'rpg' : poses[i].weapon === 'sniper' ? 'bolt' : null;
      if (w) { const wm = FN.WeaponModels.build(w); FN.Character.setWeapon(ch, wm, w === 'pickaxe' ? 'pickaxe' : 'gun'); }
      if (poses[i].glide) { const gl = FN.ItemModels.glider(); gl.position.set(0, 3.4, 0); ch.group.add(gl); }
      ch.pose = poses[i];
    }
    for (let i = 0; i < wmodels.length; i++) { const w = FN.WeaponModels.build(wmodels[i]); w.position.set(i * 1.3, 2.9, -1.5); w.rotation.y = -Math.PI / 2; w.scale.set(1.6, 1.6, 1.6); scene.add(w); }
    const items = [FN.ItemModels.chest(), FN.ItemModels.ammoBox(), FN.ItemModels.consumable('bandage'), FN.ItemModels.consumable('medkit'), FN.ItemModels.consumable('minishield'), FN.ItemModels.consumable('shield'), FN.ItemModels.consumable('chugjug'), FN.ItemModels.ammoPickup('medium'), FN.ItemModels.ammoPickup('shells'), FN.ItemModels.ammoPickup('rockets'), FN.ItemModels.materialPickup('wood'), FN.ItemModels.materialPickup('brick')];
    items.forEach((it, i) => { it.position.set(-0.5 + i * 1.0, 0, 2.2); scene.add(it); });
    const bus = FN.ItemModels.battleBus(); bus.position.set(4, 0, -16); bus.scale.set(0.5, 0.5, 0.5); scene.add(bus);
    const gl = FN.ItemModels.glider(); gl.position.set(11, 2.5, 0); scene.add(gl);
    if (view === 'poses') { cam.position.set(4.5, 2.0, 7); cam.lookAt(4.5, 1.3, 0); cam.fov = 50; }
    else if (view === 'weapons') { cam.position.set(4.5, 3.0, 4.5); cam.lookAt(4.5, 2.9, -1.5); cam.fov = 40; }
    else if (view === 'items') { cam.position.set(5, 1.6, 6); cam.lookAt(5, 0.3, 2.2); cam.fov = 45; }
    else if (view === 'face') { cam.position.set(0, 1.7, 2.2); cam.lookAt(0, 1.5, 0); cam.fov = 35; }
    else { cam.position.set(4.5, 2.4, 8); cam.lookAt(4.5, 1.2, 0); cam.fov = 55; }
    cam.updateProjectionMatrix();
    E.start((dt) => {
      for (const ch of chars) FN.Character.animate(ch, ch.pose, dt);
      items[0].lid.rotation.x = -Math.sin(E.time) * 0.5 - 0.5; items[1].lid.rotation.x = -0.8;
      FN.Sky.update(dt, cam.position); FN.FX.update(dt); FN.Input.endFrame();
    });
  }

  function showLaunch() {
    const l = document.getElementById('launch'); if (!l) return boot();
    l.style.display = 'flex';
    const go = () => { l.style.display = 'none'; document.getElementById('loading').style.display = 'flex'; FN.Audio.init(); boot().catch(e => { console.error(e); setLoad('ERROR: ' + e.message, 0); }); };
    l.addEventListener('click', go, { once: true });
    if (params.get('autostart')) go();
  }
  window.addEventListener('load', showLaunch);
})();
