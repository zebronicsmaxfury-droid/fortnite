// Stylized Fortnite-style character: single skinned mesh (one draw call) with rigid-weighted parts,
// procedural animation, and two-bone arm IK so both hands really hold the weapon.
window.FN = window.FN || {};
(function () {
  const U = FN.U, G = FN.GeoUtil;
  const CH = {};
  // Default skins of Season 1-2
  CH.SKINS = [
    { id: 'jonesy', name: 'Jonesy', hair: 0xe8c96a, hairStyle: 'swept', skin: 0xe0b48c, top: 0x6f7b4a, sleeves: false, under: 0x8c8f86, pants: 0x9a8a6a, boots: 0x3a2a1a, gloves: 0x5a4a3a, harness: 0x5a4a3a, tattoo: true, female: false },
    { id: 'ramirez', name: 'Ramirez', hair: 0x2a1a10, hairStyle: 'ponytail', skin: 0xc48a5a, top: 0xb03030, sleeves: true, under: 0x2a2a2a, pants: 0x3a3a3a, boots: 0x2a2a2a, gloves: 0x2a2a2a, harness: 0x1a1a1a, female: true },
    { id: 'headhunter', name: 'Headhunter', hair: 0x1a1410, hairStyle: 'bun', skin: 0xd8a882, top: 0x2b2b2b, sleeves: false, under: 0x444444, pants: 0x4a4a52, boots: 0x1a1a1a, gloves: 0x333333, harness: 0x222222, female: true },
    { id: 'hawk', name: 'Hawk', hair: 0x2a1a10, hairStyle: 'short', skin: 0xc8956a, top: 0x8a2a2a, sleeves: true, under: 0x1a1a1a, pants: 0x2a2a2a, boots: 0x1a1a1a, gloves: 0x3a3a3a, harness: 0x2a2a2a, female: false },
    { id: 'renegade', name: 'Renegade', hair: 0x6a3a1a, hairStyle: 'short', skin: 0xf0c8a0, top: 0x3a5a7a, sleeves: false, under: 0x3a3a3a, pants: 0x4a4a4a, boots: 0x2a2a2a, gloves: 0x2a2a2a, harness: 0x3a3a3a, female: false },
    { id: 'banshee', name: 'Banshee', hair: 0xf0d878, hairStyle: 'long', skin: 0xf0c8a0, top: 0x6a6a6a, sleeves: false, under: 0x2a2a2a, pants: 0x2f2f2f, boots: 0x1a1a1a, gloves: 0x2a2a2a, harness: 0x1a1a1a, female: true },
    { id: 'wildcat', name: 'Wildcat', hair: 0x1a1410, hairStyle: 'bun', skin: 0x8a5a3a, top: 0x5a6a3a, sleeves: false, under: 0x3a3a3a, pants: 0x6a5a4a, boots: 0x2a2a2a, gloves: 0x3a3a3a, harness: 0x2a2a2a, female: true },
    { id: 'spitfire', name: 'Spitfire', hair: 0x1a1410, hairStyle: 'bald', skin: 0x7a4a2a, top: 0x1a1a1a, sleeves: false, under: 0x1a1a1a, pants: 0x4a5a3a, boots: 0x2a2a2a, gloves: 0x5a4a3a, harness: 0x3a2a1a, female: false },
  ];
  CH.skinById = (id) => CH.SKINS.find(s => s.id === id) || CH.SKINS[0];

  const BONES = ['root', 'pelvis', 'spine', 'neck', 'head', 'shoulderL', 'forearmL', 'handL', 'shoulderR', 'forearmR', 'handR', 'thighL', 'shinL', 'footL', 'thighR', 'shinR', 'footR'];
  const BPOS = { // world-space bind positions of joints
    root: [0, 0, 0], pelvis: [0, 0.98, 0], spine: [0, 1.12, 0], neck: [0, 1.62, 0], head: [0, 1.68, 0],
    shoulderL: [-0.29, 1.52, 0], forearmL: [-0.29, 1.22, 0], handL: [-0.29, 0.94, 0],
    shoulderR: [0.29, 1.52, 0], forearmR: [0.29, 1.22, 0], handR: [0.29, 0.94, 0],
    thighL: [-0.13, 0.98, 0], shinL: [-0.13, 0.53, 0], footL: [-0.13, 0.08, 0],
    thighR: [0.13, 0.98, 0], shinR: [0.13, 0.53, 0], footR: [0.13, 0.08, 0],
  };
  const BPARENT = { root: null, pelvis: 'root', spine: 'pelvis', neck: 'spine', head: 'neck', shoulderL: 'spine', forearmL: 'shoulderL', handL: 'forearmL', shoulderR: 'spine', forearmR: 'shoulderR', handR: 'forearmR', thighL: 'pelvis', shinL: 'thighL', footL: 'shinL', thighR: 'pelvis', shinR: 'thighR', footR: 'shinR' };
  const L1 = 0.30, L2 = 0.28; // upper arm, forearm

  function buildParts(sk) {
    const P = []; const add = (bone, geo, color) => P.push({ bone, geo, color });
    const f = sk.female ? 0.93 : 1.0;
    add('pelvis', G.box(0.36 * f, 0.2, 0.24, 0, 0.98, 0), sk.pants);
    add('pelvis', G.box(0.38 * f, 0.07, 0.26, 0, 1.06, 0), 0x3a2a1a); // belt
    add('spine', G.box(0.4 * f, 0.26, 0.26, 0, 1.24, 0), sk.top);
    add('spine', G.box(0.5 * f, 0.3, 0.3, 0, 1.47, 0), sk.top);
    add('spine', G.box(0.22, 0.12, 0.31, 0, 1.55, 0), sk.under);
    add('spine', G.box(0.07, 0.42, 0.32, -0.14, 1.36, 0), sk.harness); add('spine', G.box(0.07, 0.42, 0.32, 0.14, 1.36, 0), sk.harness);
    add('spine', G.box(0.3, 0.3, 0.1, 0, 1.4, 0.17), sk.harness);
    add('neck', G.cyl(0.06, 0.07, 0.1, 8, 0, 1.64, 0), sk.skin);
    add('head', G.sphere(0.165, 10, 0, 1.84, 0, 1.0, 1.12, 1.0), sk.skin);
    add('head', G.box(0.1, 0.05, 0.05, 0, 1.79, -0.16), sk.skin);
    add('head', G.box(0.04, 0.03, 0.02, -0.06, 1.86, -0.165), 0x222222); add('head', G.box(0.04, 0.03, 0.02, 0.06, 1.86, -0.165), 0x222222);
    add('head', G.box(0.06, 0.012, 0.02, -0.06, 1.895, -0.163), 0x3a2a1a); add('head', G.box(0.06, 0.012, 0.02, 0.06, 1.895, -0.163), 0x3a2a1a); // brows
    add('head', G.box(0.07, 0.012, 0.02, 0, 1.745, -0.158), 0x8a4a3a); // mouth
    if (sk.hairStyle === 'swept') { add('head', G.sphere(0.175, 10, 0, 1.9, 0.01, 1.02, 0.7, 1.02), sk.hair); add('head', G.box(0.3, 0.09, 0.12, 0, 1.97, -0.1), sk.hair); }
    else if (sk.hairStyle === 'short') { add('head', G.sphere(0.172, 10, 0, 1.9, 0.01, 1.02, 0.62, 1.02), sk.hair); }
    else if (sk.hairStyle === 'ponytail') { add('head', G.sphere(0.172, 10, 0, 1.9, 0.01, 1.02, 0.7, 1.02), sk.hair); add('head', G.cyl(0.04, 0.06, 0.34, 6, 0, 1.68, 0.2, 0.5, 0, 0), sk.hair); }
    else if (sk.hairStyle === 'bun') { add('head', G.sphere(0.172, 10, 0, 1.9, 0.01, 1.02, 0.7, 1.02), sk.hair); add('head', G.sphere(0.08, 8, 0, 1.98, 0.12), sk.hair); }
    else if (sk.hairStyle === 'long') { add('head', G.sphere(0.175, 10, 0, 1.9, 0.01, 1.02, 0.7, 1.02), sk.hair); add('head', G.box(0.32, 0.36, 0.14, 0, 1.72, 0.12), sk.hair); }
    const sleeveL = sk.sleeves ? sk.top : sk.skin;
    add('shoulderL', G.sphere(0.085, 8, -0.29, 1.52, 0), sk.top); add('shoulderR', G.sphere(0.085, 8, 0.29, 1.52, 0), sk.top);
    add('shoulderL', G.cyl(0.062, 0.058, 0.3, 8, -0.29, 1.37, 0), sleeveL); add('shoulderR', G.cyl(0.062, 0.058, 0.3, 8, 0.29, 1.37, 0), sleeveL);
    add('shoulderL', G.sphere(0.06, 7, -0.29, 1.22, 0), sk.skin); add('shoulderR', G.sphere(0.06, 7, 0.29, 1.22, 0), sk.skin); // elbows
    add('forearmL', G.cyl(0.058, 0.05, 0.28, 8, -0.29, 1.08, 0), sk.skin); add('forearmR', G.cyl(0.058, 0.05, 0.28, 8, 0.29, 1.08, 0), sk.skin);
    if (sk.tattoo) add('forearmR', G.cyl(0.062, 0.062, 0.1, 8, 0.29, 1.12, 0), 0x3a5a7a);
    add('handL', G.box(0.09, 0.12, 0.08, -0.29, 0.885, 0), sk.gloves); add('handR', G.box(0.09, 0.12, 0.08, 0.29, 0.885, 0), sk.gloves);
    add('thighL', G.cyl(0.095, 0.08, 0.46, 8, -0.13, 0.76, 0), sk.pants); add('thighR', G.cyl(0.095, 0.08, 0.46, 8, 0.13, 0.76, 0), sk.pants);
    add('shinL', G.cyl(0.078, 0.07, 0.45, 8, -0.13, 0.31, 0), sk.pants); add('shinR', G.cyl(0.078, 0.07, 0.45, 8, 0.13, 0.31, 0), sk.pants);
    add('shinL', G.cyl(0.085, 0.08, 0.2, 8, -0.13, 0.2, 0), sk.boots); add('shinR', G.cyl(0.085, 0.08, 0.2, 8, 0.13, 0.2, 0), sk.boots);
    add('footL', G.box(0.15, 0.1, 0.27, -0.13, 0.05, -0.04), sk.boots); add('footR', G.box(0.15, 0.1, 0.27, 0.13, 0.05, -0.04), sk.boots);
    return P;
  }

  CH.create = function (skinId) {
    const sk = typeof skinId === 'string' ? CH.skinById(skinId) : (skinId || CH.SKINS[0]);
    const bones = {}, list = [];
    for (const n of BONES) {
      const b = new THREE.Bone(); b.name = n;
      const p = BPOS[n], par = BPARENT[n];
      if (par) {
        const pp = BPOS[par];
        b.position.set(p[0] - pp[0], p[1] - pp[1], p[2] - pp[2]);
        bones[par].add(b);
      } else {
        b.position.set(0, 0, 0);
      }
      bones[n] = b; list.push(b);
    }
    const parts = buildParts(sk);
    const boneParts = {};
    for (const n of BONES) boneParts[n] = [];
    for (const p of parts) { if (boneParts[p.bone]) boneParts[p.bone].push(p); }
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true });
    const grids = [];
    for (const n of BONES) {
      const bp = boneParts[n];
      if (!bp || bp.length === 0) continue;
      const bpos = BPOS[n];
      const items = bp.map(p => {
        const g = p.geo.index ? p.geo.toNonIndexed() : p.geo.clone();
        g.translate(-bpos[0], -bpos[1], -bpos[2]);
        return { geo: g, color: p.color };
      });
      const mergedGeo = G.mergeColored(items);
      const m = new THREE.Mesh(mergedGeo, mat);
      m.castShadow = false; m.receiveShadow = false; m.frustumCulled = false;
      bones[n].add(m);

      const gridMat = new THREE.MeshBasicMaterial({ color: 0x0000ff, wireframe: true, transparent: true, opacity: 0 });
      const grid = new THREE.Mesh(mergedGeo, gridMat);
      grid.visible = false;
      bones[n].add(grid);
      grids.push(grid);
    }
    const group = new THREE.Group(); group.add(bones.root);
    // hand socket (pickaxe / consumables) and torso weapon socket (guns, both hands via IK)
    const socket = new THREE.Group(); socket.name = 'socket'; bones.handR.add(socket); socket.position.set(0.02, -0.14, -0.02);
    const wsocket = new THREE.Group(); wsocket.name = 'wsocket'; bones.spine.add(wsocket);
    const backSocket = new THREE.Group(); bones.spine.add(backSocket); backSocket.position.set(0.15, 0.35, 0.22);
    const ch = { group, mesh: bones.root, bones, skin: sk, socket, wsocket, backSocket, anim: { phase: 0 }, targets: {}, weaponMesh: null, weaponKind: 'none', grip: null, aimF: 0, shootAnim: { kind: 'none', t: 0, dur: 0, hold: false } };
    ch.bodyMat = mat;
    ch.grids = grids;
    ch.drone = buildDroneMesh(); // elimination hologram drone (hidden until death)
    ch.drone.visible = false;
    group.add(ch.drone);
    for (const n of BONES) ch.targets[n] = new THREE.Euler();
    ch.headWorld = new THREE.Vector3();
    return ch;
  };

  // ---------- weapon attachment ----------
  // Socket poses relative to the spine bone: [x, y, z, yaw]. Guns point along -Z of the socket.
  const SOCKET = {
    rifle: { hip: [0.16, 0.26, -0.24, 0.10], aim: [0.10, 0.31, -0.26, 0.05] },
    sniper: { hip: [0.16, 0.26, -0.24, 0.10], aim: [0.09, 0.31, -0.26, 0.04] },
    pistol: { hip: [0.12, 0.30, -0.36, 0.05], aim: [0.06, 0.33, -0.40, 0.02] },
    launcher: { hip: [0.23, 0.30, -0.10, 0.0], aim: [0.20, 0.33, -0.12, 0.0] },
  };
  CH.setWeapon = function (ch, mesh, kind) {
    if (ch.weaponMesh && ch.weaponMesh.parent) ch.weaponMesh.parent.remove(ch.weaponMesh);
    ch.weaponMesh = mesh; ch.weaponKind = kind || 'none'; ch.grip = null;
    if (!mesh) return;
    if (kind === 'pickaxe' || (mesh.userData && mesh.userData.model === 'pickaxe')) { ch.socket.add(mesh); ch.weaponKind = 'pickaxe'; ch.socket.rotation.set(Math.PI, 0, 0); ch.socket.position.set(0.02, -0.1, -0.02); mesh.position.set(0, 0, 0); mesh.rotation.set(0, 0, 0); }
    else if (kind === 'item') { ch.socket.add(mesh); ch.socket.rotation.set(0, 0, 0); ch.socket.position.set(0.02, -0.16, -0.02); mesh.position.set(0, 0, 0); mesh.rotation.set(0, 0, 0); }
    else { ch.wsocket.add(mesh); ch.weaponKind = 'gun'; mesh.position.set(0, 0, 0); mesh.rotation.set(0, 0, 0); ch.grip = (FN.WeaponModels && FN.WeaponModels.GRIP[mesh.userData.model]) || { r: [0, 0.1, 0.14], l: [0, 0.07, -0.36], kind: 'rifle' }; }
  };

  // ---------- two-bone IK ----------
  const vS = new THREE.Vector3(), vT = new THREE.Vector3(), vDir = new THREE.Vector3(), vP = new THREE.Vector3(), vUp = new THREE.Vector3(), vE = new THREE.Vector3(), vLow = new THREE.Vector3();
  const qP = new THREE.Quaternion(), qW = new THREE.Quaternion(), qW2 = new THREE.Quaternion(), qTmp = new THREE.Quaternion(), DOWN = new THREE.Vector3(0, -1, 0);
  const vFwd = new THREE.Vector3(), vRight = new THREE.Vector3(), vPole = new THREE.Vector3();
  function solveArm(ch, side, target, pole, handQ) {
    const sh = ch.bones['shoulder' + side], fa = ch.bones['forearm' + side], hd = ch.bones['hand' + side];
    sh.getWorldPosition(vS); vT.copy(target);
    vDir.subVectors(vT, vS); let d = vDir.length(); if (d < 1e-4) return;
    const maxD = L1 + L2 - 0.01, minD = 0.09;
    if (d > maxD) { vDir.multiplyScalar(maxD / d); d = maxD; vT.copy(vS).add(vDir); } else if (d < minD) { vDir.multiplyScalar(minD / d); d = minD; vT.copy(vS).add(vDir); }
    vDir.normalize();
    const cosA = U.clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1); const A = Math.acos(cosA);
    vP.subVectors(pole, vS); vP.addScaledVector(vDir, -vP.dot(vDir)); if (vP.lengthSq() < 1e-6) vP.set(0, -1, 0).addScaledVector(vDir, -(-vDir.y)); vP.normalize();
    vUp.copy(vDir).multiplyScalar(Math.cos(A)).addScaledVector(vP, Math.sin(A));
    vE.copy(vS).addScaledVector(vUp, L1); vLow.subVectors(vT, vE).normalize();
    sh.parent.getWorldQuaternion(qP); qW.setFromUnitVectors(DOWN, vUp); qTmp.copy(qP).invert(); sh.quaternion.copy(qTmp).multiply(qW);
    qW2.setFromUnitVectors(DOWN, vLow); qTmp.copy(qW).invert(); fa.quaternion.copy(qTmp).multiply(qW2);
    if (handQ) { qTmp.copy(qW2).invert(); hd.quaternion.copy(qTmp).multiply(handQ); } else hd.quaternion.identity();
  }

  // ---------- Procedural animation ----------
  // Conventions (character faces -Z): limb rotation.x positive = swings FORWARD; head.x positive = look up;
  // spine/pelvis.x negative = lean forward; shoulder.z: left arm outward = negative, right arm outward = positive.
  function setT(ch, n, x, y, z) { const t = ch.targets[n]; t.x = x; t.y = y; t.z = z; }
  function resetTargets(ch) { for (const n of BONES) setT(ch, n, 0, 0, 0); }
  const vGrip = new THREE.Vector3(), vFore = new THREE.Vector3(), qSock = new THREE.Quaternion(), vHandle = new THREE.Vector3();

  // ---- per-weapon shoot animation categories ----
  // Maps weapon kind (from animate state) + weapon model ID to an animation "flavor".
  // Flavors: 'bow_draw', 'bow_draw_scoped', 'crossbow', 'bolt_pull', 'pump_cycle',
  //          'pistol_flip', 'launcher_heave', 'smg_rattle', 'ar_kick', 'minigun_spin'
  const SHOOT_FLAVOR = {
    recurvebow: 'bow_draw', longbow: 'bow_draw_scoped', crossbow: 'crossbow',
    bolt: 'bolt_pull', semisniper: 'semi_sniper', heavysniper: 'bolt_pull', huntingrifle: 'bolt_pull',
    pump: 'pump_cycle', doublebarrel: 'db_break', drumshotgun: 'drum_cycle',
    tac: 'tac_cycle', autoshotgun: 'tac_cycle', infernoshotgun: 'tac_cycle',
    revolver: 'pistol_flip', handcannon: 'pistol_flip', flintknock: 'pistol_flip',
    trophygun: 'pistol_flip', burstpistol: 'pistol_flip', suppressedpistol: 'pistol_flip', pistol: 'pistol_flip',
    rpg: 'launcher_heave', grenadelauncher: 'launcher_heave', quadlauncher: 'launcher_heave',
    minigun: 'minigun_spin',
    smg: 'smg_rattle', tacsmg: 'smg_rattle', suppressedsmg: 'smg_rattle',
    burstsmg: 'smg_rattle', combatsmg: 'smg_rattle', zapsmg: 'smg_rattle', compactsmg: 'smg_rattle',
  };
  // Duration of each one-shot animation phase in seconds
  const SHOOT_DUR = {
    bow_draw: 0, bow_draw_scoped: 0,  // continuous (hold-based, no one-shot timer)
    crossbow: 0.55, bolt_pull: 0.72, semi_sniper: 0.28,
    pump_cycle: 0.55, db_break: 0.48, drum_cycle: 0.22, tac_cycle: 0.18,
    pistol_flip: 0.30, launcher_heave: 0.55,
    minigun_spin: 0, smg_rattle: 0.14, ar_kick: 0.18,
  };

  // Trigger a shoot animation on a character. Called externally by combat/player/bots.
  // weaponModel: the model string (e.g. 'recurvebow'). holdStart: true when bow draw begins, false on release.
  CH.triggerShoot = function (ch, weaponModel, holdStart) {
    if (!ch) return;
    const sa = ch.shootAnim;
    const flavor = SHOOT_FLAVOR[weaponModel] || 'ar_kick';
    const isBow = flavor === 'bow_draw' || flavor === 'bow_draw_scoped';
    if (isBow) {
      sa.kind = flavor;
      sa.hold = holdStart !== false;  // false = release
      sa.t = 0;
      sa.dur = 0;
    } else {
      sa.kind = flavor;
      sa.t = 0;
      sa.dur = SHOOT_DUR[flavor] || 0.20;
      sa.hold = false;
    }
  };

  // Apply additive shoot-animation offsets directly on top of whatever targets are already set.
  // f = 0..1 normalized time within the animation. Returns true if it wants to override IK.
  function applyShootAnim(ch, s, dt) {
    const sa = ch.shootAnim;
    if (!sa || sa.kind === 'none') return false;

    const flavor = sa.kind;
    const isBow = flavor === 'bow_draw' || flavor === 'bow_draw_scoped';

    // Advance timer for timed anims
    if (!isBow && sa.dur > 0) {
      sa.t += dt;
      if (sa.t >= sa.dur) { sa.kind = 'none'; return false; }
    }

    const f = sa.dur > 0 ? U.clamp(sa.t / sa.dur, 0, 1) : 0;

    // ---- BOW DRAW (recurve & long bow) ----
    // Right hand holds bow grip (left side, held still).
    // Left hand pulls the string back — the further back, the harder the draw.
    // On hold=false (release), a fast snap-forward + arm extension happens.
    if (isBow) {
      if (sa.hold) {
        // Draw phase: clamp draw amount to 0..1 over 0.7s real time
        sa.t = Math.min(sa.t + dt, 0.7);
        const draw = U.clamp(sa.t / 0.7, 0, 1);
        // Ease in with smoothstep so first frame isn't a pop
        const d = U.smoothstep(0, 1, draw);
        // Right arm: holds bow out in front, elbow slightly down
        setT(ch, 'shoulderR', 1.35 + d * 0.10, -0.18, 0.28);
        setT(ch, 'forearmR', 0.18 - d * 0.10, 0, 0);
        // Left arm: pulls string back – shoulder swings BACK, forearm crooks sharply
        setT(ch, 'shoulderL', 1.25 + d * 0.05, 0.26 + d * 0.12, -0.22 - d * 0.30);
        setT(ch, 'forearmL', 1.10 + d * 0.85, 0, 0);
        // Body leans slightly left into the bow, head tilts to aim along the arrow
        setT(ch, 'spine', (s.pitch || 0) * 0.25, -0.32, d * 0.06);
        setT(ch, 'head', (s.pitch || 0) * 0.45 - 0.05, 0.16, -d * 0.08);
        // Hips square up, slight weight shift right
        ch.targets.pelvis.z = d * -0.08;
      } else {
        // Release phase: quick forward snap (0..0.25s) then settle back to idle
        sa.t += dt;
        if (sa.t > 0.38) { sa.kind = 'none'; return false; }
        const snapF = U.clamp(sa.t / 0.14, 0, 1);   // 0..1 over first 0.14s
        const settleF = U.clamp((sa.t - 0.14) / 0.24, 0, 1); // 0..1 over next 0.24s
        // String-arm snaps fully forward then settles
        const snap = snapF * (1 - settleF);
        setT(ch, 'shoulderL', 1.30 - snap * 0.90, 0.26 - snap * 0.26, -0.22 + snap * 0.22);
        setT(ch, 'forearmL', 1.95 - snap * 1.45, 0, 0);
        // Bow arm gets a little kick upward then drops back
        setT(ch, 'shoulderR', 1.45 + snap * 0.22, -0.18, 0.28);
        setT(ch, 'forearmR', 0.18, 0, 0);
        setT(ch, 'spine', (s.pitch || 0) * 0.25, -0.28, snap * 0.04);
        setT(ch, 'head', (s.pitch || 0) * 0.45, 0.18, 0);
      }
      return true; // override IK: bow uses direct bone targets, not gun IK
    }

    // ---- CROSSBOW ----
    // Rifle-like two-hand hold. After firing: right arm snaps up slightly (recoil),
    // then the left hand briefly slides back to mime re-cocking the string.
    if (flavor === 'crossbow') {
      // Phase 0-0.15: recoil snap up
      // Phase 0.15-0.45: string-pull (left arm pulls back)
      // Phase 0.45-0.55: return to ready
      const recoilF = U.smoothstep(0, 0.15 / sa.dur, f);
      const pullF   = U.smoothstep(0.15 / sa.dur, 0.45 / sa.dur, f);
      const returnF = U.smoothstep(0.45 / sa.dur, 1.0, f);
      // Right shoulder: slight upward kick on recoil
      ch.targets.shoulderR.x += recoilF * 0.22 - pullF * 0.10 - returnF * 0.12;
      // Left arm: slides forward during recoil, snaps back for string pull
      ch.targets.shoulderL.x += recoilF * 0.05 - pullF * 0.28 + returnF * 0.23;
      ch.targets.forearmL.x  += pullF * 0.55 - returnF * 0.55;
      // Body: tiny lean back on recoil
      ch.targets.spine.x     -= recoilF * 0.08 - returnF * 0.08;
      return false;
    }

    // ---- BOLT-ACTION SNIPER ----
    // After the shot: right hand lifts, rotates thumb inward (bolt lift), pulls back, pushes forward, drops back.
    if (flavor === 'bolt_pull') {
      // 4 sub-phases: 0-0.18 lift bolt  |  0.18-0.38 pull back  |  0.38-0.56 push forward  |  0.56-0.72 back to ready
      const dur = sa.dur;
      const liftF   = U.smoothstep(0, 0.18 / dur, f) * (1 - U.smoothstep(0.38 / dur, 0.56 / dur, f));
      const pullF   = U.smoothstep(0.18 / dur, 0.38 / dur, f) * (1 - U.smoothstep(0.38 / dur, 0.55 / dur, f));
      const pushF   = U.smoothstep(0.38 / dur, 0.56 / dur, f) * (1 - U.smoothstep(0.56 / dur, 0.72 / dur, f));
      // Right hand lifts to operate bolt
      ch.targets.shoulderR.x += liftF * 0.55 - pullF * 0.20;
      ch.targets.forearmR.x  += liftF * (-0.35);
      ch.targets.shoulderR.y += liftF * 0.12 - pullF * 0.06;
      // Bolt pulls the elbow back
      ch.targets.shoulderR.x += pullF * (-0.38);
      ch.targets.forearmR.x  += pullF * 0.30;
      // Push forward
      ch.targets.shoulderR.x += pushF * 0.28;
      ch.targets.forearmR.x  -= pushF * 0.18;
      // Slight body rotation with the bolt action (natural)
      ch.targets.spine.y     += liftF * 0.06 - pullF * 0.04;
      return false;
    }

    // ---- SEMI-AUTO SNIPER ----
    // Quick recoil snap up + forward settle, no bolt action.
    if (flavor === 'semi_sniper') {
      const kickF   = U.smoothstep(0, 0.12 / sa.dur, f);
      const settleF = U.smoothstep(0.12 / sa.dur, 1.0, f);
      ch.targets.shoulderR.x += kickF * 0.28 - settleF * 0.28;
      ch.targets.shoulderL.x += kickF * 0.10 - settleF * 0.10;
      ch.targets.spine.x     -= kickF * 0.10 - settleF * 0.10;
      return false;
    }

    // ---- PUMP SHOTGUN ----
    // After shot: left hand slides forward on barrel (pump extends), then snaps back sharply.
    if (flavor === 'pump_cycle') {
      const extendF = U.smoothstep(0, 0.30 / sa.dur, f);
      const rackF   = U.smoothstep(0.30 / sa.dur, 0.55 / sa.dur, f);
      // Right arm: recoil kick
      ch.targets.shoulderR.x += extendF * 0.18 - rackF * 0.18;
      ch.targets.spine.x     -= extendF * 0.10 - rackF * 0.10;
      // Left hand: pump slide — move forearm forward then snap back
      ch.targets.shoulderL.x += extendF * (-0.20) + rackF * 0.20;
      ch.targets.forearmL.x  += extendF * 0.45 - rackF * 0.45;
      return false;
    }

    // ---- DOUBLE BARREL ----
    // Massive kick (two barrels), body leans back, both arms absorb.
    if (flavor === 'db_break') {
      const kickF   = U.smoothstep(0, 0.18 / sa.dur, f);
      const settleF = U.smoothstep(0.18 / sa.dur, 1.0, f);
      ch.targets.shoulderR.x += kickF * 0.55 - settleF * 0.55;
      ch.targets.shoulderL.x += kickF * 0.30 - settleF * 0.30;
      ch.targets.forearmR.x  -= kickF * 0.20 - settleF * 0.20;
      ch.targets.spine.x     -= kickF * 0.22 - settleF * 0.22;
      ch.targets.head.x      += kickF * 0.14 - settleF * 0.14;
      return false;
    }

    // ---- DRUM / AUTO SHOTGUN / TAC SHOTGUN ----
    if (flavor === 'drum_cycle' || flavor === 'tac_cycle') {
      const mag = flavor === 'drum_cycle' ? 0.22 : 0.28;
      const kickF   = U.smoothstep(0, 0.5, f);
      const settleF = U.smoothstep(0.5, 1.0, f);
      ch.targets.shoulderR.x += kickF * mag - settleF * mag;
      ch.targets.spine.x     -= kickF * 0.07 - settleF * 0.07;
      return false;
    }

    // ---- PISTOL / REVOLVER / HAND CANNON ----
    // Single-handed flip: right arm snaps upward sharply, rotates at wrist, drops back.
    if (flavor === 'pistol_flip') {
      const kickF   = U.smoothstep(0, 0.12 / sa.dur, f);
      const settleF = U.smoothstep(0.12 / sa.dur, 1.0, f);
      // Strong upward kick from the wrist — forearm snaps up, upper arm absorbs less
      ch.targets.shoulderR.x += kickF * 0.35 - settleF * 0.35;
      ch.targets.forearmR.x  -= kickF * 0.55 - settleF * 0.55;
      // Left hand: guard/offhand drifts slightly with the recoil
      ch.targets.shoulderL.x += kickF * 0.08 - settleF * 0.08;
      ch.targets.spine.x     -= kickF * 0.08 - settleF * 0.08;
      return false;
    }

    // ---- ROCKET / GRENADE LAUNCHER ----
    // Heavy push straight back into the shoulder, body heaves rearward.
    if (flavor === 'launcher_heave') {
      const kickF   = U.smoothstep(0, 0.20 / sa.dur, f);
      const settleF = U.smoothstep(0.20 / sa.dur, 1.0, f);
      ch.targets.shoulderR.x -= kickF * 0.30 - settleF * 0.30;
      ch.targets.shoulderL.x -= kickF * 0.25 - settleF * 0.25;
      ch.targets.forearmR.x  += kickF * 0.15 - settleF * 0.15;
      ch.targets.spine.x     -= kickF * 0.18 - settleF * 0.18;
      ch.targets.head.x      += kickF * 0.12 - settleF * 0.12;
      return false;
    }

    // ---- MINIGUN ----
    // Constant barrel-spinning shake. We use a continuous vibration, no one-shot phase.
    if (flavor === 'minigun_spin') {
      const t = FN.Engine.time;
      const shake = Math.sin(t * 42) * 0.04;
      const shakeZ = Math.cos(t * 38) * 0.025;
      ch.targets.shoulderR.x += shake; ch.targets.shoulderL.x += shake * 0.7;
      ch.targets.spine.x     += shake * 0.04; ch.targets.spine.z += shakeZ * 0.03;
      return false;
    }

    // ---- SMG RATTLE ----
    // Fast, snappy micro-recoil.
    if (flavor === 'smg_rattle') {
      const kickF   = U.smoothstep(0, 0.07 / sa.dur, f);
      const settleF = U.smoothstep(0.07 / sa.dur, 1.0, f);
      ch.targets.shoulderR.x += kickF * 0.14 - settleF * 0.14;
      ch.targets.forearmR.x  -= kickF * 0.10 - settleF * 0.10;
      ch.targets.spine.x     -= kickF * 0.05 - settleF * 0.05;
      return false;
    }

    // ---- DEFAULT AR KICK ----
    if (flavor === 'ar_kick') {
      const kickF   = U.smoothstep(0, 0.09 / sa.dur, f);
      const settleF = U.smoothstep(0.09 / sa.dur, 1.0, f);
      ch.targets.shoulderR.x += kickF * 0.20 - settleF * 0.20;
      ch.targets.spine.x     -= kickF * 0.08 - settleF * 0.08;
      return false;
    }

    return false;
  }

  // s: {move:0..1, sprint, crouch, grounded, air(vertical vel), aim, pitch, weapon:'none'|'pickaxe'|'rifle'|'pistol'|'launcher'|'sniper'|'item', swing:0..1|null, skydive:{dive,turn}, glide:{turn}, dead, recoil, hurt, weaponModel:string}
  CH.animate = function (ch, s, dt) {
    // Death: freeze the body exactly in the pose it had at the moment of death.
    // No targets, no damping, no IK - the mesh becomes a static statue for the
    // death-FX overlay (CH.updateDeath) to dissolve.
    if (s.dead) { if (ch.weaponMesh) ch.weaponMesh.visible = false; return; }
    const a = ch.anim; resetTargets(ch);
    a.phase += dt * (s.sprint ? 11.5 : 9.0) * (s.move > 0.05 && s.grounded ? 1 : 0);
    const ph = a.phase; const sw = Math.sin(ph), cs = Math.cos(ph);
    let bodyY = 0, lean = 0;
    const hold = s.weapon && s.weapon !== 'none';
    const gunIK = ch.weaponKind === 'gun' && ch.weaponMesh && (s.weapon === 'rifle' || s.weapon === 'sniper' || s.weapon === 'pistol' || s.weapon === 'launcher');
    if (s.skydive) {
      const dive = s.skydive.dive; lean = -(0.85 + dive * 0.75);
      setT(ch, 'shoulderL', 0.25, 0, -1.25); setT(ch, 'shoulderR', 0.25, 0, 1.25); setT(ch, 'forearmL', 0.35, 0, -0.2); setT(ch, 'forearmR', 0.35, 0, 0.2);
      setT(ch, 'thighL', -0.3, 0, -0.35); setT(ch, 'thighR', -0.3, 0, 0.35); setT(ch, 'shinL', -0.7, 0, 0); setT(ch, 'shinR', -0.7, 0, 0);
      setT(ch, 'head', 0.55, 0, 0); setT(ch, 'spine', 0.1, s.skydive.turn * 0.2, 0);
      ch.targets.pelvis.z = s.skydive.turn * -0.35;
    } else if (s.glide) {
      setT(ch, 'shoulderL', 2.55, 0, -0.3); setT(ch, 'shoulderR', 2.55, 0, 0.3); setT(ch, 'forearmL', 0.35, 0, 0); setT(ch, 'forearmR', 0.35, 0, 0);
      setT(ch, 'thighL', 0.25 + Math.sin(FN.Engine.time * 1.7) * 0.06, 0, -0.08); setT(ch, 'thighR', 0.2 - Math.sin(FN.Engine.time * 1.7) * 0.06, 0, 0.08); setT(ch, 'shinL', -0.5, 0, 0); setT(ch, 'shinR', -0.55, 0, 0);
      setT(ch, 'head', 0.1, 0, 0); lean = -0.12; ch.targets.pelvis.z = (s.glide.turn || 0) * -0.3;
    } else if (s.dead) {
      // handled by the early freeze above
    } else {
      if (!s.grounded) {
        const up = s.air > 1 ? 1 : 0;
        setT(ch, 'thighL', 0.55 + up * 0.3, 0, -0.08); setT(ch, 'thighR', -0.25, 0, 0.08); setT(ch, 'shinL', -1.1, 0, 0); setT(ch, 'shinR', -0.8, 0, 0);
        if (!hold) { setT(ch, 'shoulderL', 0.5, 0, -0.5); setT(ch, 'shoulderR', 0.5, 0, 0.5); setT(ch, 'forearmL', 0.6, 0, 0); setT(ch, 'forearmR', 0.6, 0, 0); }
      } else if (s.move > 0.05) {
        const amp = (s.sprint ? 1.0 : 0.72) * U.clamp(s.move, 0.3, 1); const crouchF = s.crouch ? 0.55 : 1;
        setT(ch, 'thighL', sw * amp * crouchF, 0, 0); setT(ch, 'thighR', -sw * amp * crouchF, 0, 0);
        setT(ch, 'shinL', -(0.15 + Math.max(0, -sw) * amp * 1.25), 0, 0); setT(ch, 'shinR', -(0.15 + Math.max(0, sw) * amp * 1.25), 0, 0);
        bodyY = Math.abs(cs) * 0.035 * amp; lean = s.sprint ? -0.22 : -0.08;
        if (!hold) { setT(ch, 'shoulderL', -sw * amp * 0.85, 0, -0.12); setT(ch, 'shoulderR', sw * amp * 0.85, 0, 0.12); setT(ch, 'forearmL', 0.55, 0, 0); setT(ch, 'forearmR', 0.55, 0, 0); }
      } else {
        const br = Math.sin(FN.Engine.time * 2.2) * 0.02; setT(ch, 'spine', br, 0, 0);
        if (!hold) { setT(ch, 'shoulderL', 0.05, 0, -0.1 - br); setT(ch, 'shoulderR', 0.05, 0, 0.1 + br); setT(ch, 'forearmL', 0.25, 0, 0); setT(ch, 'forearmR', 0.25, 0, 0); }
        setT(ch, 'thighL', 0, 0, -0.03); setT(ch, 'thighR', 0, 0, 0.03);
      }
      if (s.crouch) { bodyY -= 0.42; setT(ch, 'thighL', ch.targets.thighL.x + 1.1, 0, -0.15); setT(ch, 'thighR', ch.targets.thighR.x + 1.1, 0, 0.15); setT(ch, 'shinL', ch.targets.shinL.x - 1.5, 0, 0); setT(ch, 'shinR', ch.targets.shinR.x - 1.5, 0, 0); setT(ch, 'footL', 0.4, 0, 0); setT(ch, 'footR', 0.4, 0, 0); lean -= 0.25; }
      const pitch = s.pitch || 0;
      if (s.weapon === 'pickaxe') {
        const t = (s.swing === null || s.swing === undefined) ? -1 : s.swing;
        if (t >= 0) {
          const k = t < 0.35 ? 1.7 + (t / 0.35) * 0.8 : 2.5 - ((t - 0.35) / 0.65) * 2.2;
          setT(ch, 'shoulderR', k, 0.1, 0.3); setT(ch, 'forearmR', 0.6, 0, 0);
          setT(ch, 'spine', (t < 0.35 ? 0.12 : -0.25), (t < 0.35 ? 0.3 : -0.2), 0);
        } else { setT(ch, 'shoulderR', 0.95, 0.05, 0.25); setT(ch, 'forearmR', 0.8, 0, 0); }
      } else if (gunIK) {
        // torso: slight bladed stance, lean into the aim pitch; arms come from IK below
        setT(ch, 'spine', ch.targets.spine.x + pitch * 0.25, s.aim ? -0.18 : -0.28, 0); setT(ch, 'head', pitch * 0.45, s.aim ? 0.14 : 0.24, 0);
      } else if (s.weapon === 'item') {
        setT(ch, 'shoulderR', 1.0, 0.5, 0.2); setT(ch, 'forearmR', 1.9, 0, 0); setT(ch, 'head', -0.25, 0, 0);
      }
      if (s.hurt) { lean -= 0.1 * s.hurt; }
    }

    // Apply shoot animation offsets. For bows this also sets the base targets directly.
    // bowOverride = true means the bow pose has fully set shoulderL/R + forearmL/R already,
    // so we must skip the gun IK pass and use direct bone targets instead.
    const bowOverride = !s.dead && !s.skydive && !s.glide && hold ? applyShootAnim(ch, s, dt) : false;

    

    const lam = s.snap ? 1e9 : 16;
    for (const n of BONES) { const b = ch.bones[n]; const t = ch.targets[n]; b.rotation.x = U.damp(b.rotation.x, t.x, lam, dt); b.rotation.y = U.damp(b.rotation.y, t.y, lam, dt); b.rotation.z = U.damp(b.rotation.z, t.z, lam, dt); }
    const pel = ch.bones.pelvis; pel.position.y = U.damp(pel.position.y, 0.98 + bodyY, lam, dt); pel.rotation.x = U.damp(pel.rotation.x, lean, lam, dt);
    pel.rotation.z = U.damp(pel.rotation.z, (s.skydive || s.glide) ? ch.targets.pelvis.z : 0, 6, dt);
    if (ch.weaponMesh) ch.weaponMesh.visible = !!hold && !s.dead;

    // ---- IK pass: hands onto the weapon ----
    if (!s.dead && !s.skydive && s.glide) {
      // grip the glider control bar: bar sits 1.2 below the canopy root (y=3.3),
      // grips at x=±0.3. Solving in group space makes hands follow the bar while banking.
      ch.group.updateMatrixWorld(true);
      ch.group.getWorldQuaternion(qSock); vFwd.set(0, 0, -1).applyQuaternion(qSock); vRight.set(1, 0, 0).applyQuaternion(qSock);
      ch.bones.shoulderR.getWorldPosition(vS); vPole.copy(vS).addScaledVector(vRight, 0.35).addScaledVector(vFwd, 0.1); vPole.y -= 0.9;
      vGrip.set(0.3, 2.1, 0); ch.group.localToWorld(vGrip);
      solveArm(ch, 'R', vGrip, vPole, null);
      ch.bones.shoulderL.getWorldPosition(vS); vPole.copy(vS).addScaledVector(vRight, -0.35).addScaledVector(vFwd, 0.1); vPole.y -= 0.9;
      vGrip.set(-0.3, 2.1, 0); ch.group.localToWorld(vGrip);
      solveArm(ch, 'L', vGrip, vPole, null);
    } else if (!s.dead && !s.skydive && !s.glide && hold) {
      ch.group.getWorldQuaternion(qSock); vFwd.set(0, 0, -1).applyQuaternion(qSock); vRight.set(1, 0, 0).applyQuaternion(qSock);
      if (gunIK && !bowOverride) {
        const kind = s.weapon === 'rifle' || s.weapon === 'sniper' ? (s.weapon === 'sniper' ? 'sniper' : 'rifle') : s.weapon;
        const sp = SOCKET[kind] || SOCKET.rifle; ch.aimF = U.damp(ch.aimF, s.aim ? 1 : 0, 10, dt);
        const P0 = sp.hip, P1 = sp.aim; const f = ch.aimF; const ws = ch.wsocket;
        const recoil = (s.recoil || 0) * 0.05;
        ws.position.set(U.lerp(P0[0], P1[0], f), U.lerp(P0[1], P1[1], f), U.lerp(P0[2], P1[2], f) + recoil);
        const spine = ch.bones.spine;
        ws.rotation.set((s.pitch || 0) * 0.85 - spine.rotation.x - pel.rotation.x, U.lerp(P0[3], P1[3], f) - spine.rotation.y, 0);
        ch.group.updateMatrixWorld(true);
        const g = ch.grip; vGrip.set(g.r[0], g.r[1], g.r[2]); ws.localToWorld(vGrip); vFore.set(g.l[0], g.l[1], g.l[2]); ws.localToWorld(vFore);
        ws.getWorldQuaternion(qSock);
        ch.bones.shoulderR.getWorldPosition(vS); vPole.copy(vS).addScaledVector(vRight, 0.35).addScaledVector(vFwd, -0.25); vPole.y -= 0.9;
        solveArm(ch, 'R', vGrip, vPole, qSock);
        ch.bones.shoulderL.getWorldPosition(vS); vPole.copy(vS).addScaledVector(vRight, -0.25).addScaledVector(vFwd, 0.15); vPole.y -= 0.9;
        solveArm(ch, 'L', vFore, vPole, qSock);
      } else if (ch.weaponKind === 'pickaxe' && ch.weaponMesh) {
        // left hand grabs the pickaxe handle held by the right hand
        ch.group.updateMatrixWorld(true);
        vHandle.set(0, 0.42, 0); ch.weaponMesh.localToWorld(vHandle);
        ch.bones.shoulderL.getWorldPosition(vS); vPole.copy(vS).addScaledVector(vRight, -0.3).addScaledVector(vFwd, 0.1); vPole.y -= 0.9;
        solveArm(ch, 'L', vHandle, vPole, null);
      }
    }
  };
  CH.headPos = function (ch, out) { ch.bones.head.getWorldPosition(out || ch.headWorld); return out || ch.headWorld; };

  // Elimination hologram drone: quad body + projector beam + floating scan cubes.
  // Hidden until death; fades in together with the blue grid overlay (like Fortnite).
  function buildDroneMesh() {
    const g = new THREE.Group();
    const mats = [];
    const addMat = (m, base) => { m.transparent = true; m.opacity = 0; m.depthWrite = false; m.userData.base = base; mats.push(m); return m; };
    const bodyMat = addMat(new THREE.MeshLambertMaterial({ color: 0x39424e }), 1);
    const armsMat = bodyMat;
    const body = new THREE.Mesh(G.box(0.5, 0.16, 0.5), bodyMat);
    const arms = new THREE.Mesh(G.merge([G.box(0.95, 0.05, 0.08, 0, 0.02, 0.24), G.box(0.95, 0.05, 0.08, 0, 0.02, -0.24), G.box(0.08, 0.05, 0.95, 0.24, 0.06, 0), G.box(0.08, 0.05, 0.95, -0.24, 0.06, 0)]), armsMat);
    const drone = new THREE.Group(); drone.add(body); drone.add(arms);
    const props = [];
    for (const s of [[0.45, 0.45], [-0.45, 0.45], [0.45, -0.45], [-0.45, -0.45]]) {
      const pm = addMat(new THREE.MeshBasicMaterial({ color: 0xbfdcff }), 0.9);
      const rotor = new THREE.Mesh(G.cyl(0.24, 0.24, 0.03, 10, 0, 0, 0), pm); rotor.position.set(s[0], 0.1, s[1]);
      props.push(rotor); drone.add(rotor);
    }
    const lamp = new THREE.Mesh(G.sphere(0.09, 8, 0, -0.12, 0), addMat(new THREE.MeshBasicMaterial({ color: 0xd8efff }), 1));
    drone.add(lamp);
    drone.position.set(0, 3.05, 0.35); drone.rotation.x = -0.15;
    g.add(drone);
    // projector beam: narrow at the drone, wide over the body
    const beamMat = addMat(new THREE.MeshBasicMaterial({ color: 0x7ec8ff, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }), 0.55);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 1.55, 2.75, 20, 1, true), beamMat);
    beam.position.set(0, 1.62, 0.18); beam.renderOrder = 6;
    g.add(beam);
    // floating scan cubes around the body
    const cubeMat = addMat(new THREE.MeshBasicMaterial({ color: 0x9fdcff, blending: THREE.AdditiveBlending }), 0.95);
    const cubes = [];
    for (const c of [[-0.55, 1.35, 0.1], [0.5, 1.7, -0.15], [0.15, 1.05, 0.45], [-0.3, 1.85, -0.4]]) {
      const cube = new THREE.Mesh(G.box(0.14, 0.14, 0.14), cubeMat); cube.position.set(c[0], c[1], c[2]); cube.renderOrder = 6;
      cubes.push(cube); g.add(cube);
    }
    g.userData = { mats, props, drone, cubes, beam };
    return g;
  }

  // ---------- death FX (identical code path for player and bots) ----------
  // Phase A (1.5s): body frozen at the exact death pose; original colors fade
  // out while a blue grid overlay fades in. Phase B (1.0s): hold as a blue grid
  // ghost. Phase C (0.4s): everything fades out; caller removes the entity
  // afterwards. The dying body is a pure ghost: raycasts skip dead entities and
  // no AI/animation ticks run on it.
  const DEATH_WHITE = new THREE.Color(1, 1, 1), DEATH_BLUE = new THREE.Color(0x2456e0);
  const DEATH_BODY_OPACITY = 0.25; // translucent blue body under the grid overlay
  CH.beginDeath = function (ch) {
    if (!ch || ch.deathFx) return;
    ch.deathFx = { t: 0, A: 1.5, B: 1.0, C: 0.4 };
    ch.bodyMat.transparent = true;
    ch.bodyMat.color.copy(DEATH_WHITE);
    ch.bodyMat.opacity = 1;
    for (const g of ch.grids) { g.visible = true; g.material.opacity = 0; g.material.color.copy(DEATH_BLUE); }
    if (ch.weaponMesh) ch.weaponMesh.visible = false;
  };
  // Returns true once the whole sequence finished and the body is fully faded.
  CH.updateDeath = function (ch, dt) {
    const d = ch.deathFx;
    if (!d) return true;
    d.t += dt;
    // Phase A: freeze + dissolve-in (1.5s) — colors fade out, grid fades in.
    if (d.t <= d.A) {
      const f = U.smoothstep(0, 1, d.t / d.A);
      ch.bodyMat.color.copy(DEATH_WHITE).lerp(DEATH_BLUE, f);
      ch.bodyMat.opacity = 1 - (1 - DEATH_BODY_OPACITY) * f;
      for (const g of ch.grids) g.material.opacity = f;
      return false;
    }
    // Phase B: hold as blue grid ghost (1s).
    if (d.t <= d.A + d.B) {
      ch.bodyMat.color.copy(DEATH_BLUE);
      ch.bodyMat.opacity = DEATH_BODY_OPACITY;
      for (const g of ch.grids) g.material.opacity = 1;
      return false;
    }
    // Phase C: fast fade-out (0.4s).
    const f = U.clamp((d.t - d.A - d.B) / d.C, 0, 1);
    ch.bodyMat.opacity = DEATH_BODY_OPACITY * (1 - f);
    for (const g of ch.grids) g.material.opacity = 1 - f;
    return d.t >= d.A + d.B + d.C;
  };
  // Restore materials so a pooled mesh can be reused after a death sequence.
  CH.endDeath = function (ch) {
    if (!ch) return;
    ch.deathFx = null;
    ch.bodyMat.color.copy(DEATH_WHITE);
    ch.bodyMat.opacity = 1;
    for (const g of ch.grids) { g.material.opacity = 0; g.visible = false; }
  };
  FN.Character = CH;
})();