// Renderer, scene, camera, main loop + adaptive quality manager.
// Optimization pass: Engine owns a quality manager (presets LOW/MEDIUM/HIGH, auto mode w/ hysteresis).
// LOW is tuned for a low-end iGPU (Intel HD Sandy Bridge): lower render scale, fewer particles,
// no grass by default, fewer full-mesh bots, lower terrain detail + draw distance.
window.FN = window.FN || {};
(function () {
  const E = { time: 0, frame: 0, fps: 0, dtAvg: 0.016, quality: { shadows: false, pixelRatio: 1 }, renderScene: null };

  const PRESETS = {
    potato: { label:'POTATO', renderScale:0.30, particleScale:0.1, grass:false, clouds:false, cloudsCount:0,
              botNearRadius:100, botPool:16, farTick:4.0, botStagger:8, terrainLow:40,  terrainHidden:300,  propDensity:0.2, grassN:0,    maxDebris:10,  maxPuff:5 },
    low:    { label:'LOW',    renderScale:0.55, particleScale:0.3,  grass:false, clouds:true,  cloudsCount:4,
              botNearRadius:230, botPool:40, farTick:2.5, botStagger:4, terrainLow:70,  terrainHidden:550,  propDensity:0.45, grassN:100,  maxDebris:50,  maxPuff:20 },
    medium: { label:'MEDIUM', renderScale:0.75, particleScale:0.6,  grass:true,  clouds:true,  cloudsCount:16,
              botNearRadius:400, botPool:96, farTick:1.8, botStagger:3, terrainLow:120, terrainHidden:1200, propDensity:0.55, grassN:500,  maxDebris:150, maxPuff:60 },
    high:   { label:'HIGH',   renderScale:1,    particleScale:1,    grass:true,  clouds:true,  cloudsCount:36,
              botNearRadius:600, botPool:190, farTick:1.0, botStagger:1, terrainLow:180, terrainHidden:2000, propDensity:1.0, grassN:1000, maxDebris:450, maxPuff:160 },
    maxed:  { label:'MAXED',  renderScale:1,    particleScale:1,    grass:true,  clouds:true,  cloudsCount:64,
          botNearRadius:900, botPool:260, farTick:0.5, botStagger:0, terrainLow:240, terrainHidden:3000, propDensity:1.0, grassN:1600, maxDebris:700, maxPuff:240 },
  };
  E.PRESETS = PRESETS;
  const RENDER_DISTANCE = {
    potato: { terrainHidden: 400, botNearRadius: 150, loot: 35 },
    low: { terrainHidden: 700, botNearRadius: 230, loot: 60 },
    medium: { terrainHidden: 1200, botNearRadius: 400, loot: 120 },
    high: { terrainHidden: 2000, botNearRadius: 600, loot: 160 },
    maxed: { terrainHidden: 3000, botNearRadius: 900, loot: 220 },
  };
  E.RENDER_DISTANCE = RENDER_DISTANCE;
  E.quality = Object.assign({ preset:'potato', auto:true, shadows:false, renderDistance:'high' }, PRESETS.potato);
  E.quality.terrainHidden = RENDER_DISTANCE.high.terrainHidden; E.quality.botNearRadius = RENDER_DISTANCE.high.botNearRadius; E.quality.lootRange = RENDER_DISTANCE.high.loot;

  E.setPreset = function (name, applySys) {
    if (!PRESETS[name]) return;
    E.quality.preset = name;
    const p = PRESETS[name]; const q = E.quality;
    q.renderScale = p.renderScale; q.particleScale = p.particleScale; q.grass = p.grass; q.clouds = p.clouds;
    q.cloudsCount = p.cloudsCount; q.botNearRadius = p.botNearRadius; q.botPool = p.botPool; q.farTick = p.farTick;
    q.botStagger = p.botStagger; q.terrainLow = p.terrainLow; q.terrainHidden = p.terrainHidden; q.propDensity = p.propDensity;
    q.grassN = p.grassN; q.maxDebris = p.maxDebris; q.maxPuff = p.maxPuff;
    if (q.renderDistance && RENDER_DISTANCE[q.renderDistance]) { q.terrainHidden = RENDER_DISTANCE[q.renderDistance].terrainHidden; q.botNearRadius = RENDER_DISTANCE[q.renderDistance].botNearRadius; }
    if (applySys !== false) E.applyQuality();
  };
  E.setRenderDistance = function (name) {
    const d = RENDER_DISTANCE[name] || RENDER_DISTANCE.potato;
    E.quality.renderDistance = name in RENDER_DISTANCE ? name : 'potato';
    E.quality.terrainHidden = d.terrainHidden;
    E.quality.botNearRadius = d.botNearRadius;
    E.quality.lootRange = d.loot;
    if (E.Terrain && E.Terrain.setQuality) E.Terrain.setQuality(E.quality.terrainLow, d.terrainHidden);
    if (FN.Bots && FN.Bots.setQuality) FN.Bots.setQuality(d.botNearRadius, E.quality.botPool, E.quality.farTick, E.quality.botStagger);
    if (FN.Loot && FN.Loot.setQuality) FN.Loot.setQuality(d.loot);
  };
  // Re-read the saved setting at major match transitions. This is useful when
  // the setting was changed in the lobby or persisted by a previous session.
  E.reloadRenderDistance = function () {
    const saved = FN.Settings && FN.Settings.get ? FN.Settings.get('renderDistance') : E.quality.renderDistance;
    const name = saved && RENDER_DISTANCE[saved] ? saved : 'potato';
    E.setRenderDistance(name);
    if (E.Terrain && E.Terrain.updateLOD && E.camera) E.Terrain.updateLOD(E.camera.position);
    return name;
  };

  // Push current quality into every subsystem (guarded so early calls are safe).
  E.applyQuality = function () {
    const q = E.quality;
    E._wantScale = q.renderScale;
    if (E.renderer) E.resize();
    if (FN.Grass && FN.Grass.setQuality) FN.Grass.setQuality(q.grass, q.grassN);
    if (FN.FX && FN.FX.setScale) FN.FX.setScale(q.maxDebris, q.maxPuff, q.particleScale);
    if (FN.Bots && FN.Bots.setQuality) FN.Bots.setQuality(q.botNearRadius, q.botPool, q.farTick, q.botStagger);
    if (FN.Sky && FN.Sky.setQuality) FN.Sky.setQuality(q.clouds, q.cloudsCount);
    if (FN.Terrain && FN.Terrain.setQuality) FN.Terrain.setQuality(q.terrainLow, q.terrainHidden);
    if (FN.Loot && FN.Loot.setQuality) FN.Loot.setQuality(q.preset === 'potato' ? 35 : (q.preset === 'low' ? 60 : 120));
  };

  // Auto adaptive: measure FPS slowly, apply with hysteresis + delay so it never oscillates.
  // Upgrade threshold raised to 50 fps (conservative), downgrade lowered to 28 fps (aggressive)
  // so Intel HD Sandy Bridge machines stay at potato/low and never stutter.
  E._qAcc = 0; E._qHoldT = 0;
  E.updateAdaptive = function (dt) {
    if (!E.quality.auto) { E._qAcc = 0; E._qHoldT = 0; return; }
    E._qAcc += dt;
    if (E._qAcc < 1.5) return;
    E._qAcc = 0;
    const fps = E.fps, order = ['potato', 'low', 'medium', 'high'];
    const i = order.indexOf(E.quality.preset);
    if (fps >= 50 && i < order.length - 1) {
      E._qHoldT += 1.5;
      if (E._qHoldT >= 6.0) { E._qHoldT = 0; E.setPreset(order[i + 1]); }
    } else if (fps > 0 && fps < 28 && i > 0) {
      E._qHoldT -= 1.5;
      if (E._qHoldT <= -1.5) { E._qHoldT = 0; E.setPreset(order[i - 1]); }
    } else {
      E._qHoldT = 0;
    }
  };

  E.init = function () {
    const canvas = document.getElementById('game');
    E.canvas = canvas;
    E.renderer = new THREE.WebGLRenderer({ canvas, antialias:false, powerPreference:'high-performance', stencil:false, depth:true, logarithmicDepthBuffer:false });
    E.renderer.setPixelRatio(1);
    E.renderer.shadowMap.enabled = false; E.renderer.shadowMap.type = THREE.PCFShadowMap;
    E.renderer.outputColorSpace = THREE.SRGBColorSpace;
    E.renderer.toneMapping = THREE.NoToneMapping;
    // Reduce far plane — Intel HD Sandy Bridge has limited fillrate; shorter far = fewer overdraw pixels.
    E.scene = new THREE.Scene();
    E.camera = new THREE.PerspectiveCamera(FN.CONFIG.CAMERA.FOV, 1, 0.1, 1500);
    E.scene.add(E.camera);
    E.resize();
    window.addEventListener('resize', E.resize);
    E.clock = performance.now();
    E._fpsAcc = 0; E._fpsN = 0;
  };

  // Render into a buffer scaled by the preset; CSS upscales to full-screen (a big iGPU pixel saver).
  E.resize = function () {
    const w = window.innerWidth, h = window.innerHeight;
    const s = E._wantScale || (E.quality ? E.quality.renderScale : 1);
    const bw = Math.max(64, Math.round(w * s)), bh = Math.max(64, Math.round(h * s));
    E.renderer.setPixelRatio(1);
    E.renderer.setSize(bw, bh, false);
    E.camera.aspect = w / h; E.camera.updateProjectionMatrix();
  };

  E.setShadows = function (on) { E.quality.shadows = on; E.renderer.shadowMap.enabled = on; if (FN.Sky && FN.Sky.sun) FN.Sky.sun.castShadow = on; E.scene.traverse((o) => { if (o.material) o.material.needsUpdate = true; }); };

  E.start = function (tick) {
    E.tick = tick;
    const loop = () => {
      const now = performance.now(); let dt = (now - E.clock) / 1000; E.clock = now;
      if (dt > 0.1) dt = 0.1; if (dt <= 0) dt = 0.001; if (E.fixedDt) dt = E.fixedDt;
      E.time += dt; E.frame++;
      E._fpsAcc += dt; E._fpsN++; if (E._fpsAcc >= 0.5) { E.fps = Math.round(E._fpsN / E._fpsAcc); E._fpsAcc = 0; E._fpsN = 0; }
      E.dtAvg = E.dtAvg * 0.95 + dt * 0.05;
      E.updateAdaptive(dt);
      try { E.tick(dt); } catch (err) { console.error('tick error', err); }
      if (!E.renderSkip || E.frame % E.renderSkip === 0) E.renderer.render(E.renderScene || E.scene, E.camera);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  };
  FN.Engine = E;
})();
