// Shooting (hitscan + projectiles), damage, harvesting. Shared by player and bots.
window.FN = window.FN || {};
(function () {
  const C = FN.CONFIG, U = FN.U;
  const CB = { projectiles: [], tmp: new THREE.Vector3() };
  CB.init = function (scene) { CB.scene = scene; CB.projectiles = []; };

  // Rotate a direction by random spread (degrees, cone half-angle)
  CB.spreadDir = function (dir, spreadDeg, rng) {
    if (spreadDeg <= 0) return { x: dir.x, y: dir.y, z: dir.z };
    rng = rng || Math.random;
    const a = rng() * Math.PI * 2, r = Math.sqrt(rng()) * spreadDeg * Math.PI / 180;
    // basis
    const up = Math.abs(dir.y) < 0.99 ? { x: 0, y: 1, z: 0 } : { x: 1, y: 0, z: 0 };
    const rx = dir.y * up.z - dir.z * up.y, ry = dir.z * up.x - dir.x * up.z, rz = dir.x * up.y - dir.y * up.x; const rl = Math.sqrt(rx * rx + ry * ry + rz * rz);
    const r1 = { x: rx / rl, y: ry / rl, z: rz / rl }; const r2 = { x: dir.y * r1.z - dir.z * r1.y, y: dir.z * r1.x - dir.x * r1.z, z: dir.x * r1.y - dir.y * r1.x };
    const ox = Math.cos(a) * Math.sin(r), oy = Math.sin(a) * Math.sin(r), cz = Math.cos(r);
    const o = { x: dir.x * cz + r1.x * ox + r2.x * oy, y: dir.y * cz + r1.y * ox + r2.y * oy, z: dir.z * cz + r1.z * ox + r2.z * oy };
    const l = Math.sqrt(o.x * o.x + o.y * o.y + o.z * o.z); o.x /= l; o.y /= l; o.z /= l; return o;
  };
  CB.muzzlePos = function (ent) {
    const ch = ent.char; if (!ch || !ch.weaponMesh) return { x: ent.x, y: ent.y + 1.4, z: ent.z };
    const m = FN.WeaponModels.MUZZLE[ch.weaponMesh.userData.model] || [0, 0.15, -0.8];
    CB.tmp.set(m[0], m[1], m[2]); ch.weaponMesh.localToWorld(CB.tmp); return { x: CB.tmp.x, y: CB.tmp.y, z: CB.tmp.z };
  };
  // Fire one trigger pull. shooter: entity; item: weapon item; origin/dir: aim ray; spreadDeg: current cone.
  CB.fire = function (shooter, item, origin, dir, spreadDeg, opts) {
    opts = opts || {}; const def = C.WEAPONS[item.id]; const dmg = FN.Inventory.dmg(item);
    if (shooter.isBot) shooter.shotT = 1;
    const muzzle = CB.muzzlePos(shooter);
    const sound = { ar: 'shot_ar', shotgun: 'shot_tac', sniper: 'shot_sniper', pistol: 'shot_pistol', launcher: 'shot_rpg', smg: 'shot_smg' }[def.kind] || 'shot_ar';
    const snd = { scar: 'shot_scar', scoped: 'shot_scoped', pump: 'shot_pump', doublebarrel: 'shot_db', suppressedsmg: 'shot_suppressed', revolver: 'shot_revolver', handcannon: 'shot_revolver', leveraction: 'shot_leveraction', drumshotgun: 'shot_drumshotgun', burstsmg: 'shot_burstsmg', combatsmg: 'shot_combatsmg', heavyar: 'shot_heavyar', flintknock: 'shot_flintknock', suppressedpistol: 'shot_suppressedpistol', huntingrifle: 'shot_huntingrifle', autoshotgun: 'shot_autoshotgun', tacticalar: 'shot_tacticalar', minigun: 'shot_minigun', infernoar: 'shot_infernoar', plasmarifle: 'shot_plasmarifle', zapsmg: 'shot_zapsmg', heavysniper: 'shot_heavysniper', suppressedar: 'shot_suppressedar', trophygun: 'shot_trophygun', quadlauncher: 'shot_quadlauncher', infernoshotgun: 'shot_infernoshotgun', burstpistol: 'shot_burstpistol', compactsmg: 'shot_compactsmg', thermalar: 'shot_thermalar' }[item.id] || sound;
    const suppressed = !!def.suppressed;
    if (FN.Audio) FN.Audio.play(snd, shooter.isPlayer ? null : muzzle, shooter.isPlayer ? (suppressed ? 0.45 : 0.9) : (suppressed ? 0.4 : 0.8), def.kind === 'sniper' || def.kind === 'launcher' ? 700 : 420);
    if (FN.FX) FN.FX.muzzle(muzzle.x, muzzle.y, muzzle.z, suppressed ? 0.12 : (def.kind === 'shotgun' ? 0.8 : (def.kind === 'pistol' || def.kind === 'smg' ? 0.4 : 0.55)));
    // gunfire is loud: nearby bots hear it and turn/investigate/engage (suppressed weapons are much quieter)
    if (FN.Bots && shooter.isPlayer) FN.Bots.noise(shooter.x, shooter.z, suppressed ? 35 : (C.BOTS.HEAR_RANGE || 110), shooter);
    shooter.recoil = 1; if (shooter.isPlayer && FN.Player) FN.Player.kick(def.kind === 'shotgun' ? 1.6 : def.kind === 'sniper' ? 2.2 : def.kind === 'launcher' ? 1.5 : 0.7);
    if (def.projectile) {
      const d = CB.spreadDir(dir, spreadDeg);
      const p = { x: muzzle.x, y: muzzle.y, z: muzzle.z, vx: d.x * def.speed, vy: d.y * def.speed, vz: d.z * def.speed, def, dmg, shooter, item, t: 0, hs: def.hs };
      // start along the aim ray so the shot lands where the crosshair is
      p.x = origin.x + dir.x * 1.5; p.y = origin.y + dir.y * 1.5; p.z = origin.z + dir.z * 1.5;
      if (def.kind === 'launcher') { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.5, 8), new THREE.MeshLambertMaterial({ color: 0x5b6b3c })); m.rotation.x = Math.PI / 2; const g = new THREE.Group(); g.add(m); const tip = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.2, 8), new THREE.MeshLambertMaterial({ color: 0xd8452f })); tip.rotation.x = -Math.PI / 2; tip.position.z = -0.35; g.add(tip); CB.scene.add(g); p.mesh = g; if (FN.Audio) FN.Audio.play('rocket_fly', muzzle, 0.6, 300); }
      else { const m = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffe8a0 })); CB.scene.add(m); p.mesh = m; }
      CB.projectiles.push(p); return;
    }
    const pellets = def.pellets || 1; let anyHit = false, anyHead = false, totalDmg = 0;
    const ents = FN.Match ? FN.Match.entities : [];
    // Training mode: include dummies in raycasts
    if (FN.Training && FN.Training.active) { for (const d of FN.Training.dummies) ents.push(d); for (const d of FN.Training.targets) ents.push(d); }
    for (let i = 0; i < pellets; i++) {
      const d = CB.spreadDir(dir, spreadDeg);
      const hit = FN.Physics.raycast(origin, d, def.range, { entities: ents, skipEntity: shooter });
      const end = hit ? hit.point : { x: origin.x + d.x * def.range, y: origin.y + d.y * def.range, z: origin.z + d.z * def.range };
      if (def.tracer || pellets > 1) FN.FX.tracer(muzzle, end, pellets > 1 ? 0xffd090 : 0xfff1b0);
      if (!hit) continue;
      if (hit.kind === 'entity') {
        let amount = dmg;
        if (def.falloffStart !== undefined) { const f = 1 - U.smoothstep(def.falloffStart, def.falloffEnd, hit.t); amount = dmg * Math.max(def.minFrac, f); }
        if (pellets > 1) amount = amount / pellets;
        const hs = hit.head ? def.hs : 1; amount *= hs;
        totalDmg += CB.applyDamage(hit.entity, amount, shooter, { head: hit.head, weapon: item, pellets: pellets > 1 });
        anyHit = true; if (hit.head) anyHead = true;
        FN.FX.puff(hit.point.x, hit.point.y, hit.point.z, 0xff6a6a, 0.4);
      } else if (hit.kind === 'structure') { FN.Structures.damage(hit.piece, (pellets > 1 ? dmg / pellets : dmg) * 1.0, shooter); FN.FX.hitDebris(hit.point.x, hit.point.y, hit.point.z, hit.piece.mat, 4); }
      else if (hit.kind === 'prop') { FN.Props.damage(hit.prop, pellets > 1 ? dmg / pellets : dmg); FN.FX.hitDebris(hit.point.x, hit.point.y, hit.point.z, hit.prop.harvest === 'rock' ? 'rock' : hit.prop.harvest === 'car' ? 'metal' : 'wood', 3); }
      else if (hit.kind === 'terrain') { FN.FX.puff(hit.point.x, hit.point.y + 0.1, hit.point.z, 0xb8a070, 0.5); }
    }
    if (anyHit && shooter.isPlayer && FN.HUD) { FN.HUD.hitMarker(anyHead); }
    if (pellets > 1 && anyHit && shooter.isPlayer && FN.HUD) FN.HUD.damageNumberAt(FN.HUD._lastDmgPos, Math.round(totalDmg), anyHead, false, true);
  };
  CB.updateProjectiles = function (dt) {
    const ents = FN.Match ? FN.Match.entities : [];
    if (FN.Training && FN.Training.active) { for (const d of FN.Training.dummies) ents.push(d); for (const d of FN.Training.targets) ents.push(d); }
    for (let i = CB.projectiles.length - 1; i >= 0; i--) {
      const p = CB.projectiles[i]; p.t += dt;
      const g = p.def.drop ? C.GRAVITY * 0.5 * p.def.drop : 0; p.vy -= g * dt;
      const nx = p.x + p.vx * dt, ny = p.y + p.vy * dt, nz = p.z + p.vz * dt;
      const dx = nx - p.x, dy = ny - p.y, dz = nz - p.z; const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const dir = { x: dx / len, y: dy / len, z: dz / len };
      const hit = FN.Physics.raycast({ x: p.x, y: p.y, z: p.z }, dir, len, { entities: ents, skipEntity: p.t < 0.15 ? p.shooter : null });
      let done = false;
      if (hit) {
        if (p.def.kind === 'launcher') {
          CB.explode(hit.point, p.def.splash, p.dmg, p.def.structDmg, p.shooter, p.item);
        } else {
          if (hit.kind === 'entity') { const amount = p.dmg * (hit.head ? p.def.hs : 1); CB.applyDamage(hit.entity, amount, p.shooter, { head: hit.head, weapon: p.item }); if (p.shooter.isPlayer && FN.HUD) FN.HUD.hitMarker(hit.head); }
          else if (hit.kind === 'structure') { FN.Structures.damage(hit.piece, p.dmg, p.shooter); FN.FX.hitDebris(hit.point.x, hit.point.y, hit.point.z, hit.piece.mat, 5); }
          else if (hit.kind === 'prop') { FN.Props.damage(hit.prop, p.dmg); FN.FX.hitDebris(hit.point.x, hit.point.y, hit.point.z, 'wood', 4); }
          else FN.FX.puff(hit.point.x, hit.point.y + 0.1, hit.point.z, 0xb8a070, 0.6);
        }
        done = true;
      }
      p.x = nx; p.y = ny; p.z = nz;
      if (p.t > 6 || p.y < -50) done = true;
      if (p.mesh) { p.mesh.position.set(p.x, p.y, p.z); if (p.def.kind === 'launcher') { p.mesh.lookAt(p.x + dir.x, p.y + dir.y, p.z + dir.z); if (Math.random() < 0.6) FN.FX.puff(p.x, p.y, p.z, 0x999999, 0.7); } }
      if (done) { if (p.mesh) { CB.scene.remove(p.mesh); } CB.projectiles.splice(i, 1); }
    }
  };
  CB.explode = function (pt, radius, dmg, structDmg, shooter, item) {
    FN.FX.explosion(pt.x, pt.y, pt.z, radius);
    const ents = FN.Match ? FN.Match.entities : [];
    if (FN.Training && FN.Training.active) { for (const d of FN.Training.dummies) ents.push(d); for (const d of FN.Training.targets) ents.push(d); }
    // Offload bulk entity damage calculation to avoid stalling the main thread.
    // Use requestAnimationFrame or setTimeout if lag persists, but for now 
    // prioritize core logic and cap loops strictly.
    let entsProcessed = 0;
    let playerHit = false;
    for (const e of ents) {
      if (e.dead) continue;
      const d = U.dist3({ x: e.x, y: e.y + 0.9, z: e.z }, pt);
      if (d > radius + 0.5) continue;
      
      const amount = dmg * (1 - 0.5 * U.clamp((d - 1) / radius, 0, 1));
      
      // Keep explosive damage deterministic and avoid creating a burst of delayed timers.
      CB.applyDamage(e, amount, shooter, { weapon: item, explosive: true });
      entsProcessed++;
      if (shooter && shooter.isPlayer && FN.HUD && e !== shooter) playerHit = true;
    }
    // A single explosion should only trigger one hitmarker sound, even if it hits several enemies.
    if (playerHit && shooter && shooter.isPlayer && FN.HUD) FN.HUD.hitMarker(false);
    const pieces = FN.Structures.nearby(pt.x, pt.z, radius + 3, []);
    let processed = 0; for (const p of pieces) { if (processed++ > 25) break; const cx = U.clamp(pt.x, p.aabb.min.x, p.aabb.max.x), cy = U.clamp(pt.y, p.aabb.min.y, p.aabb.max.y), cz = U.clamp(pt.z, p.aabb.min.z, p.aabb.max.z); if (U.dist3({ x: cx, y: cy, z: cz }, pt) <= radius) FN.Structures.damage(p, structDmg, shooter); }
    const props = FN.Props.nearby(pt.x, pt.z, radius + 3, []);
    for (const p of props) { if (U.dist2(p.x, p.z, pt.x, pt.z) <= radius + 1 && p.harvest) FN.Props.damage(p, structDmg); }
    if (FN.Bots) FN.Bots.noise(pt.x, pt.z, 200, shooter);
  };
  // Apply damage to an entity (shield first). Returns damage applied.
  CB.applyDamage = function (target, amount, source, info) {
    if (!target || target.dead || amount <= 0) return 0; info = info || {};
    // Training-mode dummies: show damage number, never actually take health.
    if (FN.Training && FN.Training.isDummy && FN.Training.isDummy(target)) {
      return FN.Training.applyDummyDamage(target, amount, source, info);
    }
    // Duo/squad teammates share a team id. Friendly fire is disabled for all
    // damage sources, including bullets, projectiles, explosives and melee.
    if (source && source !== target && source.team !== undefined && source.team === target.team) return 0;
    if (target.invulnerable) return 0; if (FN.Match && (FN.Match.noDamage || FN.Match.phase === 'island')) return 0;
    amount = Math.round(amount); let shieldDmg = 0, healthDmg = 0;
    if (target.shield > 0) { shieldDmg = Math.min(target.shield, amount); target.shield -= shieldDmg; }
    healthDmg = Math.min(target.health, amount - shieldDmg); target.health -= healthDmg;
    const total = shieldDmg + healthDmg;
    target.lastHitBy = source; target.lastHitT = FN.Engine.time; target.hurt = 1;
    if (source && source.isPlayer && FN.HUD && target !== source) {
      const pos = { x: target.x, y: target.y + (info.head ? 1.85 : 1.3), z: target.z }; FN.HUD._lastDmgPos = pos;
      if (!info.pellets) FN.HUD.damageNumberAt(pos, total, !!info.head, shieldDmg > 0 && healthDmg === 0);
      if (source.stats) source.stats.damage += total;
    }
    if (target.isPlayer && FN.HUD) { FN.HUD.damageTaken(source, total); if (shieldDmg > 0 && target.shield <= 0) FN.Audio && FN.Audio.play('shield_break'); }
    if (!target.isPlayer && FN.Bots) FN.Bots.onDamaged(target, source, info);
    if (target.health <= 0) { target.health = 0; CB.kill(target, source, info); }
    return total;
  };
  CB.kill = function (target, source, info) {
    if (target.dead) return;
    target.dead = true;
    target.deathT = FN.Engine.time;
    // Shared death sequence for player and bots: freeze + dissolve handled by
    // FN.Character (beginDeath/updateDeath/endDeath), driven by each entity's
    // render/update tick. Death clock matches Character's phases (A 1.5s + hold 1s + fade 0.4s).
    if (FN.Character && FN.Character.beginDeath) {
      const ch = target.isPlayer ? FN.Player.char : target.char;
      if (ch) { FN.Character.beginDeath(ch); target.deathDuration = 1.5 + 1.0 + 0.4; }
      else target.deathDuration = 0;
    } else target.deathDuration = 0;
    if (FN.Match) FN.Match.onKill(source, target, info);
  };
  // ---------- Harvesting ----------
  CB.harvestHit = function (ent, origin, dir, reach) {
    if (FN.Match && FN.Match.phase === 'island') return null;
    const ents = FN.Match ? FN.Match.entities : [];
    // Training mode: pickaxe swings can hit dummies too
    if (FN.Training && FN.Training.active) { for (const d of FN.Training.dummies) ents.push(d); for (const d of FN.Training.targets) ents.push(d); }
    const hit = FN.Physics.raycast(origin, dir, reach, { entities: ents, skipEntity: ent });
    if (!hit) { return null; }
    const hv = C.HARVEST; let gain = null, crit = false, mat = null;
    if (hit.kind === 'entity') { CB.applyDamage(hit.entity, C.PLAYER.PICKAXE_DMG_PLAYER, ent, { weapon: { id: 'pickaxe' }, melee: true }); if (ent.isPlayer && FN.HUD) FN.HUD.hitMarker(false); if (FN.Audio) FN.Audio.play('hit_flesh', hit.point, 0.8, 30); return hit; }
    if (hit.kind === 'structure') {
      const p = hit.piece; mat = p.mat; const key = 'struct_' + mat; const h = hv[key];
      crit = CB.checkWeakSpot(ent, p, hit.point);
      FN.Structures.damage(p, C.PLAYER.PICKAXE_DMG_STRUCT * (crit ? 2 : 1), ent);
      gain = { mat, n: crit ? h.crit : h.perHit };
      FN.FX.hitDebris(hit.point.x, hit.point.y, hit.point.z, mat, crit ? 10 : 5);
      if (ent.isPlayer && FN.Bots) FN.Bots.noise(ent.x, ent.z, 45, ent); // pickaxe whacks are audible up close
      if (FN.Audio) FN.Audio.play(crit ? 'pickaxe_crit' : (mat === 'brick' ? 'hit_stone' : mat === 'metal' ? 'hit_metal' : 'pickaxe_hit'), ent.isPlayer ? null : hit.point, 0.9, 60);
    } else if (hit.kind === 'prop') {
      const p = hit.prop; if (!p.harvest) { if (FN.Audio) FN.Audio.play('hit_stone', hit.point, 0.5, 40); return hit; }
      const h = hv[p.harvest]; mat = h.mat; crit = CB.checkWeakSpot(ent, p, hit.point);
      FN.Props.damage(p, C.PLAYER.PICKAXE_DMG_STRUCT * (crit ? 2 : 1));
      gain = { mat, n: crit ? h.crit : h.perHit };
      FN.FX.hitDebris(hit.point.x, hit.point.y, hit.point.z, mat === 'brick' ? 'rock' : mat, crit ? 10 : 5);
      if (FN.Audio) FN.Audio.play(crit ? 'pickaxe_crit' : (mat === 'brick' ? 'hit_stone' : mat === 'metal' ? 'hit_metal' : 'pickaxe_hit'), ent.isPlayer ? null : hit.point, 0.9, 60);
    } else { if (FN.Audio) FN.Audio.play('hit_stone', ent.isPlayer ? null : hit.point, 0.5, 40); FN.FX.puff(hit.point.x, hit.point.y, hit.point.z, 0xb8a070, 0.4); return hit; }
    if (gain && ent.inv) { const before = ent.inv.mats[gain.mat]; ent.inv.mats[gain.mat] = Math.min(C.PLAYER.MAX_MATS, before + gain.n); gain.n = ent.inv.mats[gain.mat] - before; if (ent.isPlayer && FN.HUD) FN.HUD.materialGain(gain.mat, gain.n, crit); }
    hit.gain = gain; hit.crit = crit; return hit;
  };
  // Weak spot: per-harvester target + point. Returns true if this hit was a crit; picks a new spot after any hit.
  CB.checkWeakSpot = function (ent, target, point) {
    let crit = false;
    if (ent.weak && ent.weak.target === target) { crit = U.dist3(ent.weak.point, point) < 0.5; }
    // new weak spot near the hit point (random offset on the surface plane)
    const ox = (U.rand() - 0.5) * 1.6, oy = (U.rand() - 0.3) * 1.2, oz = (U.rand() - 0.5) * 1.6;
    ent.weak = { target, point: { x: point.x + ox, y: Math.max(point.y + oy, (target.y !== undefined ? target.y : point.y) + 0.4), z: point.z + oz }, t: FN.Engine.time };
    // project back toward the hit point to keep it roughly on the surface (approximate)
    ent.weak.point.x = point.x + ox * 0.6; ent.weak.point.z = point.z + oz * 0.6;
    return crit;
  };
  FN.Combat = CB;
})();