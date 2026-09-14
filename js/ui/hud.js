// In-game HUD (OG Season 1-2 layout): compass, minimap, vitals, hotbar, build slots, materials, kill feed, damage numbers, map screen.
window.FN = window.FN || {};
(function () {
  const C = FN.CONFIG, U = FN.U;
  const HUD = { icons: {}, feed: [], dmgNums: [], toasts: [], notif: null, hitT: 0, hitHead: false, mapOpen: false, visible: false,
    c: {}, _cT: 0, _mT: 0, _lastYaw: -999, _lastMMX: 1e9, _lastMMZ: 1e9, _lastH: -1, _lastS: -1, _lastAmmoMag: '', _lastAmmoRes: '' };
  const $ = (id) => document.getElementById(id);
  HUD.build = function () {
    const ui = $('ui');
    ui.innerHTML = `
      <div id="hud" style="display:none">
        <div id="fps-counter" style="display:none">60 FPS</div>
        <canvas id="compass" width="720" height="60"></canvas>
        <div id="team"></div>
        <div id="mm-box"><canvas id="minimap" width="360" height="360"></canvas><div id="mm-loc"></div>
          <div id="mm-stats"><span class="st storm"><i class="ic ic-storm"></i><b id="st-timer">0:00</b></span><span class="st"><i class="ic ic-players"></i><b id="st-players">100</b></span><span class="st"><i class="ic ic-kills"></i><b id="st-kills">0</b></span></div>
        </div>
        <div id="mats"><div class="mats-head"><span class="key">I</span><i class="ic ic-bag"></i></div><div class="mat-row"><div class="mat" id="mat-wood"><i class="ic ic-wood"></i><b>0</b></div><div class="mat" id="mat-brick"><i class="ic ic-brick"></i><b>0</b></div><div class="mat" id="mat-metal"><i class="ic ic-metal"></i><b>0</b></div></div></div>
        <div id="buildbar"><div class="bkeys"><span>F1</span><span>F2</span><span>F3</span><span>F4</span><span>F5</span></div><div class="brow"><div class="qkey"><span class="key">Q</span><i class="ic ic-pickaxe"></i></div><div class="bslot" data-p="wall"><i class="ic ic-wall"></i></div><div class="bslot" data-p="floor"><i class="ic ic-floor"></i></div><div class="bslot" data-p="stairs"><i class="ic ic-stairs"></i></div><div class="bslot" data-p="roof"><i class="ic ic-roof"></i></div><div class="bslot empty"></div></div><div id="bmat"></div></div>
        <div id="hotbar"><div class="hslot pick" data-s="0"><div class="hkey">1</div></div><div class="hslot" data-s="1"><div class="hkey">2</div></div><div class="hslot" data-s="2"><div class="hkey">3</div></div><div class="hslot" data-s="3"><div class="hkey">4</div></div><div class="hslot" data-s="4"><div class="hkey">5</div></div><div class="hslot" data-s="5"><div class="hkey">6</div></div></div>
        <div id="vitals"><div id="ammo"><b id="ammo-mag">30</b><span class="sep">|</span><span id="ammo-res">20</span><i class="ic ic-bullets"></i></div>
          <div class="bar shield"><div class="fill" id="shield-fill"></div><div class="num"><b id="shield-num">0</b><span>| 100</span></div><i class="ic ic-shield"></i></div>
          <div class="bar health"><div class="fill" id="health-fill"></div><div class="num"><b id="health-num">100</b><span>| 100</span></div><i class="ic ic-plus"></i></div>
        </div>
        <div id="killfeed"></div>
        <div id="crosshair"><div class="ch t"></div><div class="ch b"></div><div class="ch l"></div><div class="ch r"></div><div class="dot"></div></div>
        <div id="hitmarker" style="display:none"><i></i><i></i><i></i><i></i></div>
        <div id="prompt" style="display:none"><span class="key">E</span><span id="prompt-text">Search</span></div>
        <div id="progress" style="display:none"><div id="progress-label"></div><div class="pbar"><div id="progress-fill"></div></div></div>
        <div id="toasts"></div>
        <div id="notify" style="display:none"></div>
        <div id="center-msg" style="display:none"></div>
        <div id="dmgnums"></div>
        <div id="storm-tint"></div><div id="hurt-vignette"></div><div id="scope" style="display:none"></div>
        <div id="bus-ui" style="display:none"><div id="bus-banner"><span id="bus-banner-text">DOORS WILL OPEN IN</span> <b id="bus-count">5</b><span>s</span></div><div id="bus-jump"><span class="key">SPACE</span> JUMP</div></div>
        <div id="island-ui" style="display:none"><div id="island-title">BATTLE BUS LAUNCHING IN</div><div id="island-count">30</div><div id="island-sub">Waiting for players...</div></div>
      </div>
      <div id="mapscreen" style="display:none"><canvas id="bigmap" width="1024" height="1024"></canvas><div id="map-hint">M &middot; CLOSE MAP</div></div>
      <div id="endscreen" style="display:none"></div>
      <div id="speedometer" style="display:none"><span id="spd-val">0</span> <span id="spd-unit">km/h</span><div id="spd-name">Car</div></div>
      <div id="veh-leave-hint" style="display:none">Press <span class="key">E</span> to exit</div>
    </div>`;
    HUD.cv = $('compass'); HUD.cctx = HUD.cv.getContext('2d'); HUD.mm = $('minimap'); HUD.mctx = HUD.mm.getContext('2d'); HUD.bigmap = $('bigmap'); HUD.bctx = HUD.bigmap.getContext('2d');
    // Cache hot DOM refs used every frame (avoids repeated getElementById lookups).
    const c = HUD.c;
    c.healthFill = $('health-fill'); c.shieldFill = $('shield-fill'); c.ammo = $('ammo'); c.ammoMag = $('ammo-mag'); c.ammoRes = $('ammo-res');
    c.crosshair = $('crosshair'); c.scope = $('scope'); c.prompt = $('prompt'); c.promptText = $('prompt-text');
    c.stormTint = $('storm-tint'); c.hurtV = $('hurt-vignette'); c.fps = $('fps-counter');
    HUD.built = true;
  };
  HUD.show = function (on) {
    if (!HUD.built) HUD.build();
    U.show('hud', on);
    HUD.visible = !!on;
    if (on) {
      // A newly shown canvas is blank until its first draw. Render it now so
      // it never flashes/disappears while the player is already turning.
      HUD._cT = 0;
      HUD._lastYaw = -999;
      if (FN.Player && Number.isFinite(FN.Player.camYaw)) HUD.drawCompass();
    }
    if (FN.debugEl) FN.debugEl.style.display = on && !FN.params.get('debug') ? 'none' : '';
  };
  // fps counter toggle (Settings -> GAME -> Show FPS)
  HUD.setFpsVisible = function (on) { if (!HUD.built) HUD.build(); if (HUD.c.fps) HUD.c.fps.style.display = on ? '' : 'none'; HUD.fpsOn = !!on; };
  // speedometer + vehicle UI
  HUD.setVehicleDriving = function (on) { if (!HUD.built) HUD.build(); HUD._driving = !!on; U.show('speedometer', on); U.show('veh-leave-hint', on); U.show('hotbar', !on); U.show('buildbar', !on); U.show('vitals', !on); U.show('mats', !on); };
  HUD.updateSpeedometer = function (kph, name) { if (!HUD.built || !HUD._driving) return; $('spd-val').textContent = kph; if (name) $('spd-name').textContent = name; };
  HUD.showPrompt = function (text) { if (!HUD.built) HUD.build(); const p = HUD.c.prompt; if (p) { p.style.display = ''; HUD.c.promptText.textContent = text; } };
  // ---------- icons rendered from the 3D models ----------
  HUD.renderIcons = function () {
    const E = FN.Engine; const size = 160; const rt = new THREE.WebGLRenderTarget(size, size); const scene = new THREE.Scene(); scene.add(new THREE.HemisphereLight(0xffffff, 0x888888, 1.6)); const dl = new THREE.DirectionalLight(0xffffff, 1.4); dl.position.set(2, 3, 4); scene.add(dl);
    const cam = new THREE.OrthographicCamera(-0.75, 0.75, 0.55, -0.55, 0.1, 10); cam.position.set(0, 0.2, 3); cam.lookAt(0, 0.15, 0);
    const buf = new Uint8Array(size * size * 4);
    const make = (key, obj, scale, yoff, rotY) => {
      const g = new THREE.Group(); g.add(obj); obj.rotation.y = rotY === undefined ? -Math.PI / 2 : rotY; obj.position.y = yoff || 0; g.scale.setScalar(scale || 1); scene.add(g);
      E.renderer.setRenderTarget(rt); E.renderer.setClearColor(0x000000, 0); E.renderer.clear(); E.renderer.render(scene, cam); E.renderer.setRenderTarget(null);
      E.renderer.readRenderTargetPixels(rt, 0, 0, size, size, buf);
      const cv = document.createElement('canvas'); cv.width = size; cv.height = size; const ctx = cv.getContext('2d'); const img = ctx.createImageData(size, size);
      for (let y = 0; y < size; y++) img.data.set(buf.subarray((size - 1 - y) * size * 4, (size - y) * size * 4), y * size * 4);
      ctx.putImageData(img, 0, 0); HUD.icons[key] = cv.toDataURL(); scene.remove(g);
    };
    for (const id in C.WEAPONS) { const def = C.WEAPONS[id]; make('w_' + id, FN.WeaponModels.build(def.model), def.kind === 'pistol' || def.kind === 'smg' ? 2.6 : 1.15, -0.15); }
    make('pickaxe', FN.WeaponModels.build('pickaxe'), 1.0, -0.5, 0.6);
    for (const id in C.CONSUMABLES) make('c_' + id, FN.ItemModels.consumable(id), id === 'bandage' || id === 'minishield' ? 3.4 : 2.2, -0.15, 0.5);
    rt.dispose(); E.renderer.setClearColor(0x000000, 1);
  };
  // ---------- per-frame ----------
  HUD.update = function (dt) {
    if (!HUD.visible) return;
    const PL = FN.Player, M = FN.Match;
    // fps counter (updated 4x per second, only when enabled)
    if (HUD.fpsOn) { HUD.fpsT = (HUD.fpsT || 0) - dt; if (HUD.fpsT <= 0) { HUD.fpsT = 0.25; U.txt('fps-counter', FN.Engine.fps + ' FPS'); } }
    // vitals (guard style writes so unchanged bars don't trigger layout/reflow)
    const hf = HUD.c.healthFill, sf = HUD.c.shieldFill;
    const hw = Math.round(PL.health), sw = Math.round(PL.shield);
    if (hw !== HUD._lastH) { HUD._lastH = hw; hf.style.width = hw + '%'; }
    if (sw !== HUD._lastS) { HUD._lastS = sw; sf.style.width = sw + '%'; }
    U.txt('health-num', Math.ceil(PL.health)); U.txt('shield-num', Math.ceil(PL.shield));
    U.cls('vitals', 'low', PL.health <= 30);
    // ammo
    const it = PL.equip.item; const ammoEl = HUD.c.ammo;
    if (it && it.kind === 'weapon') {
      const def = C.WEAPONS[it.id];
      const ammoMag = (it.ammo !== undefined && !isNaN(it.ammo)) ? it.ammo : (def ? def.mag : 0);
      const ammoRes = (def && PL.inv && PL.inv.ammo && PL.inv.ammo[def.ammo] !== undefined) ? PL.inv.ammo[def.ammo] : 0;
      ammoEl.style.display = ''; U.txt('ammo-mag', ammoMag); U.txt('ammo-res', ammoRes); U.cls('ammo', 'empty', ammoMag === 0);
    }
    else ammoEl.style.display = 'none';
    // hotbar
    if (HUD._hbT === undefined || HUD._hbT > 0.3 || HUD.dirtyHotbar) { HUD._hbT = 0; HUD.dirtyHotbar = false; HUD.renderHotbar(); } HUD._hbT += dt;
    // materials
    $('mat-wood').querySelector('b').textContent = PL.inv.mats.wood; $('mat-brick').querySelector('b').textContent = PL.inv.mats.brick; $('mat-metal').querySelector('b').textContent = PL.inv.mats.metal;
    // build bar
    const B = FN.Build; document.querySelectorAll('#buildbar .bslot').forEach(el => el.classList.toggle('sel', B.active && el.dataset.p === B.piece)); U.cls('buildbar', 'active', B.active);
    const bm = $('bmat'); if (B.active) { bm.style.display = ''; bm.innerHTML = ['wood', 'brick', 'metal'].map(m => `<span class="bm ${m === B.mat ? 'sel' : ''} ${m}"><i class="ic ic-${m}"></i>${PL.inv.mats[m]}</span>`).join('') + '<span class="bm-hint">RMB · MATERIAL &nbsp; R · ROTATE</span>'; } else bm.style.display = 'none';
    // stats
    if (M) { U.txt('st-timer', M.stormTimerText()); U.txt('st-players', M.aliveCount()); U.txt('st-kills', PL.stats.kills); U.cls('st-timer', 'shrinking', FN.Storm && FN.Storm.shrinking); }
    // crosshair
    const ch = HUD.c.crosshair; const spread = it && it.kind === 'weapon' ? PL.currentSpread() : 0; const px = 6 + spread * 22; ch.style.setProperty('--gap', px + 'px');
    const scoped = PL.equip.ads && it && it.kind === 'weapon' && C.WEAPONS[it.id].scope; ch.style.display = (scoped || PL.state !== 'ground' || B.active) ? 'none' : '';
    const sc = HUD.c.scope; if (scoped) { sc.style.display = ''; sc.className = C.WEAPONS[it.id].scope; } else sc.style.display = 'none';
    // hit marker
    if (HUD.hitT > 0) { HUD.hitT -= dt; $('hitmarker').style.display = ''; $('hitmarker').style.opacity = Math.min(1, HUD.hitT * 6); U.cls('hitmarker', 'head', HUD.hitHead); } else $('hitmarker').style.display = 'none';
    // prompt
    const pr = HUD.c.prompt; const tgt = PL.interactTarget; const vehicleNear = PL._vehicleNear;
    if (vehicleNear && PL.state === 'ground' && !B.active) { pr.style.display = ''; U.txt('prompt-text', 'Enter ' + vehicleNear.def.name); pr.className = ''; }
    else if (tgt && tgt.type !== 'item' && PL.state === 'ground' && !B.active) { pr.style.display = ''; const txt = tgt.type === 'chest' || tgt.type === 'ammobox' ? 'Search' : ''; U.txt('prompt-text', txt); pr.className = ''; }
    else if (tgt && tgt.type === 'item' && !(tgt.pickupDelay > 0) && PL.state === 'ground' && !B.active) { pr.style.display = ''; U.txt('prompt-text', (tgt.type === 'chest' || tgt.type === 'ammobox') ? 'Search' : ('Pick up ' + FN.Inventory.displayName(tgt.item) + (tgt.item.count > 1 ? ' x' + tgt.item.count : ''))); pr.className = tgt.type === 'item' ? 'r-' + FN.Inventory.rarityOf(tgt.item) : ''; } else pr.style.display = 'none';
    // damage numbers
    HUD.updateDmgNums(dt);
    // feed
    for (let i = HUD.feed.length - 1; i >= 0; i--) { HUD.feed[i].t += dt; if (HUD.feed[i].t > 6) { HUD.feed.splice(i, 1); HUD.dirtyFeed = true; } }
    if (HUD.dirtyFeed) { HUD.dirtyFeed = false; $('killfeed').innerHTML = HUD.feed.map(f => `<div class="kf" style="opacity:${Math.min(1, (6 - f.t) * 1.5)}">${f.html}</div>`).join(''); }
    // toasts
    for (let i = HUD.toasts.length - 1; i >= 0; i--) { HUD.toasts[i].t += dt; if (HUD.toasts[i].t > 2.5) { HUD.toasts.splice(i, 1); HUD.dirtyToast = true; } }
    if (HUD.dirtyToast) { HUD.dirtyToast = false; $('toasts').innerHTML = HUD.toasts.map(t => `<div class="toast r-${t.r}">${t.text}</div>`).join(''); }
    if (HUD.notif) { HUD.notif.t -= dt; if (HUD.notif.t <= 0) { HUD.notif = null; $('notify').style.display = 'none'; } }
    if (HUD.centerMsg) { HUD.centerMsg.t -= dt; if (HUD.centerMsg.t <= 0) { HUD.centerMsg = null; $('center-msg').style.display = 'none'; } }
    // storm tint / hurt
    HUD.c.stormTint.style.opacity = PL.inStorm ? 0.55 : 0; HUD.c.hurtV.style.opacity = Math.max(PL.hurt * 0.8, PL.health <= 25 ? 0.35 + Math.sin(FN.Engine.time * 4) * 0.1 : 0);
    // phase UIs
    U.show('bus-ui', PL.state === 'bus'); U.show('island-ui', M && M.phase === 'island');
    if (PL.state === 'bus' && M) { const bt = $('bus-banner'); if (M.busDoorT > 0) { bt.style.display = ''; U.txt('bus-banner-text', 'DOORS WILL OPEN IN'); U.txt('bus-count', Math.ceil(M.busDoorT)); U.show('bus-jump', false); } else { bt.style.display = 'none'; U.show('bus-jump', M.busCanJump); } }
    if (M && M.phase === 'island') { U.txt('island-count', Math.ceil(M.islandT)); U.txt('island-sub', M.islandT > C.ISLAND_LAUNCH_COUNT ? 'Waiting for players... ' + M.islandJoined + '/100' : 'GET READY'); }
    // team list
    if (M && M.teammates && M.teammates.length) { $('team').style.display = ''; $('team').innerHTML = [PL].concat(M.teammates).map((e, i) => `<div class="tm ${e.dead ? 'dead' : ''}"><span class="tmc c${i}"></span><span class="tmn">${e.name}</span><div class="tmbar"><div class="tmfill" style="width:${e.health}%"></div><div class="tmshield" style="width:${e.shield}%"></div></div></div>`).join(''); } else $('team').style.display = 'none';
    // The compass is a small canvas and must track mouse movement every frame;
    // interval redraws make it visibly stick behind the camera.
    HUD.drawCompass();
    HUD._mT += dt;
    if (HUD._mT > 0.14) { HUD._mT = 0; HUD.drawMinimap(); }
    if (HUD.mapOpen) HUD.drawBigMap();
    if (FN.Player.state === 'ground' && FN.Player.heal === null && FN.Player.equip.reloadT <= 0 && HUD._progressOn) HUD.progress(null);
  };
  HUD.renderHotbar = function () {
    const PL = FN.Player; const slots = document.querySelectorAll('#hotbar .hslot');
    slots.forEach((el, i) => {
      el.classList.toggle('sel', PL.equip.slot === i);
      const kn = (n) => FN.Settings ? FN.Settings.shortName(C.KEYS['slot' + n]) : String(n);
      if (i === 0) { el.innerHTML = `<img src="${HUD.icons.pickaxe || ''}"><div class="hkey">${kn(1)}</div>`; el.className = 'hslot pick' + (PL.equip.slot === 0 ? ' sel' : ''); return; }
      const it = PL.inv.slots[i - 1];
      if (!it) { el.className = 'hslot' + (PL.equip.slot === i ? ' sel' : ''); el.innerHTML = `<div class="hkey">${kn(i + 1)}</div>`; return; }
      const r = FN.Inventory.rarityOf(it); el.className = 'hslot r-' + r + (PL.equip.slot === i ? ' sel' : '');
      const icon = it.kind === 'weapon' ? HUD.icons['w_' + it.id] : HUD.icons['c_' + it.id];
      const ammoVal = (it.ammo !== undefined && !isNaN(it.ammo)) ? it.ammo : (C.WEAPONS[it.id] ? C.WEAPONS[it.id].mag : 0);
      const cnt = it.kind === 'weapon' ? `<div class="hammo">${ammoVal}<i class="ic ic-bullets"></i></div>` : `<div class="hcount">${it.count}</div>`;
      el.innerHTML = `<img src="${icon || ''}">${cnt}<div class="hkey">${kn(i + 1)}</div>`;
    });
  };
  // ---------- compass ----------
  HUD.drawCompass = function () {
    const ctx = HUD.cctx, W = HUD.cv.width, H = HUD.cv.height; ctx.clearRect(0, 0, W, H);
    const yaw = Number(FN.Player.camYaw);
    // Keep the last valid direction if a camera update briefly produces an
    // invalid value; NaN coordinates would otherwise clear the whole canvas.
    const safeYaw = Number.isFinite(yaw) ? yaw : (Number.isFinite(HUD._lastValidYaw) ? HUD._lastValidYaw : 0);
    HUD._lastValidYaw = safeYaw;
    HUD._lastYaw = safeYaw;
    let heading = (-safeYaw * 180 / Math.PI) % 360; if (heading < 0) heading += 360;
    const pxPerDeg = W / 180; const names = { 0: 'N', 45: 'NE', 90: 'E', 135: 'SE', 180: 'S', 225: 'SW', 270: 'W', 315: 'NW' };
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let d = -90; d <= 90; d += 15) {
      // The camera heading is usually between compass ticks. Round the
      // displayed bearing instead of skipping the tick; the old divisibility
      // check made every label disappear except at exact 15-degree headings.
      let a = Math.round((heading + d) / 15) * 15; a = ((a % 360) + 360) % 360;
      const x = W / 2 + d * pxPerDeg; const alpha = 1 - Math.pow(Math.abs(d) / 95, 2.2);
      ctx.fillStyle = 'rgba(255,255,255,' + alpha + ')'; ctx.strokeStyle = 'rgba(0,0,0,' + alpha * 0.6 + ')'; ctx.lineWidth = 3;
      if (names[a]) { ctx.font = (a % 90 === 0 ? 'bold 30px' : 'bold 22px') + ' Impact, Arial Narrow, sans-serif'; ctx.strokeText(names[a], x, 26); ctx.fillText(names[a], x, 26); }
      else { ctx.font = '15px Arial, sans-serif'; ctx.strokeText(String(a), x, 28); ctx.fillText(String(a), x, 28); ctx.fillRect(x - 1, 42, 2, 8); }
    }
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(W / 2 - 6, 2); ctx.lineTo(W / 2 + 6, 2); ctx.lineTo(W / 2, 10); ctx.fill();
  };
  // ---------- minimap ----------
  HUD.drawMinimap = function () {
    const ctx = HUD.mctx, S = HUD.mm.width; const map = FN.World.mapCanvas; if (!map) return;
    const PL = FN.Player; const M = FN.Match; const W = C.WORLD_SIZE; const mpp = map.width / W; // map px per metre
    const viewM = 330; // metres across the minimap
    const cx = PL.pos.x, cz = PL.pos.z;
    ctx.clearRect(0, 0, S, S); ctx.save();
    const sx = (cx + W / 2) * mpp - viewM * mpp / 2, sz = (cz + W / 2) * mpp - viewM * mpp / 2;
    ctx.fillStyle = '#1b4f8f'; ctx.fillRect(0, 0, S, S);
    ctx.drawImage(map, sx, sz, viewM * mpp, viewM * mpp, 0, 0, S, S);
    const toMM = (x, z) => [(x - cx) / viewM * S + S / 2, (z - cz) / viewM * S + S / 2];
    // storm overlay
    if (FN.Storm && FN.Storm.active) {
      const st = FN.Storm; const [ox, oz] = toMM(st.cx, st.cz); const r = st.radius / viewM * S;
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, S, S); ctx.arc(ox, oz, r, 0, Math.PI * 2, true); ctx.fillStyle = 'rgba(150,60,220,0.45)'; ctx.fill('evenodd'); ctx.restore();
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(ox, oz, r, 0, Math.PI * 2); ctx.stroke();
      if (st.next) { const [nx, nz] = toMM(st.next.cx, st.next.cz); ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(nx, nz, st.next.radius / viewM * S, 0, Math.PI * 2); ctx.stroke(); }
    }
    // bus path
    if (M && M.bus && (M.phase === 'bus' || M.phase === 'drop')) { const b = M.bus; const [ax, az] = toMM(b.start.x, b.start.z), [bx, bz] = toMM(b.end.x, b.end.z); ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.setLineDash([8, 8]); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(ax, az); ctx.lineTo(bx, bz); ctx.stroke(); ctx.setLineDash([]); const [px, pz] = toMM(b.pos.x, b.pos.z); ctx.fillStyle = '#4fc3ff'; ctx.beginPath(); ctx.arc(px, pz, 9, 0, 6.28); ctx.fill(); }
    // teammates
    if (M && M.teammates) M.teammates.forEach((t, i) => { if (t.dead) return; const [tx, tz] = toMM(t.x, t.z); ctx.fillStyle = ['#4fc3ff', '#ff4fa3', '#4fff8a'][i % 3]; ctx.beginPath(); ctx.arc(tx, tz, 7, 0, 6.28); ctx.fill(); });
    if (M && FN.Bots) FN.Bots.list.forEach((b) => { if (b.dead || b.team === 0 || !(b.shotT > 0)) return; const [bx, bz] = toMM(b.x, b.z); ctx.save(); ctx.globalAlpha = Math.min(1, b.shotT); ctx.fillStyle = '#ff3945'; ctx.strokeStyle = '#5a0000'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(bx, bz - 10); ctx.lineTo(bx + 9, bz); ctx.lineTo(bx, bz + 10); ctx.lineTo(bx - 9, bz); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); });
    // player arrow
    ctx.translate(S / 2, S / 2); ctx.rotate(-PL.camYaw); ctx.fillStyle = '#fff'; ctx.strokeStyle = '#222'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(10, 10); ctx.lineTo(0, 5); ctx.lineTo(-10, 10); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
    const loc = FN.World.locationName(cx, cz); U.txt('mm-loc', loc ? loc.toUpperCase() : '');
  };
  HUD.toggleMap = function () { HUD.mapOpen = !HUD.mapOpen; U.show('mapscreen', HUD.mapOpen); };
  HUD.drawBigMap = function () {
    const ctx = HUD.bctx, S = HUD.bigmap.width; const map = FN.World.mapCanvas; if (!map) return; const W = C.WORLD_SIZE;
    ctx.drawImage(map, 0, 0, S, S);
    const to = (x, z) => [(x + W / 2) / W * S, (z + W / 2) / W * S];
    // grid
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1; for (let i = 1; i < 10; i++) { ctx.beginPath(); ctx.moveTo(i * S / 10, 0); ctx.lineTo(i * S / 10, S); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, i * S / 10); ctx.lineTo(S, i * S / 10); ctx.stroke(); }
    ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.font = 'bold 18px Arial'; ctx.textAlign = 'center'; for (let i = 0; i < 10; i++) { ctx.fillText('ABCDEFGHIJ'[i], (i + 0.5) * S / 10, 16); ctx.fillText(String(i + 1), 12, (i + 0.5) * S / 10 + 6); }
    // POI labels
    ctx.font = 'bold 20px Impact, Arial Narrow, sans-serif'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.fillStyle = '#fff';
    for (const p of FN.MapData.pois) { if (!p.name || p.hidden) continue; const [x, z] = to(p.p[0], p.p[1]); ctx.strokeText(p.name.toUpperCase(), x, z); ctx.fillText(p.name.toUpperCase(), x, z); }
    if (FN.Storm && FN.Storm.active) {
      const st = FN.Storm; const [ox, oz] = to(st.cx, st.cz); const r = st.radius / W * S;
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, S, S); ctx.arc(ox, oz, r, 0, Math.PI * 2, true); ctx.fillStyle = 'rgba(150,60,220,0.45)'; ctx.fill('evenodd'); ctx.restore();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(ox, oz, r, 0, Math.PI * 2); ctx.stroke();
      if (st.next) { const [nx, nz] = to(st.next.cx, st.next.cz); ctx.beginPath(); ctx.arc(nx, nz, st.next.radius / W * S, 0, Math.PI * 2); ctx.stroke(); }
    }
    const M = FN.Match; if (M && M.bus && (M.phase === 'bus' || M.phase === 'drop')) { const b = M.bus; const [ax, az] = to(b.start.x, b.start.z), [bx, bz] = to(b.end.x, b.end.z); ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.setLineDash([10, 10]); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(ax, az); ctx.lineTo(bx, bz); ctx.stroke(); ctx.setLineDash([]); const [px, pz] = to(b.pos.x, b.pos.z); ctx.fillStyle = '#4fc3ff'; ctx.beginPath(); ctx.arc(px, pz, 8, 0, 6.28); ctx.fill(); }
    const PL = FN.Player; const [px, pz] = to(PL.pos.x, PL.pos.z); ctx.save(); ctx.translate(px, pz); ctx.rotate(-PL.camYaw); ctx.fillStyle = '#fff'; ctx.strokeStyle = '#222'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(9, 9); ctx.lineTo(0, 4); ctx.lineTo(-9, 9); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
    if (M && M.teammates) M.teammates.forEach((t, i) => { if (t.dead) return; const [tx, tz] = to(t.x, t.z); ctx.fillStyle = ['#4fc3ff', '#ff4fa3', '#4fff8a'][i % 3]; ctx.beginPath(); ctx.arc(tx, tz, 6, 0, 6.28); ctx.fill(); });
  };
  // ---------- events ----------
  HUD.hitMarker = function (head) { HUD.hitT = 0.25; HUD.hitHead = head; const now = performance.now(); if (now - (HUD._lastHitSoundT || 0) >= 75) { HUD._lastHitSoundT = now; if (FN.Audio) FN.Audio.play(head ? 'headshot' : 'hitmarker', null, 0.6); } };
  // Damage numbers are deliberately kept lightweight: a small bounded pool,
  // compositor-friendly transforms, and CSS-driven fading. The old path wrote
  // opacity every frame while fading, which can trigger expensive text repaint
  // work on older integrated GPUs/browsers.
  HUD.damageNumberAt = function (pos, amount, head, shield, big) {
    if (!pos || amount <= 0) return;
    const root = $('dmgnums');
    const el = document.createElement('div');
    el.className = 'dn' + (head ? ' head' : '') + (shield ? ' shield' : '') + (big ? ' big' : '');
    el.textContent = amount;
    el.style.willChange = 'transform, opacity';
    root.appendChild(el);

    // Rocket/explosive splash can hit several bots at once. Keep the HUD bounded
    // so a burst cannot create a large DOM/update spike.
    const MAX_DMG_NUMS = 5;
    while (HUD.dmgNums.length >= MAX_DMG_NUMS) {
      const old = HUD.dmgNums.shift();
      if (old && old.el) old.el.remove();
    }

    HUD.dmgNums.push({
      el,
      pos: { x: pos.x + (Math.random() - 0.5) * 0.4, y: pos.y, z: pos.z + (Math.random() - 0.5) * 0.4 },
      t: 0
    });
  };
  HUD._dmgUpdateAcc = 0;
  HUD.updateDmgNums = function (dt) {
    const list = HUD.dmgNums;
    if (!list.length) return;
    HUD._dmgUpdateAcc += dt;
    // 30 Hz is enough for this tiny HUD effect and avoids unnecessary DOM writes.
    if (HUD._dmgUpdateAcc < 0.033) {
      for (let i = list.length - 1; i >= 0; i--) {
        const d = list[i];
        d.t += dt;
        if (d.t > 0.9) { d.el.remove(); list.splice(i, 1); }
      }
      return;
    }
    HUD._dmgUpdateAcc = 0;
    const cam = FN.Engine.camera; const v = new THREE.Vector3(); const w = window.innerWidth, h = window.innerHeight;
    for (let i = list.length - 1; i >= 0; i--) {
      const d = list[i];
      d.t += dt;
      if (d.t > 0.9) { d.el.remove(); list.splice(i, 1); continue; }
      v.set(d.pos.x, d.pos.y + d.t * 0.8, d.pos.z).project(cam);
      if (v.z > 1) {
        d.el.style.display = 'none';
        continue;
      }
      d.el.style.display = '';
      // Transform-only movement avoids left/top layout work. Fading is CSS-only.
      const x = ((v.x + 1) * 0.5 * w);
      const y = ((1 - v.y) * 0.5 * h);
      d.el.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
    }
  };
  HUD.damageTaken = function (source, amount) { FN.Player.hurt = 1; if (FN.Audio) FN.Audio.play('damage_taken', null, 0.7); };
  HUD.killFeed = function (html) { HUD.feed.push({ html, t: 0 }); if (HUD.feed.length > 6) HUD.feed.shift(); HUD.dirtyFeed = true; };
  HUD.pickupToast = function (it) { const txt = FN.Inventory.displayName(it) + (it.count > 1 ? ' x' + it.count : ''); HUD.toasts.push({ text: txt, r: FN.Inventory.rarityOf(it), t: 0 }); if (HUD.toasts.length > 4) HUD.toasts.shift(); HUD.dirtyToast = true; HUD.dirtyHotbar = true; };
  HUD.materialGain = function (mat, n, crit) { if (n <= 0) return; const el = document.createElement('div'); el.className = 'mgain ' + mat + (crit ? ' crit' : ''); el.innerHTML = `<i class="ic ic-${mat}"></i>+${n}`; $('toasts').appendChild(el); setTimeout(() => el.remove(), 900); };
  HUD.notify = function (text, dur) { HUD.notif = { t: dur || 2.2 }; const n = $('notify'); n.textContent = text; n.style.display = ''; };
  HUD.center = function (html, dur, cls) { HUD.centerMsg = { t: dur || 3 }; const n = $('center-msg'); n.innerHTML = html; n.className = cls || ''; n.style.display = ''; };
  HUD.progress = function (p) { const el = $('progress'); if (!p) { el.style.display = 'none'; HUD._progressOn = false; return; } HUD._progressOn = true; el.style.display = ''; U.txt('progress-label', p.label); if (p.reload !== undefined) { HUD._reloadTotal = p.reload; } const f = p.reload !== undefined ? 0 : p.f; $('progress-fill').style.width = Math.round(U.clamp(f, 0, 1) * 100) + '%'; };
  HUD.updateReloadBar = function (t, total) { if (!HUD._progressOn) return; $('progress-fill').style.width = Math.round((1 - t / total) * 100) + '%'; };
  HUD.refreshBinds = function () {
    if (!HUD.built || !FN.Settings) return; const K = C.KEYS, nm = FN.Settings.shortName;
    document.querySelectorAll('#buildbar .bkeys span').forEach((el, i) => { el.textContent = nm(K[['wall', 'floor', 'stairs', 'roof', 'trap'][i]]); });
    const q = document.querySelector('#buildbar .qkey .key'); if (q) q.textContent = nm(K.buildToggle);
    const pk = document.querySelector('#prompt .key'); if (pk) pk.textContent = nm(K.interact);
    const jk = document.querySelector('#bus-jump .key'); if (jk) jk.textContent = nm(K.jump);
    const mh = document.getElementById('map-hint'); if (mh) mh.textContent = nm(K.map) + ' \u00b7 CLOSE MAP';
    const ik = document.querySelector('#mats .mats-head .key'); if (ik) ik.textContent = nm(K.inventory);
    HUD.dirtyHotbar = true;
  };
  HUD.showEnd = function (html) { const e = $('endscreen'); e.innerHTML = html; e.style.display = 'flex'; };
  HUD.hideEnd = function () { $('endscreen').style.display = 'none'; };
  FN.HUD = HUD;
})();
