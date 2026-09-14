// Training Mode: real map, all weapons/ammo/healing in a line (auto-respawn),
// dummy bots that pace forward/backward, show damage but never die.
window.FN = window.FN || {};
(function () {
  const C = FN.CONFIG, U = FN.U;

  const TR = { active: false, dummies: [], targets: [], vehicleLine: [], itemSlots: [], time: 0 };

  // Spawn area: open plain near map centre
  const SPAWN_X = 0, SPAWN_Z = 200;
  const ITEM_SPACING = 2.2;
  const DUMMY_COUNT = 8, DUMMY_RANGE = 60, DUMMY_SPEED = 3.5, DUMMY_SPREAD = 14;
  // Killable static target dummies near the vehicle line: can be killed, respawn 1s after their death FX ends.
  const TARGET_COUNT = 3, TARGET_RESPAWN = 1.0;
  // All drivable vehicles line up in a vertical line (constant X, spaced along Z).
  const VEHICLE_LINE_X = SPAWN_X + 24, VEHICLE_LINE_Z0 = SPAWN_Z - 16, VEHICLE_SPACING = 8;

  const WEAPON_IDS = ['ar','scar','tac','pump','doublebarrel','drumshotgun','autoshotgun','infernoshotgun','sniper','semisniper','heavysniper','huntingrifle','leveraction','smg','tacsmg','suppressedsmg','burstsmg','combatsmg','zapsmg','compactsmg','pistol','revolver','handcannon','suppressedpistol','flintknock','burstpistol','trophygun','burst','scoped','tacticalar','heavyar','infernoar','plasmarifle','suppressedar','thermalar','minigun','rpg','grenadelauncher','quadlauncher'];
  const AMMO_IDS = ['light','medium','heavy','shells','rockets','energy'];
  const CONS_IDS = ['bandage','medkit','minishield','shield','chugjug'];

  // ---- items ----
  TR.buildItems = function () {
    TR.itemSlots = [];
    TR.lootGroup = new THREE.Group();
    FN.Engine.scene.add(TR.lootGroup);

    const all = [];
    for (const id of WEAPON_IDS) {
      const def = C.WEAPONS[id];
      all.push({ kind: 'weapon', id, rarity: def.rarities[def.rarities.length - 1], ammo: def.mag });
    }
    for (const id of AMMO_IDS) all.push({ kind: 'ammo', id, count: C.AMMO[id].box * 5 });
    for (const id of CONS_IDS) all.push({ kind: 'consumable', id, count: C.CONSUMABLES[id].stack });

    const startX = SPAWN_X - (all.length - 1) * ITEM_SPACING / 2;
    const lineZ = SPAWN_Z - 30;
    for (let i = 0; i < all.length; i++) {
      const x = startX + i * ITEM_SPACING;
      const y = FN.Terrain.heightAt(x, lineZ);
      const slot = { item: all[i], x, y, z: lineZ, mesh: null, respawnT: 0 };
      TR.itemSlots.push(slot);
      TR._spawnSlot(slot);
    }
  };

  TR._spawnSlot = function (slot) {
    if (slot.mesh) return;
    const g = new THREE.Group();
    const it = slot.item;
    let inner;
    if (it.kind === 'weapon') {
      inner = FN.WeaponModels.build(C.WEAPONS[it.id].model);
      inner.position.y = 0.15;
    } else if (it.kind === 'consumable') {
      inner = FN.ItemModels.consumable(it.id);
    } else {
      inner = FN.ItemModels.ammoPickup(it.id);
    }
    g.add(inner);
    const col = it.kind === 'weapon' ? C.RARITY[it.rarity].hex : (it.kind === 'consumable' ? C.RARITY[C.CONSUMABLES[it.id].rarity].hex : 0xd0d0d0);
    if (it.kind === 'weapon') {
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 2.4, 32, 1, true), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide }));
      beam.position.y = 1.3;
      g.add(beam);
    } else {
      const glow = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 12), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.35, depthWrite: false }));
      glow.position.y = 0.3;
      g.add(glow);
    }
    g.position.set(slot.x, slot.y, slot.z);
    g.userData.trainingItem = true;
    TR.lootGroup.add(g);
    slot.mesh = g;
    if (FN.Loot) {
      const loot = { id: FN.Loot.nextId++, type: 'item', item: Object.assign({}, it), x: slot.x, y: slot.y + 0.4, z: slot.z, rot: 0, mesh: g, t: 0, pickupDelay: 0, dropFloorY: slot.y, fly: null, training: true, slotRef: slot };
      FN.Loot.registerItem(loot);
      slot.loot = loot;
    }
  };

  // ---- dummy bots ----
  TR.buildDummies = function () {
    TR.dummies = [];
    const skins = FN.Character.SKINS;
    const totalW = (DUMMY_COUNT - 1) * DUMMY_SPREAD;
    const dummyBaseZ = SPAWN_Z - 80;
    for (let i = 0; i < DUMMY_COUNT; i++) {
      const x = SPAWN_X - totalW / 2 + i * DUMMY_SPREAD;
      const z = dummyBaseZ + (i % 3) * 20;
      const y = FN.Terrain.heightAt(x, z);
      const ch = FN.Character.create(skins[i % skins.length]);
      ch.group.position.set(x, y, z);
      ch.group.visible = true;
      FN.Engine.scene.add(ch.group);

      TR.dummies.push({
        x, y, z,
        zMin: z - DUMMY_RANGE / 2, zMax: z + DUMMY_RANGE / 2,
        yaw: 0, dir: i % 2 === 0 ? 1 : -1,
        char: ch, health: 100, shield: 0, hurt: 0, dead: false,
        isBot: false, isDummy: true, team: 99,
        inv: FN.Inventory.create(),
        equip: { slot: 0, item: null },
        stats: { kills: 0 },
      });
    }
  };

  // ---- killable static target dummies (near the vehicle line) ----
  TR.buildTargets = function () {
    TR.targets = [];
    const skins = FN.Character.SKINS;
    for (let i = 0; i < TARGET_COUNT; i++) {
      const x = VEHICLE_LINE_X - 7, z = VEHICLE_LINE_Z0 + i * 12;
      const y = FN.Terrain.heightAt(x, z);
      const ch = FN.Character.create(skins[(i + 3) % skins.length]);
      ch.group.position.set(x, y, z);
      ch.group.rotation.y = Math.PI / 2; // face the player spawn area
      ch.group.visible = true;
      FN.Engine.scene.add(ch.group);
      TR.targets.push({
        x0: x, z0: z, x, y, z,
        char: ch, health: 100, shield: 0, hurt: 0, dead: false, respawnT: 0,
        isBot: false, isDummy: true, killable: true, team: 99,
        inv: FN.Inventory.create(),
        equip: { slot: 0, item: null },
        stats: { kills: 0 },
      });
    }
  };

  // ---- vehicles: spawn every drivable vehicle in one vertical line ----
  TR.buildVehicles = function () {
    TR.vehicleLine = [];
    FN.Vehicles.init(); // collect all drivable props on the map
    for (let i = 0; i < FN.Vehicles.list.length; i++) {
      const v = FN.Vehicles.list[i]; const p = v.prop;
      TR.vehicleLine.push({ prop: p, x: p.x, z: p.z, rot: p.rot, y: p.y }); // remember originals to restore on stop
      p.x = VEHICLE_LINE_X;
      p.z = VEHICLE_LINE_Z0 + i * VEHICLE_SPACING;
      p.rot = Math.PI / 2; // nose-to-tail along the vertical line
      p.y = FN.Terrain.heightAt(p.x, p.z) + (v.def ? v.def.groundOffset : 0);
      FN.Props.writeInstance(p);
    }
  };

  // ---- start / stop ----
  TR.start = function () {
    TR.active = true;
    TR.time = 0;
    if (FN.Loot && FN.Loot.items) {
      FN.Loot.items = FN.Loot.items.filter(o => !o.training);
    }
    TR.buildItems();
    TR.buildDummies();
    TR.buildTargets();
    TR.buildVehicles();

    const PL = FN.Player;
    PL.reset();
    PL.team = 0;
    const startY = FN.Terrain.heightAt(SPAWN_X, SPAWN_Z) + 0.2;
    PL.teleport(SPAWN_X, startY, SPAWN_Z);
    PL.state = 'ground';
    PL.camYaw = Math.PI;
    PL.camPitch = -0.1;
    PL.yaw = PL.camYaw;
    for (const t in C.AMMO) PL.inv.ammo[t] = C.AMMO[t].max;
    PL.char.group.position.set(SPAWN_X, startY, SPAWN_Z);
    PL.char.group.visible = true;

    FN.Match.phase = 'game';
    FN.Match.noDamage = false;
    FN.Match.time = 0;
    FN.Match.entities = [PL];
    FN.Storm.stop();
    FN.Bots.reset();
    FN.Loot.clear();

    // Re-add training items after clear (clear wiped them)
    for (const slot of TR.itemSlots) {
      if (slot.loot) FN.Loot.registerItem(slot.loot);
    }

    FN.HUD.show(true);
    FN.HUD.hideEnd();
    FN.HUD.feed = [];
    FN.HUD.dirtyFeed = true;
    FN.HUD.dirtyHotbar = true;
    FN.HUD.center('TRAINING MODE', 3);
    FN.Input.lock();
    if (FN.Audio) FN.Audio.stopMusic();
  };

  TR.stop = function () {
    if (!TR.active) return;
    TR.active = false;

    // remove dummy chars from main scene
    for (const d of TR.dummies) FN.Engine.scene.remove(d.char.group);
    TR.dummies = [];
    for (const d of TR.targets) FN.Engine.scene.remove(d.char.group);
    TR.targets = [];

    // restore the vehicles to their original world positions
    for (const v of TR.vehicleLine) { const p = v.prop; p.x = v.x; p.z = v.z; p.rot = v.rot; p.y = v.y; FN.Props.writeInstance(p); }
    TR.vehicleLine = [];

    // remove loot group
    if (TR.lootGroup) { FN.Engine.scene.remove(TR.lootGroup); TR.lootGroup = null; }

    // remove training items from loot registry
    if (FN.Loot && FN.Loot.items) {
      FN.Loot.items = FN.Loot.items.filter(o => !o.training);
    }
    TR.itemSlots = [];
  };

  // ---- per-frame ----
  TR.update = function (dt) {
    if (!TR.active) return;
    TR.time += dt;

    // item respawn
    for (const slot of TR.itemSlots) {
      if (slot.mesh && slot.mesh.userData && slot.mesh.userData.dead) {
        TR.lootGroup.remove(slot.mesh);
        if (slot.loot && FN.Loot) {
          const i = FN.Loot.items.indexOf(slot.loot); if (i >= 0) FN.Loot.items.splice(i, 1);
        }
        slot.mesh = null;
        slot.loot = null;
        slot.respawnT = 1.0;
      }
      if (!slot.mesh) {
        slot.respawnT -= dt;
        if (slot.respawnT <= 0) TR._spawnSlot(slot);
      } else {
        slot.mesh.position.y = slot.y + 0.25 + Math.sin(TR.time * 2 + slot.x) * 0.06;
        slot.mesh.rotation.y += dt * 1.2;
        if (slot.loot) { slot.loot.x = slot.mesh.position.x; slot.loot.z = slot.mesh.position.z; }
      }
    }

    // dummy movement + anim
    for (const d of TR.dummies) {
      d.z += d.dir * DUMMY_SPEED * dt;
      if (d.z >= d.zMax) { d.z = d.zMax; d.dir = -1; }
      if (d.z <= d.zMin) { d.z = d.zMin; d.dir = 1; }
      d.y = FN.Terrain.heightAt(d.x, d.z);
      d.yaw = d.dir > 0 ? 0 : Math.PI;
      d.hurt = Math.max(0, d.hurt - dt * 3);
      d.char.group.position.set(d.x, d.y, d.z);
      d.char.group.rotation.y = d.yaw;
      FN.Character.animate(d.char, { move: 0.9, grounded: true, weapon: 'none', hurt: d.hurt }, dt);
    }

    // target dummies: static stance, killable, respawn 1s after the death FX ends
    for (const d of TR.targets) {
      d.hurt = Math.max(0, d.hurt - dt * 3);
      if (d.dead) {
        if (d.char.deathFx) {
          // play the shared death sequence (freeze -> blue grid -> fade out)
          if (FN.Character.updateDeath(d.char, dt)) {
            FN.Character.endDeath(d.char);
            d.char.group.visible = false;
            d.respawnT = TARGET_RESPAWN;
          }
        } else {
          d.respawnT -= dt;
          if (d.respawnT <= 0) {
            d.dead = false; d.health = 100; d.hurt = 0;
            d.x = d.x0; d.z = d.z0; d.y = FN.Terrain.heightAt(d.x, d.z);
            d.char.group.position.set(d.x, d.y, d.z);
            d.char.group.rotation.y = Math.PI / 2;
            d.char.group.visible = true;
          }
        }
        continue;
      }
      d.y = FN.Terrain.heightAt(d.x, d.z);
      d.char.group.position.set(d.x, d.y, d.z);
      FN.Character.animate(d.char, { move: 0, grounded: true, weapon: 'none', hurt: d.hurt }, dt);
    }
  };

  TR.isDummy = function (ent) { return !!(ent && ent.isDummy); };

  // ---- player update ----
  TR.updatePlayer = function (dt) {
    if (!TR.active || !PL) return;
    PL.update(dt);
  };

  TR.applyDummyDamage = function (dummy, amount, source, info) {
    if (!dummy.isDummy || dummy.dead) return 0;
    amount = Math.round(amount);
    dummy.hurt = 1;
    if (source && source.isPlayer && FN.HUD) {
      const pos = { x: dummy.x, y: dummy.y + (info && info.head ? 1.85 : 1.3), z: dummy.z };
      FN.HUD.damageNumberAt(pos, amount, !!(info && info.head), false);
      FN.HUD.hitMarker(!!(info && info.head));
      if (source.stats) source.stats.damage += amount;
    }
    // killable target dummies take real damage and die through the shared death FX
    if (dummy.killable) {
      dummy.health -= amount;
      if (dummy.health <= 0) {
        dummy.dead = true; dummy.health = 0;
        FN.Character.beginDeath(dummy.char);
        if (FN.Audio) FN.Audio.play('death', { x: dummy.x, y: dummy.y + 1, z: dummy.z }, 0.7);
      }
    }
    return amount;
  };

  // expose player for update
  let PL;
  function initPL() { PL = FN.Player; }
  if (FN.Player) initPL();
  else setTimeout(initPL, 100);

  FN.Training = TR;
})();
