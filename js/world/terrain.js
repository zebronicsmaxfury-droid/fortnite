// Island heightmap generation, ground texture painting, road mask, chunked terrain mesh, water.
window.FN = window.FN || {};
(function () {
  const C = FN.CONFIG, U = FN.U;
  const T = { N: C.TERRAIN_RES, size: C.WORLD_SIZE };
  T.step = T.size / T.N; T.origin = -T.size / 2;
  T.WATER = 10.0; // lake level

  function coastDist(x, z) {
    const d = U.polyEdgeDist(x, z, FN.MapData.coast);
    return d + U.fbm(x * 0.0035 + 3.1, z * 0.0035 + 9.7, 3) * 34;
  }
  function fineNoise(x, z) { return U.fbm(x * 0.007 + 50, z * 0.007 + 50, 3) * 2.2; }
  function rawHeight(x, z) {
    const M = FN.MapData;
    let base = 13 + U.fbm(x * 0.0016, z * 0.0016, 4) * 7.5 + fineNoise(x, z);
    for (const hl of M.hills) {
      const dx = x - hl.x, dz = z - hl.z; const d = Math.sqrt(dx * dx + dz * dz) / hl.r;
      if (d < 1) {
        const t = 1 - d * d * (3 - 2 * d);
        let g = hl.h * Math.pow(t, 1.15);
        if (hl.rocky) g += U.ridged(x * 0.012, z * 0.012, 3) * hl.h * 0.35 * t;
        base += g;
      }
    }
    return base;
  }
  function beachFactor(x, z) { return U.smoothstep(0.18, 0.4, U.fbm(x * 0.0022 + 7, z * 0.0022 + 11, 2)); }
  T.rawHeight = rawHeight;

  T.generate = function (progress) {
    const N = T.N, n1 = N + 1, M = FN.MapData;
    const h = new Float32Array(n1 * n1); T.h = h;
    const wflag = new Uint8Array(n1 * n1); T.wflag = wflag;
    for (const p of M.pois) {
      if (p.r > 0) { const rh = rawHeight(p.p[0], p.p[1]); p.padH = Math.max(C.WALL_H * 3, Math.round(rh / C.WALL_H) * C.WALL_H); if (p.kind === 'spawnisland') p.padH = C.WALL_H * 3; }
    }
    const L = M.lake; const cs = Math.cos(L.rot), sn = Math.sin(L.rot);
    for (let j = 0; j < n1; j++) {
      const z = T.origin + j * T.step;
      for (let i = 0; i < n1; i++) {
        const x = T.origin + i * T.step;
        const d = coastDist(x, z);
        let y;
        if (d < 0) {
          y = -1.5 + d * 0.22; if (y < -40) y = -40;
          y += U.fbm(x * 0.01, z * 0.01, 2) * 1.5;
        } else {
          const base = rawHeight(x, z);
          const bf = beachFactor(x, z);
          const beachH = U.lerp(0.4, base, U.smoothstep(0, 150, d));
          const cliffH = U.lerp(2.0, base, Math.pow(U.smoothstep(0, 14, d), 0.7));
          y = U.lerp(cliffH, beachH, bf);
          // roads: remove the fine bumps so the surface is smooth under the asphalt
          const rd = M.roadDist(x, z);
          if (rd < 14) { const t = 1 - U.smoothstep(6, 14, rd); y -= fineNoise(x, z) * t * 0.9; }
        }
        // POI flatten
        for (const p of M.pois) {
          if (!(p.r > 0)) continue;
          const dx = x - p.p[0], dz = z - p.p[1]; const dist = Math.sqrt(dx * dx + dz * dz);
          const bw = p.kind === 'spawnisland' ? 26 : 70;
          if (dist < p.r + bw) { const t = 1 - U.smoothstep(p.r, p.r + bw, dist); y = U.lerp(y, p.padH, t); }
        }
        // Lake
        const lx = x - L.x, lz = z - L.z; const ex = (lx * cs + lz * sn) / L.rx, ez = (-lx * sn + lz * cs) / L.rz; const e = ex * ex + ez * ez;
        if (e < 1.25) {
          const bed = L.level - 1.15 - (1 - Math.min(e, 1)) * 0.5;
          const t = 1 - U.smoothstep(0.92, 1.25, e);
          y = U.lerp(y, Math.min(y, bed), t);
          const di = Math.sqrt(lx * lx + lz * lz);
          if (di < L.island.r + 15) { const it = 1 - U.smoothstep(L.island.r - 12, L.island.r + 15, di); y = U.lerp(y, Math.max(y, L.level + 2.6), it); }
          if (e < 1.0 && di > L.island.r - 8) wflag[j * n1 + i] = 2;
        }
        // Rivers (carved, painted as water)
        for (const rv of M.rivers) {
          const dr = U.polylineDist(x, z, rv.pts) - U.fbm(x * 0.02, z * 0.02, 2) * 3;
          if (dr < rv.w) {
            const bedLevel = Math.min(y - 3.2, T.WATER - 1.6);
            const t = 1 - U.smoothstep(rv.w * 0.55, rv.w, dr);
            y = U.lerp(y, bedLevel, t);
            if (dr < rv.w * 0.62) wflag[j * n1 + i] = 3;
          }
        }
        if (d < 0 && y < 0.3) wflag[j * n1 + i] = 1;
        h[j * n1 + i] = y;
      }
      if (progress && (j & 63) === 0) progress(j / n1);
    }
    const tmp = new Float32Array(h);
    for (let j = 1; j < N; j++) for (let i = 1; i < N; i++) { const k = j * n1 + i; h[k] = tmp[k] * 0.6 + (tmp[k - 1] + tmp[k + 1] + tmp[k - n1] + tmp[k + n1]) * 0.1; }
    T.generated = true;
  };

  T.heightAt = function (x, z) {
    const n1 = T.N + 1; const fx = (x - T.origin) / T.step, fz = (z - T.origin) / T.step;
    let i = Math.floor(fx), j = Math.floor(fz);
    if (i < 0) i = 0; if (j < 0) j = 0; if (i > T.N - 1) i = T.N - 1; if (j > T.N - 1) j = T.N - 1;
    const tx = U.clamp(fx - i, 0, 1), tz = U.clamp(fz - j, 0, 1); const h = T.h;
    const a = h[j * n1 + i], b = h[j * n1 + i + 1], c = h[(j + 1) * n1 + i], d = h[(j + 1) * n1 + i + 1];
    return U.lerp(U.lerp(a, b, tx), U.lerp(c, d, tx), tz);
  };
  T.normalAt = function (x, z) {
    const e = 1.5; const hl = T.heightAt(x - e, z), hr = T.heightAt(x + e, z), hd = T.heightAt(x, z - e), hu = T.heightAt(x, z + e);
    const n = new THREE.Vector3(hl - hr, 2 * e, hd - hu); return n.normalize();
  };
  T.slopeAt = function (x, z) { const e = 2; const hl = T.heightAt(x - e, z), hr = T.heightAt(x + e, z), hd = T.heightAt(x, z - e), hu = T.heightAt(x, z + e); return Math.sqrt(((hr - hl) / (2 * e)) ** 2 + ((hu - hd) / (2 * e)) ** 2); };
  T.waterAt = function (x, z) {
    const n1 = T.N + 1; const i = U.clamp(Math.round((x - T.origin) / T.step), 0, T.N), j = U.clamp(Math.round((z - T.origin) / T.step), 0, T.N); return T.wflag[j * n1 + i];
  };
  T.waterLevelAt = function (x, z) { const w = T.waterAt(x, z); if (w === 1) return 0; if (w === 2 || w === 3) return T.WATER; return -Infinity; };
  T.inBounds = (x, z) => x > T.origin + 5 && x < -T.origin - 5 && z > T.origin + 5 && z < -T.origin - 5;

  // ---------- Ground texture painting (grass / rock / sand / water beds / lots / fields) ----------
  T.paint = function (res) {
    res = res || 2048; const cv = document.createElement('canvas'); cv.width = res; cv.height = res; const ctx = cv.getContext('2d');
    const img = ctx.createImageData(res, res); const data = img.data; const tpm = res / T.size; const M = FN.MapData;
    for (let j = 0; j < res; j++) {
      const z = T.origin + (j + 0.5) / tpm;
      for (let i = 0; i < res; i++) {
        const x = T.origin + (i + 0.5) / tpm;
        const y = T.heightAt(x, z); const w = T.waterAt(x, z);
        const slope = T.slopeAt(x, z);
        const n1 = U.fbm(x * 0.012, z * 0.012, 3), n2 = U.noise2(x * 0.09, z * 0.09);
        let R, G, B;
        if (w === 1 || y < 0.2) {
          const dpt = U.clamp(-y / 12, 0, 1); R = U.lerp(130, 20, dpt); G = U.lerp(180, 70, dpt); B = U.lerp(210, 150, dpt);
        } else if (w === 2 || w === 3) {
          const dd = U.clamp((T.WATER - y) / 4, 0, 1); R = U.lerp(70, 35, dd); G = U.lerp(150, 110, dd); B = U.lerp(210, 190, dd);
          R += n2 * 12; G += n2 * 12; B += n2 * 12;
        } else if (y < 2.6) {
          R = 226 + n2 * 10; G = 210 + n2 * 10; B = 150 + n2 * 8;
        } else {
          const gv = n1 * 0.5 + 0.5; const patch = U.smoothstep(0.35, 0.7, U.fbm(x * 0.004 + 21, z * 0.004 + 3, 2) * 0.5 + 0.5);
          R = U.lerp(96, 128, gv) - patch * 22; G = U.lerp(168, 196, gv) - patch * 10; B = U.lerp(52, 64, gv) - patch * 12;
          R += n2 * 8; G += n2 * 8; B += n2 * 4;
          const rockT = U.smoothstep(0.55, 1.05, slope + n2 * 0.08);
          if (rockT > 0) { const rg = 132 + n2 * 22 + n1 * 12; R = U.lerp(R, rg, rockT); G = U.lerp(G, rg * 0.97, rockT); B = U.lerp(B, rg * 0.9, rockT); }
          const dirtT = U.smoothstep(0.3, 0.55, slope) * (1 - rockT) * 0.5; if (dirtT > 0) { R = U.lerp(R, 150, dirtT); G = U.lerp(G, 120, dirtT); B = U.lerp(B, 70, dirtT); }
          // worn shoulder next to roads
          const rd = M.roadDist(x, z); if (rd < 9) { const t = (1 - U.smoothstep(5.5, 9, rd)) * 0.45; R = U.lerp(R, 140, t); G = U.lerp(G, 125, t); B = U.lerp(B, 85, t); }
        }
        const k = (j * res + i) * 4; data[k] = R; data[k + 1] = G; data[k + 2] = B; data[k + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    const W = (x) => (x - T.origin) * tpm, Wz = (z) => (z - T.origin) * tpm;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const rv of M.rivers) {
      ctx.strokeStyle = '#4a86a8'; ctx.lineWidth = rv.w * 1.25 * tpm; ctx.beginPath(); rv.pts.forEach((p, i) => i ? ctx.lineTo(W(p[0]), Wz(p[1])) : ctx.moveTo(W(p[0]), Wz(p[1]))); ctx.stroke();
      ctx.strokeStyle = '#3a8fd6'; ctx.lineWidth = rv.w * 0.95 * tpm; ctx.beginPath(); rv.pts.forEach((p, i) => i ? ctx.lineTo(W(p[0]), Wz(p[1])) : ctx.moveTo(W(p[0]), Wz(p[1]))); ctx.stroke();
      ctx.strokeStyle = 'rgba(120,190,240,0.5)'; ctx.lineWidth = rv.w * 0.4 * tpm; ctx.beginPath(); rv.pts.forEach((p, i) => i ? ctx.lineTo(W(p[0]), Wz(p[1])) : ctx.moveTo(W(p[0]), Wz(p[1]))); ctx.stroke();
    }
    { const L = M.lake; ctx.save(); ctx.translate(W(L.x), Wz(L.z)); ctx.rotate(L.rot); ctx.fillStyle = '#3a8fd6'; ctx.beginPath(); ctx.ellipse(0, 0, L.rx * tpm, L.rz * tpm, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      ctx.fillStyle = '#7fb85a'; ctx.beginPath(); ctx.arc(W(L.x), Wz(L.z), L.island.r * 0.9 * tpm, 0, Math.PI * 2); ctx.fill(); ctx.lineWidth = 3 * tpm; ctx.strokeStyle = '#e6d59a'; ctx.beginPath(); ctx.arc(W(L.x), Wz(L.z), L.island.r * 0.9 * tpm, 0, Math.PI * 2); ctx.stroke(); }
    for (const p of M.paint) {
      ctx.save(); ctx.translate(W(p.x), Wz(p.z));
      if (p.type === 'rect') { ctx.fillStyle = p.color; ctx.fillRect(-p.w * tpm / 2, -p.d * tpm / 2, p.w * tpm, p.d * tpm);
        if (p.bays) { ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 0.22 * tpm; ctx.beginPath(); for (let k = -p.w / 2 + 4; k < p.w / 2 - 2; k += 3.1) { ctx.moveTo(k * tpm, -p.d * tpm / 2 + 1.5 * tpm); ctx.lineTo(k * tpm, -p.d * tpm / 2 + 6.5 * tpm); ctx.moveTo(k * tpm, p.d * tpm / 2 - 1.5 * tpm); ctx.lineTo(k * tpm, p.d * tpm / 2 - 6.5 * tpm); } ctx.stroke(); } }
      else if (p.type === 'field') {
        ctx.fillStyle = p.color; ctx.fillRect(-p.w * tpm / 2, -p.d * tpm / 2, p.w * tpm, p.d * tpm);
        ctx.fillStyle = 'rgba(70,120,30,0.55)'; for (let k = -p.w / 2 + 2; k < p.w / 2; k += 4.5) ctx.fillRect(k * tpm, -p.d * tpm / 2, 1.8 * tpm, p.d * tpm);
      } else if (p.type === 'soccer') {
        ctx.fillStyle = p.color; ctx.fillRect(-p.w * tpm / 2, -p.d * tpm / 2, p.w * tpm, p.d * tpm);
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 0.4 * tpm; ctx.strokeRect(-p.w * tpm / 2 + 2 * tpm, -p.d * tpm / 2 + 2 * tpm, (p.w - 4) * tpm, (p.d - 4) * tpm);
        ctx.beginPath(); ctx.moveTo(-p.w * tpm / 2 + 2 * tpm, 0); ctx.lineTo(p.w * tpm / 2 - 2 * tpm, 0); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, 9 * tpm, 0, Math.PI * 2); ctx.stroke();
      } else if (p.type === 'track') {
        ctx.strokeStyle = p.color; ctx.lineWidth = 12 * tpm; ctx.beginPath(); ctx.ellipse(0, 0, p.w * tpm / 2, p.d * tpm / 2, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(-p.w * tpm * 0.12, 0, p.w * tpm * 0.28, p.d * tpm * 0.22, 0.5, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.restore();
    }
    T.groundCanvas = cv;
    // 1024 instead of 2048 — Intel HD Sandy Bridge VRAM is shared with RAM; halving resolution
    // cuts texture bandwidth by 4x with minimal visible difference at 0.5 render scale.
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping; tex.anisotropy = 2; tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter;
    T.groundTex = tex; return tex;
  };

  // ---------- Road mask texture (R = asphalt, G = inner asphalt (edge-line band), B = centre dashes, A = dirt) ----------
  T.paintRoads = function (res) {
    res = res || 2048; const cv = document.createElement('canvas'); cv.width = res; cv.height = res; const ctx = cv.getContext('2d');
    const tpm = res / T.size; const M = FN.MapData;
    const W = (x) => (x - T.origin) * tpm, Wz = (z) => (z - T.origin) * tpm;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const strokePaths = (paths, width, color, dash) => { ctx.strokeStyle = color; ctx.lineWidth = width * tpm; ctx.setLineDash(dash || []); for (const p of paths) { ctx.beginPath(); p.forEach((q, i) => i ? ctx.lineTo(W(q[0]), Wz(q[1])) : ctx.moveTo(W(q[0]), Wz(q[1]))); ctx.stroke(); } ctx.setLineDash([]); };
    strokePaths(M.dirtPaths, 6.5, 'rgba(0,0,0,1)'); // dirt: alpha 1, rgb 0
    ctx.globalCompositeOperation = 'lighter';
    strokePaths(M.roadPaths, 9.6, 'rgb(255,0,0)');
    strokePaths(M.roadPaths, 8.7, 'rgb(0,255,0)');
    strokePaths(M.roadPaths, 0.42, 'rgb(0,0,255)', [3.6 * tpm, 4.4 * tpm]);
    ctx.globalCompositeOperation = 'source-over';
    const tex = new THREE.CanvasTexture(cv); tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping; tex.anisotropy = 2; tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.premultiplyAlpha = false;
    T.roadTex = tex; return tex;
  };

  // ---------- Mesh ----------
  T.buildMesh = function (scene) {
    // CH reduced from 16 to 4 (16 chunks total instead of 256) — eliminates ~240 draw calls every frame!
    const N = T.N, n1 = N + 1, CH = 4, per = N / CH;
    const tex = T.groundTex || T.paint(1024);
    const roadTex = T.roadTex || T.paintRoads(1024);
    const detail = FN.Tex.grassTile(); detail.repeat.set(1, 1); detail.anisotropy = 1;
    const mat = new THREE.MeshLambertMaterial({ map: tex });
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.detailMap = { value: detail }; sh.uniforms.roadMap = { value: roadTex };
      sh.fragmentShader = sh.fragmentShader.replace('uniform vec3 diffuse;', 'uniform vec3 diffuse; uniform sampler2D detailMap; uniform sampler2D roadMap;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>',
        `#ifdef USE_MAP
          vec4 sampledDiffuseColor = texture2D( map, vMapUv );
          vec4 det = texture2D( detailMap, vMapUv * 420.0 );
          float lum = dot(det.rgb, vec3(0.333));
          vec3 col = sampledDiffuseColor.rgb * (0.78 + lum * 0.5);
          vec4 rm = texture2D( roadMap, vMapUv );
          float dirt = smoothstep(0.35, 0.6, rm.a * (1.0 - rm.r));
          float asph = smoothstep(0.38, 0.58, rm.r);
          float inner = smoothstep(0.38, 0.58, rm.g);
          float edgeLine = clamp(asph - inner, 0.0, 1.0);
          float dash = smoothstep(0.35, 0.6, rm.b) * inner;
          vec3 dirtC = vec3(0.58, 0.47, 0.32) * (0.75 + lum * 0.55);
          vec3 asphC = vec3(0.26, 0.265, 0.28) * (0.8 + lum * 0.45);
          col = mix(col, dirtC, dirt);
          col = mix(col, asphC, asph);
          col = mix(col, vec3(0.86, 0.86, 0.84), edgeLine * 0.85);
          col = mix(col, vec3(0.93, 0.82, 0.42), dash);
          diffuseColor *= vec4(col, sampledDiffuseColor.a);
        #endif`);
    };
    T.material = mat;
    T.group = new THREE.Group(); T.group.name = 'terrain'; T.chunks = [];
    const nrm = new Float32Array(n1 * n1 * 3);
    for (let j = 0; j < n1; j++) for (let i = 0; i < n1; i++) {
      const il = Math.max(i - 1, 0), ir = Math.min(i + 1, N), jd = Math.max(j - 1, 0), ju = Math.min(j + 1, N);
      const dx = (T.h[j * n1 + ir] - T.h[j * n1 + il]) / ((ir - il) * T.step), dz = (T.h[ju * n1 + i] - T.h[jd * n1 + i]) / ((ju - jd) * T.step);
      let nx = -dx, ny = 1, nz = -dz; const l = Math.sqrt(nx * nx + ny * ny + nz * nz); const k = (j * n1 + i) * 3; nrm[k] = nx / l; nrm[k + 1] = ny / l; nrm[k + 2] = nz / l;
    }
    for (let cj = 0; cj < CH; cj++) for (let ci = 0; ci < CH; ci++) {
      const pos = new Float32Array((per + 1) * (per + 1) * 3), uv = new Float32Array((per + 1) * (per + 1) * 2), nn = new Float32Array((per + 1) * (per + 1) * 3);
      for (let j = 0; j <= per; j++) for (let i = 0; i <= per; i++) {
        const gi = ci * per + i, gj = cj * per + j; const k = j * (per + 1) + i;
        const x = T.origin + gi * T.step, z = T.origin + gj * T.step, y = T.h[gj * n1 + gi];
        pos[k * 3] = x; pos[k * 3 + 1] = y; pos[k * 3 + 2] = z; uv[k * 2] = gi / N; uv[k * 2 + 1] = 1 - gj / N;
        nn[k * 3] = nrm[(gj * n1 + gi) * 3]; nn[k * 3 + 1] = nrm[(gj * n1 + gi) * 3 + 1]; nn[k * 3 + 2] = nrm[(gj * n1 + gi) * 3 + 2];
      }
      const makeIndex = (stride) => {
        const idx = []; for (let j = 0; j < per; j += stride) for (let i = 0; i < per; i += stride) {
          const a = j * (per + 1) + i, b = a + stride, c = a + stride * (per + 1), d = c + stride; idx.push(a, c, b, b, c, d);
        } return new Uint16Array(idx);
      };
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); geo.setAttribute('normal', new THREE.BufferAttribute(nn, 3));
      const idxFull = new THREE.BufferAttribute(makeIndex(1), 1), idxLow = new THREE.BufferAttribute(makeIndex(4), 1);
      geo.setIndex(idxFull); geo.computeBoundingSphere(); geo.computeBoundingBox();
      const mesh = new THREE.Mesh(geo, mat); mesh.receiveShadow = false; mesh.castShadow = false; mesh.userData.idxFull = idxFull; mesh.userData.idxLow = idxLow; mesh.userData.center = geo.boundingSphere.center.clone(); mesh.userData.lod = 0;
      mesh.matrixAutoUpdate = false; mesh.updateMatrix();
      T.group.add(mesh); T.chunks.push(mesh);
    }
    scene.add(T.group);
    // Sea plane uses MeshLambertMaterial (avoids expensive Phong specular shader calculations)
    const seaMat = new THREE.MeshLambertMaterial({ color: 0x2a86d6, transparent: true, opacity: 0.86, map: FN.Tex.water() });
    seaMat.map.repeat.set(70, 70);
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000), seaMat); sea.rotation.x = -Math.PI / 2; sea.position.y = 0; sea.receiveShadow = false; sea.name = 'sea'; T.sea = sea; scene.add(sea);
    // Lake: lightweight Lambert
    const L = FN.MapData.lake; const lakeMat = new THREE.MeshLambertMaterial({ color: 0x3a95df, transparent: true, opacity: 0.72, map: FN.Tex.water() });
    const lake = new THREE.Mesh(new THREE.CircleGeometry(1, 24), lakeMat); lake.rotation.x = -Math.PI / 2; lake.scale.set(L.rx * 1.06, L.rz * 1.06, 1); lake.rotation.z = -L.rot; lake.position.set(L.x, L.level, L.z); T.lake = lake; scene.add(lake);
    return T.group;
  };
  // Defaults tuned for potato preset; setQuality is always called after engine init.
  T.setQuality = function (low, hide) { T.lowDist = low || 60; T.hideDist = hide || 550; };
  T.updateLOD = function (camPos, force) {
    if (!T.chunks) return;
    // Throttle the recompute (cheaper to do a few times a second) instead of every frame.
    // Increased from 0.33 to 0.5 — further reduces CPU cost on Pentium G630.
    const now = FN.Engine.time;
    if (!force && T._lastLod && (now - T._lastLod) < 0.5) return;
    T._lastLod = now;
    const low = T.lowDist || 150, hide = T.hideDist || 1700;
    for (const m of T.chunks) {
      const c = m.userData.center; const dx = c.x - camPos.x, dz = c.z - camPos.z; const d2 = dx * dx + dz * dz;
      const lod = d2 > low * low ? 1 : 0;
      const vis = d2 <= hide * hide;
      if (vis !== m.visible) m.visible = vis;
      if (lod !== m.userData.lod) { m.userData.lod = lod; m.geometry.setIndex(lod ? m.userData.idxLow : m.userData.idxFull); }
    }
    if (T.sea) { T.sea.position.x = camPos.x; T.sea.position.z = camPos.z; T.sea.material.map.offset.x = (camPos.x / 9000) * 140 + FN.Engine.time * 0.004; T.sea.material.map.offset.y = -(camPos.z / 9000) * 140 + FN.Engine.time * 0.003; }
    if (T.lake) { T.lake.material.map.offset.x = FN.Engine.time * 0.01; }
  };
  FN.Terrain = T;
})();
