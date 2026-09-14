// Small geometry helpers (merge non-indexed geometries, colored boxes).
window.FN = window.FN || {};
(function () {
  const G = {};
  G.merge = function (geos) {
    const parts = geos.map(g => g.index ? g.toNonIndexed() : g);
    let total = 0; const hasUv = parts.every(p => p.attributes.uv);
    for (const p of parts) total += p.attributes.position.count;
    const pos = new Float32Array(total * 3), nrm = new Float32Array(total * 3), uv = hasUv ? new Float32Array(total * 2) : null;
    let off = 0;
    for (const p of parts) {
      pos.set(p.attributes.position.array, off * 3);
      if (p.attributes.normal) nrm.set(p.attributes.normal.array, off * 3);
      if (uv && p.attributes.uv) uv.set(p.attributes.uv.array, off * 2);
      off += p.attributes.position.count;
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.BufferAttribute(nrm, 3)); if (uv) out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    out.computeBoundingSphere(); out.computeBoundingBox();
    return out;
  };
  // Merge geometries with per-part vertex colors -> single geometry with 'color' attribute
  G.mergeColored = function (items) { // [{geo, color(hex)}]
    const parts = items.map(it => ({ g: it.geo.index ? it.geo.toNonIndexed() : it.geo, c: new THREE.Color(it.color) }));
    let total = 0; for (const p of parts) total += p.g.attributes.position.count;
    const pos = new Float32Array(total * 3), nrm = new Float32Array(total * 3), col = new Float32Array(total * 3);
    let off = 0;
    for (const p of parts) {
      const n = p.g.attributes.position.count; pos.set(p.g.attributes.position.array, off * 3); if (p.g.attributes.normal) nrm.set(p.g.attributes.normal.array, off * 3);
      for (let i = 0; i < n; i++) { col[(off + i) * 3] = p.c.r; col[(off + i) * 3 + 1] = p.c.g; col[(off + i) * 3 + 2] = p.c.b; }
      off += n;
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.BufferAttribute(nrm, 3)); out.setAttribute('color', new THREE.BufferAttribute(col, 3));
    out.computeBoundingSphere(); out.computeBoundingBox(); return out;
  };
  G.box = function (w, h, d, x, y, z, rx, ry, rz) { const g = new THREE.BoxGeometry(w, h, d); if (rx || ry || rz) { const e = new THREE.Euler(rx || 0, ry || 0, rz || 0); g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(e)); } g.translate(x || 0, y || 0, z || 0); return g; };
  G.cyl = function (rt, rb, h, seg, x, y, z, rx, ry, rz) { const g = new THREE.CylinderGeometry(rt, rb, h, seg || 8); if (rx || ry || rz) { g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rx || 0, ry || 0, rz || 0))); } g.translate(x || 0, y || 0, z || 0); return g; };
  G.sphere = function (r, seg, x, y, z, sx, sy, sz) { const g = new THREE.SphereGeometry(r, seg || 8, seg || 6); if (sx !== undefined) g.scale(sx, sy, sz); g.translate(x || 0, y || 0, z || 0); return g; };
  G.cone = function (r, h, seg, x, y, z) { const g = new THREE.ConeGeometry(r, h, seg || 8); g.translate(x || 0, y || 0, z || 0); return g; };
  // Mesh from colored parts: one draw call, vertex colors
  G.coloredMesh = function (items, matOpts) { const geo = G.mergeColored(items); const mat = new THREE.MeshLambertMaterial(Object.assign({ vertexColors: true }, matOpts || {})); const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; return m; };
  FN.GeoUtil = G;
})();
