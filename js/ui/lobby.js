// Season 2 winter lobby: 3D snowy scene with the player's character on the glowing pad + the HTML overlay.
window.FN = window.FN || {};
(function () {
  const U = FN.U, G = FN.GeoUtil;
  const LB = { visible: false, mode: 'solo', name: 'Bardeezie', ready: false };
  const MODES = ['solo', 'duo', 'squad', 'training']; const MODE_LABEL = { solo: 'SOLO', duo: 'DUOS', squad: 'SQUADS', training: 'TRAINING' };
  // ---------- progression (localStorage) ----------
  const PR = { level: 10, xp: 628, tier: 4, stars: 2, wins: 0, matches: 0, kills: 0 };
  PR.load = function () { try { const s = JSON.parse(localStorage.getItem('fnog_progress') || '{}'); Object.assign(PR, s); } catch (e) { } };
  PR.save = function () { try { const { level, xp, tier, stars, wins, matches, kills, name, skin } = PR; localStorage.setItem('fnog_progress', JSON.stringify({ level, xp, tier, stars, wins, matches, kills, name, skin })); } catch (e) { } };
  PR.record = function (r) { PR.matches++; PR.kills += r.kills; if (r.win) PR.wins++; PR.xp += 100 + r.kills * 50 + Math.floor(r.survived / 10) + (r.win ? 500 : 0) + Math.max(0, 100 - r.placement * 3); while (PR.xp >= 1000) { PR.xp -= 1000; PR.level++; PR.stars++; if (PR.stars >= 10) { PR.stars -= 10; PR.tier++; } } PR.save(); };
  FN.Progress = PR;

  LB.init = function () {
    PR.load(); if (PR.name) LB.name = PR.name; if (PR.skin) LB.skin = PR.skin; LB.skin = LB.skin || 'jonesy';
    LB.scene = new THREE.Scene(); LB.scene.background = new THREE.Color(0xc9dcec); LB.scene.fog = new THREE.Fog(0xc9dcec, 30, 140);
    const s = LB.scene;
    s.add(new THREE.HemisphereLight(0xdfe9f5, 0x8a9bb0, 1.1)); const dl = new THREE.DirectionalLight(0xfff0e0, 1.2); dl.position.set(-20, 40, 20); dl.castShadow = true; dl.shadow.mapSize.set(2048, 2048); const sc = dl.shadow.camera; sc.left = -30; sc.right = 30; sc.top = 30; sc.bottom = -30; sc.far = 120; s.add(dl);
    // snowy ground
    const gt = FN.Tex.make('snow', 256, 256, (ctx, w, h) => { ctx.fillStyle = '#eef3f8'; ctx.fillRect(0, 0, w, h); for (let i = 0; i < 3000; i++) { ctx.fillStyle = 'rgba(180,200,225,' + Math.random() * 0.25 + ')'; ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2); } }); gt.repeat.set(30, 30);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshLambertMaterial({ map: gt })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; s.add(ground);
    // snow mounds
    for (let i = 0; i < 14; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(3 + Math.random() * 6, 10, 8), new THREE.MeshLambertMaterial({ color: 0xf2f6fa })); m.position.set((Math.random() - 0.5) * 120, -2 - Math.random() * 3, -20 - Math.random() * 60); m.scale.y = 0.5; s.add(m); }
    // pines with snow
    const pineTrunk = G.cyl(0.3, 0.5, 4, 7, 0, 2, 0); const pineCanopy = G.merge([G.cone(2.8, 4.2, 8, 0, 4.6, 0), G.cone(2.2, 3.8, 8, 0, 7.0, 0), G.cone(1.5, 3.2, 8, 0, 9.2, 0)]);
    const snowCaps = G.merge([G.cone(2.85, 1.3, 8, 0, 6.2, 0), G.cone(2.25, 1.2, 8, 0, 8.4, 0), G.cone(1.55, 1.1, 8, 0, 10.3, 0)]);
    const r = U.mulberry32(5);
    for (let i = 0; i < 40; i++) {
      const x = (r() - 0.5) * 140, z = -12 - r() * 70; if (Math.abs(x) < 9 && z > -25) continue; const sc = 0.7 + r() * 0.8;
      const grp = new THREE.Group(); grp.add(new THREE.Mesh(pineTrunk, new THREE.MeshLambertMaterial({ color: 0x5a3d22 }))); grp.add(new THREE.Mesh(pineCanopy, new THREE.MeshLambertMaterial({ color: 0x2f6b34 }))); grp.add(new THREE.Mesh(snowCaps, new THREE.MeshLambertMaterial({ color: 0xf4f8fc })));
      grp.position.set(x, 0, z); grp.scale.setScalar(sc); grp.traverse(o => { o.castShadow = true; }); s.add(grp);
    }
    // log cabin
    const cabin = G.coloredMesh([{ geo: G.box(9, 4, 6, 0, 2, 0), color: 0x7a4a2a }, { geo: G.box(9.6, 0.4, 6.6, 0, 4.1, 0), color: 0xf4f8fc }, { geo: new THREE.CylinderGeometry(0.01, 4.9, 2.6, 4, 1).rotateY(Math.PI / 4).translate(0, 5.5, 0), color: 0xf4f8fc }, { geo: G.box(1.2, 2.2, 0.2, 2.2, 1.1, 3.05), color: 0x3a2a1a }, { geo: G.box(1.4, 1.2, 0.2, -2, 2.4, 3.05), color: 0xffe9a0 }, { geo: G.box(1.0, 2.0, 1.0, 3, 5.2, -1.5), color: 0x8a8a8a }]);
    cabin.position.set(10, 0, -24); cabin.rotation.y = -0.4; s.add(cabin);
    // christmas tree
    const tree = new THREE.Group(); tree.add(new THREE.Mesh(G.cyl(0.35, 0.5, 2, 7, 0, 1, 0), new THREE.MeshLambertMaterial({ color: 0x5a3d22 })));
    tree.add(new THREE.Mesh(G.merge([G.cone(3.6, 4.5, 9, 0, 3.6, 0), G.cone(2.9, 4.0, 9, 0, 6.4, 0), G.cone(2.1, 3.6, 9, 0, 8.8, 0), G.cone(1.3, 3.0, 9, 0, 10.8, 0)]), new THREE.MeshLambertMaterial({ color: 0x2f7a35 })));
    const lights = []; for (let i = 0; i < 90; i++) { const t = i / 90; const y = 2 + t * 10; const rad = 3.6 * (1 - t * 0.85) + 0.2; const a = i * 0.9; const m = new THREE.Mesh(new THREE.SphereGeometry(0.14, 6, 6), new THREE.MeshBasicMaterial({ color: [0xff4040, 0x40ff60, 0x4080ff, 0xffe040][i % 4] })); m.position.set(Math.cos(a) * rad, y, Math.sin(a) * rad); tree.add(m); lights.push(m); }
    const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.7, 0), new THREE.MeshBasicMaterial({ color: 0xffe36a })); star.position.y = 12.6; star.scale.set(1, 1.4, 0.4); tree.add(star);
    const starGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: FN.Tex.glow(), color: 0xffe36a, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending })); starGlow.scale.set(4, 4, 1); starGlow.position.y = 12.6; tree.add(starGlow);
    tree.position.set(14, 0, -9); tree.traverse(o => { o.castShadow = true; }); s.add(tree); LB.tree = tree; LB.lights = lights;
    // presents
    const pres = [[0xd8302a, 0xffe36a], [0x2f6fd8, 0xffffff], [0x3aa35a, 0xd8302a], [0xb15be2, 0xffffff]];
    pres.forEach((c, i) => { const g = G.coloredMesh([{ geo: G.box(1.2, 1.0, 1.2, 0, 0.5, 0), color: c[0] }, { geo: G.box(1.25, 1.05, 0.25, 0, 0.5, 0), color: c[1] }, { geo: G.box(0.25, 1.05, 1.25, 0, 0.5, 0), color: c[1] }]); g.position.set(11 + (i % 2) * 2.2, 0, -5 + Math.floor(i / 2) * 2); g.rotation.y = i * 0.6; s.add(g); });
    // candy canes
    const caneTex = FN.Tex.make('cane', 64, 64, (ctx, w, h) => { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#d8302a'; for (let i = -64; i < 128; i += 24) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + 12, 0); ctx.lineTo(i + 12 + 64, 64); ctx.lineTo(i + 64, 64); ctx.fill(); } }); caneTex.repeat.set(1, 3);
    for (let i = 0; i < 8; i++) { const g = new THREE.Group(); const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 5.5, 10), new THREE.MeshLambertMaterial({ map: caneTex })); cyl.position.y = 2.75; g.add(cyl); const hook = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.28, 8, 12, Math.PI), new THREE.MeshLambertMaterial({ map: caneTex })); hook.position.set(0.9, 5.5, 0); g.add(hook); const x = i < 4 ? -14 - i * 3.2 : 20 + (i - 4) * 3.2; g.position.set(x, 0, -14 + (i % 2) * 6); g.rotation.z = (i % 2 ? 0.08 : -0.08); g.traverse(o => { o.castShadow = true; }); s.add(g); }
    // snowman
    const snowman = G.coloredMesh([{ geo: G.sphere(1.3, 10, 0, 1.2, 0), color: 0xf4f8fc }, { geo: G.sphere(0.95, 10, 0, 2.9, 0), color: 0xf4f8fc }, { geo: G.sphere(0.7, 10, 0, 4.2, 0), color: 0xf4f8fc }, { geo: G.cone(0.12, 0.7, 6, 0, 0, 0).rotateX(-Math.PI / 2).translate(0, 4.2, -0.9), color: 0xff8c1a }, { geo: G.box(0.14, 0.14, 0.1, -0.25, 4.4, -0.66), color: 0x222 }, { geo: G.box(0.14, 0.14, 0.1, 0.25, 4.4, -0.66), color: 0x222 }, { geo: G.cyl(0.7, 0.7, 0.12, 12, 0, 4.9, 0), color: 0x222 }, { geo: G.cyl(0.45, 0.45, 0.7, 12, 0, 5.3, 0), color: 0x222 }]);
    snowman.position.set(-13, 0, -6); snowman.rotation.y = 0.5; s.add(snowman);
    // platforms (glowing pads)
    LB.pads = [];
    for (let i = 0; i < 3; i++) {
      const x = [0, -6.5, 6.5][i]; const pad = new THREE.Group();
      const base = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.2, 0.35, 32), new THREE.MeshLambertMaterial({ color: 0xdfe6ee })); base.position.y = 0.17; base.receiveShadow = true; pad.add(base);
      const glowRing = new THREE.Mesh(new THREE.RingGeometry(1.4, 2.0, 32), new THREE.MeshBasicMaterial({ color: i === 0 ? 0x66e0ff : 0xaad8ff, transparent: true, opacity: i === 0 ? 0.9 : 0.35, side: THREE.DoubleSide })); glowRing.rotation.x = -Math.PI / 2; glowRing.position.y = 0.36; pad.add(glowRing);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: FN.Tex.glow(), color: 0x7fe0ff, transparent: true, opacity: i === 0 ? 0.6 : 0.2, depthWrite: false, blending: THREE.AdditiveBlending })); glow.scale.set(6, 3, 1); glow.position.y = 0.6; pad.add(glow);
      // fairy lights around the pad
      for (let k = 0; k < 20; k++) { const a = k / 20 * Math.PI * 2; const m = new THREE.Mesh(new THREE.SphereGeometry(0.08, 5, 5), new THREE.MeshBasicMaterial({ color: 0xffe9a0 })); m.position.set(Math.cos(a) * 2.3, 0.3, Math.sin(a) * 2.3); pad.add(m); }
      pad.position.set(x, 0, 0); s.add(pad); LB.pads.push(pad);
    }
    // snow particles
    const N = 1500; const pos = new Float32Array(N * 3); for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - 0.5) * 80; pos[i * 3 + 1] = Math.random() * 30; pos[i * 3 + 2] = (Math.random() - 0.5) * 80 - 10; }
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); LB.snow = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0xffffff, size: 0.18, transparent: true, opacity: 0.9, map: FN.Tex.softDot(), depthWrite: false })); s.add(LB.snow);
    // character
    LB.setSkin(LB.skin);
    LB.buildUI();
  };
  LB.setSkin = function (id) {
    if (LB.char) LB.scene.remove(LB.char.group);
    LB.skin = id; LB.char = FN.Character.create(id); LB.char.group.position.set(0, 0.35, 0); LB.char.group.rotation.y = Math.PI; LB.scene.add(LB.char.group);
    PR.skin = id; PR.save(); if (FN.Player && FN.Player.setSkin) FN.Player.setSkin(id);
    document.querySelectorAll('.skin-card').forEach(el => el.classList.toggle('sel', el.dataset.id === id));
  };
  // ---------- UI ----------
  LB.buildUI = function () {
    const el = document.createElement('div'); el.id = 'lobby'; el.style.display = 'none';
    el.innerHTML = `
      <div class="lb-top">
        <div class="lb-logo">FORTNITE</div>
        <div class="lb-tabs"><span class="pad">LB</span><span class="tab sel" data-tab="lobby">LOBBY</span><span class="tab" data-tab="pass">BATTLE PASS</span><span class="tab" data-tab="locker">LOCKER</span><span class="tab" data-tab="shop">ITEM SHOP</span><span class="tab" data-tab="profile">PROFILE</span><span class="tab" data-tab="leader">LEADERBOARDS</span><span class="tab" data-tab="store">STORE</span><span class="tab" data-tab="settings">SETTINGS</span><span class="pad">RB</span></div>
        <div class="lb-right"><span class="vb"><i></i>0</span><span class="party"><i></i>4</span><span class="menu">&#9776;</span></div>
      </div>
      <div class="lb-left">
        <div class="season">SEASON 2</div>
        <div class="lvl-box"><div class="badge"></div><div class="lvl"><div class="lvl-t">LEVEL <b id="lb-level">10</b></div><div class="xp-row"><span id="lb-xp">628</span> / 1,000</div><div class="xp-bar"><div id="lb-xp-fill"></div></div><div class="lvl-next">LVL <span id="lb-next">11</span> &nbsp;<span class="star">&#9733;</span> 1</div></div></div>
        <div class="pass"><div class="pass-l"><div class="shield-ic"></div><div><div class="pass-t">FREE PASS</div><div class="pass-s">Tier <span id="lb-tier">4</span></div></div></div><div class="pass-r"><span class="star">&#9733;</span> <span id="lb-stars">2</span> / 10</div></div>
        <div class="pass-note">&#9733; Pass owners receive an extra daily challenge</div>
        <div class="sec">EVENT CHALLENGES</div>
        <div class="chal"><div class="chal-t">Play Special Event Matches</div><div class="chal-b"><div class="chal-bar"><div style="width:0%"></div></div><span>0 / 3</span><span class="xp">XP 1,000</span></div></div>
        <div class="sec">DAILY CHALLENGES</div>
        <div class="chal"><div class="chal-t">Eliminate 3 opponents</div><div class="chal-b"><div class="chal-bar"><div id="lb-ch1" style="width:0%"></div></div><span id="lb-ch1t">0 / 3</span><span class="xp">XP 500</span></div></div>
        <div class="chal"><div class="chal-t">Place Top 10 in Solo</div><div class="chal-b"><div class="chal-bar"><div style="width:0%"></div></div><span>0 / 1</span><span class="xp">XP 500</span></div></div>
      </div>
      <div class="lb-nametag"><div class="nt-row"><span class="nt-a">A</span><span class="nt-crown">&#9814;</span><span id="lb-name" contenteditable="true" spellcheck="false">Bardeezie</span></div><div class="nt-ready">Not Ready</div></div>
      <div class="lb-plus l">+</div><div class="lb-plus r">+</div><div class="lb-plus rr">+</div>
      <div class="lb-mode">
        <div class="new-mode">New Mode Available!</div>
        <div class="mode-box"><div class="mode-t">GAME MODE</div><div class="mode-v" id="lb-mode">SOLO</div><div class="mode-sel" id="lb-select"><span class="btn-x">X</span> Select Mode</div></div>
        <div class="play-btn" id="lb-play"><span class="btn-y">Y</span> PLAY</div>
      </div>
      <div class="lb-bottom"><span class="glob">Global</span><span class="chat"><span class="lbk">&#9634;</span> Hold to chat</span><span class="rt"><span class="lbk">L</span> Inspect Challenges</span><span class="rt"><span class="lbk">RT</span> News</span></div>
      <div id="lb-locker" style="display:none"><div class="locker-t">LOCKER &middot; OUTFITS</div><div class="skins"></div><div class="locker-hint">Click an outfit to equip it. Default Season 1-2 outfits.</div></div>
      <div id="lb-info" style="display:none"></div>`;
    document.body.appendChild(el); LB.el = el;
    el.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => LB.tab(t.dataset.tab)));
    document.getElementById('lb-play').addEventListener('click', () => LB.play());
    document.getElementById('lb-select').addEventListener('click', () => { LB.mode = MODES[(MODES.indexOf(LB.mode) + 1) % MODES.length]; document.getElementById('lb-mode').textContent = MODE_LABEL[LB.mode]; if (FN.Audio) FN.Audio.play('ui_click'); });
    const nameEl = document.getElementById('lb-name'); nameEl.textContent = LB.name; nameEl.addEventListener('blur', () => { LB.name = nameEl.textContent.trim().slice(0, 16) || 'Player'; nameEl.textContent = LB.name; PR.name = LB.name; PR.save(); });
    nameEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); nameEl.blur(); } });
    // locker skins
    const sk = el.querySelector('.skins');
    sk.innerHTML = FN.Character.SKINS.map(s => `<div class="skin-card ${s.id === LB.skin ? 'sel' : ''}" data-id="${s.id}"><div class="skin-sw" style="background:linear-gradient(180deg,#${s.hair.toString(16).padStart(6, '0')} 0 28%,#${s.skin.toString(16).padStart(6, '0')} 28% 45%,#${s.top.toString(16).padStart(6, '0')} 45% 75%,#${s.pants.toString(16).padStart(6, '0')} 75%)"></div><div class="skin-n">${s.name}</div></div>`).join('');
    sk.querySelectorAll('.skin-card').forEach(c => c.addEventListener('click', () => { LB.setSkin(c.dataset.id); if (FN.Audio) FN.Audio.play('ui_click'); }));
    el.addEventListener('mouseover', (e) => { if (e.target.classList && (e.target.classList.contains('tab') || e.target.id === 'lb-play')) { if (FN.Audio) FN.Audio.play('ui_hover'); } });
  };
  LB.tab = function (t) {
    if (t === 'settings') { if (FN.Settings) FN.Settings.show(); if (FN.Audio) FN.Audio.play('ui_click'); return; }
    LB.el.querySelectorAll('.tab').forEach(x => x.classList.toggle('sel', x.dataset.tab === t));
    U.show('lb-locker', t === 'locker'); const info = document.getElementById('lb-info');
    const texts = { pass: 'BATTLE PASS<br><small>Season 2 Battle Pass — 70 tiers of rewards. (Not available in this recreation)</small>', shop: 'ITEM SHOP<br><small>Daily items refresh in 12:00:00. (Not available in this recreation)</small>', profile: `PROFILE<br><small>Matches: ${PR.matches} &nbsp; Wins: ${PR.wins} &nbsp; Eliminations: ${PR.kills} &nbsp; Level: ${PR.level}</small>`, leader: 'LEADERBOARDS<br><small>Solo &middot; Wins<br>1. ' + LB.name + ' — ' + PR.wins + '</small>', store: 'STORE<br><small>Founder packs. (Not available in this recreation)</small>' };
    if (texts[t]) { info.style.display = ''; info.innerHTML = texts[t]; } else info.style.display = 'none';
    if (FN.Audio) FN.Audio.play('ui_click');
  };
  LB.show = function () {
    LB.visible = true; LB.el.style.display = ''; FN.Engine.renderScene = LB.scene; LB.refresh(); LB.tab('lobby');
    if (FN.Audio) { FN.Audio.init(); FN.Audio.startMusic(); }
    FN.Engine.renderer.shadowMap.needsUpdate = true;
  };
  LB.hide = function () { LB.visible = false; LB.el.style.display = 'none'; FN.Engine.renderScene = null; };
  LB.refresh = function () {
    U.txt('lb-level', PR.level); U.txt('lb-xp', PR.xp); document.getElementById('lb-xp-fill').style.width = (PR.xp / 10) + '%'; U.txt('lb-next', PR.level + 1); U.txt('lb-tier', PR.tier); U.txt('lb-stars', PR.stars);
    const k = Math.min(3, PR.kills); document.getElementById('lb-ch1').style.width = (k / 3 * 100) + '%'; U.txt('lb-ch1t', k + ' / 3');
  };
  LB.play = function () {
    if (FN.Audio) { FN.Audio.init(); FN.Audio.play('ui_click'); }
    FN.Player.name = LB.name; LB.hide();
    if (LB.mode === 'training') FN.Training.start();
    else FN.Match.start(LB.mode);
  };
  LB.playTraining = function () {
    if (FN.Audio) { FN.Audio.init(); FN.Audio.play('ui_click'); }
    FN.Player.name = LB.name; LB.hide(); FN.Training.start();
  };
  LB.update = function (dt) {
    if (!LB.visible) return; const cam = FN.Engine.camera; const t = FN.Engine.time;
    cam.position.set(Math.sin(t * 0.05) * 0.4, 2.4, 11.5); cam.lookAt(0, 1.6, 0); cam.fov = 50; cam.updateProjectionMatrix();
    FN.Character.animate(LB.char, { move: 0, grounded: true, weapon: 'none' }, dt);
    const p = LB.snow.geometry.attributes.position.array; for (let i = 0; i < p.length; i += 3) { p[i + 1] -= dt * (1.2 + (i % 7) * 0.15); p[i] += Math.sin(t + i) * dt * 0.3; if (p[i + 1] < 0) p[i + 1] = 30; } LB.snow.geometry.attributes.position.needsUpdate = true;
    LB.lights.forEach((m, i) => { m.visible = Math.sin(t * 3 + i) > -0.6; });
    LB.pads[0].children[1].material.opacity = 0.7 + Math.sin(t * 2) * 0.2;
  };
  FN.Lobby = LB;
})();
