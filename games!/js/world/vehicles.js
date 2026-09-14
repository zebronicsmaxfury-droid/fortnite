// Drivable vehicles: cars, trucks, tractors. Player and bots can enter/exit.
window.FN = window.FN || {};
(function () {
  const C = FN.CONFIG, U = FN.U;
  const V = { list: [], speedometer: 0, speedometerKph: 0 };

  // Different vehicles have different stats
  const TYPES = {
    car:     { maxSpeed: 32, accel: 22, brake: 30, turn: 1.1, name: 'Car',     width: 4.3, depth: 2.0, height: 2.0, seats: 3, groundOffset: 0.5 },
    truck:   { maxSpeed: 24, accel: 16, brake: 24, turn: 0.85, name: 'Truck',   width: 7.4, depth: 2.4, height: 3.0, seats: 3, groundOffset: -0.04 },
    tractor: { maxSpeed: 18, accel: 13, brake: 18, turn: 1.0, name: 'Tractor', width: 3.0, depth: 2.0, height: 3.0, seats: 3, groundOffset: 0.5 },
  };

  V.init = function () {
    V.list = [];
    const placed = []; // world-space footprints of vehicles already spawned
    for (const p of FN.Props.list) {
      if (p.alive && p.def.drivable) {
        if (FN.Match && FN.Match.phase === 'island' && Math.hypot(p.x - (-1125), p.z - 1125) < 110) continue;
        let shape = FN.Props.shapeOf(p);
        if (shape && shape.kind === 'box') {
          // Only relocate a vehicle when its footprint really overlaps an
          // already-spawned one; then slide it to the next free spot instead
          // of stacking vehicles inside each other.
          if (V.overlapsAny(shape, placed, 0.5)) {
            const spot = V.findFreeSpot(p, shape, placed);
            if (spot) {
              const t = TYPES[p.def.vehicleType];
              p.x = spot.x; p.z = spot.z;
              if (t) p.y = FN.Terrain.heightAt(p.x, p.z) + t.groundOffset;
              shape = FN.Props.shapeOf(p);
              FN.Props.writeInstance(p);
            }
          }
          placed.push(shape);
        }
        V.list.push({ prop: p, type: p.def.vehicleType, def: TYPES[p.def.vehicleType], driver: null, speed: 0, steer: 0, wheelSpin: 0, crashT: 0, fuel: 100, hornT: 0, coasting: false, passengers: [], callout: null });
      }
    }
  };

  // Axis-aligned XZ overlap test between a candidate footprint and placed ones.
  V.overlapsAny = function (box, list, margin) {
    for (const o of list) {
      if (box.max.x + margin > o.min.x && box.min.x - margin < o.max.x && box.max.z + margin > o.min.z && box.min.z - margin < o.max.z) return true;
    }
    return false;
  };

  // Find a free spot for a vehicle whose footprint overlaps another one.
  // Keeps the original position when it is free; otherwise tries expanding
  // rings of offsets and returns the first spot that overlaps nothing.
  V.findFreeSpot = function (p, shape, placed) {
    const w = shape.max.x - shape.min.x, d = shape.max.z - shape.min.z;
    const step = Math.max(w, d) + 2;
    const cands = [[0, 0]];
    for (let r = 1; r <= 4; r++) {
      const off = step * r;
      cands.push([off, 0], [-off, 0], [0, off], [0, -off], [off, off], [-off, off], [off, -off], [-off, -off]);
    }
    const lim = C.WORLD_SIZE / 2 - 10;
    for (const c of cands) {
      const nx = p.x + c[0], nz = p.z + c[1];
      if (Math.abs(nx) > lim || Math.abs(nz) > lim) continue;
      const test = { min: { x: shape.min.x + c[0], z: shape.min.z + c[1] }, max: { x: shape.max.x + c[0], z: shape.max.z + c[1] } };
      if (!V.overlapsAny(test, placed, 0.5)) return { x: nx, z: nz };
    }
    return null;
  };

  V.nearest = function (x, z, maxDist) {
    maxDist = maxDist || 3;
    let best = null, bestD = Infinity;
    for (const v of V.list) {
      if (v.driver) continue;
      const p = v.prop;
      const d = U.dist2(x, z, p.x, p.z);
      const reach = maxDist <= 3 ? Math.max(maxDist, v.def.width * 0.5 + 0.75) : maxDist;
      if (d < reach * reach && d < bestD) { bestD = d; best = v; }
    }
    return best;
  };

  V.aimed = function (x, z, ro, rd, maxDist) {
    maxDist = maxDist || 4;
    const hit = FN.Physics.raycast(ro, rd, maxDist + 1, { noTerrain: true });
    if (hit && hit.kind === 'prop' && hit.prop && hit.prop.drivable) {
      const vehicle = V.list.find(v => v.prop === hit.prop && (!v.driver || (FN.Match && FN.Match.mode !== 'solo' && v.driver.team === 0)));
      if (vehicle && U.dist2(x, z, vehicle.prop.x, vehicle.prop.z) <= maxDist * maxDist) return vehicle;
    }
    let best = null, bestDot = 0.82;
    for (const vehicle of V.list) {
      if (vehicle.driver && !(FN.Match && FN.Match.mode !== 'solo' && vehicle.driver.team === 0)) continue;
      const dx = vehicle.prop.x - x, dz = vehicle.prop.z - z, d = Math.sqrt(dx * dx + dz * dz);
      if (d > maxDist) continue;
      const dot = (dx * rd.x + dz * rd.z) / Math.max(0.001, d);
      if (dot > bestDot) { bestDot = dot; best = vehicle; }
    }
    return best;
  };

  V.enter = function (vehicle, driver) {
    if (!vehicle || vehicle.driver) return false;
    vehicle.driver = driver;
    vehicle.speed = 0;
    vehicle.steer = 0;
    vehicle.coasting = false;
    vehicle.wheelSpin = 0;
    vehicle.crashT = 0;
    return true;
  };

  V.exit = function (vehicle) {
    if (!vehicle) return;
    vehicle.driver = null;
    // Everyone leaves when the driver exits. Clear the seat list immediately
    // so this vehicle can be called and boarded again on the next use.
    for (const passenger of vehicle.passengers) {
      if (passenger.vehicle === vehicle) passenger.vehicle = null;
      passenger.passenger = false;
      if (passenger.state === 'passenger') { passenger.state = 'roam'; passenger.goal = null; }
      // Always restore visibility: the passenger's state may have been
      // overwritten while riding (e.g. 'engage' on damage), which used to skip
      // this and leave the bot permanently invisible after leaving the vehicle.
      if (passenger.char) passenger.char.group.visible = true;
    }
    vehicle.passengers.length = 0;
    // Keep the current velocity after the driver leaves. V.update() will
    // apply the normal rolling slowdown until the vehicle comes to rest.
    vehicle.coasting = Math.abs(vehicle.speed) > 0.1;
  };

  // Update a vehicle being driven - input is read from I (real input) unless virtualInput is provided (bots)
  V.updateDriving = function (v, dt, virtualInput) {
    const type = v.def;
    const p = v.prop;
    const I = virtualInput || FN.Input;

    v.crashT = Math.max(0, v.crashT - dt);
    let throttle = 0;
    if (I.isDown(C.KEYS.forward)) throttle += 1;
    if (I.isDown(C.KEYS.back)) throttle -= 1;

    let steerInput = 0;
    if (I.isDown(C.KEYS.left)) steerInput -= 1;
    if (I.isDown(C.KEYS.right)) steerInput += 1;

    if (throttle > 0) v.speed += type.accel * dt;
    else if (throttle < 0) v.speed -= type.brake * dt;
    else { v.speed *= (1 - 2.2 * dt); if (Math.abs(v.speed) < 0.1) v.speed = 0; }
    v.speed = U.clamp(v.speed, -type.maxSpeed * 0.45, type.maxSpeed);

    const steerFactor = Math.min(Math.abs(v.speed) / Math.max(2, type.maxSpeed * 0.35), 1);
    const steerTarget = steerInput * 0.48;
    v.steer = U.lerp(v.steer, steerTarget, Math.min(1, 4 * dt));
    const direction = v.speed < 0 ? -1 : 1;
    const yaw = p.rot - steerInput * type.turn * steerFactor * direction * dt;
    const fx = Math.cos(yaw), fz = -Math.sin(yaw);
    const travel = Math.abs(v.speed * dt);
    const moveFx = fx * direction, moveFz = fz * direction;
    let blocked = false;
    if (travel > 0.02) {
      const front = type.width * 0.5 + 0.2;
      const hit = FN.Physics.raycast({ x: p.x + moveFx * front, y: p.y + 0.85, z: p.z + moveFz * front }, { x: moveFx, y: 0, z: moveFz }, travel + 0.9, { noTerrain: true, skipProp: p });
      if (hit && (hit.kind === 'structure' || (hit.kind === 'prop' && hit.prop !== p))) {
        blocked = true;
        if (v.crashT <= 0) {
          // Vehicles still stop against world objects, but driving into them
          // no longer deals damage.
          v.crashT = 0.3;
        }
        v.speed *= 0.12;
      }
    }
    const newX = blocked ? p.x : p.x + fx * v.speed * dt;
    const newZ = blocked ? p.z : p.z + fz * v.speed * dt;

    const lim = C.WORLD_SIZE / 2 - 8;
    p.x = U.clamp(newX, -lim, lim);
    p.z = U.clamp(newZ, -lim, lim);
    p.y = FN.Terrain.heightAt(p.x, p.z) + v.def.groundOffset;
    p.rot = yaw;
    v.wheelSpin = (v.wheelSpin || 0) + v.speed * dt / 0.45;
    p.wheelSpin = v.wheelSpin;

    FN.Props.writeInstance(p);

    V.speedometer = Math.abs(v.speed);
    V.speedometerKph = Math.round(Math.abs(v.speed) * 3.6);
  };

  V.update = function (dt) {
    // Driverless vehicles continue moving with their last velocity instead
    // of stopping instantly when their driver exits.
    for (const v of V.list) {
      if (!v.coasting || v.driver || !v.prop.alive) continue;
      V.updateDriving(v, dt, { isDown: function () { return false; } });
      if (Math.abs(v.speed) <= 0.1) { v.speed = 0; v.coasting = false; v.steer = 0; }
    }
  };
  V.enterPassenger = function (vehicle, passenger) {
    if (!vehicle || !passenger || !vehicle.driver || vehicle.passengers.indexOf(passenger) >= 0) return false;
    // Squad vehicles always accept the three teammates in duo/squad mode,
    // regardless of the vehicle model's visual size.
    const maxPassengers = FN.Match && FN.Match.mode !== 'solo' ? 3 : vehicle.def.seats;
    if (vehicle.passengers.length >= maxPassengers) return false;
    vehicle.passengers.push(passenger); passenger.vehicle = vehicle; passenger.passenger = true; return true;
  };
  V.exitPassenger = function (vehicle, passenger) {
    if (!vehicle || !passenger) return;
    const i = vehicle.passengers.indexOf(passenger); if (i >= 0) vehicle.passengers.splice(i, 1);
    if (passenger.vehicle === vehicle) passenger.vehicle = null; passenger.passenger = false;
  };

  FN.Vehicles = V;
})();
