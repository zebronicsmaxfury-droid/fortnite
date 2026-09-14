// 99 AI opponents. Near bots (within NEAR_RADIUS of the player) are fully simulated with skinned meshes;
// far bots use cheap logic + statistical fights, rendered as instanced silhouettes. Teammates follow the player.
window.FN = window.FN || {};
(function () {
  const C = FN.CONFIG, U = FN.U, P = C.PLAYER, S = C.SKYDIVE, B = C.BOTS;
  const BOTS = { list: [], pool: [], POOL: 36, names: [], fights: [], farT: 0, decideT: 0, matchTime: 0 };
  const DIFFICULTIES = {
    easy: { skillMin: 0.15, skillMax: 0.38, reaction: 1.05, reactionSpread: 0.9, aimError: 1.35, awareness: 0.1, buildChance: 0.2, escapeLead: 0.65 },
    medium: { skillMin: 0.30, skillMax: 0.68, reaction: 0.55, reactionSpread: 0.7, aimError: 1.0, awareness: 0.35, buildChance: 0.55, escapeLead: 0.85 },
    hard: { skillMin: 0.55, skillMax: 0.86, reaction: 0.28, reactionSpread: 0.45, aimError: 0.78, awareness: 0.65, buildChance: 0.72, escapeLead: 1.0 },
    ultra: { skillMin: 0.75, skillMax: 0.96, reaction: 0.14, reactionSpread: 0.28, aimError: 0.58, awareness: 0.85, buildChance: 0.86, escapeLead: 1.15 },
    impossible: { skillMin: 0.94, skillMax: 1.0, reaction: 0.06, reactionSpread: 0.12, aimError: 0.4, awareness: 1.0, buildChance: 0.96, escapeLead: 1.3 },
  };
  BOTS.difficultyProfile = function () { const key = FN.Settings && FN.Settings.get ? FN.Settings.get('botDifficulty') : 'medium'; return DIFFICULTIES[key] || DIFFICULTIES.medium; };
  const FIRST = ['Slayer', 'Ninja', 'Ghost', 'Shadow', 'Turbo', 'Blaze', 'Frost', 'Viper', 'Storm', 'Rogue', 'Ace', 'Wolf', 'Tiger', 'Phantom', 'Rocket', 'Pixel', 'Nova', 'Hunter', 'Drift', 'Vortex', 'Cobra', 'Falcon', 'Rex', 'Zed', 'Kilo', 'Echo', 'Jett', 'Max', 'Neo', 'Sky'];
  const SECOND = ['King', 'Boy', 'Gamer', 'Master', 'Lord', 'Pro', 'YT', 'X', 'Snipes', 'Dude', 'Kid', 'Man', 'Girl', 'Queen', 'One', 'Zone', '99', 'HD', 'TV', 'GG'];
  const REAL = ['MatthewWagner', 'ST33332Y', 'spinalfluid', 'stuman', 'RZE', 'Frost', 'Cardmaster99', 'Hannah69', 'Scrwologist', 'Entricate', 'feliciavagabond', 'ryderfighter369', 'RhythmGod715', 'Guardianthefirst', 'Furi7777', 'DakotaZ', 'jules', 'Kev', 'Bardeezie2', 'noobmaster'];
  const BOT_NAMES = ['AmberArrow', 'ArcticAce', 'AshenWolf', 'AstroRush', 'AzureKnight', 'BlazeRunner', 'BoltBrawler', 'BrightViper', 'CanyonGhost', 'CinderFox', 'CloudStriker', 'CobaltCrow', 'CometRider', 'CopperClaw', 'CrimsonDash', 'CrystalHawk', 'DaringDrift', 'DawnHunter', 'DeltaFang', 'DesertNova', 'EchoBlaze', 'EmberScout', 'FalconFrost', 'FlareTiger', 'FrostByte', 'GhostGlider', 'GoldenRogue', 'GraniteGamer', 'HavocHawk', 'HiddenComet', 'IceboundAce', 'IronLynx', 'JadeJumper', 'JetstreamJoe', 'LavaLegend', 'LunarLion', 'MapleMarauder', 'MidnightFox', 'MistWalker', 'NeonNomad', 'NightOwl', 'NovaNinja', 'OakOutlaw', 'OrbitOmega', 'PhoenixPath', 'PixelPilot', 'PlasmaPuma', 'PrismPredator', 'QuickQuartz', 'RavenRush', 'RedwoodRanger', 'RocketRook', 'RubyRaider', 'SableShadow', 'SavageSparrow', 'ScarletScout', 'SilverSaber', 'SkylineSniper', 'SolarStriker', 'SparkSpider', 'SteelSpecter', 'StormSurfer', 'SunsetSlayer', 'ThunderTrail', 'TitanTrekker', 'TorchTracker', 'TurboTalon', 'TwilightTactician', 'VaporViper', 'VelvetVolt', 'VioletVoyager', 'VoidWalker', 'WanderingWolf', 'WildfireWing', 'WinterWarden', 'WolfpackWave', 'XenoXplorer', 'YellowJacket', 'ZenithZero', 'AcidArrow', 'BoulderBurst', 'CircuitCobra', 'CrestedCoyote', 'DragonDrifter', 'EverestEdge', 'FlintFalcon', 'GravityGhost', 'HarborHunter', 'InfernoIris', 'JungleJolt', 'KineticKite', 'LoneLotus', 'MagmaMantis', 'NobleNebula', 'OceanOrbit', 'PrairiePulse', 'QuasarQueen', 'RiverRaptor', 'ThunderThorn'];
  BOTS.genName = function (i) { if (i < BOT_NAMES.length) return BOT_NAMES[i]; const a = U.pick(FIRST), b = U.rng() < 0.6 ? U.pick(SECOND) : ''; const n = U.rng() < 0.6 ? String(U.randInt(1, 999)) : ''; const pre = U.rng() < 0.15 ? 'xX' : (U.rng() < 0.1 ? 'TTV_' : ''); return pre + a + b + n + (pre === 'xX' ? 'Xx' : ''); };

  // ---------- creation ----------
  BOTS.init = function (scene) {
    BOTS.scene = scene;
    // far silhouettes
    const G = FN.GeoUtil; const geo = G.merge([G.box(0.5, 0.62, 0.3, 0, 1.36, 0), G.sphere(0.17, 6, 0, 1.84, 0), G.box(0.36, 0.9, 0.26, 0, 0.5, 0)]);
    BOTS.farMesh = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: 0xffffff }), 100); BOTS.farMesh.frustumCulled = false; BOTS.farMesh.castShadow = false; BOTS.farMesh.count = 0; scene.add(BOTS.farMesh);
    BOTS.farMesh.setColorAt(0, new THREE.Color(1, 1, 1));
    const gg = G.merge([G.box(3.0, 0.06, 1.6, 0, 3.3, 0)]);
    BOTS.farGlider = new THREE.InstancedMesh(gg, new THREE.MeshLambertMaterial({ color: 0x3b7fe0 }), 100); BOTS.farGlider.frustumCulled = false; BOTS.farGlider.castShadow = false; BOTS.farGlider.count = 0; scene.add(BOTS.farGlider);
    BOTS.nameTags = document.createElement('div'); BOTS.nameTags.id = 'nametags'; BOTS.nameTags.style.cssText = 'position:fixed;inset:0;pointer-events:none;'; document.body.appendChild(BOTS.nameTags);
    BOTS.commandMenu = document.createElement('div'); BOTS.commandMenu.style.cssText = 'position:fixed;left:18px;top:50%;transform:translateY(-50%);display:none;z-index:30;background:rgba(10,16,24,.94);border:2px solid #4fc3ff;border-radius:5px;padding:8px 0;min-width:210px;color:#fff;font:16px Arial,sans-serif;pointer-events:none;'; document.body.appendChild(BOTS.commandMenu);
    BOTS.commandItems = ['Follow me!', 'Attack them!', 'Cancel EVERYTHING!', 'RUN!!!', 'Take This, It will help you', 'Recover bros, FAST!', 'Be normal', 'LOOT!']; BOTS.commandIndex = 0;
  };
  BOTS.renderCommandMenu = function () { if (!BOTS.commandMenu) return; BOTS.commandMenu.innerHTML = '<div style="padding:2px 14px 7px;color:#4fc3ff;font-weight:bold">TEAM COMMANDS</div>' + BOTS.commandItems.map((s, i) => '<div style="padding:7px 14px;background:' + (i === BOTS.commandIndex ? '#245878' : 'transparent') + '">' + s + '</div>').join(''); BOTS.commandMenu.style.display = BOTS.commandOpen ? '' : 'none'; };
  BOTS.updateCommandMenu = function () {
    const I = FN.Input, M = FN.Match;
    if (!I || !M || M.mode === 'solo' || (M.phase !== 'game' && M.phase !== 'drop')) return;
    if (FN.TeamChat && FN.TeamChat.isOpen && FN.TeamChat.isOpen()) { BOTS.commandOpen = false; BOTS.renderCommandMenu(); return; }
    if (I.wasPressed('KeyO')) { BOTS.commandOpen = !BOTS.commandOpen; BOTS.renderCommandMenu(); }
    if (!BOTS.commandOpen) return;
    if (I.wasPressed('ArrowUp')) { BOTS.commandIndex = (BOTS.commandIndex + BOTS.commandItems.length - 1) % BOTS.commandItems.length; BOTS.renderCommandMenu(); }
    if (I.wasPressed('ArrowDown')) { BOTS.commandIndex = (BOTS.commandIndex + 1) % BOTS.commandItems.length; BOTS.renderCommandMenu(); }
    if (I.wasPressed('Enter')) { BOTS.issueCommand(BOTS.commandIndex); BOTS.commandOpen = false; BOTS.renderCommandMenu(); }
  };
  BOTS.issueCommand = function (index) {
    const PL = FN.Player; if (!PL || !FN.Match || FN.Match.mode === 'solo') return;
    const mates = BOTS.list.filter(b => b.isTeammate && !b.dead);
    if (index === 0) {
      for (const b of mates) { b.commandType = 'follow'; b.commandT = 30; b.target = null; b.vehicleRequest = null; b.vehicleTarget = null; b.vehicleGoal = null; b.lootQueue = []; b.path = []; b.goal = null; b.state = 'follow'; }
    } else if (index === 1) {
      for (const b of mates) {
        if (b.target && !b.target.dead) continue;
        const enemy = FN.Match.entities.filter(e => e !== b && !e.dead && !e.aboard && e.team !== b.team && U.dist2(e.x, e.z, b.x, b.z) <= 25 * 25).sort((a, c) => U.dist2(a.x, a.z, b.x, b.z) - U.dist2(c.x, c.z, b.x, b.z))[0];
        b.commandType = 'attack'; b.commandT = 30; b.commandOrigin = { x: b.x, z: b.z }; b.commandTargetHealth = enemy ? enemy.health : null;
        if (enemy) { b.target = enemy; b.targetPos = { x: enemy.x, y: enemy.y, z: enemy.z }; b.state = 'engage'; b.engageT = BOTS.matchTime; }
      }
    } else if (index === 2) {
      for (const b of mates) if (!b.target || b.state !== 'engage') { b.commandType = 'return'; b.commandT = 9999; b.vehicleRequest = null; b.lootQueue = []; b.goal = { x: PL.pos.x, z: PL.pos.z }; b.state = 'follow'; }
    } else if (index === 3) {
      // Emergency retreat: clear every non-passenger activity and follow the
      // player for exactly 60 seconds, including bots that are currently in a
      // fight, healing, harvesting, or looting.
      for (const b of mates) {
        if (b.passenger && b.vehicle && FN.Vehicles && FN.Vehicles.exitPassenger) FN.Vehicles.exitPassenger(b.vehicle, b);
        b.passenger = false; b.vehicle = null; b.commandType = 'run'; b.commandT = 60; b.target = null; b.vehicleRequest = null; b.vehicleTarget = null; b.vehicleGoal = null; b.lootQueue = []; b.path = []; b.goal = null; b.state = 'follow';
        if (b.char) b.char.group.visible = true;
      }
    } else if (index === 4) {
      const dropped = (FN.Loot && FN.Loot.items ? FN.Loot.items : []).filter(o => !o.dead && o.spot && o.spot.playerDropped && o.item);
      const available = mates.slice();
      for (const item of dropped) {
        if (!available.length) break;
        let chosen = null, best = -Infinity;
        for (const b of available) {
          let score = BOTS.itemNeedScore(b, item.item);
          if (score <= 0) continue;
          // Don't funnel every drop to the same bot: one that very recently
          // took a player-dropped item yields priority to the others.
          if (BOTS.matchTime - (b.playerPickupT || -999) < 25) score -= 60;
          if (score > best) { best = score; chosen = b; }
        }
        if (!chosen) continue;
        chosen.playerPickupT = BOTS.matchTime;
        // A direct player request overrides the normal inventory score.
        item.pickupDelay = 0;
        chosen.commandType = 'take'; chosen.commandT = 120; chosen.commandItem = item; chosen.target = null; chosen.vehicleRequest = null; chosen.vehicleTarget = null; chosen.vehicleGoal = null; chosen.lootQueue = [item]; chosen.path = []; chosen.goal = null; chosen.sideT = 0; chosen.strafe = 0; chosen.vx = 0; chosen.vz = 0; chosen.state = 'loot';
        available.splice(available.indexOf(chosen), 1);
      }
    } else if (index === 5) {
      for (const b of mates) {
        b.commandType = 'recover'; b.commandT = 120; b.commandItem = null; b.target = null; b.vehicleRequest = null; b.vehicleTarget = null; b.vehicleGoal = null; b.lootQueue = []; b.path = []; b.goal = null; b.state = 'recover';
        b.recoverJumped = false; b.recoverStarted = false;
      }
    } else if (index === 7) {
      for (const b of mates) {
        b.commandType = 'scavenge'; b.commandT = 9999; b.commandItem = null; b.target = null; b.vehicleRequest = null; b.vehicleTarget = null; b.vehicleGoal = null; b.lootQueue = []; b.path = []; b.goal = null; b.scavengeT = 0; b.state = 'scavenge';
      }
    } else {
      // Remove all command state and let normal bot decision-making resume.
      for (const b of mates) {
        b.commandType = null; b.commandT = 0; b.commandItem = null; b.vehicleRequest = null; b.vehicleTarget = null; b.vehicleGoal = null;
        b.lootQueue = []; b.path = []; b.goal = null; b.target = null;
        if (b.state !== 'engage' && b.state !== 'heal' && b.state !== 'vehicle' && b.state !== 'passenger') b.state = 'roam';
      }
    }
  };
  BOTS.itemNeedScore = function (b, item) {
    if (!item) return 0;
    if (item.kind === 'consumable') {
      const d = C.CONSUMABLES[item.id]; let score = 0;
      if (d.heal && b.health < d.healCap) score += (d.healCap - b.health) * 3;
      if (d.shield && b.shield < d.shieldCap) score += (d.shieldCap - b.shield) * 2.5;
      return score;
    }
    if (item.kind === 'weapon') {
      const weapons = b.inv.slots.filter(s => s && s.kind === 'weapon');
      // Already carrying this exact weapon? Not needy.
      if (weapons.some(s => s.id === item.id)) return 0;
      const best = weapons.reduce((v, s) => Math.max(v, FN.Inventory.dmg(s) * C.WEAPONS[s.id].rate + FN.Inventory.rarityIndex(s) * 10), 0);
      // A teammate with no weapon at all is the most needy, so outscore any
      // upgrade a teammate who already has a gun could get.
      if (!best) return 100;
      return Math.max(0, FN.Inventory.dmg(item) * C.WEAPONS[item.id].rate + FN.Inventory.rarityIndex(item) * 10 - best);
    }
    if (item.kind === 'ammo') {
      const hasGun = b.inv.slots.some(s => s && s.kind === 'weapon' && C.WEAPONS[s.id].ammo === item.id);
      return hasGun ? Math.max(0, 60 - (b.inv.ammo[item.id] || 0)) : 0;
    }
    if (item.kind === 'material') return Math.max(0, 200 - (b.inv.mats[item.id] || 0));
    return 0;
  };
  BOTS.reset = function () {
    for (const b of BOTS.list) BOTS.releaseMesh(b);
    BOTS.list = []; BOTS.fights = []; BOTS.farMesh.count = 0; BOTS.farGlider.count = 0; BOTS.nameTags.innerHTML = ''; BOTS.matchTime = 0;
  };
  BOTS.create = function (count, teamSize, playerTeammates) {
    BOTS.reset(); const skins = FN.Character.SKINS; const diff = BOTS.difficultyProfile(); let team = 1; let inTeam = 0;
    for (let i = 0; i < count; i++) {
      const skin = skins[U.randInt(0, skins.length - 1)];
      const b = { id: i + 1, name: BOTS.genName(i), skin, team: 0, isBot: true, x: 0, y: 0, z: 0, yaw: U.rand() * 6.28, pitch: 0, vx: 0, vz: 0, vy: 0, health: 100, shield: 0, dead: false, crouch: false, grounded: true,
        inv: FN.Inventory.create(), equip: { slot: 0, item: null, cooldown: 0, reloadT: 0, burst: 0, pause: 0 }, state: 'idle', target: null, lastSeen: -99, seenT: 0, goal: null, path: [], lootQueue: [], visited: new Set(),
        skill: U.lerp(diff.skillMin, diff.skillMax, U.rand()), builds: U.rand() < diff.buildChance, aggression: U.clamp(0.25 + U.rand() * 0.55 + diff.skillMin * 0.3, 0.2, 1), reaction: diff.reaction,
        difficulty: diff,
        char: null, weaponMesh: null, glider: null, aboard: false, air: null, stuckT: 0, strafeDir: 1, strafeT: 0, vehicle: null, decideT: U.rand() * 0.3, lootT: 0, landedT: -1, hurt: 0, recoil: 0, phaseT: 0, healT: 0, weak: null, stats: { kills: 0 }, jumpT: 0, alert: null, isTeammate: false, wander: null, radius: P.RADIUS, harvestT: 0, melee: false, meleeT: 0, buildT: 0 };
      b.reaction = diff.reaction + (1 - b.skill) * diff.reactionSpread;
      if (i < playerTeammates) { b.team = 0; b.isTeammate = true; }
      else { if (inTeam >= teamSize) { team++; inTeam = 0; } b.team = team; inTeam++; }
      BOTS.list.push(b);
    }
    // pool of character meshes
    while (BOTS.pool.length < BOTS.POOL) { BOTS.pool.push({ ch: null, used: null }); }
    return BOTS.list;
  };
  BOTS.teammates = () => BOTS.list.filter(b => b.isTeammate);
  BOTS.calloutVehicle = function (vehicle, driver) {
    if (!vehicle || !driver || !FN.Match || FN.Match.mode === 'solo') return;
    for (const b of BOTS.list) if (b.vehicleRequest === vehicle && !b.passenger) b.vehicleRequest = null;
    vehicle.callout = { driver: driver, t: BOTS.matchTime };
    if (driver.isBot && driver.team === 0) {
      BOTS.rideRequest = { vehicle: vehicle, driver: driver, t: BOTS.matchTime };
      if (FN.HUD) FN.HUD.center(driver.name + ' wants you to ride. Press Y to wait, N to decline', 5);
    }
    for (const b of BOTS.list) {
      if (b.dead || b.team !== driver.team || b === driver || b.passenger) continue;
      // A player callout is an explicit squad order. Clear combat, loot, and
      // chat tasks so a teammate actually comes to the vehicle.
      b.target = null; b.commandType = null; b.commandT = 0; b.commandItem = null;
      b.vehicleTarget = null; b.vehicleGoal = null;
      b.vehicleRequest = vehicle;
      b.lootQueue = []; b.path = []; b.goal = { x: vehicle.prop.x, z: vehicle.prop.z, vehicle: true }; b.state = 'rotate';
    }
  };
  BOTS.alive = () => BOTS.list.filter(b => !b.dead).length;

  // ---------- mesh pool ----------
  BOTS.assignMesh = function (b) {
    if (b.char) return;
    let slot = BOTS.pool.find(p => !p.used); if (!slot) return;
    if (!slot.ch || slot.ch.skin.id !== b.skin.id) { if (slot.ch) BOTS.scene.remove(slot.ch.group); slot.ch = FN.Character.create(b.skin); BOTS.scene.add(slot.ch.group); slot.ch.weaponCache = {}; }
    slot.used = b; b.char = slot.ch; b.char.group.visible = true; b.char.anim.phase = U.rand() * 6; b.slot = slot; b.visualWeapon = null;
    BOTS.syncWeaponMesh(b);
    if (b.air && b.air.glide) BOTS.attachGlider(b);
  };
  BOTS.releaseMesh = function (b) {
    if (!b.char) return; if (b.glider) { b.char.group.remove(b.glider); b.glider = null; }
    FN.Character.endDeath(b.char); // make sure a mid-sequence body is restored before the mesh is reused
    FN.Character.setWeapon(b.char, null); b.char.group.visible = false; b.slot.used = null; b.char = null; b.slot = null; b.visualWeapon = null;
  };
  // Return a pooled mesh after a death sequence and hand it back to the pool.
  BOTS.retireMesh = function (b) {
    if (!b.char) return;
    FN.Character.endDeath(b.char); // reset materials for reuse
    BOTS.releaseMesh(b);
  };
  // Drive the shared death-FX on a dead bot's frozen body. Returns true when
  // the sequence finished and the mesh can be retired.
  BOTS.updateDeathFx = function (b, dt) {
    if (!b.char) return true;
    if (b.glider) BOTS.detachGlider(b); // dying mid-air: drop the glider so only the body dissolves
    b.deathFxT = (b.deathFxT || 0) + dt;
    if (FN.Character.updateDeath(b.char, dt)) { BOTS.retireMesh(b); b.deathFxT = 0; return true; }
    return false;
  };
  BOTS.syncWeaponMesh = function (b) {
    if (!b.char) return; const it = b.equip.item; const key = !it ? (b.equip.slot === 0 ? 'pickaxe' : 'none') : (it.kind === 'weapon' ? C.WEAPONS[it.id].model : 'c_' + it.id);
    if (b.visualWeapon === key) return; b.visualWeapon = key;
    if (key === 'none') { FN.Character.setWeapon(b.char, null); return; }
    const cache = b.char.weaponCache; let mesh = cache[key]; if (!mesh) { mesh = key === 'pickaxe' ? FN.WeaponModels.build('pickaxe') : (key.startsWith('c_') ? FN.ItemModels.consumable(key.slice(2)) : FN.WeaponModels.build(key)); cache[key] = mesh; }
    FN.Character.setWeapon(b.char, mesh, key === 'pickaxe' ? 'pickaxe' : (key.startsWith('c_') ? 'item' : 'gun'));
  };
  BOTS.attachGlider = function (b) { if (!b.char) return; if (!b.glider) { b.glider = b.char.weaponCache.glider || (b.char.weaponCache.glider = FN.ItemModels.glider()); b.glider.position.set(0, 3.3, 0); } b.char.group.add(b.glider); };
  BOTS.detachGlider = function (b) { if (b.glider && b.char) b.char.group.remove(b.glider); b.glider = null; };

  // ---------- phases ----------
  BOTS.placeOnIsland = function (poi) {
    for (const b of BOTS.list) { const a = U.rand() * 6.28, r = 20 + U.rand() * 60; b.x = poi.p[0] + Math.cos(a) * r; b.z = poi.p[1] + Math.sin(a) * r; b.y = FN.Physics.groundAt(b.x, b.z, 100, 100).y; b.state = 'island'; b.wander = null; b.aboard = false; b.air = null; b.equip.slot = 0; b.equip.item = null; }
  };
  BOTS.boardBus = function (bus) {
    const M = FN.MapData; const pois = M.pois.filter(p => p.name && !p.hidden);
    const weights = { pleasant: 9, tomato: 6, retail: 8, dusty: 8, salty: 7, greasy: 8, fatal: 6, anarchy: 6, lonely: 5, wailing: 4, moisty: 4, flush: 6, lootlake: 3 };
    const leaders = {};
    for (const b of BOTS.list) {
      b.aboard = true; b.air = null; b.state = 'aboard'; b.x = bus.pos.x; b.z = bus.pos.z; b.y = bus.pos.y; BOTS.releaseMesh(b);
      let target;
      if (b.team !== 0 && leaders[b.team]) target = { x: leaders[b.team].x + (U.rand() - 0.5) * 60, z: leaders[b.team].z + (U.rand() - 0.5) * 60 };
      else if (b.isTeammate) target = null; // follow the player later
      else {
        let poi; if (U.rand() < 0.78) poi = U.weightedPick(pois.map(p => ({ p, w: weights[p.id] || 3 }))).p;
        if (poi) target = { x: poi.p[0] + (U.rand() - 0.5) * poi.r * 1.4, z: poi.p[1] + (U.rand() - 0.5) * poi.r * 1.4, poi };
        else { const sh = U.pick(M.pois.filter(p => p.kind === 'shack')); target = sh ? { x: sh.p[0] + (U.rand() - 0.5) * 30, z: sh.p[1] + (U.rand() - 0.5) * 30 } : { x: (U.rand() - 0.5) * 1800, z: (U.rand() - 0.5) * 1800 }; }
        if (b.team !== 0) leaders[b.team] = target;
      }
      b.dropTarget = target;
      // jump parameter along the route
      if (target) { const dx = target.x - bus.start.x, dz = target.z - bus.start.z; const s = dx * bus.dir.x + dz * bus.dir.z; b.jumpS = s - 40 - U.rand() * 260; } else b.jumpS = null;
    }
  };
  BOTS.jumpFromBus = function (b, bus) {
    b.aboard = false; b.x = bus.pos.x + (U.rand() - 0.5) * 6; b.z = bus.pos.z + (U.rand() - 0.5) * 6; b.y = bus.pos.y - 3; b.vx = 0; b.vz = 0; b.vy = -12;
    b.air = { glide: false, dive: 0, followPlayer: !!b.isTeammate, followOffset: { x: (U.rand() - 0.5) * 18, z: (U.rand() - 0.5) * 18 } }; b.state = 'drop'; b.yaw = Math.atan2(-(bus.dir.x), -(bus.dir.z));
    if (!b.dropTarget) { const PL = FN.Player; b.dropTarget = { x: PL.pos.x + (U.rand() - 0.5) * 40, z: PL.pos.z + (U.rand() - 0.5) * 40 }; }
  };
  // Apply quality: fewer full-mesh bots + a larger far-update tick = big CPU saving on weak PCs.
  BOTS.setQuality = function (nearRadius, pool, farTick) {
    B.NEAR_RADIUS = nearRadius || B.NEAR_RADIUS;
    BOTS.POOL = (pool && pool >= 3) ? pool : BOTS.POOL;
    B.FAR_TICK = Math.max(1.0, farTick || 1.0);
    BOTS._poolT = 0.6; // re-evaluate mesh assignment immediately
  };
  // ---------- main update ----------
  BOTS.update = function (dt) {
    const M = FN.Match, PL = FN.Player; if (!M) return; BOTS.matchTime += dt;
    const phase = M.phase; BOTS.updateCommandMenu();
    // mesh assignment (every 0.5 s)
    BOTS._poolT = (BOTS._poolT || 0) + dt;
    if (BOTS._poolT > 0.5) {
      BOTS._poolT = 0;
      const cands = BOTS.list.filter(b => !b.dead && !b.aboard).map(b => ({ b, d: U.dist2sq(b.x, b.z, PL.pos.x, PL.pos.z) })).sort((a, c) => a.d - c.d);
      const want = new Set(); for (let i = 0; i < cands.length && want.size < BOTS.POOL; i++) { if (cands[i].d < B.NEAR_RADIUS * B.NEAR_RADIUS || (cands[i].b.isTeammate && cands[i].d < 900 * 900)) want.add(cands[i].b); }
      for (const b of BOTS.list) if (b.char && !want.has(b) && !(b.dead && b.char.deathFx)) BOTS.releaseMesh(b); // keep dying bodies until their FX finishes
      for (const b of want) if (!b.char) BOTS.assignMesh(b);
    }
    if (phase === 'bus' || phase === 'drop' || phase === 'game') {
      const bus = M.bus;
      for (const b of BOTS.list) {
        b.shotT = Math.max(0, (b.shotT || 0) - dt);
        if (b.dead) { if (b.char) BOTS.updateDeathFx(b, dt); continue; } // dead bodies only run the shared death-FX (freeze → blue grid → fade out)
        if (b.aboard) { if (bus && bus.alive) { b.x = bus.pos.x; b.z = bus.pos.z; b.y = bus.pos.y; if (M.busCanJump && (b.jumpS === null ? true : bus.s >= b.jumpS) && (b.isTeammate ? PL.state !== 'bus' : true)) BOTS.jumpFromBus(b, bus); else if (M.busEnding) BOTS.jumpFromBus(b, bus); } else if (bus) BOTS.jumpFromBus(b, bus); continue; }
        if (b.air) BOTS.updateAir(b, dt); else BOTS.updateGround(b, dt);
      }
      BOTS.farT += dt; if (BOTS.farT >= B.FAR_TICK) { BOTS.farLogic(BOTS.farT); BOTS.farT = 0; }
    } else if (phase === 'island') {
      for (const b of BOTS.list) BOTS.updateIsland(b, dt);
    }
    BOTS.render(dt);
  };

  // ---------- spawn island: lightweight fast roaming without heavy physics raycasts ----------
  BOTS.updateIsland = function (b, dt) {
    const near = !!b.char;
    if (!b.wander || U.dist2(b.x, b.z, b.wander.x, b.wander.z) < 2 || b.wander.t < 0) { const poi = FN.MapData.poiById.spawnisland; const a = U.rand() * 6.28, r = U.rand() * 50; b.wander = { x: poi.p[0] + Math.cos(a) * r, z: poi.p[1] + Math.sin(a) * r, t: 4 + U.rand() * 6 }; if (U.rand() < 0.3) b.idleT = 1 + U.rand() * 2; }
    b.wander.t -= dt;
    if (b.idleT > 0) { b.idleT -= dt; b.vx = b.vz = 0; }
    else {
      const dx = b.wander.x - b.x, dz = b.wander.z - b.z; const d = Math.sqrt(dx * dx + dz * dz);
      if (d > 0.3) {
        const sp = P.SPRINT * (0.8 + b.skill * 0.4); // bots always sprint
        b.vx = dx / d * sp; b.vz = dz / d * sp;
        b.x += b.vx * dt; b.z += b.vz * dt;
        b.yaw = Math.atan2(-dx, -dz);
        b.y = FN.Terrain.heightAt(b.x, b.z);
        b.grounded = true;
      }
    }
  };
  // ---------- aerial ----------
  BOTS.updateAir = function (b, dt) {
    const PL = FN.Player;
    if (b.air.followPlayer && PL && (PL.state === 'skydive' || PL.state === 'glide')) {
      const off = b.air.followOffset || { x: 0, z: 0 };
      b.dropTarget = { x: PL.pos.x + off.x, z: PL.pos.z + off.z };
      if (PL.state === 'glide' && !b.air.glide) { b.air.glide = true; BOTS.attachGlider(b); b.vy = Math.max(b.vy, -S.GLIDE_FALL * 1.5); }
    }
    const t = b.dropTarget || { x: b.x, z: b.z }; const dx = t.x - b.x, dz = t.z - b.z; const dist = Math.sqrt(dx * dx + dz * dz);
    const surf = dist < 60 ? FN.Physics.surfaceHeight(b.x, b.z) : FN.Terrain.heightAt(b.x, b.z); const hAbove = b.y - surf;
    const dirx = dist > 1 ? dx / dist : 0, dirz = dist > 1 ? dz / dist : 0;
    if (!b.air.glide) {
      // deploy when low, or early if the target is far (need glide range)
      const needGlide = dist > hAbove * 1.7 && dist > 120;
      if (hAbove < S.GLIDER_AUTO_H || needGlide) { b.air.glide = true; BOTS.attachGlider(b); b.vy = Math.max(b.vy, -S.GLIDE_FALL * 1.5); }
      else { const dive = dist < hAbove * 0.8 ? 1 : 0.3; b.vy = U.damp(b.vy, -U.lerp(S.FALL_MIN, S.FALL_MAX, dive), 1.5, dt); const sp = Math.min(S.FWD_MAX, dist * 0.5); b.vx = U.damp(b.vx, dirx * sp, 2, dt); b.vz = U.damp(b.vz, dirz * sp, 2, dt); b.air.dive = dive; }
    }
    if (b.air.glide) {
      const sp = Math.min(S.GLIDE_FWD, dist * 0.6); b.vx = U.damp(b.vx, dirx * sp, 1.8, dt); b.vz = U.damp(b.vz, dirz * sp, 1.8, dt);
      const dive = dist < 15 ? 1 : (hAbove > dist * 0.5 ? 0.8 : 0); b.vy = U.damp(b.vy, -U.lerp(S.GLIDE_FALL, S.GLIDE_DIVE_FALL, dive), 2.5, dt);
    }
    b.x += b.vx * dt; b.z += b.vz * dt; b.y += b.vy * dt;
    if (b.vx * b.vx + b.vz * b.vz > 0.5) b.yaw = U.lerpAngle(b.yaw, Math.atan2(-b.vx, -b.vz), 0.1);
    const g = FN.Physics.surfaceHeight(b.x, b.z);
    if (b.y <= g) { b.y = g; b.air = null; b.vx = b.vz = b.vy = 0; b.grounded = true; BOTS.detachGlider(b); BOTS.onLanded(b); }
  };
  BOTS.onLanded = function (b) {
    b.landedT = BOTS.matchTime; b.state = 'loot'; b.lootT = 0; b.equip.slot = 0; b.equip.item = null; BOTS.syncWeaponMesh(b);
    BOTS.buildLootQueue(b, 110);
  };
  BOTS.buildLootQueue = function (b, r) {
    const near = FN.Loot.nearby(b.x, b.z, r, []).filter(o => !o.dead && !b.visited.has(o.id) && ((o.type === 'chest' || o.type === 'ammobox') ? !o.opened : (o.type === 'item' && (o.item.kind === 'weapon' || o.item.kind === 'consumable' || o.item.kind === 'ammo' || o.item.kind === 'material'))));
    near.sort((a, c) => (U.dist2sq(a.x, a.z, b.x, b.z) - (a.type === 'chest' ? 900 : 0)) - (U.dist2sq(c.x, c.z, b.x, b.z) - (c.type === 'chest' ? 900 : 0)));
    b.lootQueue = near.slice(0, 7); b.path = [];
  };
  // ---------- ground ----------
  BOTS.updateGround = function (b, dt) {
    if (b.passenger || b.state === 'passenger') { BOTS.updatePassenger(b); return; }
    if (b.state === 'vehicle') { BOTS.updateVehicleDriving(b, dt); return; }
    if (b.commandT && b.commandT < 9000) b.commandT -= dt;
    if (b.commandType === 'attack' && b.commandT <= 0) { b.target = null; b.commandType = 'return'; b.commandT = 9999; b.goal = { x: FN.Player.pos.x, z: FN.Player.pos.z }; b.state = 'follow'; }
    if (b.commandType === 'follow' && b.commandT <= 0) { b.commandType = null; b.commandT = 0; if (b.state === 'follow') b.state = 'roam'; }
    if (b.commandType === 'run') {
      if (b.commandT <= 0) { b.commandType = null; b.commandT = 0; if (b.state === 'follow') b.state = 'roam'; }
      else { b.target = null; b.vehicleRequest = null; b.lootQueue = []; b.path = []; b.goal = null; b.state = 'follow'; }
    }
    if (b.commandType === 'take') {
      if (b.commandT <= 0 || !b.commandItem || b.commandItem.dead) { b.commandType = null; b.commandT = 0; b.commandItem = null; if (b.state === 'loot') b.state = 'roam'; }
      else { b.target = null; b.vehicleRequest = null; b.lootQueue = [b.commandItem]; b.state = 'loot'; }
    }
    if (b.commandType === 'recover') {
      if (b.commandT <= 0) { b.commandType = null; b.commandT = 0; if (b.state === 'recover') b.state = 'roam'; }
      else if (b.state !== 'heal') { b.target = null; b.vehicleRequest = null; b.lootQueue = []; b.path = []; b.goal = null; b.state = 'recover'; }
    }
    if (b.commandType === 'scavenge') {
      const threat = FN.Match.entities.find((e) => e !== b && !e.dead && !e.aboard && e.team !== b.team && U.dist2(e.x, e.z, b.x, b.z) <= 25);
      if (threat) { b.lootQueue = []; b.target = threat; b.state = 'engage'; }
      else if (!b.lootQueue.length && b.state !== 'engage') {
        b.scavengeT = (b.scavengeT || 0) - dt;
        if (b.scavengeT <= 0) {
          b.scavengeT = 0.45;
          const loot = FN.Loot.nearby(b.x, b.z, 25, []).filter((o) => !o.dead && !b.visited.has(o.id) && ((o.type === 'chest' && !o.opened) || (o.type === 'item' && o.item && (o.item.kind === 'weapon' || o.item.kind === 'consumable'))));
          loot.sort((a, c) => U.dist2sq(a.x, a.z, b.x, b.z) - U.dist2sq(c.x, c.z, b.x, b.z));
          if (loot.length) { b.lootQueue = [loot[0]]; b.path = []; b.state = 'loot'; }
          else { b.goal = { x: FN.Player.pos.x, z: FN.Player.pos.z }; b.commandType = 'scavengeReturn'; b.state = 'follow'; }
        }
      }
    }
    if (b.vehicleRequest && b.vehicleRequest.driver && !b.target && !b.lootQueue.length) {
      const v = b.vehicleRequest; const vd = U.dist2(b.x, b.z, v.prop.x, v.prop.z);
      // Boarding is intentionally more forgiving than body collision. This
      // lets every called teammate claim an available seat instead of only
      // whichever bot happens to reach the vehicle first.
      if (vd < 12 && BOTS.tryEnterPassenger(b, v)) return;
    }
    const near = !!b.char; const PL = FN.Player; const ST = FN.Storm;
    b.hurt = Math.max(0, b.hurt - dt * 3); b.recoil = Math.max(0, b.recoil - dt * 8); b.phaseT += dt;
    if (b.equip.cooldown > 0) b.equip.cooldown -= dt; if (b.equip.reloadT > 0) { b.equip.reloadT -= dt; if (b.equip.reloadT <= 0) BOTS.finishReload(b); }
    if (!near) { BOTS.farGround(b, dt); return; }
    // Teammates periodically rescan nearby floor loot, including items the
    // player dropped after the teammate's original loot route was created.
    if (b.isTeammate) {
      b.teamLootT = (b.teamLootT || 0) - dt;
      if (b.teamLootT <= 0) {
        b.teamLootT = 0.8;
        if (!b.target && (b.state === 'roam' || b.state === 'follow') && !b.lootQueue.length) {
          BOTS.buildLootQueue(b, 35);
          if (b.lootQueue.length) b.state = 'loot';
        }
      }
    }
    b.decideT -= dt;
    if (b.decideT <= 0) { b.decideT = (b.difficulty ? b.difficulty.reaction * 0.35 : 0.2) + U.rand() * 0.15; BOTS.perceive(b); BOTS.decide(b); }
    // act by state
    switch (b.state) {
      case 'engage': BOTS.doEngage(b, dt); break;
      case 'heal': BOTS.doHeal(b, dt); break;
      case 'recover': BOTS.doRecover(b, dt); break;
      case 'rotate': BOTS.doMoveGoal(b, dt, P.SPRINT * 0.95); break;
      case 'loot': BOTS.doLoot(b, dt); break;
      case 'follow': BOTS.doFollow(b, dt); break;
      case 'harvest': BOTS.doHarvest(b, dt); break;
      case 'vehicle': BOTS.updateVehicleDriving(b, dt); break;
      case 'passenger': BOTS.updatePassenger(b, dt); break;
      default: BOTS.doRoam(b, dt); break;
    }
    // stuck detection
    const moved = Math.abs(b.x - (b.px || b.x)) + Math.abs(b.z - (b.pz || b.z)); b.px = b.x; b.pz = b.z;
    if (b.wantMove && moved < 0.02) { b.stuckT += dt; if (b.stuckT > 0.35 && b.grounded && b.jumpT <= 0) { BOTS.unstick(b); b.stuckT = 0; } } else b.stuckT = Math.max(0, b.stuckT - dt);
    if (b.jumpT > 0) b.jumpT -= dt;
  };
  BOTS.unstick = function (b) {
    // try to break the blocking piece with the pickaxe, else sidestep
    const fx = -Math.sin(b.yaw), fz = -Math.cos(b.yaw);
    const origin = { x: b.x - fx * 0.4, y: b.y + 1.2, z: b.z - fz * 0.4 };
    const hit = FN.Physics.raycast(origin, { x: fx, y: 0, z: fz }, 2.6, { noProps: false });
    if (hit && (hit.kind === 'structure' || hit.kind === 'prop')) { b.breakTarget = hit; b.breakT = 0; b.prevState = b.state; b.state = 'harvest'; BOTS.equipSlot(b, 0); return; }
    b.sideT = 1.0 + U.rand(); b.sideDir = U.rand() < 0.5 ? 1 : -1;
  };
  BOTS.doHarvest = function (b, dt) {
    b.wantMove = false; b.vx = U.damp(b.vx, 0, 10, dt); b.vz = U.damp(b.vz, 0, 10, dt); BOTS.integrate(b, dt);
    b.harvestT = (b.harvestT || 0) + dt;
    if (b.harvestT >= P.HARVEST_RATE) {
      b.harvestT = 0; const fx = -Math.sin(b.yaw), fz = -Math.cos(b.yaw);
      const origin = { x: b.x - fx * 0.4, y: b.y + 1.4, z: b.z - fz * 0.4 };
      const hit = FN.Combat.harvestHit(b, origin, { x: fx, y: -0.25, z: fz }, 3.6);
      b.breakT = (b.breakT || 0) + 1;
      if (!hit || b.breakT > 12 || (hit.kind !== 'structure' && hit.kind !== 'prop')) { b.state = b.prevState || 'roam'; b.breakT = 0; }
    }
    b.swing = (b.harvestT / P.HARVEST_RATE);
  };
  BOTS.perceive = function (b) {
    const ents = FN.Match.entities; const eye = { x: b.x, y: b.y + 1.6, z: b.z }; const now = BOTS.matchTime;
    let best = null, bd = 1e9;
    const fx = -Math.sin(b.yaw), fz = -Math.cos(b.yaw);
    for (const e of ents) {
      if (e === b || e.dead || e.team === b.team || e.aboard || (e.air && !e.isPlayer)) continue; if (e.isPlayer && (e.state === 'bus' || e.state === 'lobby' || e.state === 'dead')) continue;
      const d = U.dist2(e.x, e.z, b.x, b.z); if (d > B.SEE_RANGE) continue;
      const dx = (e.x - b.x) / d, dz = (e.z - b.z) / d; const dot = dx * fx + dz * fz;
      const isTarget = b.target === e; const alerted = b.alert && U.dist2(b.alert.x, b.alert.z, e.x, e.z) < 25;
      const viewLimit = -0.05 - (b.difficulty ? b.difficulty.awareness * 0.45 : 0.15);
      if (dot < viewLimit && !isTarget && !alerted && !(b.lastHitBy === e && now - b.lastHitT < 3)) continue; // difficulty controls awareness
      if (!FN.Physics.lineOfSight(eye, { x: e.x, y: e.y + 1.3, z: e.z })) continue;
      const score = d * (isTarget ? 0.6 : 1); if (score < bd) { bd = score; best = e; }
    }
    if (best) {
      if (b.target !== best) { b.target = best; b.seenT = now; b.reactT = now + b.reaction * (best.isPlayer ? 1 : 1.3) * (b.state === 'engage' ? 0.4 : 1); }
      b.lastSeen = now; b.targetPos = { x: best.x, y: best.y, z: best.z };
    } else if (b.target && now - b.lastSeen > 6) { b.target = null; }
    if (b.alert && now - b.alert.t > 4) b.alert = null;
  };
  BOTS.decide = function (b) {
    const now = BOTS.matchTime; const ST = FN.Storm; const PL = FN.Player;
    if (b.state === 'harvest' && b.breakTarget) return;
    // vehicle state: keep driving unless enemy spotted
    if (b.state === 'vehicle') {
      if (b.target && !b.target.dead && U.dist2(b.x, b.z, b.target.x, b.target.z) < 40) { BOTS.exitVehicleBot(b); b.state = 'engage'; b.engageT = now; return; }
      return; // keep driving
    }
    const hasWeapon = b.inv.slots.some(s => s && s.kind === 'weapon' && FN.Inventory.hasAmmo(b.inv, s));
    const hurtNeed = (b.health < 65 && FN.Inventory.consumableSlot(b.inv, false, true) >= 0) || (b.shield < 40 && FN.Inventory.consumableSlot(b.inv, true, false) >= 0);
    if (b.target && !b.target.dead && hasWeapon) { if (b.state !== 'engage') { b.state = 'engage'; b.engageT = now; } return; }
    if (b.target && !hasWeapon) { BOTS.chooseWeapon(b, U.dist2(b.x, b.z, b.target.x, b.target.z)); b.state = 'engage'; b.engageT = now; return; }
    if (b.state === 'heal') return;
    if (hurtNeed && now - b.lastSeen > 5) { BOTS.startHeal(b); return; }
    if (b.vehicleRequest && b.vehicleRequest.driver && !b.lootQueue.length && !b.target) {
      b.goal = { x: b.vehicleRequest.prop.x, z: b.vehicleRequest.prop.z, vehicle: true }; b.state = 'rotate'; return;
    }
    // Enemy squads also use vehicles for long rotations instead of relying
    // only on the storm-escape path. Pick an unoccupied vehicle occasionally,
    // drive toward a distant route point, and call the squad to the vehicle.
    if (!b.isTeammate && !b.target && b.state === 'roam' && !b.vehicleTarget && !b.lootQueue.length && FN.Vehicles && U.rand() < 0.08) {
      const vehicle = FN.Vehicles.nearest(b.x, b.z, 90);
      if (vehicle) {
        const a = U.rand() * 6.28, r = 180 + U.rand() * 220;
        b.vehicleTarget = vehicle; b.vehicleGoal = { x: b.x + Math.cos(a) * r, z: b.z + Math.sin(a) * r };
        b.goal = { x: vehicle.prop.x, z: vehicle.prop.z, vehicle: true }; b.state = 'rotate'; return;
      }
    }
    // storm rotation: use vehicle if goal is far
    if (ST.active) {
      const tgt = ST.safeTarget(); const d = U.dist2(b.x, b.z, tgt.cx, tgt.cz);
      const need = (Math.max(0, d - tgt.radius * 0.7) / 4.2 + 25) * (b.difficulty ? b.difficulty.escapeLead : 0.85); const urgent = !ST.isSafe(b.x, b.z) || (ST.shrinking && d > tgt.radius * 0.85) || (!ST.shrinking && ST.timer < need && d > tgt.radius * 0.85);
      if (urgent && !b.isTeammate) {
        if (!b.vehicleTarget && (b.state !== 'rotate' || !b.goal || U.dist2(b.goal.x, b.goal.z, tgt.cx, tgt.cz) > tgt.radius * 0.8)) { const a = U.rand() * 6.28, r = Math.sqrt(U.rand()) * tgt.radius * 0.7; b.goal = { x: tgt.cx + Math.cos(a) * r, z: tgt.cz + Math.sin(a) * r }; b.path = []; }
        // Give the bot time to reach a vehicle before continuing its escape.
        if (U.dist2(b.x, b.z, b.goal.x, b.goal.z) > 100 && FN.Vehicles) {
          const vehicle = FN.Vehicles.nearest(b.x, b.z, 80);
          if (vehicle) { b.vehicleTarget = vehicle; b.vehicleGoal = b.goal; b.goal = { x: vehicle.prop.x, z: vehicle.prop.z }; }
        }
        b.state = 'rotate'; return;
      }
    }
    // try to enter a vehicle for long-distance travel
    if (b.state === 'rotate' && b.goal && U.dist2(b.x, b.z, b.goal.x, b.goal.z) > 100 && FN.Vehicles) {
      const vehicle = FN.Vehicles.nearest(b.x, b.z, 80);
      if (vehicle) {
        b.vehicleTarget = vehicle;
        b.vehicleGoal = b.goal;
        b.goal = { x: vehicle.prop.x, z: vehicle.prop.z };
      }
    }
    // An active vehicle callout takes priority over ordinary teammate
    // following. Without this, driving the vehicle changed every teammate to
    // follow-state and they never reached the passenger-seat logic.
    const busyTeamTask = b.state === 'loot' || b.state === 'recover' || b.state === 'engage' || b.state === 'harvest' || b.commandType === 'take' || b.commandType === 'recover';
    if (b.isTeammate && !b.vehicleRequest && !busyTeamTask) { if (U.dist2(b.x, b.z, PL.pos.x, PL.pos.z) > 16 || PL.state !== 'ground') { b.state = 'follow'; return; } if (b.state === 'follow' && b.lootQueue.length) { b.state = 'loot'; return; } if (b.state === 'follow') return; }
    if (b.state === 'rotate' && b.goal && U.dist2(b.x, b.z, b.goal.x, b.goal.z) > 6) return;
    if (b.lootQueue.length && b.phaseT < 400) { b.state = 'loot'; return; }
    if (b.state !== 'roam' && b.state !== 'harvest') { b.state = 'roam'; b.goal = null; }
  };
  // movement helper with collision (near bots)
  BOTS.moveToward = function (b, gx, gz, speed, dt, collide) {
    const dx = gx - b.x, dz = gz - b.z; const d = Math.sqrt(dx * dx + dz * dz); b.wantMove = d > 0.3;
    let mx = d > 0.3 ? dx / d : 0, mz = d > 0.3 ? dz / d : 0;
    if (b.sideT > 0) { b.sideT -= dt; const sx = -mz * b.sideDir, sz = mx * b.sideDir; mx = mx * 0.4 + sx; mz = mz * 0.4 + sz; }
    if (b.strafe) { mx += -mz * b.strafe * 0.8; mz += mx * b.strafe * 0.8; const l = Math.sqrt(mx * mx + mz * mz) || 1; mx /= l; mz /= l; }
    b.vx = U.damp(b.vx, mx * speed, 10, dt); b.vz = U.damp(b.vz, mz * speed, 10, dt);
    if (d > 0.3 && !b.faceTarget) b.yaw = U.lerpAngle(b.yaw, Math.atan2(-mx, -mz), Math.min(1, dt * 8));
    BOTS.integrate(b, dt, collide);
    return d;
  };
  BOTS.integrate = function (b, dt, collide) {
    const height = b.crouch ? P.CROUCH_HEIGHT : P.HEIGHT;
    const np = { x: b.x + b.vx * dt, y: b.y, z: b.z + b.vz * dt };
    if (collide !== false) { const col = FN.Physics.collideXZ(np, P.RADIUS, height, b._col || (b._col = {}), true); if (col.stepUp > -Infinity && col.stepUp <= b.y + 0.6 && b.grounded) np.y = Math.max(np.y, col.stepUp); }
    const lim = C.WORLD_SIZE / 2 - 4; b.x = U.clamp(np.x, -lim, lim); b.z = U.clamp(np.z, -lim, lim); b.y = np.y;
    const prevY = b.y;
    b.vy -= C.GRAVITY * dt; b.y += b.vy * dt;
    // when airborne use the higher of the previous/new y so fast falls can't tunnel through floors
    const g = b.grounded
      ? FN.Physics.groundAt(b.x, b.z, b.y + 0.6, 0.6)
      : FN.Physics.groundAt(b.x, b.z, Math.max(prevY, b.y) + 0.05, 0.05);
    if (b.y <= g.y + 0.001 && b.vy <= 0) { b.y = g.y; b.vy = 0; b.grounded = true; }
    else if (b.grounded && b.vy <= 0 && g.y > b.y - 0.7 && g.y <= b.y) { b.y = g.y; b.vy = 0; }
    else b.grounded = false;
  };
  BOTS.doMoveGoal = function (b, dt, speed) {
    b.faceTarget = false; b.crouch = false;
    if (!b.goal) { b.state = 'roam'; return; }
    if (b.vehicleRequest && b.vehicleRequest.driver) { b.goal.x = b.vehicleRequest.prop.x; b.goal.z = b.vehicleRequest.prop.z; }
    const d = BOTS.moveToward(b, b.goal.x, b.goal.z, speed, dt, true);
    if (d < 4.5) {
      if (b.vehicleRequest && b.vehicleRequest.driver && BOTS.tryEnterPassenger(b, b.vehicleRequest)) { b.goal = null; return; }
      if (b.vehicleTarget && BOTS.tryEnterVehicle(b)) { b.goal = b.vehicleGoal || null; b.vehicleGoal = null; b.vehicleTarget = null; return; }
      b.vehicleTarget = null; b.vehicleGoal = null; b.goal = null; b.state = b.lootQueue.length ? 'loot' : 'roam';
    }
  };
  BOTS.doRoam = function (b, dt) {
    b.faceTarget = false;
    if (!b.goal || b.goalT <= 0) {
      const ST = FN.Storm; let cx = b.x, cz = b.z, r = 60;
      if (ST.active) { const t = ST.safeTarget(); if (U.dist2(b.x, b.z, t.cx, t.cz) > t.radius * 0.6) { cx = U.lerp(b.x, t.cx, 0.4); cz = U.lerp(b.z, t.cz, 0.4); } }
      const a = U.rand() * 6.28, rr = 15 + U.rand() * 30; b.goal = { x: cx + Math.cos(a) * rr, z: cz + Math.sin(a) * rr }; b.goalT = 8 + U.rand() * 10;
      if (U.rand() < 0.25) { b.idleT = 2 + U.rand() * 4; }
      // occasionally harvest a tree for materials
      if (U.rand() < 0.35 && b.inv.mats.wood < 200) { const props = FN.Props.nearby(b.x, b.z, 30, []).filter(p => p.harvest === 'tree' || p.harvest === 'pine' || p.harvest === 'rock'); if (props.length) { const p = props[0]; b.goal = { x: p.x + 1.8, z: p.z + 1.8 }; b.harvestProp = p; } }
      if (!b.lootQueue.length && U.rand() < 0.5) BOTS.buildLootQueue(b, 80);
    }
    b.goalT -= dt;
    if (b.idleT > 0) { b.idleT -= dt; b.vx = U.damp(b.vx, 0, 10, dt); b.vz = U.damp(b.vz, 0, 10, dt); BOTS.integrate(b, dt); b.wantMove = false; return; }
    const d = BOTS.moveToward(b, b.goal.x, b.goal.z, P.SPRINT * 0.95, dt, true);
    if (d < 2.5) { if (b.harvestProp && b.harvestProp.alive) { b.yaw = Math.atan2(-(b.harvestProp.x - b.x), -(b.harvestProp.z - b.z)); b.state = 'harvest'; b.prevState = 'roam'; b.breakT = 0; BOTS.equipSlot(b, 0); b.harvestProp = null; } b.goal = null; }
  };
  BOTS.doFollow = function (b, dt) {
    const PL = FN.Player; b.faceTarget = false;
    if (!b.followOff) b.followOff = { x: (U.rand() - 0.5) * 8, z: (U.rand() - 0.5) * 8 };
    const gx = PL.pos.x + b.followOff.x, gz = PL.pos.z + b.followOff.z; const d = U.dist2(b.x, b.z, gx, gz);
    if (b.commandType === 'return' && d < 4) { b.commandType = null; b.commandT = 0; b.state = 'roam'; b.goal = null; return; }
    if (b.commandType === 'scavengeReturn' && d < 4) { b.commandType = null; b.commandT = 0; b.state = 'roam'; b.goal = null; return; }
    if (b.commandType === 'follow' && b.commandT <= 0) { b.commandType = null; b.state = 'roam'; return; }
    if (d > 3) BOTS.moveToward(b, gx, gz, P.SPRINT, dt, true); else { b.wantMove = false; b.vx = U.damp(b.vx, 0, 10, dt); b.vz = U.damp(b.vz, 0, 10, dt); BOTS.integrate(b, dt); }
    if (U.rand() < dt * 0.3) BOTS.buildLootQueue(b, 30);
  };
  BOTS.doLoot = function (b, dt) {
    b.faceTarget = false; b.crouch = false;
    while (b.lootQueue.length && (b.lootQueue[0].dead || ((b.lootQueue[0].type === 'chest' || b.lootQueue[0].type === 'ammobox') && b.lootQueue[0].opened))) b.lootQueue.shift();
    if (!b.lootQueue.length) {
      if (b.vehicleRequest && b.vehicleRequest.driver) { b.goal = { x: b.vehicleRequest.prop.x, z: b.vehicleRequest.prop.z, vehicle: true }; b.state = 'rotate'; }
      else if (b.commandType === 'recover') b.state = 'recover';
      else if (b.commandType === 'scavenge') { b.goal = { x: FN.Player.pos.x, z: FN.Player.pos.z }; b.commandType = 'scavengeReturn'; b.state = 'follow'; }
      else b.state = 'roam';
      return;
    }
    const o = b.lootQueue[0];
    if (!b.path.length || b.pathFor !== o) {
      b.pathFor = o; b.path = [];
      const buildings = FN.POI && FN.POI.buildings ? FN.POI.buildings : [];
      const building = buildings.find((v) => v.door && Math.abs(o.x - v.x) <= v.w * 0.55 && Math.abs(o.z - v.z) <= v.d * 0.55);
      // Player-dropped items are a direct handoff; never route them through
      // a building or retain combat strafing from the previous task.
      if (b.commandType === 'take') b.path.push({ x: o.x, z: o.z });
      else {
        if (building && building.navPath) b.path.push(...building.navPath.map((p) => ({ x: p.x, z: p.z })));
        else if (o.spot && o.spot.door) b.path.push({ x: o.spot.door.x, z: o.spot.door.z }, { x: o.spot.door.ix, z: o.spot.door.iz });
        b.path.push({ x: o.x, z: o.z });
      }
    }
    if (b.commandType === 'take') { b.sideT = 0; b.strafe = 0; b.faceTarget = false; }
    const wp = b.path[0]; const d = BOTS.moveToward(b, wp.x, wp.z, P.SPRINT * 0.95, dt, true);
    if (d < 1.6) {
      b.path.shift();
      if (!b.path.length) { b.visited.add(o.id); b.lootQueue.shift(); BOTS.takeLoot(b, o); b.idleT = 0.4; }
    }
  };
  BOTS.takeLoot = function (b, o) {
    if (o.dead || !FN.Physics.lineOfSight({ x: b.x, y: b.y + 1.2, z: b.z }, { x: o.x, y: o.y, z: o.z })) return; let items = [];
    if (o.type === 'chest') { if (Math.abs(o.y - b.y) > 3.5) return; items = FN.Loot.openChest(o, b); }
    else if (o.type === 'ammobox') { if (Math.abs(o.y - b.y) > 3.5) return; items = FN.Loot.openAmmoBox(o, b); }
    else items = [o];
    for (const it of items) {
      // Container drops animate for players, but bots are already standing
      // at the container and should collect the ammo immediately.
      if (o.type === 'chest' || o.type === 'ammobox') it.pickupDelay = 0;
      if (it.dead || it.pickupDelay > 0) continue; const item = it.item;
      if (item.kind === 'weapon' && FN.Inventory.isFull(b.inv)) { let worst = -1, ws = 1e9; b.inv.slots.forEach((s, i) => { if (s && s.kind === 'weapon') { const sc = FN.Inventory.dmg(s) * C.WEAPONS[s.id].rate + FN.Inventory.rarityIndex(s) * 10; if (sc < ws) { ws = sc; worst = i; } } }); const score = FN.Inventory.dmg(item) * C.WEAPONS[item.id].rate + FN.Inventory.rarityIndex(item) * 10; if (worst >= 0 && ws < score) { const old = b.inv.slots[worst]; b.inv.slots[worst] = Object.assign({}, item); FN.Loot.remove(it); FN.Loot.dropItems([old], b.x, b.y, b.z, 0.5); } continue; }
      let r = FN.Inventory.add(b.inv, Object.assign({}, item));
      // Hurt bots should make room for useful healing instead of ignoring it
      // when every inventory slot is occupied. Never discard a weapon for a
      // heal; replace an existing consumable only when necessary.
      if (!r.ok && item.kind === 'consumable') {
        const def = C.CONSUMABLES[item.id];
        const useful = (def.heal && b.health < def.healCap) || (def.shield && b.shield < def.shieldCap);
        if (useful) {
          const slot = b.inv.slots.findIndex(s => s && s.kind === 'consumable');
          if (slot >= 0) { const old = b.inv.slots[slot]; b.inv.slots[slot] = Object.assign({}, item); FN.Loot.remove(it); FN.Loot.dropItems([old], b.x, b.y, b.z, 0.5); r = { ok: true }; }
        }
      }
      if (r.ok && !r.leftover && !it.dead) FN.Loot.remove(it);
    }
    BOTS.chooseWeapon(b, 30);
  };
  BOTS.equipSlot = function (b, slot) { b.equip.slot = slot; b.equip.item = slot === 0 ? null : b.inv.slots[slot - 1]; b.equip.reloadT = 0; BOTS.syncWeaponMesh(b); };
  BOTS.chooseWeapon = function (b, dist) {
    // a bot can hold multiple guns; pick the best one for the current range that actually has ammo.
    // usable = mag > 0 OR ammo of that type in reserve.
    const usable = [];
    b.inv.slots.forEach((s, i) => { if (s && s.kind === 'weapon') { const def = C.WEAPONS[s.id]; if (s.ammo > 0 || b.inv.ammo[def.ammo] > 0) usable.push({ s, i, def }); } });
    if (!usable.length) {
      // completely out of ammo -> melee with the pickaxe
      if (b.equip.slot !== 0) BOTS.equipSlot(b, 0);
      b.melee = true; return;
    }
    b.melee = false;
    // range-based preference list (higher = preferred for that distance)
    let pref;
    if (dist < 14) pref = { shotgun: 20, pistol: 12, smg: 9, ar: 4, sniper: 1 };
    else if (dist > 70) pref = { sniper: 14, ar: 5, smg: 2, pistol: 1, shotgun: 1 };
    else pref = { ar: 12, smg: 10, pistol: 7, shotgun: 8, sniper: 3 };
    let best = -1, bs = -99;
    for (const x of usable) {
      let sc = (pref[x.def.kind] || 1);
      sc += (x.s.ammo > 0 ? 3 : 0);               // prefer a loaded weapon over a dry one
      sc += FN.Inventory.rarityIndex(x.s) * 0.6;  // prefer rarer guns
      if (sc > bs) { bs = sc; best = x.i; }
    }
    const slot = best + 1;
    if (slot !== b.equip.slot) BOTS.equipSlot(b, slot); else if (slot === 0) BOTS.equipSlot(b, 0);
  };
  BOTS.startHeal = function (b) {
    const wantShield = b.shield < 60, wantHealth = b.health < 75; let slot = FN.Inventory.consumableSlot(b.inv, wantShield, wantHealth); if (slot < 0) return;
    const it = b.inv.slots[slot]; const def = C.CONSUMABLES[it.id];
    if (def.heal && !def.shield && b.health >= def.healCap) return; if (def.shield && !def.heal && b.shield >= def.shieldCap) return;
    b.state = 'heal'; b.healT = def.time; b.healSlot = slot; b.crouch = true; BOTS.equipSlot(b, slot + 1);
  };
  BOTS.doHeal = function (b, dt) {
    b.wantMove = false; b.vx = U.damp(b.vx, 0, 12, dt); b.vz = U.damp(b.vz, 0, 12, dt); BOTS.integrate(b, dt);
    b.healT -= dt; if (b.target && BOTS.matchTime - b.lastSeen < 1) { b.state = 'engage'; b.crouch = false; BOTS.chooseWeapon(b, 20); return; }
    if (b.healT <= 0) {
      const it = b.inv.slots[b.healSlot]; if (it) { const def = C.CONSUMABLES[it.id]; if (def.heal) b.health = Math.min(def.healCap, Math.max(b.health, Math.min(def.healCap, b.health + def.heal))); if (def.shield) b.shield = Math.min(def.shieldCap, b.shield + def.shield); it.count--; if (it.count <= 0) b.inv.slots[b.healSlot] = null; }
      b.crouch = false; b.state = b.commandType === 'recover' ? 'recover' : 'roam'; BOTS.chooseWeapon(b, 30);
      if ((b.health < 70 && FN.Inventory.consumableSlot(b.inv, false, true) >= 0) || (b.shield < 50 && FN.Inventory.consumableSlot(b.inv, true, false) >= 0)) BOTS.startHeal(b);
    }
  };
  BOTS.doEngage = function (b, dt) {
    const t = b.target; if (!t || t.dead) { b.target = null; b.state = 'roam'; b.faceTarget = false; return; }
    const now = BOTS.matchTime; const d = U.dist2(b.x, b.z, t.x, t.z); const seen = now - b.lastSeen < 0.5;
    if (U.rand() < dt * 0.5) BOTS.chooseWeapon(b, d);
    const it = b.equip.item; const def = it && it.kind === 'weapon' ? C.WEAPONS[it.id] : null;
    // Pickaxe combat uses a short, physical reach. Bots may still approach an
    // enemy without a gun, but they do not consider themselves in melee range
    // until they are very close.
    const range = b.melee ? 1.55 : (def ? (def.kind === 'shotgun' ? 6 : def.kind === 'sniper' ? 55 : def.kind === 'pistol' ? 14 : def.kind === 'smg' ? 12 : 24) : 20);
    // movement: approach / back off / strafe
    b.faceTarget = true; b.yaw = U.lerpAngle(b.yaw, Math.atan2(-(t.x - b.x), -(t.z - b.z)), Math.min(1, dt * 10));
    b.strafeT -= dt; if (b.strafeT <= 0) { b.strafeT = 0.8 + U.rand() * 1.5; b.strafe = U.rand() < 0.35 ? 0 : (U.rand() < 0.5 ? 1 : -1); b.crouch = !seen ? false : U.rand() < 0.2; }
    let gx = t.x, gz = t.z; let speed = P.SPRINT * (0.9 + b.aggression * 0.2); // bots always sprint (even while engaging)
    if (!seen) { gx = b.targetPos ? b.targetPos.x : t.x; gz = b.targetPos ? b.targetPos.z : t.z; speed = P.SPRINT * 0.9; b.strafe = 0; }
    else if (d < range * 0.6) { gx = b.x - (t.x - b.x); gz = b.z - (t.z - b.z); }
    else if (d < range * 1.3) { gx = b.x; gz = b.z; }
    if (d > 2) BOTS.moveToward(b, gx, gz, speed, dt, true); else { b.vx = U.damp(b.vx, 0, 10, dt); b.vz = U.damp(b.vz, 0, 10, dt); BOTS.integrate(b, dt); }
    // Defend slowly when surrounded or recently hit. Building has a cooldown
    // so bots do not pop instant cover every frame.
    b.buildT = Math.max(0, (b.buildT || 0) - dt);
    const enemiesNear = FN.Match.entities.filter(e => e !== b && !e.dead && e.team !== b.team && !e.aboard && U.dist2(e.x, e.z, b.x, b.z) < 18).length;
    const surrounded = enemiesNear >= 2 || (d < 9 && now - (b.lastHitT || -99) < 1.2);
    const mats = b.inv.mats.wood + b.inv.mats.brick + b.inv.mats.metal;
    if (b.builds && surrounded && b.buildT <= 0) {
      if (mats >= 10) {
        b.buildT = 2.8 + U.rand() * 2.8;
        if (U.rand() < 0.45 && b.inv.mats.wood >= 10) BOTS.placeRamp(b); else BOTS.placeWall(b, t);
      } else if (!b.harvestProp) {
        const resource = FN.Props.nearby(b.x, b.z, 35, []).find(p => p.alive && (p.harvest === 'tree' || p.harvest === 'pine' || p.harvest === 'rock'));
        if (resource) { b.harvestProp = resource; b.goal = { x: resource.x + 1.8, z: resource.z + 1.8 }; b.goalT = 20; b.prevState = 'engage'; b.state = 'roam'; }
      }
    }
    // shooting, or pickaxe melee when the bot is completely out of ammo
    if (b.meleeT > 0) b.meleeT -= dt;
    if (seen && now >= b.reactT) {
      if (def && it.kind === 'weapon') {
        if (it.ammo <= 0) { if (b.inv.ammo[def.ammo] > 0) { if (b.equip.reloadT <= 0) b.equip.reloadT = FN.Inventory.reloadTime(it) * 1.1; } else BOTS.chooseWeapon(b, d); }
        else if (b.equip.reloadT <= 0 && b.equip.cooldown <= 0) {
          if (b.equip.pause > 0) b.equip.pause -= dt;
          else {
            const aim = { x: t.x, y: t.y + (t.crouch ? 1.0 : 1.25) + (U.rand() < 0.12 * b.skill ? 0.55 : 0), z: t.z };
            const shot = BOTS.shootAt(b, aim, false);
            if (shot) { b.equip.burst++; const burstLen = def.burst || (def.auto ? 3 + Math.floor(b.skill * 5) : 1); if (b.equip.burst >= burstLen) { b.equip.burst = 0; b.equip.pause = 0.35 + (1 - b.skill) * 0.9 + U.rand() * 0.4; } }
          }
        }
      } else if (b.melee && d < 1.7 && b.meleeT <= 0) { // out of ammo -> swing only at close range
        b.meleeT = 1.0; b.recoil = 1;
        if (FN.Combat) FN.Combat.applyDamage(t, C.PLAYER.PICKAXE_DMG_PLAYER, b, { weapon: { id: 'pickaxe' }, melee: true });
        if (FN.Audio) FN.Audio.play('pickaxe_hit', { x: t.x, y: t.y, z: t.z }, 0.7, 30);
      }
    }
  };
  // ---------- bot vehicle driving ----------
  BOTS.tryEnterVehicle = function (b) {
    if (!FN.Vehicles || b.vehicle) return false;
    const v = b.vehicleTarget && !b.vehicleTarget.driver ? b.vehicleTarget : FN.Vehicles.nearest(b.x, b.z, 3);
    if (!v) return false;
    if (!FN.Vehicles.enter(v, b)) return false;
    b.vehicle = v;
    b.state = 'vehicle';
    if (FN.Match && FN.Match.mode !== 'solo' && !b.isTeammate) BOTS.calloutVehicle(v, b);
    if (b.char) b.char.group.visible = false;
    return true;
  };
  BOTS.doRecover = function (b, dt) {
    b.wantMove = false; b.vx = U.damp(b.vx, 0, 12, dt); b.vz = U.damp(b.vz, 0, 12, dt); BOTS.integrate(b, dt);
    if (!b.recoverStarted) { b.recoverStarted = true; BOTS.chooseWeapon(b, 30); }
    const it = b.equip.item; const def = it && it.kind === 'weapon' ? C.WEAPONS[it.id] : null;
    if (def && it.ammo < def.mag && b.inv.ammo[def.ammo] > 0) { if (b.equip.reloadT <= 0) b.equip.reloadT = FN.Inventory.reloadTime(it); return; }
    const needsHeal = b.health < 100 || b.shield < 100;
    if (needsHeal && FN.Inventory.consumableSlot(b.inv, b.shield < 100, b.health < 100) >= 0) { BOTS.startHeal(b); return; }
    if (needsHeal && !b.lootQueue.length) { BOTS.buildLootQueue(b, 70); if (b.lootQueue.length) { b.state = 'loot'; return; } }
    if (!b.recoverJumped) { b.recoverJumped = true; b.vy = P.JUMP_VEL; b.grounded = false; b.jumpT = 1.2; }
    b.commandType = null; b.commandT = 0; b.state = 'roam';
  };
  BOTS.tryEnterPassenger = function (b, v) {
    if (!v || !v.driver || !FN.Vehicles || !FN.Vehicles.enterPassenger) return false;
    if (!FN.Vehicles.enterPassenger(v, b)) return false;
    b.vehicle = v; b.passenger = true; b.state = 'passenger'; b.vehicleRequest = null; b.goal = null; b.vx = b.vz = 0;
    if (b.char) b.char.group.visible = false;
    return true;
  };
  BOTS.updatePassenger = function (b) {
    const v = b.vehicle;
    if (!v || !v.driver || !v.prop.alive) {
      if (v && FN.Vehicles) FN.Vehicles.exitPassenger(v, b);
      b.vehicle = null; b.passenger = false; b.state = 'roam'; b.goal = null; if (b.char) b.char.group.visible = true; return;
    }
    const slot = Math.max(0, v.passengers.indexOf(b)); const side = slot % 2 ? 1 : -1;
    const fx = Math.cos(v.prop.rot), fz = -Math.sin(v.prop.rot);
    b.x = v.prop.x - fx * (slot + 1) * 0.65 - fz * side * 0.8;
    b.z = v.prop.z - fz * (slot + 1) * 0.65 + fx * side * 0.8;
    b.y = v.prop.y; b.yaw = v.prop.rot; b.vx = b.vz = 0;
  };
  BOTS.exitVehicleBot = function (b) {
    if (!b.vehicle) return;
    const v = b.vehicle;
    const fx = Math.cos(v.prop.rot), fz = Math.sin(v.prop.rot);
    b.x = v.prop.x - fx * 3; b.z = v.prop.z - fz * 3;
    b.y = FN.Terrain.heightAt(b.x, b.z);
    b.vx = b.vz = b.vy = 0;
    b.grounded = true;
    FN.Vehicles.exit(v);
    b.vehicle = null;
    b.state = 'roam';
    if (b.char) b.char.group.visible = true;
  };
  BOTS.updateVehicleDriving = function (b, dt) {
    const v = b.vehicle;
    if (!v) { b.state = 'roam'; return; }
    if (!v.prop.alive) { BOTS.exitVehicleBot(b); return; }
    if (v.waitForPlayer) { v.speed = 0; b.x = v.prop.x; b.z = v.prop.z; b.y = v.prop.y; return; }
    // exit if enemy spotted nearby
    if (b.target && !b.target.dead && U.dist2(b.x, b.z, b.target.x, b.target.z) < 40) {
      BOTS.exitVehicleBot(b); b.state = 'engage'; return;
    }
    // drive toward goal (rotate target or loot)
    const goal = b.goal || b.dropTarget || { x: b.x + (U.rand() - 0.5) * 200, z: b.z + (U.rand() - 0.5) * 200 };
    const dx = goal.x - v.prop.x, dz = goal.z - v.prop.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < 5) { b.goal = null; BOTS.exitVehicleBot(b); return; }
    // steer toward goal
    const targetYaw = Math.atan2(-dz, dx);
    let angleDiff = targetYaw - v.prop.rot;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    // build virtual input for the vehicle
    const virt = { _down: new Set(),
      isDown: function (code) { return this._down.has(code); }
    };
    virt._down.add(C.KEYS.forward);
    if (Math.abs(angleDiff) > 0.1) {
      if (angleDiff > 0) virt._down.add(C.KEYS.right); else virt._down.add(C.KEYS.left);
    }
    FN.Vehicles.updateDriving(v, dt, virt);
    b.x = v.prop.x; b.z = v.prop.z; b.y = v.prop.y;
  };
  BOTS.shootAt = function (b, aim, harmless) {
    const it = b.equip.item; if (!it || it.kind !== 'weapon' || it.ammo <= 0) return false; const def = C.WEAPONS[it.id];
    const eye = { x: b.x - Math.sin(b.yaw) * 0.3, y: b.y + 1.45, z: b.z - Math.cos(b.yaw) * 0.3 };
    const d = U.dist3(eye, aim); const sigma = (1 - b.skill) * 1.3 * (b.difficulty ? b.difficulty.aimError : 1) + d * 0.014 + (b.vx * b.vx + b.vz * b.vz > 4 ? 0.4 : 0);
    const ax = aim.x + U.gauss() * sigma, ay = aim.y + U.gauss() * sigma * 0.7, az = aim.z + U.gauss() * sigma;
    const dx = ax - eye.x, dy = ay - eye.y, dz = az - eye.z; const l = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const dir = { x: dx / l, y: dy / l, z: dz / l }; b.pitch = Math.asin(U.clamp(dir.y, -1, 1));
    it.ammo--; b.equip.cooldown = 1 / def.rate * (def.auto || def.burst ? 1.0 : 1.3);
    if (harmless) { const save = FN.Match.noDamage; FN.Match.noDamage = true; FN.Combat.fire(b, it, eye, dir, def.spread * 1.3); FN.Match.noDamage = save; }
    else FN.Combat.fire(b, it, eye, dir, def.spread * 1.2);
    b.recoil = 1;
    if (FN.Character && FN.Character.triggerShoot) FN.Character.triggerShoot(b.char, def.model, true);
    if (FN.Bots) BOTS.noise(b.x, b.z, 110, b);
    return true;
  };
  BOTS.finishReload = function (b) { const it = b.equip.item; if (!it || it.kind !== 'weapon') return; const def = C.WEAPONS[it.id]; const take = Math.min(def.mag - it.ammo, b.inv.ammo[def.ammo]); it.ammo += take; b.inv.ammo[def.ammo] -= take; b.equip.reloadT = 0; };
  BOTS.placeWall = function (b, t) {
    const mats = ['wood', 'brick', 'metal'].filter(m => b.inv.mats[m] >= 10); if (!mats.length) return; const mat = mats[0];
    const dx = t.x - b.x, dz = t.z - b.z; const cx = FN.Structures.cellOf(b.x), cz = FN.Structures.cellOf(b.z), ly = FN.Structures.levelOf(b.y + 0.6);
    let o; if (Math.abs(dx) > Math.abs(dz)) o = { type: 'wall', axis: 'z', cx: dx > 0 ? cx + 1 : cx, cz, ly }; else o = { type: 'wall', axis: 'x', cx, cz: dz > 0 ? cz + 1 : cz, ly };
    const p = FN.Structures.add(Object.assign(o, { mat, grow: true, team: b.team })); if (p) { b.inv.mats[mat] -= 10; if (FN.Audio) FN.Audio.play('build', { x: b.x, y: b.y, z: b.z }, 0.6, 60); }
  };
  BOTS.placeRamp = function (b) {
    const fx = -Math.sin(b.yaw), fz = -Math.cos(b.yaw); const cx = FN.Structures.cellOf(b.x + fx * 3), cz = FN.Structures.cellOf(b.z + fz * 3); const ly = FN.Structures.levelOf(b.y + 0.6);
    const rot = ((Math.round(Math.atan2(fx, -fz) / (Math.PI / 2)) % 4) + 4) % 4;
    const p = FN.Structures.add({ type: 'stairs', cx, cz, ly, rot, mat: 'wood', grow: true, team: b.team }); if (p) { b.inv.mats.wood -= 10; if (FN.Audio) FN.Audio.play('build', { x: b.x, y: b.y, z: b.z }, 0.6, 60); }
  };
  BOTS.noise = function (x, z, range, source) {
    for (const b of BOTS.list) {
      if (b.dead || b === source || b.aboard || b.air || !b.char) continue; if (source && source.team === b.team) continue;
      const d = U.dist2(b.x, b.z, x, z); if (d > range) continue;
      if (!b.target) { b.alert = { x, z, t: BOTS.matchTime }; if (b.state !== 'engage' && b.state !== 'heal') { b.yaw = Math.atan2(-(x - b.x), -(z - b.z)); b.idleT = 0.8 + U.rand(); } if (source && !source.dead && source.team !== b.team && d < 60 && U.rand() < 0.5 + b.skill * 0.4) { b.target = source; b.targetPos = { x: source.x, y: source.y, z: source.z }; b.lastSeen = BOTS.matchTime - 2; b.reactT = BOTS.matchTime + b.reaction; } else if (!(b.goal && b.goal.storm)) { // investigate the noise (unless rotating to the storm)
        b.goal = { x: x + (U.rand() - 0.5) * 12, z: z + (U.rand() - 0.5) * 12 }; b.path = []; if (b.state !== 'harvest') b.state = 'rotate'; b.lootQueue = []; } }
    }
  };
  BOTS.onDamaged = function (b, source, info) {
    b.lastHitT = BOTS.matchTime; b.lastHitBy = source;
    if (source && !source.dead && source.team !== b.team && !info.storm) { if (!b.target || b.target !== source) { b.target = source; b.reactT = BOTS.matchTime + b.reaction * 0.6; } b.lastSeen = BOTS.matchTime - 1.5; b.targetPos = { x: source.x, y: source.y, z: source.z }; b.alert = { x: source.x, z: source.z, t: BOTS.matchTime }; if (b.state === 'heal' || b.state === 'loot' || b.state === 'roam' || b.state === 'follow') { const hasW = FN.Inventory.bestWeaponSlot(b.inv) >= 0; b.state = hasW ? 'engage' : 'rotate'; if (!hasW) { b.goal = { x: b.x - (source.x - b.x) * 2, z: b.z - (source.z - b.z) * 2 }; } } }
  };
  BOTS.onDeath = function (b, source) {
    // drop EVERYTHING the bot had: every inventory slot (weapons + consumables), all ammo pools and all materials
    const drops = []; for (const s of b.inv.slots) if (s) drops.push(Object.assign({}, s)); for (const a in b.inv.ammo) if (b.inv.ammo[a] > 0) drops.push({ kind: 'ammo', id: a, count: b.inv.ammo[a] }); for (const m in b.inv.mats) if (b.inv.mats[m] > 0) drops.push({ kind: 'material', id: m, count: b.inv.mats[m] });
    b.inv.slots.fill(null); for (const a in b.inv.ammo) b.inv.ammo[a] = 0; for (const m in b.inv.mats) b.inv.mats[m] = 0;
    const PL = FN.Player; const nearPlayer = U.dist2(b.x, b.z, PL.pos.x, PL.pos.z) < 400;
    if (drops.length) FN.Loot.dropItems(drops, b.x, b.y, b.z, 1.2, null, nearPlayer);
    // Keep the mesh visible for the shared death-FX sequence (frozen pose,
    // blue grid dissolve, fade-out); it is retired once fully transparent.
    if (b.char) { if (b.glider) { b.char.group.remove(b.glider); b.glider = null; } FN.Character.setWeapon(b.char, null); }
    for (const o of BOTS.list) if (o.target === b) o.target = null;
  };
  // ---------- far logic ----------
  BOTS.farGround = function (b, dt) {
    const ST = FN.Storm; const now = BOTS.matchTime;
    if (b.state === 'engage' && (!b.target || b.target.dead)) { b.target = null; b.state = 'roam'; }
    if (b.state === 'engage' && b.target && !b.target.isPlayer && !b.target.char) { b.state = 'roam'; b.target = null; }
    if (b.fight) return; // resolving statistically
    // choose goal
    let urgent = false;
    if (ST.active) { const tgt = ST.safeTarget(); const d = U.dist2(b.x, b.z, tgt.cx, tgt.cz); const need = (Math.max(0, d - tgt.radius * 0.7) / 4.2 + 25) * (b.difficulty ? b.difficulty.escapeLead : 0.85); urgent = !ST.isSafe(b.x, b.z) || d > tgt.radius * 0.95 || (!ST.shrinking && ST.timer < need && d > tgt.radius * 0.85) || (ST.shrinking && d > tgt.radius * 0.8);
      if (urgent && !b.isTeammate && (!b.goal || !b.goal.storm || U.dist2(b.goal.x, b.goal.z, tgt.cx, tgt.cz) > tgt.radius * 0.85)) { const a = U.rand() * 6.28, r = Math.sqrt(U.rand()) * tgt.radius * 0.7; b.goal = { x: tgt.cx + Math.cos(a) * r, z: tgt.cz + Math.sin(a) * r, storm: true }; b.state = 'rotate'; } }
    if (b.isTeammate) { const PL = FN.Player; if (U.dist2(b.x, b.z, PL.pos.x, PL.pos.z) > 14) b.goal = { x: PL.pos.x + (U.rand() - 0.5) * 8, z: PL.pos.z + (U.rand() - 0.5) * 8 }; }
    if (!b.goal) {
      if (b.state === 'loot' && now - b.landedT < 100 + U.rand() * 60) { const c = b.dropTarget || { x: b.x, z: b.z }; const a = U.rand() * 6.28, r = 10 + U.rand() * 50; b.goal = { x: c.x + Math.cos(a) * r, z: c.z + Math.sin(a) * r }; b.lootT = 0; }
      else { b.state = 'roam'; const a = U.rand() * 6.28, r = 15 + U.rand() * 35; let gx = b.x + Math.cos(a) * r, gz = b.z + Math.sin(a) * r; if (ST.active) { const t = ST.safeTarget(); if (U.dist2(b.x, b.z, t.cx, t.cz) > t.radius * 0.5 && U.rand() < 0.6) { gx = U.lerp(b.x, t.cx, 0.25) + (U.rand() - 0.5) * 60; gz = U.lerp(b.z, t.cz, 0.25) + (U.rand() - 0.5) * 60; } } b.goal = { x: gx, z: gz }; if (U.rand() < 0.3) b.idleT = 2 + U.rand() * 5; }
      // simulated looting: open a nearby chest / take items
      if (b.state === 'loot') { const near = FN.Loot.nearby(b.x, b.z, 40, []).filter(o => !o.dead && !((o.type === 'chest' || o.type === 'ammobox') && o.opened) && !b.visited.has(o.id)); if (near.length) { const o = near[0]; b.visited.add(o.id); if (Math.abs(o.y - b.y) < 6) BOTS.takeLoot(b, o); } }
    }
    if (b.idleT > 0) { b.idleT -= dt; return; }
    const dx = b.goal.x - b.x, dz = b.goal.z - b.z; const d = Math.sqrt(dx * dx + dz * dz);
    const sp = P.SPRINT * (0.9 + b.skill * 0.15); // bots always sprint
    if (d < 4.5 && b.vehicleTarget && BOTS.tryEnterVehicle(b)) { b.goal = b.vehicleGoal || null; b.vehicleGoal = null; b.vehicleTarget = null; return; }
    if (d < 2) { b.goal = null; return; }
    const step = Math.min(d, sp * dt); b.x += dx / d * step; b.z += dz / d * step; b.vx = dx / d * sp; b.vz = dz / d * sp; b.yaw = Math.atan2(-dx, -dz);
    b.y = FN.Terrain.heightAt(b.x, b.z); const wl = FN.Terrain.waterLevelAt(b.x, b.z); if (wl > b.y) b.y = wl - 1.0;
  };
  BOTS.expectedAlive = function () { const t = BOTS.matchTime; const P_ = C.PACING; for (let i = 0; i + 1 < P_.length; i++) if (t >= P_[i][0] && t < P_[i + 1][0]) return U.lerp(P_[i][1], P_[i + 1][1], (t - P_[i][0]) / (P_[i + 1][0] - P_[i][0])); return P_[P_.length - 1][1]; };
  BOTS.farLogic = function (dt) {
    // resolve fights
    for (let i = BOTS.fights.length - 1; i >= 0; i--) {
      const f = BOTS.fights[i]; f.t -= dt;
      if (f.a.dead || f.b.dead || f.a.char || f.b.char) { f.a.fight = null; f.b.fight = null; BOTS.fights.splice(i, 1); continue; }
      if (f.t <= 0) {
        const sa = f.a.skill + BOTS.loadoutScore(f.a) + 0.15 + (f.a.health + f.a.shield) / 300, sb = f.b.skill + BOTS.loadoutScore(f.b) + 0.15 + (f.b.health + f.b.shield) / 300;
        const aWins = U.rand() < sa / (sa + sb); const w = aWins ? f.a : f.b, l = aWins ? f.b : f.a;
        const wit = w.inv.slots[FN.Inventory.bestWeaponSlot(w.inv)] || { kind: 'weapon', id: 'pistol', rarity: 'common' };
        w.stats.kills++; w.lastFightT = BOTS.matchTime; FN.Combat.applyDamage(w, 10 + U.rand() * 45, null, { far: true }); FN.Combat.applyDamage(l, 999, w, { weapon: wit, far: true });
        // winner takes some loot
        if (!w.dead) { const bs = FN.Inventory.bestWeaponSlot(l.inv); if (bs >= 0 && !FN.Inventory.isFull(w.inv)) FN.Inventory.add(w.inv, l.inv.slots[bs]); }
        f.a.fight = null; f.b.fight = null; BOTS.fights.splice(i, 1);
      }
    }
    // pacing-controlled encounters between far bots
    const alive = FN.Match.aliveCount(); const expected = BOTS.expectedAlive(); const ratio = alive / Math.max(1, expected);
    let p = 0.004 * dt / 0.5 * U.clamp(Math.pow(ratio, 4), 0.03, 8); if (alive < expected - 2) p = 0; // never drop below the natural curve through simulated fights
    if (FN.Match.phase !== 'game' && FN.Match.phase !== 'drop') p = 0;
    const far = BOTS.list.filter(b => !b.dead && !b.char && !b.aboard && !b.air && !b.fight && !b.isTeammate && BOTS.matchTime - b.landedT > 25 && BOTS.matchTime - (b.lastFightT || -99) > 25);
    const grid = new Map(); for (const b of far) { const k = Math.floor(b.x / 60) + ',' + Math.floor(b.z / 60); let a = grid.get(k); if (!a) { a = []; grid.set(k, a); } a.push(b); }
    for (const b of far) {
      if (b.fight) continue; const cx = Math.floor(b.x / 60), cz = Math.floor(b.z / 60);
      for (let dz = -1; dz <= 1 && !b.fight; dz++) for (let dx = -1; dx <= 1 && !b.fight; dx++) { const a = grid.get((cx + dx) + ',' + (cz + dz)); if (!a) continue; for (const o of a) { if (o === b || o.fight || o.team === b.team) continue; if (U.dist2sq(o.x, o.z, b.x, b.z) < 60 * 60 && U.rand() < p * 6) { const f = { a: b, b: o, t: 2.5 + U.rand() * 5 }; b.fight = f; o.fight = f; BOTS.fights.push(f); break; } } }
    }
  };
  BOTS.loadoutScore = function (b) { const s = FN.Inventory.bestWeaponSlot(b.inv); if (s < 0) return -0.3; const it = b.inv.slots[s]; return 0.15 + FN.Inventory.rarityIndex(it) * 0.08 + (C.WEAPONS[it.id].kind === 'shotgun' || C.WEAPONS[it.id].kind === 'ar' ? 0.1 : 0); };

  // ---------- rendering ----------
  const TMPM = new THREE.Matrix4(), TMPQ = new THREE.Quaternion(), TMPV = new THREE.Vector3(), TMPS = new THREE.Vector3(1, 1, 1), YAX = new THREE.Vector3(0, 1, 0), TMPC = new THREE.Color();
  BOTS.render = function (dt) {
    const PL = FN.Player; let fi = 0, gi = 0; const cam = FN.Engine.camera; const tags = [];
    for (const b of BOTS.list) {
      if (b.dead || b.aboard) continue;
      if (b.char) {
        const ch = b.char; ch.group.position.set(b.x, b.y, b.z); ch.group.rotation.y = b.yaw;
        const spd = Math.sqrt(b.vx * b.vx + b.vz * b.vz);
        const it = b.equip.item; let wk = 'none'; if ((b.equip.slot === 0 && (b.state === 'harvest' || b.state === 'island' || FN.Match.phase === 'game')) || b.melee) wk = 'pickaxe'; if (it) { if (it.kind === 'consumable') wk = 'item'; else { const k = C.WEAPONS[it.id].kind; wk = k === 'pistol' ? 'pistol' : k === 'launcher' ? 'launcher' : k === 'sniper' ? 'sniper' : 'rifle'; } }
        if (b.state === 'heal') wk = 'item';
        const s = { move: U.clamp(spd / P.SPRINT, 0, 1), sprint: spd > 4.6, crouch: b.crouch, grounded: b.grounded, air: b.vy, aim: b.state === 'engage', pitch: b.state === 'engage' ? b.pitch : 0, weapon: wk, swing: (b.state === 'harvest' ? b.swing : null) || (b.melee && b.meleeT > 0.5 ? 0.8 : null), recoil: b.recoil, hurt: b.hurt };
        if (b.air) { if (b.air.glide) s.glide = { turn: 0 }; else s.skydive = { dive: b.air.dive || 0.5, turn: 0 }; s.weapon = 'none'; }
        FN.Character.animate(ch, s, dt);
        if (b.isTeammate) tags.push(b);
      } else if (!b.dead) {
        const d2 = U.dist2sq(b.x, b.z, PL.pos.x, PL.pos.z); if (d2 > B.MID_RADIUS * B.MID_RADIUS) continue;
        TMPQ.setFromAxisAngle(YAX, b.yaw); TMPV.set(b.x, b.y, b.z); TMPM.compose(TMPV, TMPQ, TMPS); BOTS.farMesh.setMatrixAt(fi, TMPM); TMPC.setHex(b.skin.top); BOTS.farMesh.setColorAt(fi, TMPC); fi++;
        if (b.air && b.air.glide) { BOTS.farGlider.setMatrixAt(gi, TMPM); gi++; }
      }
    }
    BOTS.farMesh.count = fi; BOTS.farMesh.instanceMatrix.needsUpdate = true; if (BOTS.farMesh.instanceColor) BOTS.farMesh.instanceColor.needsUpdate = true; BOTS.farGlider.count = gi; BOTS.farGlider.instanceMatrix.needsUpdate = true;
    // teammate name tags
    if (tags.length || BOTS._hadTags) {
      const v = new THREE.Vector3(); let html = '';
      for (const b of tags) { v.set(b.x, b.y + 2.2, b.z).project(cam); if (v.z > 1) continue; const x = (v.x + 1) / 2 * window.innerWidth, y = (1 - v.y) / 2 * window.innerHeight; html += `<div style="position:absolute;left:${x}px;top:${y}px;transform:translate(-50%,-100%);color:#4fc3ff;font:bold 16px Impact,Arial Narrow,sans-serif;text-shadow:0 1px 2px #000">${b.name}</div>`; }
      BOTS.nameTags.innerHTML = html; BOTS._hadTags = tags.length > 0;
    }
  };
  FN.Bots = BOTS;
})();
