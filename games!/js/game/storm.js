// The Storm: shrinking safe zone with phases, damage ticks, purple wall and sky tint.
window.FN = window.FN || {};
(function () {
  const C = FN.CONFIG, U = FN.U;
  const ST = { active: false, cx: 0, cz: 0, radius: C.STORM.START_RADIUS, next: null, phase: 0, timer: 0, shrinking: false, dps: 0, tickT: 0, finished: false };
  ST.init = function (scene) {
    ST.scene = scene;
    const geo = new THREE.CylinderGeometry(1, 1, 1400, 128, 1, true);
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false,
      uniforms: { time: { value: 0 }, color: { value: new THREE.Color(0xa050ff) }, radius: { value: 1000 } },
      vertexShader: 'varying vec2 vUv; varying float vY; void main(){ vUv = uv; vY = position.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `varying vec2 vUv; varying float vY; uniform float time; uniform vec3 color; uniform float radius;
        float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
        float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }
        void main(){ float circ = radius * 6.2832 / 60.0; vec2 p = vec2(vUv.x * circ, vY * 0.02 - time * 0.15);
          float n = noise(p * 1.5) * 0.6 + noise(p * 4.0 + time * 0.3) * 0.4; float h = clamp((vY + 700.0) / 1400.0, 0.0, 1.0);
          float a = (0.28 + n * 0.35) * (1.0 - smoothstep(0.55, 1.0, h)) ; gl_FragColor = vec4(color * (0.8 + n * 0.5), a * 0.75); }`
    });
    ST.wall = new THREE.Mesh(geo, mat); ST.wall.visible = false; ST.wall.frustumCulled = false; ST.wall.renderOrder = 4; scene.add(ST.wall); ST.mat = mat;
  };
  function pickCenter(cx, cz, rCur, rNext) {
    const M = FN.MapData; let best = null;
    for (let i = 0; i < 60; i++) {
      const a = U.rand() * Math.PI * 2, d = Math.sqrt(U.rand()) * Math.max(0, rCur - rNext) * 0.98;
      const x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
      const land = U.polyEdgeDist(x, z, M.coast);
      if (land > Math.min(rNext * 0.6, 120)) return { x, z };
      if (!best || land > best.land) best = { x, z, land };
    }
    return best || { x: cx, z: cz };
  }
  ST.start = function () {
    ST.active = true; ST.phase = 0; ST.startScale = 0.88 + U.rand() * 0.24; ST.cx = (U.rand() - 0.5) * 520; ST.cz = (U.rand() - 0.5) * 520; ST.radius = C.STORM.START_RADIUS * ST.startScale; ST.shrinking = false; ST.finished = false;
    const ph = C.STORM.PHASES[0]; ST.timer = ph.wait; ST.dps = ph.dps;
    const c = pickCenter(ST.cx, ST.cz, ST.radius, ph.r * ST.startScale); ST.next = { cx: c.x, cz: c.z, radius: ph.r * ST.startScale }; ST.from = { cx: ST.cx, cz: ST.cz, radius: ST.radius };
    ST.wall.visible = true; ST.warned = false;
  };
  ST.stop = function () { ST.active = false; ST.wall.visible = false; FN.Sky.setStorm(0, ST.scene); };
  ST.update = function (dt) {
    if (!ST.active) return;
    ST.mat.uniforms.time.value = FN.Engine.time;
    const phases = C.STORM.PHASES;
    if (!ST.finished) {
      ST.timer -= dt;
      if (!ST.shrinking) {
        if (!ST.warned && ST.timer < 30 && FN.HUD) { ST.warned = true; FN.HUD.notify('THE STORM IS CLOSING IN', 3); if (FN.Audio) FN.Audio.play('storm_warning', null, 0.5); }
        if (ST.timer <= 0) { ST.shrinking = true; ST.timer = phases[ST.phase].shrink; ST.shrinkTotal = ST.timer; ST.from = { cx: ST.cx, cz: ST.cz, radius: ST.radius }; if (FN.HUD) FN.HUD.notify('THE STORM IS SHRINKING', 3); }
      } else {
        const f = 1 - U.clamp(ST.timer / ST.shrinkTotal, 0, 1);
        ST.cx = U.lerp(ST.from.cx, ST.next.cx, f); ST.cz = U.lerp(ST.from.cz, ST.next.cz, f); ST.radius = U.lerp(ST.from.radius, ST.next.radius, f);
        if (ST.timer <= 0) {
          ST.cx = ST.next.cx; ST.cz = ST.next.cz; ST.radius = ST.next.radius; ST.shrinking = false; ST.phase++;
          if (ST.phase >= phases.length) { ST.finished = true; ST.next = null; ST.dps = 10; }
          else { const ph = phases[ST.phase]; ST.timer = ph.wait; ST.dps = ph.dps; const nextRadius = ph.r * ST.startScale; const c = ST.radius <= 0.1 ? { x: ST.cx, z: ST.cz } : pickCenter(ST.cx, ST.cz, ST.radius, nextRadius); ST.next = { cx: c.x, cz: c.z, radius: nextRadius }; ST.warned = false; }
        }
      }
    }
    // wall
    ST.wall.position.set(ST.cx, 0, ST.cz); ST.wall.scale.set(Math.max(ST.radius, 0.5), 1, Math.max(ST.radius, 0.5)); ST.mat.uniforms.radius.value = ST.radius;
    // damage ticks
    ST.tickT += dt;
    if (ST.tickT >= 1) {
      ST.tickT -= 1;
      const ents = FN.Match ? FN.Match.entities : [];
      for (const e of ents) {
        if (e.dead) continue; const inside = U.dist2sq(e.x, e.z, ST.cx, ST.cz) < ST.radius * ST.radius; e.inStorm = !inside;
        if (!inside && FN.Match.phase === 'game') { FN.Combat.applyDamage(e, ST.dps, null, { storm: true }); if (e.isPlayer && FN.Audio) FN.Audio.play('storm_tick', null, 0.5); }
      }
    }
    // sky tint / audio for the player
    const PL = FN.Player; if (PL) { const dOut = U.dist2(PL.pos.x, PL.pos.z, ST.cx, ST.cz) - ST.radius; PL.inStorm = dOut > 0; const mix = U.clamp(dOut / 60, 0, 1) * 0.85 + (dOut > -80 && dOut <= 0 ? 0.05 * (1 + dOut / 80) : 0); ST.mix = U.damp(ST.mix || 0, mix, 3, dt); FN.Sky.setStorm(ST.mix, ST.scene); if (FN.Audio) FN.Audio.loop('storm', dOut > -120, { gain: U.clamp(0.08 + (dOut + 120) / 200, 0, 0.5), freq: 150 }); }
  };
  ST.timerText = function () { return U.fmtTime(ST.timer); };
  ST.isSafe = (x, z) => !ST.active || U.dist2sq(x, z, ST.cx, ST.cz) < ST.radius * ST.radius;
  ST.safeTarget = () => ST.next ? ST.next : { cx: ST.cx, cz: ST.cz, radius: ST.radius };
  FN.Storm = ST;
})();
