// World assembly: terrain, props scattering, POIs, minimap render.
window.FN = window.FN || {};
(function () {
  const C = FN.CONFIG, U = FN.U;
  const W = { built: false };

  function addShacks() {
    const M = FN.MapData; const r = U.mulberry32(555); let added = 0, tries = 0;
    while (added < 16 && tries < 400) {
      tries++;
      const x = (r() - 0.5) * 2200, z = (r() - 0.5) * 2200;
      if (U.polyEdgeDist(x, z, M.coast) < 120) continue;
      let ok = true; for (const p of M.pois) { if (U.dist2(x, z, p.p[0], p.p[1]) < (p.r || 120) + 150) { ok = false; break; } }
      if (!ok) continue;
      const L = M.lake; if (U.dist2(x, z, L.x, L.z) < 320) continue;
      let nearRiver = false; for (const rv of M.rivers) if (U.polylineDist(x, z, rv.pts) < 60) nearRiver = true; if (nearRiver) continue;
      if (M.roadDist(x, z) < 30) continue;
      M.pois.push({ id: 'shack' + added, name: '', p: [x, z], r: 24, kind: 'shack' }); added++;
    }
  }

  W.build = function (scene, progress) {
    const M = FN.MapData, T = FN.Terrain;
    U.setSeed(20171026);
    addShacks();
    progress && progress('Generating island...', 0.05);
    T.generate();
    progress && progress('Painting ground...', 0.25);
    // Reduced from 2048/4096 to 1024 — Intel HD Sandy Bridge has very limited shared VRAM;
    // lower resolution is barely visible at 0.5 render scale and loads ~4× faster on Pentium G630.
    T.paint(1024); T.paintRoads(1024);
    progress && progress('Building terrain mesh...', 0.45);
    T.buildMesh(scene);
    FN.Structures.init(scene); FN.Props.init(scene); FN.Props.defineAll();
    progress && progress('Building locations...', 0.55);
    FN.POI.buildAll();
    progress && progress('Planting forests...', 0.7);
    W.scatter();
    FN.Structures.flush();
    W.built = true;
    progress && progress('Done', 1);
  };

  // Scatter trees / rocks / bushes over the island avoiding POIs, roads, water.
  W.scatter = function () {
    const M = FN.MapData, T = FN.Terrain, P = FN.Props; const r = U.mulberry32(8080);
    const clearOf = (x, z) => {
      for (const p of M.pois) { if (p.r > 0 && U.dist2(x, z, p.p[0], p.p[1]) < p.r * 0.92) return false; }
      if (M.roadDist(x, z) < 9.5) return false;
      for (const pt of M.paint) { if (Math.abs(x - pt.x) < pt.w / 2 + 4 && Math.abs(z - pt.z) < pt.d / 2 + 4) return false; }
      return true;
    };
    let trees = 0, rocks = 0, bushes = 0;
    // Prop density scales with the quality preset — the instanced prop meshes are the
    // single biggest triangle budget (~2M tris at full density), so LOW cuts them hard.
    const dens = (FN.Engine && FN.Engine.quality && FN.Engine.quality.propDensity) ? FN.Engine.quality.propDensity : 1;
    const N = Math.round(26000 * dens);
    for (let i = 0; i < N; i++) {
      const x = (r() - 0.5) * 2500, z = (r() - 0.5) * 2500;
      const y = T.heightAt(x, z); if (y < 2.5) continue; if (T.waterAt(x, z)) continue;
      const slope = T.slopeAt(x, z);
      const n = U.fbm(x * 0.003 + 40, z * 0.003 + 40, 3) * 0.5 + 0.5;
      // forest zones
      let forest = null; for (const f of M.forests) { const d = U.dist2(x, z, f.x, f.z); if (d < f.r) { if (f.ring && d < 75) continue; forest = f; break; } }
      const roll = r();
      if (forest) {
        if (roll < forest.density * 0.55 && slope < 0.9 && clearOf(x, z)) { P.add(forest.type === 'dead' ? 'deadtree' : forest.type, x, z, { scale: 0.85 + r() * 0.5 }); trees++; continue; }
        if (roll < forest.density * 0.6) { P.add('bush', x, z, { scale: 0.8 + r() * 0.6 }); bushes++; continue; }
      }
      if (!clearOf(x, z)) continue;
      if (slope > 0.75) { if (roll < 0.18) { P.add(roll < 0.03 ? 'bigrock' : 'rock', x, z, { scale: 0.7 + r() * 0.9 }); rocks++; } continue; }
      const treeP = 0.06 + n * 0.16;
      if (roll < treeP) { const pine = U.fbm(x * 0.002 + 9, z * 0.002 + 9, 2) > 0.15; P.add(pine ? 'pine' : 'tree', x, z, { scale: 0.85 + r() * 0.5 }); trees++; }
      else if (roll < treeP + 0.03) { P.add('rock', x, z, { scale: 0.6 + r() * 0.8 }); rocks++; }
      else if (roll < treeP + 0.09) { P.add('bush', x, z, { scale: 0.7 + r() * 0.6 }); bushes++; }
    }
    // pylons line
    for (let k = 0; k < 8; k++) { const x = -1000 + k * 260, z = -560 + k * 60; if (T.heightAt(x, z) > 3 && clearOf(x, z)) P.add('pylon', x, z, { rot: 0.4 }); }
    W.counts = { trees, rocks, bushes };
  };

  // Which POI name applies at a position (for the HUD)
  W.locationName = function (x, z) {
    let best = null, bd = 1e9;
    for (const p of FN.MapData.pois) { if (!p.name || p.hidden) continue; const rr = p.kind === 'lake' ? 260 : p.r + 90; const d = U.dist2(x, z, p.p[0], p.p[1]); if (d < rr && d < bd) { bd = d; best = p.name; } }
    return best;
  };

  // Top-down render of the island into a canvas (map image)
  W.renderMap = function (renderer, scene, size) {
    size = size || 2048;
    const rt = new THREE.WebGLRenderTarget(size, size, { colorSpace: THREE.SRGBColorSpace });
    const half = C.WORLD_SIZE / 2;
    const cam = new THREE.OrthographicCamera(-half, half, half, -half, 1, 3000);
    cam.position.set(0, 1500, 0); cam.up.set(0, 0, -1); cam.lookAt(0, 0, 0); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
    const clouds = scene.getObjectByName('clouds'); const sky = FN.Sky.dome; const cv = clouds ? clouds.visible : true; if (clouds) clouds.visible = false; if (sky) sky.visible = false;
    const fog = scene.fog; scene.fog = null; const oldBg = scene.background; scene.background = new THREE.Color(0x1b4f8f);
    const shadows = renderer.shadowMap.enabled; renderer.shadowMap.enabled = false;
    renderer.setRenderTarget(rt); renderer.render(scene, cam); renderer.setRenderTarget(null);
    renderer.shadowMap.enabled = shadows; scene.fog = fog; scene.background = oldBg; if (clouds) clouds.visible = cv; if (sky) sky.visible = true;
    const buf = new Uint8Array(size * size * 4); renderer.readRenderTargetPixels(rt, 0, 0, size, size, buf);
    const canvas = document.createElement('canvas'); canvas.width = size; canvas.height = size; const ctx = canvas.getContext('2d');
    const img = ctx.createImageData(size, size);
    // flip vertically
    for (let y = 0; y < size; y++) { const src = (size - 1 - y) * size * 4, dst = y * size * 4; img.data.set(buf.subarray(src, src + size * 4), dst); }
    ctx.putImageData(img, 0, 0);
    // stylize: slight saturation boost + vignette-free
    ctx.globalCompositeOperation = 'overlay'; ctx.fillStyle = 'rgba(120,200,90,0.12)'; ctx.fillRect(0, 0, size, size); ctx.globalCompositeOperation = 'source-over';
    rt.dispose();
    W.mapCanvas = canvas; return canvas;
  };
  FN.World = W;
})();
