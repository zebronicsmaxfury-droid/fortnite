// Instanced grass tufts scattered around the player (deterministic per cell, cheap).
window.FN = window.FN || {};
(function () {
  const U = FN.U;
  const GR = { N: 1500, cell: 4.5, radius: 30, lastX: 1e9, lastZ: 1e9 };
  GR.init = function (scene) {
    // honor quality preset (grass off + lower count on LOW)
    if (FN.Engine && FN.Engine.quality) { GR.enabled = !!FN.Engine.quality.grass; GR.N = Math.max(120, FN.Engine.quality.grassN | 0); }
    const tex = FN.Tex.make('grassblade', 128, 128, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < 9; i++) {
        const x0 = 12 + i * 13 + (Math.random() - 0.5) * 6; const top = 10 + Math.random() * 30; const lean = (Math.random() - 0.5) * 26;
        const g = ctx.createLinearGradient(0, h, 0, top); g.addColorStop(0, '#3f8a2a'); g.addColorStop(1, '#8fd05a');
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x0 - 5, h); ctx.quadraticCurveTo(x0 + lean * 0.5, h * 0.55, x0 + lean, top); ctx.quadraticCurveTo(x0 + lean * 0.5 + 4, h * 0.55, x0 + 5, h); ctx.fill();
      }
    });
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    const q1 = new THREE.PlaneGeometry(1.1, 0.72); q1.translate(0, 0.36, 0);
    const q2 = q1.clone(); q2.rotateY(Math.PI / 2); const q3 = q1.clone(); q3.rotateY(Math.PI / 4); const q4 = q1.clone(); q4.rotateY(-Math.PI / 4);
    const geo = FN.GeoUtil.merge([q1, q2, q3, q4]);
    const mat = new THREE.MeshLambertMaterial({ map: tex, alphaTest: 0.45, side: THREE.DoubleSide, transparent: false });
    // Allocate once at the max capacity; GR.N controls how many are actually placed (cheap preset switch).
    GR.mesh = new THREE.InstancedMesh(geo, mat, 1500); GR.mesh.castShadow = false; GR.mesh.receiveShadow = false; GR.mesh.frustumCulled = false; GR.mesh.count = 0;
    GR.mesh.setColorAt(0, new THREE.Color(1, 1, 1));
    scene.add(GR.mesh); GR.enabled = GR.enabled && !!GR.mesh;
  };
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), V = new THREE.Vector3(), S = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0), C = new THREE.Color();
  function clearAt(x, z) {
    const MD = FN.MapData; const T = FN.Terrain;
    const y = T.heightAt(x, z); if (y < 3.2) return false; if (T.waterAt(x, z)) return false; if (T.slopeAt(x, z) > 0.75) return false;
    if (MD.roadDist(x, z) < 6.2) return false;
    for (const pt of MD.paint) { if (Math.abs(x - pt.x) < pt.w / 2 + 1 && Math.abs(z - pt.z) < pt.d / 2 + 1) return false; }
    const s = FN.Structures.groundAt(x, z, y + 3, y - 3); if (s && s.kind === 'floor') return false;
    return true;
  }
  GR.update = function (px, pz) {
    if (!GR.enabled || !GR.mesh) return;
    if (Math.abs(px - GR.lastX) < 3 && Math.abs(pz - GR.lastZ) < 3) return;
    GR.lastX = px; GR.lastZ = pz;
    const cs = GR.cell, R = GR.radius; let n = 0; const mesh = GR.mesh;
    const c0x = Math.floor((px - R) / cs), c1x = Math.floor((px + R) / cs), c0z = Math.floor((pz - R) / cs), c1z = Math.floor((pz + R) / cs);
    for (let cz = c0z; cz <= c1z && n < GR.N; cz++) for (let cx = c0x; cx <= c1x && n < GR.N; cx++) {
      const h = U.hash2(cx, cz); if (h < 0.22) continue;
      const cnt = h > 0.8 ? 3 : 2;
      for (let k = 0; k < cnt && n < GR.N; k++) {
        const hx = U.hash2(cx * 3 + k, cz * 7 + 1), hz = U.hash2(cx * 5 + 2, cz * 11 + k);
        const x = (cx + hx) * cs, z = (cz + hz) * cs; const d2 = (x - px) * (x - px) + (z - pz) * (z - pz); if (d2 > R * R) continue;
        if (!clearAt(x, z)) continue;
        const y = FN.Terrain.heightAt(x, z);
        const sc = 0.75 + U.hash2(cx + 9, cz + k) * 0.6; const fade = 1 - Math.pow(Math.sqrt(d2) / R, 4);
        Q.setFromAxisAngle(Y, hx * 6.28); V.set(x, y - 0.02, z); S.set(sc, sc * fade, sc); M.compose(V, Q, S); mesh.setMatrixAt(n, M);
        const g = 0.85 + U.hash2(cx + 3, cz + 5) * 0.3; C.setRGB(0.9 * g, 1.0 * g, 0.8 * g); mesh.setColorAt(n, C); n++;
      }
    }
    mesh.count = n; mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  };
  GR.setEnabled = function (on) { GR.enabled = on; if (GR.mesh) { GR.mesh.visible = on; if (on) { GR.lastX = 1e9; GR.lastZ = 1e9; GR.update(FN.Player.pos.x, FN.Player.pos.z); } else { GR.mesh.count = 0; } } };
  GR.setQuality = function (on, n) { if (n !== undefined) GR.N = Math.max(120, n | 0); GR.setEnabled(!!on); };
  FN.Grass = GR;
})();
