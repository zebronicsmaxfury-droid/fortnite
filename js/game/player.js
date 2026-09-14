// The human player: movement, camera, aerial phases, interaction, weapons, harvesting, building, consumables.
window.FN = window.FN || {};
(function () {
  const C = FN.CONFIG, U = FN.U, P = C.PLAYER, CAM = C.CAMERA, K = C.KEYS;
  const PL = {
    isPlayer: true, name: 'Player', team: 0, pos: new THREE.Vector3(), vel: new THREE.Vector3(), yaw: 0, camYaw: 0, camPitch: -0.15,
    x: 0, y: 0, z: 0, crouch: false, sprint: false, grounded: false, health: 100, shield: 0, dead: false, state: 'lobby', radius: P.RADIUS,
    inv: null, equip: { slot: 0, item: null, reloadT: 0, cooldown: 0, bloom: 0, ads: false, switchT: 0, burstLeft: 0 }, harvest: { swingT: -1 }, heal: null,
    stats: { kills: 0, damage: 0 }, fallStart: null, char: null, weaponCache: {}, glider: null, kickT: 0, kickAmt: 0, hurt: 0, recoil: 0,
    camDist: CAM.DIST, fov: CAM.FOV, lastAim: { origin: { x: 0, y: 0, z: 0 }, dir: { x: 0, y: 0, z: -1 } }, skydive: null, glide: null, inStorm: false, skin: 'jonesy', vehicle: null,
  };
  PL.init = function (scene) {
    PL.scene = scene; PL.inv = FN.Inventory.create();
    PL.char = FN.Character.create(PL.skin); scene.add(PL.char.group);
    PL.pickaxeMesh = FN.WeaponModels.build('pickaxe');
    // contrails
    PL.trails = [];
    for (let i = 0; i < 2; i++) { const geo = new THREE.BufferGeometry(); const N = 40; geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3)); const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 })); line.visible = false; line.frustumCulled = false; scene.add(line); PL.trails.push({ line, N, head: 0, filled: false }); }
    PL.weakRing = new THREE.Sprite(new THREE.SpriteMaterial({ map: FN.Tex.make('ring', 64, 64, (ctx, w, h) => { ctx.clearRect(0, 0, w, h); ctx.strokeStyle = '#4fc3ff'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(32, 32, 24, 0, 6.28); ctx.stroke(); ctx.fillStyle = 'rgba(79,195,255,0.25)'; ctx.fill(); }), transparent: true, depthTest: false, depthWrite: false })); PL.weakRing.scale.set(0.8, 0.8, 1); PL.weakRing.visible = false; PL.weakRing.renderOrder = 5; scene.add(PL.weakRing);
    PL.equipSlot(0, true);
  };    PL.reset = function () {
    PL.inv = FN.Inventory.create(); PL.health = 100; PL.shield = 0; PL.dead = false; PL.invulnerable = false; PL.stats = { kills: 0, damage: 0 }; PL.equip = { slot: 0, item: null, reloadT: 0, cooldown: 0, bloom: 0, ads: false, switchT: 0, burstLeft: 0 }; PL.heal = null; PL.harvest.swingT = -1;
    PL.vel.set(0, 0, 0); PL.vehicle = null; PL.vehicleSeat = null; PL.crouch = false; PL.skydive = null; PL.glide = null; PL.inStorm = false; PL.weak = null; PL.lastHitBy = null; PL.deathInfo = null; PL.placement = 0;
    if (PL.glider) { if (PL.glider.parent) PL.glider.parent.remove(PL.glider); PL.glider = null; }
    if (FN.Build) FN.Build.exit();
    if (PL.char && FN.Character) FN.Character.endDeath(PL.char); // clear any mid-sequence death FX from the previous run
    PL.equipSlot(0, true); PL.char.group.visible = true;
  };
  PL.setSkin = function (id) { if (PL.char) { PL.scene.remove(PL.char.group); } PL.skin = id; PL.char = FN.Character.create(id); PL.scene.add(PL.char.group); PL.equipSlot(PL.equip.slot, true); };
  PL.teleport = function (x, y, z) { PL.pos.set(x, y, z); PL.vel.set(0, 0, 0); PL.syncXYZ(); };
  PL.syncXYZ = function () { PL.x = PL.pos.x; PL.y = PL.pos.y; PL.z = PL.pos.z; };
  PL.currentItem = () => PL.equip.slot === 0 ? { kind: 'pickaxe', id: 'pickaxe' } : PL.inv.slots[PL.equip.slot - 1];
  PL.weaponKindFor = function (it) {
    if (!it) return 'none'; if (it.kind === 'pickaxe') return 'pickaxe'; if (it.kind === 'consumable') return 'item';
    const def = C.WEAPONS[it.id]; if (def.kind === 'pistol') return 'pistol'; if (def.kind === 'launcher') return 'launcher'; if (def.kind === 'sniper') return 'sniper'; return 'rifle';
  };
  PL.equipSlot = function (slot, silent) {
    if (slot < 0 || slot > 5) return; if (PL.heal) PL.cancelHeal(); if (PL.equip.reloadT > 0) PL.cancelReload();
    if (slot > 0 && !PL.inv.slots[slot - 1]) return;
    PL.equip.slot = slot; PL.equip.item = PL.currentItem(); PL.equip.reloadT = 0; PL.equip.ads = false;
    PL.equip.switchT = silent ? 0 : 0.3;
    const it = PL.equip.item; let mesh = null, kind = 'gun';
    if (!it) mesh = null;
    else if (it.kind === 'pickaxe') { mesh = PL.pickaxeMesh; kind = 'pickaxe'; }
    else if (it.kind === 'weapon') { const model = C.WEAPONS[it.id].model; mesh = PL.weaponCache[model] || (PL.weaponCache[model] = FN.WeaponModels.build(model)); }
    else if (it.kind === 'consumable') { mesh = PL.weaponCache['c_' + it.id] || (PL.weaponCache['c_' + it.id] = FN.ItemModels.consumable(it.id)); kind = 'item'; }
    FN.Character.setWeapon(PL.char, mesh, kind);
    if (!silent && FN.Audio) FN.Audio.play('equip', null, 0.6);
    if (FN.Build && FN.Build.active) FN.Build.exit();
  };
  PL.kick = function (a) { PL.kickAmt = a; PL.kickT = 0.12; };
  PL.cancelHeal = function () { PL.heal = null; if (FN.HUD) FN.HUD.progress(null); };
  PL.cancelReload = function () { PL.equip.reloadT = 0; if (FN.HUD) FN.HUD.progress(null); };
  // Drop the item in the currently selected inventory slot (never the pickaxe, never in build mode).
  PL.dropSelected = function () {
    const slot = PL.equip.slot;
    if (slot === 0) return;                 // never drop the harvest tool
    if (FN.Build && FN.Build.active) return; // never drop while placing buildings
    const it = PL.inv.slots[slot - 1];
    if (!it) return;
    const f = PL.forward();
    // Drop directly onto the current floor. A flying drop can lose its floor
    // context in multi-story buildings and land on/under the wrong level.
    FN.Loot.dropItems([it], PL.pos.x + f.x * 1.2, PL.pos.y, PL.pos.z + f.z * 1.2, 0.5, { playerDropped: true }, true, true);
    PL.inv.slots[slot - 1] = null;
    if (FN.HUD) { FN.HUD.dirtyHotbar = true; FN.HUD.dirtyToast = true; }
    PL.equipSlot(0, true); // switch back to the pickaxe
    if (FN.Audio) FN.Audio.play('equip', null, 0.5);
  };

  // ---------- vehicle ----------
  PL.enterVehicle = function (v) {
    if (!v) return;
    const passenger = !!(v.driver && FN.Match && FN.Match.mode !== 'solo' && v.driver.team === PL.team);
    if (passenger ? !FN.Vehicles.enterPassenger(v, PL) : !FN.Vehicles.enter(v, PL)) return;
    PL.vehicle = v;
    PL.vehicleSeat = passenger ? 'passenger' : 'driver';
    PL.state = 'vehicle';
    PL.camYaw = v.prop.rot - Math.PI / 2;
    PL.camPitch = -0.15;
    PL.char.group.visible = false;
    PL.vel.set(0, 0, 0);
    if (FN.Build && FN.Build.active) FN.Build.exit();
    PL.equipSlot(0, true);
    FN.Character.setWeapon(PL.char, null);
    if (FN.Audio) FN.Audio.play('equip', null, 0.6);
    if (FN.HUD) { FN.HUD.dirtyHotbar = true; FN.HUD.setVehicleDriving(true); if (FN.Match && FN.Match.mode !== 'solo') FN.HUD.notify('Press T to call out for teammates', 3.5); }
  };
  PL.exitVehicle = function () {
    if (!PL.vehicle) return;
    const v = PL.vehicle;
    const exitSpeed = Math.abs(v.speed);
    const px = v.prop.x, pz = v.prop.z;
    if (PL.vehicleSeat === 'passenger') {
      const fx = Math.cos(v.prop.rot), fz = Math.sin(v.prop.rot);
      PL.pos.set(px - fx * 3, FN.Terrain.heightAt(px - fx * 3, pz - fz * 3), pz - fz * 3);
      FN.Vehicles.exitPassenger(v, PL); PL.vehicle = null; PL.vehicleSeat = null; PL.syncXYZ(); PL.char.group.position.copy(PL.pos); PL.char.group.visible = true; PL.vel.set(0, 0, 0); PL.grounded = true; PL.state = 'ground';
      if (FN.HUD) { FN.HUD.dirtyHotbar = true; FN.HUD.setVehicleDriving(false); }
      return;
    }
    // get out beside the vehicle
    const fx = Math.cos(v.prop.rot), fz = Math.sin(v.prop.rot);
    PL.pos.set(px - fx * 3, FN.Terrain.heightAt(px - fx * 3, pz - fz * 3), pz - fz * 3);
    PL.syncXYZ();
    PL.char.group.position.copy(PL.pos);
    PL.char.group.visible = true;
    PL.vel.set(0, 0, 0);
    PL.grounded = true;
    PL.state = 'ground';
    FN.Vehicles.exit(v);
    PL.vehicle = null;
    PL.vehicleSeat = null;
    PL.equipSlot(0, true);
    if (FN.Audio) FN.Audio.play('equip', null, 0.6);
    if (FN.HUD) { FN.HUD.dirtyHotbar = true; FN.HUD.setVehicleDriving(false); }
  };
  PL.updateVehicle = function (dt) {
    const v = PL.vehicle;
    if (!v) return;
    PL.char.group.visible = false;
    if (FN.Input.wasPressed(C.KEYS.interact)) { PL.exitVehicle(); return; }
    if (PL.vehicleSeat === 'passenger') {
      const slot = Math.max(0, v.passengers.indexOf(PL)); const side = slot % 2 ? 1 : -1; const fx = Math.cos(v.prop.rot), fz = -Math.sin(v.prop.rot);
      PL.pos.set(v.prop.x - fx * (slot + 1) * 0.65 - fz * side * 0.8, v.prop.y + 1.1, v.prop.z - fz * (slot + 1) * 0.65 + fx * side * 0.8); PL.syncXYZ();
      const cam = FN.Engine.camera; const f = { x: -Math.sin(PL.camYaw), z: -Math.cos(PL.camYaw) }; cam.position.set(v.prop.x - f.x * 7.5, v.prop.y + 4, v.prop.z - f.z * 7.5); cam.lookAt(v.prop.x + f.x * 12, v.prop.y + 1.3, v.prop.z + f.z * 12); return;
    }
    if (FN.Input.wasPressed('KeyT') && FN.Match && FN.Match.mode !== 'solo' && FN.Bots) {
      FN.Bots.calloutVehicle(v, PL);
      if (FN.HUD) FN.HUD.notify('Vehicle callout sent to teammates', 2.5);
    }
    if (!v.prop.alive) { PL.exitVehicle(); return; }

    FN.Vehicles.updateDriving(v, dt);
    PL.pos.set(v.prop.x, v.prop.y + 1.5, v.prop.z);
    PL.syncXYZ();

    const cam = FN.Engine.camera;
    const f = { x: -Math.sin(PL.camYaw), z: -Math.cos(PL.camYaw) };
    const dist = 7.5 + Math.min(3.5, Math.abs(v.speed) * 0.18);
    const height = 4.0;
    cam.position.set(v.prop.x - f.x * dist, v.prop.y + height, v.prop.z - f.z * dist);
    cam.lookAt(v.prop.x + f.x * 12, v.prop.y + 1.3, v.prop.z + f.z * 12);
    PL.fov = U.damp(PL.fov, 82, 8, dt); cam.fov = PL.fov; cam.updateProjectionMatrix();

    FN.Sky.update(dt, cam.position); FN.Terrain.updateLOD(cam.position);
    if (FN.Audio) FN.Audio.setListener(cam.position.x, cam.position.y, cam.position.z, f.x, f.z);
    if (FN.HUD) FN.HUD.updateSpeedometer(FN.Vehicles.speedometerKph, v.def.name);
  };

  // ---------- camera ----------
  PL.forward = function () { return { x: -Math.sin(PL.camYaw) * Math.cos(PL.camPitch), y: Math.sin(PL.camPitch), z: -Math.cos(PL.camYaw) * Math.cos(PL.camPitch) }; };
  PL.updateCamera = function (dt, opts) {
    const cam = FN.Engine.camera; opts = opts || {};
    const it = PL.equip.item; const def = it && it.kind === 'weapon' ? C.WEAPONS[it.id] : null;
    const scoped = PL.equip.ads && def && def.scope;
    let dist = CAM.DIST, side = CAM.SIDE, height = CAM.HEIGHT, fov = CAM.FOV;
    if (PL.state === 'skydive' || PL.state === 'glide') { dist = 5.5; height = 1.2; side = 0.3; fov = 85; }
    else if (PL.state === 'dead') { dist = 6; height = 2.5; side = 0; }
    else if (scoped) { dist = 0.0; side = 0.0; height = PL.crouch ? 1.3 : 1.62; fov = def.scope === 'sniper' ? CAM.SNIPER_FOV : CAM.SCOPE_AR_FOV; }
    else if (PL.equip.ads) { dist = CAM.ADS_DIST; side = CAM.ADS_SIDE; fov = CAM.ADS_FOV; }
    else if (PL.sprint && PL.grounded) fov += 4;
    if (PL.crouch && PL.state !== 'skydive') height -= 0.35;
    PL.fov = U.damp(PL.fov, fov, 12, dt); cam.fov = PL.fov; cam.updateProjectionMatrix();
    const f = PL.forward(); const rx = Math.cos(PL.camYaw), rz = -Math.sin(PL.camYaw);
    const pivot = { x: PL.pos.x + rx * side * 0.3, y: PL.pos.y + height, z: PL.pos.z + rz * side * 0.3 };
    // collision: shorten the boom
    let d = dist;
    if (d > 0.2) {
      const back = { x: -f.x, y: -f.y, z: -f.z }; const start = { x: pivot.x + rx * side, y: pivot.y, z: pivot.z + rz * side };
      const hit = FN.Physics.raycast(start, back, d + 0.3, { noProps: false });
      if (hit) d = Math.max(0.3, hit.t - 0.35);
      const th = FN.Terrain.heightAt(start.x + back.x * d, start.z + back.z * d); const cy = start.y + back.y * d; if (cy < th + 0.5) { d = Math.max(0.3, d * (start.y - th - 0.5) / Math.max(0.01, start.y - cy)); }
    }
    PL.camDist = U.damp(PL.camDist, d, 30, dt); if (PL.camDist > d) PL.camDist = d;
    const kick = PL.kickT > 0 ? PL.kickAmt * (PL.kickT / 0.12) * 0.03 : 0;
    cam.position.set(pivot.x + rx * side - f.x * PL.camDist, pivot.y - f.y * PL.camDist + kick, pivot.z + rz * side - f.z * PL.camDist);
    const look = { x: pivot.x + rx * side + f.x * 40, y: pivot.y + f.y * 40, z: pivot.z + rz * side + f.z * 40 };
    cam.lookAt(look.x, look.y, look.z);
    // aim ray from the camera through the crosshair, starting near the character
    PL.lastAim.dir = f; PL.lastAim.origin = { x: cam.position.x + f.x * (PL.camDist + 0.2), y: cam.position.y + f.y * (PL.camDist + 0.2), z: cam.position.z + f.z * (PL.camDist + 0.2) };
    if (FN.Audio) FN.Audio.setListener(cam.position.x, cam.position.y, cam.position.z, f.x, f.z);
    FN.Sky.update(dt, cam.position); FN.Terrain.updateLOD(cam.position);
  };
  PL.lookInput = function () {
    const I = FN.Input; const m = I.consumeMouse();
    const it = PL.equip.item; const def = it && it.kind === 'weapon' ? C.WEAPONS[it.id] : null;
    const st = FN.Settings ? FN.Settings.data : null; const sens = CAM.SENS * (st ? st.sens : 1) * (PL.equip.ads ? (def && def.scope ? (def.scope === 'sniper' ? 0.25 : 0.45) : 0.7) : 1);
    PL.camYaw -= m.x * sens; PL.camPitch = U.clamp(PL.camPitch - m.y * sens * (st && st.invertY ? -1 : 1), -1.35, 1.35);
  };

  // ---------- main update ----------
  PL.update = function (dt) {
    const I = FN.Input; const st = PL.state;
    if (PL.kickT > 0) PL.kickT -= dt; PL.hurt = Math.max(0, PL.hurt - dt * 3); PL.recoil = Math.max(0, PL.recoil - dt * 8);
    if (st === 'lobby') return;
    if (st === 'dead') { PL.lookInput(); PL.animate(dt); PL.updateCamera(dt); return; }
    if (st === 'bus') { PL.lookInput(); FN.Match.busCamera(dt); if (I.wasPressed(K.jump) && FN.Match.busCanJump) FN.Match.leaveBus(); return; }
    if (st === 'vehicle') { PL.lookInput(); PL.updateVehicle(dt); PL.animate(dt); return; }
    PL.lookInput();
    if (st === 'skydive') PL.updateSkydive(dt); else if (st === 'glide') PL.updateGlide(dt); else PL.updateGround(dt);
    PL.syncXYZ();
    PL.char.group.position.copy(PL.pos); PL.char.group.rotation.y = PL.yaw;
    PL.animate(dt); PL.updateCamera(dt); PL.updateTrails(dt);
  };
  PL.animate = function (dt) {
    if (PL.dead) {
      // Shared death FX: frozen at death pose, dissolve to blue grid, hold, fade out.
      if (PL.char && PL.char.deathFx) {
        const done = FN.Character.updateDeath(PL.char, dt);
        if (done) { PL.char.group.visible = false; FN.Character.endDeath(PL.char); }
      }
      return;
    }
    const it = PL.equip.item; const spd = Math.sqrt(PL.vel.x * PL.vel.x + PL.vel.z * PL.vel.z);
    const weaponModel = it && it.kind === 'weapon' ? C.WEAPONS[it.id].model : 'none';
    const s = { move: U.clamp(spd / P.SPRINT, 0, 1), sprint: PL.sprint && spd > 4.5, crouch: PL.crouch, grounded: PL.grounded, air: PL.vel.y, aim: PL.equip.ads, pitch: PL.camPitch, weapon: PL.weaponKindFor(it), swing: PL.harvest.swingT >= 0 ? PL.harvest.swingT / P.HARVEST_RATE : null, recoil: PL.recoil, hurt: PL.hurt, dead: PL.dead, weaponModel };
    if (PL.state === 'skydive') s.skydive = PL.skydive; else if (PL.state === 'glide') s.glide = PL.glide;
    if (PL.heal) s.weapon = 'item';
    FN.Character.animate(PL.char, s, dt);
    // hide own model when scoped or while driving
    const def = it && it.kind === 'weapon' ? C.WEAPONS[it.id] : null;
    const hiddenByVehicle = PL.state === 'vehicle';
    PL.char.group.visible = !hiddenByVehicle && !(PL.equip.ads && def && def.scope) && PL.state !== 'bus';
  };
  // ---------- ground ----------
  PL.updateGround = function (dt) {
    const I = FN.Input; const it = PL.equip.item; const def = it && it.kind === 'weapon' ? C.WEAPONS[it.id] : null;
    // hotbar
    const slotKeys = [K.slot1, K.slot2, K.slot3, K.slot4, K.slot5, K.slot6]; for (let i = 0; i < 6; i++) if (I.wasPressed(slotKeys[i])) PL.equipSlot(i);
    const wh = I.consumeWheel(); if (wh !== 0) { let s = PL.equip.slot; for (let k = 0; k < 6; k++) { s = (s + wh + 6) % 6; if (s === 0 || PL.inv.slots[s - 1]) break; } PL.equipSlot(s); }
    // build keys
    const B = FN.Build;
    const canBuild = !FN.Match || FN.Match.phase === 'game';
    if (!canBuild) { if (B.active) B.exit(); }
    else {
      if (I.wasPressed(K.wall)) B.enter('wall'); if (I.wasPressed(K.floor)) B.enter('floor'); if (I.wasPressed(K.stairs)) B.enter('stairs'); if (I.wasPressed(K.roof)) B.enter('roof');
      if (I.wasPressed(K.buildToggle)) { if (B.active) { B.exit(); } else B.enter(); }
    }
    // drop the selected item (G). Pickaxe and buildings are never dropped.
    if (I.wasPressed(K.edit) && !B.active) PL.dropSelected();
    if (B.active && (I.wasPressed(K.slot1) || I.wasPressed(K.slot2) || I.wasPressed(K.slot3))) B.exit();
    if (B.active) { if (I.wasPressed(K.rotate)) B.rotate(); if (I.btnClicked(2)) B.cycleMat(); if (I.wasPressed(K.matWood)) B.mat = 'wood'; if (I.wasPressed(K.matBrick)) B.mat = 'brick'; if (I.wasPressed(K.matMetal)) B.mat = 'metal'; }
    // movement input
    const ax = I.axis();
    // Forward movement is always sprint speed; Shift is no longer required.
    const wantSprint = ax.z > 0 && !PL.equip.ads && !PL.heal;
    PL.sprint = wantSprint; const wantCrouch = I.isDown(K.crouch);
    if (wantCrouch !== PL.crouch) { if (wantCrouch || PL.canStand()) PL.crouch = wantCrouch; }
    let speed = PL.crouch ? P.CROUCH : (PL.equip.ads ? P.ADS : (PL.sprint ? P.SPRINT : P.WALK)); if (PL.heal) speed = Math.min(speed, P.WALK);
    if (ax.z < 0) speed = Math.min(speed, P.BACK);
    // in lake water: slow
    const wl = FN.Terrain.waterLevelAt(PL.pos.x, PL.pos.z); if (wl > PL.pos.y + 0.3) speed *= 0.55;
    const fx = -Math.sin(PL.camYaw), fz = -Math.cos(PL.camYaw), rx = Math.cos(PL.camYaw), rz = -Math.sin(PL.camYaw);
    let mx = fx * ax.z + rx * ax.x, mz = fz * ax.z + rz * ax.x; const ml = Math.sqrt(mx * mx + mz * mz); if (ml > 1) { mx /= ml; mz /= ml; }
    const accel = PL.grounded ? 40 : 40 * P.AIR_CONTROL;
    PL.vel.x = U.damp(PL.vel.x, mx * speed, accel, dt); PL.vel.z = U.damp(PL.vel.z, mz * speed, accel, dt);
    PL.yaw = PL.camYaw;
    // jump
    if (I.wasPressed(K.jump) && PL.grounded && !PL.crouch) { PL.vel.y = P.JUMP_VEL; PL.grounded = false; if (FN.Audio) FN.Audio.play('jump', null, 0.5); }
    if (I.wasPressed(K.jump) && PL.crouch && PL.grounded) { if (PL.canStand()) PL.crouch = false; }
    PL.vel.y -= C.GRAVITY * dt;
    PL.integrate(dt);
    // footsteps
    const spd2 = Math.sqrt(PL.vel.x * PL.vel.x + PL.vel.z * PL.vel.z); if (PL.grounded && spd2 > 1.5) { PL._stepT = (PL._stepT || 0) + dt * (PL.sprint ? 3.2 : 2.4); if (PL._stepT >= 1) { PL._stepT = 0;
      let sound = 'footstep';
      if (PL.groundKind === 'structure' && PL.groundObj) {
        if (PL.groundObj.mat === 'wood') sound = 'footstep_wood';
        else if (PL.groundObj.mat === 'brick') sound = 'footstep_stone';
        else if (PL.groundObj.mat === 'metal') sound = 'footstep_metal';
      } else if (PL.groundKind === 'terrain') sound = 'footstep_grass';
      if (FN.Audio) FN.Audio.play(sound, null, PL.crouch ? 0.2 : 0.45); } }
    // interaction / actions
    PL.updateActions(dt);
    B.update(PL, dt);
  };
  PL.canStand = function () { const g = FN.Physics.collideXZ({ x: PL.pos.x, y: PL.pos.y, z: PL.pos.z }, P.RADIUS, P.HEIGHT, {}); return !(g.ceiling < PL.pos.y + P.HEIGHT); };
  PL.integrate = function (dt) {
    const height = PL.crouch ? P.CROUCH_HEIGHT : P.HEIGHT;
    const wasGrounded = PL.grounded;
    // horizontal
    const np = { x: PL.pos.x + PL.vel.x * dt, y: PL.pos.y, z: PL.pos.z + PL.vel.z * dt };
    const col = FN.Physics.collideXZ(np, P.RADIUS, height, PL._col || (PL._col = {}));
    if (PL.harvest.swingT > 0 && col.hit) {
      PL.vel.x = 0;
      PL.vel.z = 0;
    }
    if (col.stepUp > -Infinity && col.stepUp <= PL.pos.y + 1.2 && PL.grounded) { np.y = Math.max(np.y, col.stepUp); }
    // bounds
    const lim = C.WORLD_SIZE / 2 - 4; np.x = U.clamp(np.x, -lim, lim); np.z = U.clamp(np.z, -lim, lim);
    PL.pos.x = np.x; PL.pos.z = np.z; PL.pos.y = np.y;
    // vertical
    const prevY = PL.pos.y;
    PL.pos.y += PL.vel.y * dt;
    // when airborne use the higher of the previous/new y so fast falls can't tunnel
    // through floors (jumping on a 2nd storey used to drop you right through it)
    const g = wasGrounded
      ? FN.Physics.groundAt(PL.pos.x, PL.pos.z, PL.pos.y + 1.15, 1.15)
      : FN.Physics.groundAt(PL.pos.x, PL.pos.z, Math.max(prevY, PL.pos.y) + 1.15, 1.15);
    if (PL.pos.y <= g.y + 0.001 && PL.pos.y > g.y - 2.5 && PL.vel.y <= 0) {
      if (!wasGrounded) PL.onLand();
      PL.pos.y = g.y; PL.vel.y = 0; PL.grounded = true; PL.groundKind = g.kind; PL.groundObj = g.obj;
    } else {

      // walking off an edge: snap down small drops when grounded
      if (wasGrounded && PL.vel.y <= 0 && g.y > PL.pos.y - 0.6 && g.y <= PL.pos.y) { PL.pos.y = g.y; PL.vel.y = 0; PL.grounded = true; }
      else { if (PL.pos.y < FN.Terrain.heightAt(PL.pos.x, PL.pos.z)) { PL.pos.y = FN.Terrain.heightAt(PL.pos.x, PL.pos.z); PL.vel.y = 0; PL.grounded = true; } else { PL.grounded = false; if (PL.fallStart === null || PL.vel.y > 0) PL.fallStart = Math.max(PL.fallStart === null ? PL.pos.y : PL.fallStart, PL.pos.y); } }
    }
    if (col.ceiling < PL.pos.y + height && PL.vel.y > 0) { PL.vel.y = 0; PL.pos.y = Math.min(PL.pos.y, col.ceiling - height - 0.01); }
    // water: sea kills nothing but keep above sea floor; lake walkable on the bed
    if (PL.grounded) PL.fallStart = null;
  };
  PL.onLand = function () {
    if (FN.Audio) FN.Audio.play('land', null, 0.5);
    if (PL.fallStart !== null) { const fall = PL.fallStart - PL.pos.y; if (fall > P.FALL_DMG_MIN) { const dmg = Math.min(200, (fall - P.FALL_DMG_MIN) * P.FALL_DMG_PER_M); FN.Combat.applyDamage(PL, dmg, null, { fall: true }); if (FN.Audio) FN.Audio.play('damage_taken', null, 0.8); } }
    PL.fallStart = null;
  };
  // ---------- actions: interact, fire, harvest, heal, reload ----------
  PL.updateActions = function (dt) {
    const I = FN.Input; const E = PL.equip; const it = E.item; const B = FN.Build;
    if (E.switchT > 0) E.switchT -= dt; if (E.cooldown > 0) E.cooldown -= dt;
    E.bloom = Math.max(0, E.bloom - dt * 2.4);
    if (FN.Bots && FN.Bots.rideRequest && FN.Match && FN.Match.mode !== 'solo') {
      const req = FN.Bots.rideRequest;
      if (!req.driver || req.driver.dead || !req.vehicle || !req.vehicle.prop.alive) FN.Bots.rideRequest = null;
      else if (I.wasPressed('KeyY')) { req.vehicle.waitForPlayer = true; FN.Bots.rideRequest = null; if (FN.HUD) FN.HUD.notify(req.driver.name + ' will wait for you', 2.5); }
      else if (I.wasPressed('KeyN')) { req.vehicle.waitForPlayer = false; FN.Bots.exitVehicleBot(req.driver); FN.Bots.rideRequest = null; if (FN.HUD) FN.HUD.notify('Ride declined', 2.5); }
    }
    // interact
    const aim = PL.lastAim; const target = FN.Loot.findInteract(FN.Engine.camera.position, aim.dir, 3.6, PL.pos.x, PL.pos.y, PL.pos.z);
    PL.interactTarget = target;
    PL._vehicleNear = FN.Vehicles ? FN.Vehicles.aimed(PL.pos.x, PL.pos.z, FN.Engine.camera.position, PL.lastAim.dir, 4) : null;
    if (I.wasPressed(K.interact)) {
      if (PL._vehicleNear && !PL.vehicle) { PL.enterVehicle(PL._vehicleNear); return; }
      if (target) { PL.interact(target); }
    }
    const interactKey = FN.Settings ? FN.Settings.shortName(K.interact) : 'E';
    if (PL._vehicleNear && !PL.vehicle && FN.HUD) FN.HUD.showPrompt('Press ' + interactKey + ' to enter ' + PL._vehicleNear.def.name);
    else if (!target && FN.HUD && FN.HUD.c.prompt && FN.HUD.c.prompt.style.display !== 'none' && !PL._vehicleNear) { /* keep prompt for target */ }
    // auto pickup ammo/mats
    PL._apT = (PL._apT || 0) + dt; if (PL._apT > 0.2) { PL._apT = 0; const near = FN.Loot.nearby(PL.pos.x, PL.pos.z, 3, []); for (const o of near) { if (o.type !== 'item' || o.fly || o.pickupDelay > 0) continue; const k = o.item.kind; if ((k === 'ammo' || k === 'material') && U.dist2sq(o.x, o.z, PL.pos.x, PL.pos.z) < 2.4 && Math.abs(o.y - PL.pos.y) < 2 && FN.Physics.lineOfSight({ x: PL.pos.x, y: PL.pos.y + 1.2, z: PL.pos.z }, { x: o.x, y: o.y, z: o.z })) { const r = FN.Inventory.add(PL.inv, o.item); if (r.ok) { if (FN.Audio) FN.Audio.play('pickup', null, 0.5); if (FN.HUD) FN.HUD.pickupToast(o.item); if (!r.leftover) FN.Loot.remove(o); } } } }
    // reload
    if (it && it.kind === 'weapon' && I.wasPressed(K.reload) && !B.active) PL.startReload();
    if (E.reloadT > 0) {
      E.reloadT -= dt;
      if (E.reloadT <= 0) {
        const def = C.WEAPONS[it.id];
        if (def) {
          if (it.ammo === undefined || isNaN(it.ammo)) it.ammo = 0;
          if (PL.inv.ammo[def.ammo] === undefined || isNaN(PL.inv.ammo[def.ammo])) PL.inv.ammo[def.ammo] = 0;
          const need = def.mag - it.ammo;
          const take = Math.min(need, PL.inv.ammo[def.ammo]);
          it.ammo += take;
          PL.inv.ammo[def.ammo] -= take;
        }
        E.reloadT = 0;
        if (FN.HUD) FN.HUD.progress(null);
      }
    }
    // ADS (Click / Toggle)
    if (it && it.kind === 'weapon' && !B.active && E.reloadT <= 0) {
      if (I.btnClicked(2)) { E.ads = !E.ads; }
      if (PL.sprint || E.reloadT > 0 || E.switchT > 0) { E.ads = false; }
    } else {
      E.ads = false;
    }
    // healing progress
    if (PL.heal) {
      PL.heal.t += dt; if (FN.HUD) FN.HUD.progress({ label: C.CONSUMABLES[PL.heal.id].name, f: PL.heal.t / PL.heal.dur });
      if (PL.heal.t >= PL.heal.dur) PL.finishHeal();
    }
    // primary action
    const fire = I.btn(0), click = I.btnClicked(0);
    if (FN.Match && FN.Match.phase === 'island') {
      if (it && it.kind === 'pickaxe') { PL.harvest.swingT = -1; PL.harvest.hitDone = false; }
      return;
    }
    // aim-bot: only while firing a weapon; also runs when idle so the 1s release timer ticks
    if (it && it.kind === 'weapon' && fire && !B.active && !PL.heal) PL.updateAimAssist(dt, true);
    else PL.updateAimAssist(dt, false);
    if (B.active) { if (click) B.place(PL); return; }
    if (PL.heal) return;
    if (!it) return;
    if (it.kind === 'pickaxe') {
      if (PL.harvest.swingT >= 0) { PL.harvest.swingT += dt; if (!PL.harvest.hitDone && PL.harvest.swingT > P.HARVEST_RATE * 0.42) { PL.harvest.hitDone = true; PL.doHarvestHit(); } if (PL.harvest.swingT >= P.HARVEST_RATE) PL.harvest.swingT = fire ? 0 : -1, PL.harvest.hitDone = false; }
      else if (fire) { PL.harvest.swingT = 0; PL.harvest.hitDone = false; if (FN.Audio) FN.Audio.play('pickaxe_swing', null, 0.4); }
      if (PL.harvest.swingT < 0 && !fire) PL.harvest.hitDone = false;
    } else if (it.kind === 'weapon') {
      const def = C.WEAPONS[it.id];
      // burst weapons: one trigger pull queues the rest of the burst (fires on cooldown ticks)
      const cont = !!(def.burst && E.burstLeft > 0);
const trigger = cont || (def.auto ? (fire || click) : click);
	       if (trigger && E.cooldown <= 0 && E.reloadT <= 0 && E.switchT <= 0) {
	         if (it.ammo === undefined || isNaN(it.ammo) || it.ammo <= 0) {
	           it.ammo = 0;
	           E.burstLeft = 0;
	           if (click && !cont) {
	             if ((PL.inv.ammo[def.ammo] || 0) > 0) PL.startReload();
	             else if (FN.Audio) FN.Audio.play('empty_click', null, 0.5);
	           }
	         }
	         else {
	           it.ammo--; E.cooldown = 1 / def.rate;
	           const spread = PL.currentSpread(); FN.Combat.fire(PL, it, aim.origin, aim.dir, spread);
	           if (FN.Character && FN.Character.triggerShoot) FN.Character.triggerShoot(PL.char, def.model, true);
	           E.bloom = Math.min(1, E.bloom + def.bloom); PL.recoil = 1;
          E.burstLeft = cont ? E.burstLeft - 1 : (def.burst ? def.burst - 1 : 0);
          if (it.ammo <= 0 && (PL.inv.ammo[def.ammo] || 0) > 0) { PL.startReload(true); E.burstLeft = 0; }
        }
      }
} else if (it.kind === 'consumable') {
       if (click) PL.startHeal(it);
      }
    if (PL.weak && PL.equip.slot === 0 && FN.Engine.time - PL.weak.t < 6) { PL.weakRing.visible = true; PL.weakRing.position.set(PL.weak.point.x, PL.weak.point.y, PL.weak.point.z); PL.weakRing.scale.setScalar(0.7 + Math.sin(FN.Engine.time * 6) * 0.06); }
    else PL.weakRing.visible = false;
  };
  PL.currentSpread = function () {
    const it = PL.equip.item; const def = C.WEAPONS[it.id]; const E = PL.equip;
    let s = E.ads ? def.adsSpread : def.spread; s += E.bloom * (E.ads ? 1.2 : 2.4);
    const spd = Math.sqrt(PL.vel.x * PL.vel.x + PL.vel.z * PL.vel.z); if (spd > 1) s *= 1.45; if (!PL.grounded) s *= 1.8; if (PL.crouch) s *= 0.75;
    return s;
  };
  PL.startReload = function (auto) {
    const it = PL.equip.item; if (!it || it.kind !== 'weapon') return; const def = C.WEAPONS[it.id]; const E = PL.equip;
    if (!def) return;
    if (it.ammo === undefined || isNaN(it.ammo)) it.ammo = 0;
    if (PL.inv.ammo[def.ammo] === undefined || isNaN(PL.inv.ammo[def.ammo])) PL.inv.ammo[def.ammo] = 0;
    if (E.reloadT > 0 || it.ammo >= def.mag || PL.inv.ammo[def.ammo] <= 0) return;
    E.reloadT = FN.Inventory.reloadTime(it); E.ads = false; if (FN.Audio) FN.Audio.play('reload', null, 0.7);
    if (FN.HUD) FN.HUD.progress({ label: 'Reloading', f: 0, reload: E.reloadT });
  };
  // ---------- drop weapon (controller X after landing) ----------
  PL.dropWeapon = function () {
    if (PL.equip.slot <= 0) return;
    const it = PL.inv.slots[PL.equip.slot - 1];
    if (!it) return;
    PL.inv.slots[PL.equip.slot - 1] = null;
    if (FN.Loot) FN.Loot.dropItems([it], PL.pos.x, PL.pos.y + 0.5, PL.pos.z, 0.8, { playerDropped: true }, false);
    PL.equipSlot(0);
    if (FN.HUD) FN.HUD.dirtyHotbar = true;
    if (FN.Audio) FN.Audio.play('equip', null, 0.5);
    // When the player drops an item, the teammates decide who needs it most and
    // that bot automatically goes over and picks it up (same logic as the manual
    // "Take This" team command, without needing to open the command menu).
    if (FN.Bots && FN.Bots.issueCommand && FN.Bots.list && FN.Bots.list.some(b => b.isTeammate && !b.dead)) FN.Bots.issueCommand(4);
  };
  // ---------- aim-bot (Settings -> GAME -> Aim-bot) ----------
  // Acquires enemies near the crosshair while firing and smoothly steers toward them.
  PL.aimAssist = { target: null, holdT: 0, scanT: 0, checkT: 0 };
  PL.validAimTarget = function (b) {
    return b && !b.dead && !b.isTeammate && b.team !== 0 && b.health > 0 && !b.aboard && !b.air;
  };
  PL.findAimTarget = function () {
    const A = PL.aimAssist; const d = PL.lastAim.dir, o = PL.lastAim.origin;
    let best = null, bestDot = Math.cos(0.16); // ~9 degree cone around the crosshair
    const list = FN.Bots.list;
    for (let i = 0; i < list.length; i++) {
      const b = list[i];
      if (!PL.validAimTarget(b)) continue;
      const dx = b.x - o.x, dy = b.y + 1.4 - o.y, dz = b.z - o.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist < 2 || dist > 160) continue;
      const dot = (dx * d.x + dy * d.y + dz * d.z) / dist;
      if (dot > bestDot) { bestDot = dot; best = b; }
    }
    if (best) { // line-of-sight check for the single best candidate only (cheap on low-end PCs)
      const b = best, dx = b.x - o.x, dy = b.y + 1.4 - o.y, dz = b.z - o.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const hit = FN.Physics.raycast(o, { x: dx / dist, y: dy / dist, z: dz / dist }, dist - 0.6, {});
      if (hit && hit.t < dist - 1) return null; // blocked by terrain / structure
    }
    return best;
  };
  PL.updateAimAssist = function (dt, firing) {
    const A = PL.aimAssist, st = FN.Settings ? FN.Settings.data : null;
    if (!st || !st.aimbot) { A.target = null; return; }
    // detach immediately from dead / airborne / invalid targets
    if (A.target && !PL.validAimTarget(A.target)) A.target = null;
    // stop shooting -> release the lock after 1 second; shooting again re-enables acquisition
    if (firing) A.holdT = 0; else { A.holdT += dt; if (A.holdT > 1) A.target = null; }
    A.scanT -= dt;
    if (!A.target && firing && A.scanT <= 0) { A.scanT = 0.1; A.target = PL.findAimTarget(); }
    const b = A.target;
    if (!b) return;
    // periodic LOS re-check (4x/sec): lose the lock when the target hides or gets too far
    A.checkT -= dt;
    if (A.checkT <= 0) {
      A.checkT = 0.25;
      const o = PL.lastAim.origin, dx = b.x - o.x, dy = b.y + 1.4 - o.y, dz = b.z - o.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const hit = FN.Physics.raycast(o, { x: dx / dist, y: dy / dist, z: dz / dist }, dist - 0.6, {});
      if ((hit && hit.t < dist - 1) || dist > 180) { A.target = null; return; }
    }
    // subtle, smooth steering toward the target's chest (shortest-angle yaw, damped pitch)
    let dyaw = Math.atan2(-(b.x - PL.pos.x), -(b.z - PL.pos.z)) - PL.camYaw;
    dyaw = Math.atan2(Math.sin(dyaw), Math.cos(dyaw));
    const dxh = b.x - PL.pos.x, dzh = b.z - PL.pos.z;
    const pitch = Math.atan2((b.y + 1.4) - (PL.pos.y + 1.6), Math.sqrt(dxh * dxh + dzh * dzh));
    const k = Math.min(1, 6 * dt);
    PL.camYaw += dyaw * k;
    PL.camPitch = U.clamp(PL.camPitch + (pitch - PL.camPitch) * k, -1.35, 1.35);
  };
  PL.doHarvestHit = function () {
    const aim = PL.lastAim; const hit = FN.Combat.harvestHit(PL, aim.origin, aim.dir, PL.camDist + 3.0);
    if (!hit && FN.Audio) FN.Audio.play('whoosh', null, 0.3);
  };
  PL.startHeal = function (it) {
    const def = C.CONSUMABLES[it.id];
    if (def.heal && !def.shield && PL.health >= def.healCap) { if (FN.HUD) FN.HUD.notify(PL.health >= 100 ? 'Health is full' : 'Cannot heal above ' + def.healCap); return; }
    if (def.shield && !def.heal && PL.shield >= def.shieldCap) { if (FN.HUD) FN.HUD.notify('Shield is full'); return; }
    if (def.heal && def.shield && PL.health >= 100 && PL.shield >= 100) return;
    PL.heal = { id: it.id, slot: PL.equip.slot, t: 0, dur: def.time }; PL.equip.ads = false;
    if (FN.Audio) FN.Audio.play(def.shield ? 'potion' : 'heal_start', null, 0.7);
  };
  PL.finishHeal = function () {
    const h = PL.heal; const def = C.CONSUMABLES[h.id]; const slot = PL.inv.slots[h.slot - 1];
    if (def.heal) PL.health = Math.min(def.healCap, Math.max(PL.health, Math.min(def.healCap, PL.health + def.heal)));
    if (def.shield) PL.shield = Math.min(def.shieldCap, PL.shield + def.shield);
    if (slot && slot.kind === 'consumable') { slot.count--; if (slot.count <= 0) { PL.inv.slots[h.slot - 1] = null; } }
    if (FN.Audio) FN.Audio.play('heal_done', null, 0.7);
    PL.heal = null; if (FN.HUD) FN.HUD.progress(null);
    if (!PL.inv.slots[PL.equip.slot - 1]) PL.equipSlot(0); else PL.equip.item = PL.currentItem();
  };
  PL.interact = function (o) {
    // vehicle enter takes priority
    if (PL._vehicleNear && !PL.vehicle) { PL.enterVehicle(PL._vehicleNear); return; }
    if (o.type === 'chest') { FN.Loot.openChest(o, PL); }
    else if (o.type === 'ammobox') { FN.Loot.openAmmoBox(o); }
    else if (o.type === 'item') {
      if (o.pickupDelay > 0) return; // freshly dropped items aren't pickable for ~1s
      const it = o.item; const sel = PL.equip.slot > 0 ? PL.equip.slot - 1 : -1;
      const r = FN.Inventory.add(PL.inv, it, sel);
      if (!r.ok) { if (FN.HUD) FN.HUD.notify('Inventory full'); return; }
      if (PL.equip.reloadT > 0) PL.cancelReload();
      if (FN.Audio) FN.Audio.play('pickup', null, 0.6); if (FN.HUD) FN.HUD.pickupToast(it);
      if (r.swapped) { const d = FN.Loot.dropItems([r.swapped], PL.pos.x, PL.pos.y, PL.pos.z, 0.6, { playerDropped: true }, false); }
      if (!r.leftover) FN.Loot.remove(o);
      if (r.slot !== undefined && (PL.equip.slot === 0 || r.slot === sel)) { if (it.kind === 'weapon' || it.kind === 'consumable') PL.equipSlot(r.slot + 1); }
      PL.equip.item = PL.currentItem();
    }
  };
  // ---------- skydive / glide ----------
  PL.startSkydive = function (x, y, z) {
    PL.state = 'skydive'; PL.pos.set(x, y, z); PL.vel.set(0, -10, 0); PL.skydive = { dive: 0, turn: 0 }; PL.glide = null; PL.grounded = false; PL.crouch = false;
    if (FN.Build.active) FN.Build.exit(); PL.equipSlot(0, true); FN.Character.setWeapon(PL.char, null);
    for (const t of PL.trails) { t.filled = false; t.line.visible = true; }
    if (FN.Audio) { FN.Audio.play('bus_jump', null, 0.8); FN.Audio.loop('wind', true, { gain: 0.3, freq: 900 }); }
  };
  PL.deployGlider = function () {
    if (PL.state !== 'skydive') return; PL.state = 'glide'; PL.glide = { turn: 0 }; PL.skydive = null;
    if (!PL.glider) PL.glider = FN.ItemModels.glider();
    // Attach above the player, over the head (same as bots / lobby preview).
    // Hand-bone parenting put the canopy at hip height with the wrong orientation.
    if (PL.glider.parent !== PL.char.group) PL.char.group.add(PL.glider);
    PL.glider.position.set(0, 3.3, 0);
    PL.glider.rotation.set(0, 0, 0);
    PL.vel.y = Math.max(PL.vel.y, -C.SKYDIVE.GLIDE_FALL * 1.5);
    for (const t of PL.trails) t.line.visible = false;
    if (FN.Audio) { FN.Audio.play('glider_open', null, 0.8); FN.Audio.loop('wind', true, { gain: 0.15, freq: 500 }); }
  };
  PL.retractGlider = function () {
    if (PL.state !== 'glide') return; PL.state = 'skydive'; PL.skydive = { dive: 0, turn: 0 }; PL.glide = null; if (PL.glider && PL.glider.parent) PL.glider.parent.remove(PL.glider);
    for (const t of PL.trails) { t.filled = false; t.line.visible = true; }
    if (FN.Audio) FN.Audio.loop('wind', true, { gain: 0.3, freq: 900 });
  };
  PL.updateSkydive = function (dt) {
    const I = FN.Input; const S = C.SKYDIVE; const ax = I.axis();
    const fx = -Math.sin(PL.camYaw), fz = -Math.cos(PL.camYaw), rx = Math.cos(PL.camYaw), rz = -Math.sin(PL.camYaw);
    const diveIn = ax.z > 0 ? U.clamp(-PL.camPitch / 1.0, 0, 1) : 0; const fwd = U.clamp(ax.z, -0.5, 1);
    const targetVy = -U.lerp(S.FALL_MIN, S.FALL_MAX, diveIn * Math.max(0, fwd));
    PL.vel.y = U.damp(PL.vel.y, targetVy, 1.6, dt);
    const tx = (fx * fwd + rx * ax.x) * S.FWD_MAX * (1 - diveIn * 0.35), tz = (fz * fwd + rz * ax.x) * S.FWD_MAX * (1 - diveIn * 0.35);
    PL.vel.x = U.damp(PL.vel.x, tx, 2.2, dt); PL.vel.z = U.damp(PL.vel.z, tz, 2.2, dt);
    PL.skydive.dive = U.damp(PL.skydive.dive, Math.max(0, fwd) * (0.4 + diveIn * 0.6), 4, dt); PL.skydive.turn = U.damp(PL.skydive.turn, ax.x, 4, dt);
    PL.pos.x += PL.vel.x * dt; PL.pos.y += PL.vel.y * dt; PL.pos.z += PL.vel.z * dt; PL.yaw = PL.camYaw;
    const lim = C.WORLD_SIZE / 2 - 4; PL.pos.x = U.clamp(PL.pos.x, -lim, lim); PL.pos.z = U.clamp(PL.pos.z, -lim, lim);
    const surf = FN.Physics.surfaceHeight(PL.pos.x, PL.pos.z); const hAbove = PL.pos.y - surf;
    if (FN.Audio) FN.Audio.loop('wind', true, { gain: 0.25 + Math.abs(PL.vel.y) / 200, freq: 600 + Math.abs(PL.vel.y) * 12 });
    if (I.wasPressed(K.jump) || hAbove < S.GLIDER_AUTO_H) PL.deployGlider();
    if (PL.pos.y <= surf) { PL.land(surf); }
  };
  PL.updateGlide = function (dt) {
    const I = FN.Input; const S = C.SKYDIVE; const ax = I.axis();
    const fx = -Math.sin(PL.camYaw), fz = -Math.cos(PL.camYaw), rx = Math.cos(PL.camYaw), rz = -Math.sin(PL.camYaw);
    const diveIn = ax.z > 0 ? U.clamp(-PL.camPitch / 0.9, 0, 1) : 0;
    const targetVy = -U.lerp(S.GLIDE_FALL, S.GLIDE_DIVE_FALL, diveIn);
    PL.vel.y = U.damp(PL.vel.y, targetVy, 2.5, dt);
    const tx = (fx * ax.z + rx * ax.x) * S.GLIDE_FWD * (1 + diveIn * 0.6), tz = (fz * ax.z + rz * ax.x) * S.GLIDE_FWD * (1 + diveIn * 0.6);
    PL.vel.x = U.damp(PL.vel.x, tx, 1.8, dt); PL.vel.z = U.damp(PL.vel.z, tz, 1.8, dt);
    PL.glide.turn = U.damp(PL.glide.turn, ax.x, 3, dt);
    // Glider is parented to the right hand during glide, so its tilt follows
    // the hand -> arm -> pelvis transform automatically. Do not apply a second roll here.
    PL.pos.x += PL.vel.x * dt; PL.pos.y += PL.vel.y * dt; PL.pos.z += PL.vel.z * dt; PL.yaw = PL.camYaw;
    const lim = C.WORLD_SIZE / 2 - 4; PL.pos.x = U.clamp(PL.pos.x, -lim, lim); PL.pos.z = U.clamp(PL.pos.z, -lim, lim);
    const surf = FN.Physics.surfaceHeight(PL.pos.x, PL.pos.z); const hAbove = PL.pos.y - surf;
    if (I.wasPressed(K.jump) && hAbove > S.GLIDER_FORCE_H) PL.retractGlider();
    if (PL.pos.y <= surf + 0.02) PL.land(surf);
  };
  PL.land = function (surf) {
    PL.pos.y = surf; PL.state = 'ground'; PL.grounded = true; PL.vel.set(0, 0, 0); PL.skydive = null; PL.glide = null;
    if (PL.glider && PL.glider.parent) PL.glider.parent.remove(PL.glider);
    for (const t of PL.trails) t.line.visible = false;
    PL.equipSlot(0, true);
    if (FN.Audio) { FN.Audio.loop('wind', false); FN.Audio.play('land', null, 0.6); }
    if (FN.Match) FN.Match.onPlayerLanded();
  };
  PL.updateTrails = function (dt) {
    if (PL.state !== 'skydive') return;
    const hands = [PL.char.bones.handL, PL.char.bones.handR]; const v = new THREE.Vector3();
    for (let i = 0; i < 2; i++) {
      const t = PL.trails[i]; hands[i].getWorldPosition(v); const arr = t.line.geometry.attributes.position.array;
      if (!t.filled) { for (let k = 0; k < t.N; k++) { arr[k * 3] = v.x; arr[k * 3 + 1] = v.y; arr[k * 3 + 2] = v.z; } t.filled = true; t.head = 0; }
      // shift
      for (let k = t.N - 1; k > 0; k--) { arr[k * 3] = arr[(k - 1) * 3]; arr[k * 3 + 1] = arr[(k - 1) * 3 + 1]; arr[k * 3 + 2] = arr[(k - 1) * 3 + 2]; }
      arr[0] = v.x; arr[1] = v.y; arr[2] = v.z; t.line.geometry.attributes.position.needsUpdate = true;
    }
  };
  // ---------- death ----------
  PL.onDeath = function (info) {
    PL.state = 'dead'; PL.dead = true; PL.equip.ads = false; if (FN.Build.active) FN.Build.exit(); PL.cancelHeal(); PL.cancelReload();
    if (FN.Audio) { FN.Audio.play('death', null, 0.9); FN.Audio.loop('wind', false); }
    // Dead players are pure ghosts: no collision against other entities at all.
    PL.invulnerable = true;
    // drop loot
    const drops = []; for (const s of PL.inv.slots) if (s) drops.push(s); for (const a in PL.inv.ammo) if (PL.inv.ammo[a] > 0) drops.push({ kind: 'ammo', id: a, count: PL.inv.ammo[a] }); for (const m in PL.inv.mats) if (PL.inv.mats[m] > 0) drops.push({ kind: 'material', id: m, count: PL.inv.mats[m] });
    FN.Loot.dropItems(drops, PL.pos.x, PL.pos.y, PL.pos.z, 1.2, { playerDropped: true }, true);
    // Keep the body visible so the shared death-FX sequence can play; the
    // corpse stays as a ghost (no collision) until it fully fades out.
    PL.char.group.visible = true;
  };
  FN.Player = PL;
})();