// Movement collision (capsule vs terrain / structures / props) and unified raycasts.
window.FN = window.FN || {};
(function () {
  const C = FN.CONFIG, U = FN.U;
  const PH = { STEP: 0.55 };
  const tmpBoxes = [];
  PH.terrainSupport = function (x, z, radius) {
    radius = radius || C.PLAYER.RADIUS;
    let y = FN.Terrain.heightAt(x, z);
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      y = Math.max(y, FN.Terrain.heightAt(x + Math.cos(a) * radius, z + Math.sin(a) * radius));
    }
    // Keep boot soles slightly above steep terrain triangles.
    return y + 0.2;
  };

  // Highest walkable surface under (x,z) with top <= yRef + step. Returns {y, kind, obj}
  PH.groundAt = function (x, z, yRef, step) {
    step = step === undefined ? PH.STEP : step;
    let y = PH.terrainSupport(x, z); let kind = 'terrain', obj = null;
    const s = FN.Structures.groundAt(x, z, yRef + step, -1e9);
    if (s && s.y > y) { y = s.y; kind = s.kind; obj = s.piece; }
    // props with box tops (cars, containers, crates...)
    const near = FN.Props.nearby(x, z, 4, tmpBoxes); tmpBoxes.length = 0;
    for (const p of near) {
      const sh = FN.Props.shapeOf(p); if (!sh || sh.kind !== 'box') continue;
      if (x >= sh.min.x && x <= sh.max.x && z >= sh.min.z && z <= sh.max.z) { const top = sh.max.y; if (top <= yRef + step && top > y) { y = top; kind = 'prop'; obj = p; } }
    }
    return { y, kind, obj };
  };
  PH.surfaceHeight = function (x, z) { // highest surface at all (for glider auto-deploy etc.)
    let y = FN.Terrain.heightAt(x, z);
    const s = FN.Structures.groundAt(x, z, 1e9, -1e9); if (s && s.y > y) y = s.y;
    return y;
  };

  // Resolve horizontal collisions for a vertical cylinder (feet at pos.y). Modifies pos. Returns {hit, stepped}
  PH.collideXZ = function (pos, radius, height, out, isBot) {
    out = out || { hit: false, stepUp: -Infinity, ceiling: Infinity };
    out.hit = false; out.stepUp = -Infinity; out.ceiling = Infinity;
    const feet = pos.y, head = pos.y + height;
    const list = FN.Structures.nearby(pos.x, pos.z, radius + 1, []);
    for (const p of list) {
      if (isBot && (p.variant === 'fence' || p.variant === 'railing')) continue;
      const boxes = p.sub ? p.sub : [p.aabb];
      const walkable = p.type === 'floor' || p.type === 'stairs' || p.type === 'roof';
      const stairRamp = p.type === 'stairs' ? FN.Structures.groundAt(pos.x, pos.z, feet + 1.2, -1e9) : null;
      const stairClimb = p.type === 'stairs' && stairRamp && stairRamp.piece === p && stairRamp.y > feet + 0.02 && stairRamp.y <= feet + 1.2;
      for (const b of boxes) {
        if (stairClimb) continue;
        if (walkable && !p.sub) { // floors: only block if we're under them (ceiling) or they are far above step
          if (b.min.y > feet + PH.STEP && b.min.y < head) { if (pos.x > b.min.x - radius && pos.x < b.max.x + radius && pos.z > b.min.z - radius && pos.z < b.max.z + radius) out.ceiling = Math.min(out.ceiling, b.min.y); }
          continue;
        }
        if (p.type === 'stairs' && stairRamp && stairRamp.piece === p && b.max.y <= stairRamp.y + 0.08) continue;
        if (p.type === 'roof' && p.variant !== 'flat') { // roofs are handled as ground; block only if we'd hit the underside
          if (b.min.y > feet + PH.STEP && b.min.y < head && pos.x > b.min.x - radius && pos.x < b.max.x + radius && pos.z > b.min.z - radius && pos.z < b.max.z + radius) out.ceiling = Math.min(out.ceiling, b.min.y);
          continue;
        }
        pushBox(pos, radius, feet, head, b, out);
      }
      if (p.type === 'stairs' && p.aabb && pos.x > p.aabb.min.x - radius && pos.x < p.aabb.max.x + radius && pos.z > p.aabb.min.z - radius && pos.z < p.aabb.max.z + radius) {
        const ramp = stairRamp;
        // Follow the visible ramp in small increments; the old PH.STEP
        // comparison rejected normal stair rises and disabled auto-climbing.
        if (ramp && ramp.piece === p && ramp.y > feet + 0.02 && ramp.y <= feet + 1.2) out.stepUp = Math.max(out.stepUp, ramp.y);
      }
    }
    const near = FN.Props.nearby(pos.x, pos.z, radius + 5, []);
    for (const p of near) {
      const sh = FN.Props.shapeOf(p); if (!sh) continue;
      if (sh.kind === 'cyl') {
        if (feet + PH.STEP >= sh.y1 || head <= sh.y0) continue;
        const dx = pos.x - sh.x, dz = pos.z - sh.z; const d = Math.sqrt(dx * dx + dz * dz); const min = sh.r + radius;
        if (d < min) { const push = min - d; if (d < 1e-4) { pos.x += push; } else { pos.x += dx / d * push; pos.z += dz / d * push; } out.hit = true; }
      } else pushBox(pos, radius, feet, head, sh, out);
    }
    // Keep a direct vehicle pass as a safeguard when a vehicle has moved
    // between prop-hash refreshes. On-foot players must not ghost through it.
    if (FN.Vehicles && FN.Vehicles.list) for (const v of FN.Vehicles.list) {
      const p = v.prop; if (!p || !p.alive || near.indexOf(p) >= 0) continue;
      const sh = FN.Props.shapeOf(p); if (sh && sh.kind === 'box') pushBox(pos, radius, feet, head, sh, out);
    }
    return out;
  };
  function pushBox(pos, radius, feet, head, b, out) {
    if (pos.x <= b.min.x - radius || pos.x >= b.max.x + radius || pos.z <= b.min.z - radius || pos.z >= b.max.z + radius) return;
    if (head <= b.min.y || feet >= b.max.y) return;
    // step-up onto low boxes
    if (b.max.y <= feet + PH.STEP) { out.stepUp = Math.max(out.stepUp, b.max.y); return; }
    // ceiling
    if (b.min.y > feet + PH.STEP) { out.ceiling = Math.min(out.ceiling, b.min.y); return; }
    const px1 = (b.max.x + radius) - pos.x, px2 = pos.x - (b.min.x - radius), pz1 = (b.max.z + radius) - pos.z, pz2 = pos.z - (b.min.z - radius);
    const m = Math.min(px1, px2, pz1, pz2);
    if (m === px1) pos.x += px1; else if (m === px2) pos.x -= px2; else if (m === pz1) pos.z += pz1; else pos.z -= pz2;
    out.hit = true;
  }

  // Unified raycast. opts: {maxT, entities:[{x,y,z,r,h, headY, headR, ref}], skipEntity, noProps, noTerrain}
  PH.raycast = function (ro, rd, maxT, opts) {
    opts = opts || {}; let best = null;

    // Offset the ray origin slightly forward to prevent issues when starting inside a collider.
    const originOffset = 0.2;
    const adjustedOrigin = {
      x: ro.x + rd.x * originOffset,
      y: ro.y + rd.y * originOffset,
      z: ro.z + rd.z * originOffset,
    };
    const adjustedMaxT = maxT - originOffset;
    if (adjustedMaxT <= 0) return null; // Ray is too short after offset

    // terrain: march
    if (!opts.noTerrain) {
      let t = 0; const step0 = 0.75; let prevAbove = adjustedOrigin.y - FN.Terrain.heightAt(adjustedOrigin.x, adjustedOrigin.z);
      while (t < adjustedMaxT) {
        const step = t < 40 ? step0 : (t < 200 ? 2.0 : 5.0); t = Math.min(t + step, adjustedMaxT);
        const x = adjustedOrigin.x + rd.x * t, z = adjustedOrigin.z + rd.z * t; const y = adjustedOrigin.y + rd.y * t;
        if (!FN.Terrain.inBounds(x, z)) { if (y < 0) { best = { t: t + originOffset, kind: 'terrain' }; } break; }
        const h = FN.Terrain.heightAt(x, z); const above = y - h;
        if (above <= 0) { // bisect
          let lo = t - step, hi = t; for (let i = 0; i < 5; i++) { const mid = (lo + hi) / 2; const my = adjustedOrigin.y + rd.y * mid - FN.Terrain.heightAt(adjustedOrigin.x + rd.x * mid, adjustedOrigin.z + rd.z * mid); if (my <= 0) hi = mid; else lo = mid; }
          best = { t: hi + originOffset, kind: 'terrain' }; break;
        }
        // water surface (sea) hit for effects
        prevAbove = above;
      }
    }
    const limit = best ? best.t - originOffset : adjustedMaxT;
    const sh = FN.Structures.raycast(adjustedOrigin, rd, limit); if (sh && (!best || sh.t + originOffset < best.t)) best = { t: sh.t + originOffset, kind: 'structure', piece: sh.piece };
    if (!opts.noProps) { const ph = FN.Props.raycast(adjustedOrigin, rd, best ? best.t - originOffset : adjustedMaxT, { skipProp: opts.skipProp }); if (ph && (!best || ph.t + originOffset < best.t)) best = { t: ph.t + originOffset, kind: 'prop', prop: ph.prop }; }
    if (opts.entities) {
      for (const e of opts.entities) {
        if (e === opts.skipEntity || e.dead) continue;
        const lim = best ? best.t - originOffset : adjustedMaxT;
        // head sphere first
        const hy = e.y + (e.crouch ? 1.25 : 1.72);
        const th = U.raySphere(adjustedOrigin, rd, { x: e.x, y: hy, z: e.z }, 0.2, lim);
        if (th >= 0) { best = { t: th + originOffset, kind: 'entity', entity: e, head: true }; continue; }
        const tb = U.rayCapsuleY(adjustedOrigin, rd, e.x, e.z, e.y + 0.25, e.y + (e.crouch ? 1.15 : 1.6), 0.38, lim);
        if (tb >= 0) best = { t: tb + originOffset, kind: 'entity', entity: e, head: false };
      }
    }
    if (best) best.point = { x: ro.x + rd.x * best.t, y: ro.y + rd.y * best.t, z: ro.z + rd.z * best.t };
    return best;
  };
  // Line of sight between two points (terrain + structures only, cheap)
  PH.lineOfSight = function (a, b) {
    const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z; const d = Math.sqrt(dx * dx + dy * dy + dz * dz); if (d < 0.01) return true;
    const rd = { x: dx / d, y: dy / d, z: dz / d };
    const h = PH.raycast(a, rd, d - 0.5, { noProps: true });
    return !h;
  };
  FN.Physics = PH;
})();