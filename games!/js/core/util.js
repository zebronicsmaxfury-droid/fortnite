// Core utilities: seeded RNG, noise, math helpers, geometry tests.
window.FN = window.FN || {};
(function () {
  const U = {};

  // ---------- RNG ----------
  U.mulberry32 = function (seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  U.rng = U.mulberry32(1337);
  U.setSeed = function (s) { U.rng = U.mulberry32(s); };
  U.rand = function (a, b) { if (a === undefined) return U.rng(); if (b === undefined) return U.rng() * a; return a + U.rng() * (b - a); };
  U.randInt = function (a, b) { return Math.floor(U.rand(a, b + 1)); };
  U.pick = function (arr) { return arr[Math.floor(U.rng() * arr.length)]; };
  U.chance = function (p) { return U.rng() < p; };
  U.gauss = function () { // Box-Muller
    let u = 0, v = 0; while (u === 0) u = U.rng(); while (v === 0) v = U.rng();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  };
  U.weightedPick = function (items, weightKey) {
    let total = 0; for (const it of items) total += (weightKey ? it[weightKey] : it.w);
    let r = U.rng() * total;
    for (const it of items) { r -= (weightKey ? it[weightKey] : it.w); if (r <= 0) return it; }
    return items[items.length - 1];
  };
  U.hash2 = function (x, y) { // deterministic 0..1 hash of integer coords
    let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; h = h ^ (h >>> 16); return (h >>> 0) / 4294967296;
  };

  // ---------- Math ----------
  U.clamp = (v, a, b) => v < a ? a : (v > b ? b : v);
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.smoothstep = (a, b, x) => { const t = U.clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  U.damp = (a, b, lambda, dt) => U.lerp(a, b, 1 - Math.exp(-lambda * dt));
  U.wrapAngle = (a) => { a = (a + Math.PI) % (2 * Math.PI); if (a < 0) a += 2 * Math.PI; return a - Math.PI; };
  U.lerpAngle = (a, b, t) => a + U.wrapAngle(b - a) * t;
  U.dist2 = (ax, az, bx, bz) => { const dx = ax - bx, dz = az - bz; return Math.sqrt(dx * dx + dz * dz); };
  U.dist2sq = (ax, az, bx, bz) => { const dx = ax - bx, dz = az - bz; return dx * dx + dz * dz; };
  U.dist3 = (a, b) => { const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z; return Math.sqrt(dx * dx + dy * dy + dz * dz); };
  U.easeOut = (t) => 1 - (1 - t) * (1 - t);
  U.easeInOut = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  U.fmt = (n) => (n | 0).toString();
  U.pad2 = (n) => (n < 10 ? '0' : '') + n;
  U.fmtTime = (s) => { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + U.pad2(s % 60); };

  // ---------- Value noise / fBm ----------
  const PERM = new Uint8Array(512);
  (function () { const r = U.mulberry32(99); const p = []; for (let i = 0; i < 256; i++) p[i] = i; for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = p[i]; p[i] = p[j]; p[j] = t; } for (let i = 0; i < 512; i++) PERM[i] = p[i & 255]; })();
  function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
  function grad(h, x, y) { switch (h & 7) { case 0: return x + y; case 1: return -x + y; case 2: return x - y; case 3: return -x - y; case 4: return x; case 5: return -x; case 6: return y; default: return -y; } }
  U.noise2 = function (x, y) { // Perlin-style gradient noise, range ~ -1..1
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
    x -= Math.floor(x); y -= Math.floor(y);
    const u = fade(x), v = fade(y);
    const A = PERM[X] + Y, B = PERM[X + 1] + Y;
    return U.lerp(
      U.lerp(grad(PERM[A], x, y), grad(PERM[B], x - 1, y), u),
      U.lerp(grad(PERM[A + 1], x, y - 1), grad(PERM[B + 1], x - 1, y - 1), u), v) * 1.4;
  };
  U.fbm = function (x, y, octaves, lacunarity, gain) {
    octaves = octaves || 4; lacunarity = lacunarity || 2.0; gain = gain || 0.5;
    let sum = 0, amp = 1, f = 1, norm = 0;
    for (let i = 0; i < octaves; i++) { sum += U.noise2(x * f, y * f) * amp; norm += amp; amp *= gain; f *= lacunarity; }
    return sum / norm;
  };
  U.ridged = function (x, y, octaves) {
    let sum = 0, amp = 0.5, f = 1;
    for (let i = 0; i < (octaves || 4); i++) { sum += (1 - Math.abs(U.noise2(x * f, y * f))) * amp; amp *= 0.5; f *= 2; }
    return sum;
  };

  // ---------- Geometry ----------
  // Point in polygon (poly = [[x,y],...])
  U.pointInPoly = function (x, y, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside;
    }
    return inside;
  };
  // signed-ish distance to polygon edge (positive inside)
  U.polyEdgeDist = function (x, y, poly) {
    let best = Infinity;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const d = U.segDist(x, y, poly[j][0], poly[j][1], poly[i][0], poly[i][1]);
      if (d < best) best = d;
    }
    return U.pointInPoly(x, y, poly) ? best : -best;
  };
  U.segDist = function (px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay; const l2 = dx * dx + dy * dy;
    let t = l2 > 0 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0; t = U.clamp(t, 0, 1);
    const cx = ax + t * dx, cy = ay + t * dy; return Math.sqrt((px - cx) * (px - cx) + (py - cy) * (py - cy));
  };
  U.polylineDist = function (px, py, pts) {
    let best = Infinity;
    for (let i = 0; i + 1 < pts.length; i++) { const d = U.segDist(px, py, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]); if (d < best) best = d; }
    return best;
  };
  // Ray vs AABB. ro/rd are {x,y,z}; returns t or -1
  U.rayAABB = function (ro, rd, min, max, tMax) {
    let tmin = 0, tmax = tMax === undefined ? Infinity : tMax;
    const ax = ['x', 'y', 'z'];
    for (let i = 0; i < 3; i++) {
      const a = ax[i]; const inv = 1 / rd[a];
      let t1 = (min[a] - ro[a]) * inv, t2 = (max[a] - ro[a]) * inv;
      if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
      if (t1 > tmin) tmin = t1; if (t2 < tmax) tmax = t2;
      if (tmin > tmax) return -1;
    }
    return tmin;
  };
  // Ray vs sphere; returns t or -1
  U.raySphere = function (ro, rd, c, r, tMax) {
    const ox = ro.x - c.x, oy = ro.y - c.y, oz = ro.z - c.z;
    const b = ox * rd.x + oy * rd.y + oz * rd.z;
    const cc = ox * ox + oy * oy + oz * oz - r * r;
    const disc = b * b - cc; if (disc < 0) return -1;
    const s = Math.sqrt(disc); let t = -b - s; if (t < 0) t = -b + s; if (t < 0) return -1;
    if (tMax !== undefined && t > tMax) return -1;
    return t;
  };
  // Ray vs vertical capsule approximated as cylinder + sphere caps: center (x,y,z) bottom y0 top y1 radius r
  U.rayCapsuleY = function (ro, rd, cx, cz, y0, y1, r, tMax) {
    // infinite cylinder along Y
    const ox = ro.x - cx, oz = ro.z - cz;
    const a = rd.x * rd.x + rd.z * rd.z;
    let tCyl = -1;
    if (a > 1e-8) {
      const b = ox * rd.x + oz * rd.z; const c = ox * ox + oz * oz - r * r;
      const disc = b * b - a * c;
      if (disc >= 0) { const s = Math.sqrt(disc); let t = (-b - s) / a; if (t < 0) t = (-b + s) / a; if (t >= 0) { const y = ro.y + rd.y * t; if (y >= y0 && y <= y1) tCyl = t; } }
    } else { // vertical ray
      if (ox * ox + oz * oz <= r * r) { const t0 = (y0 - ro.y) / rd.y, t1 = (y1 - ro.y) / rd.y; const t = Math.min(Math.max(t0, 0), Math.max(t1, 0)); if (t >= 0) tCyl = t; }
    }
    const tTop = U.raySphere(ro, rd, { x: cx, y: y1, z: cz }, r);
    const tBot = U.raySphere(ro, rd, { x: cx, y: y0, z: cz }, r);
    let best = -1;
    for (const t of [tCyl, tTop, tBot]) if (t >= 0 && (best < 0 || t < best)) best = t;
    if (best >= 0 && tMax !== undefined && best > tMax) return -1;
    return best;
  };
  U.aabbOverlap = (a, b) => a.min.x < b.max.x && a.max.x > b.min.x && a.min.y < b.max.y && a.max.y > b.min.y && a.min.z < b.max.z && a.max.z > b.min.z;

  // ---------- Misc ----------
  U.now = () => performance.now() / 1000;
  U.el = (id) => document.getElementById(id);
  U.html = (id, h) => { const e = document.getElementById(id); if (e && e.innerHTML !== h) e.innerHTML = h; };
  U.txt = (id, t) => { const e = document.getElementById(id); if (e && e.textContent !== String(t)) e.textContent = t; };
  U.show = (id, on) => { const e = typeof id === 'string' ? document.getElementById(id) : id; if (e) e.style.display = on ? '' : 'none'; };
  U.cls = (id, c, on) => { const e = typeof id === 'string' ? document.getElementById(id) : id; if (e) e.classList.toggle(c, !!on); };
  U.hexToRgb = (hex) => { const n = parseInt(hex.replace('#', ''), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  U.rgb = (r, g, b) => 'rgb(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ')';
  U.mixHex = (a, b, t) => { const A = U.hexToRgb(a), B = U.hexToRgb(b); return U.rgb(U.lerp(A[0], B[0], t), U.lerp(A[1], B[1], t), U.lerp(A[2], B[2], t)); };
  U.shade = (hex, f) => { const c = U.hexToRgb(hex); return U.rgb(U.clamp(c[0] * f, 0, 255), U.clamp(c[1] * f, 0, 255), U.clamp(c[2] * f, 0, 255)); };

  FN.U = U;
})();
