// Settings screen: rebindable keys (movement, combat, building, interface), mouse sensitivity, invert Y, quality toggles.
window.FN = window.FN || {};
(function () {
  const C = FN.CONFIG, U = FN.U;
  const ST = { open: false, binding: null, data: { sens: 1.0, invertY: false, shadows: false, grass: false, aimbot: false, fps: false, gfx: 'auto', renderDistance: 'high', botCount: 99, botDifficulty: 'medium', volume: 0.7 }, page: 'input' };
  ST.botGroupSize = function (mode) { mode = mode || (FN.Lobby && FN.Lobby.mode ? FN.Lobby.mode : (FN.Match && FN.Match.mode ? FN.Match.mode : 'solo')); return mode === 'squad' ? 4 : (mode === 'duo' ? 2 : 1); };
  // Keep the setting flexible. Team-size correction is decided once, when a match starts.
  ST.normalizeBotCount = function (value) { return Math.max(1, Math.min(99, Math.floor(Number(value) || 99))); };
  ST.adjustBotCountForMode = function (value, mode) {
    const count = ST.normalizeBotCount(value), group = ST.botGroupSize(mode);
    if (group === 1 || (count + 1) % group === 0) return count;
    const remove = count - ((count + 1) % group), add = count + (group - ((count + 1) % group));
    if (remove < 1) return Math.min(99, add);
    if (add > 99) return remove;
    return U.rand() < 0.5 ? add : remove;
  };
  ST.DEFAULT_KEYS = Object.assign({}, C.KEYS);
  const ACTIONS = [
    { group: 'MOVEMENT', items: [['forward', 'Move Forward'], ['back', 'Move Backward'], ['left', 'Move Left'], ['right', 'Move Right'], ['jump', 'Jump / Glider'], ['crouch', 'Crouch']] },
    { group: 'COMBAT', items: [['reload', 'Reload'], ['interact', 'Use / Search / Pick Up'], ['slot1', 'Harvesting Tool'], ['slot2', 'Weapon Slot 1'], ['slot3', 'Weapon Slot 2'], ['slot4', 'Weapon Slot 3'], ['slot5', 'Weapon Slot 4'], ['slot6', 'Weapon Slot 5']] },
    { group: 'BUILDING', items: [['wall', 'Wall'], ['floor', 'Floor'], ['stairs', 'Stairs'], ['roof', 'Roof'], ['trap', 'Trap'], ['buildToggle', 'Building Mode Toggle'], ['rotate', 'Rotate Building'], ['matWood', 'Select Wood'], ['matBrick', 'Select Brick'], ['matMetal', 'Select Metal']] },
    { group: 'INTERFACE', items: [['map', 'Map'], ['inventory', 'Inventory']] },
  ];
  const NAMES = { ShiftLeft: 'L-SHIFT', ShiftRight: 'R-SHIFT', ControlLeft: 'L-CTRL', ControlRight: 'R-CTRL', AltLeft: 'L-ALT', AltRight: 'R-ALT', Space: 'SPACE', Tab: 'TAB', Enter: 'ENTER', CapsLock: 'CAPS LOCK', Backspace: 'BACKSPACE', Escape: 'ESC', Mouse1: 'MOUSE 3', Mouse3: 'MOUSE 4', Mouse4: 'MOUSE 5', ArrowUp: 'UP', ArrowDown: 'DOWN', ArrowLeft: 'LEFT', ArrowRight: 'RIGHT', Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']', Semicolon: ';', Quote: "'", Comma: ',', Period: '.', Slash: '/', Backslash: '\\', Backquote: '`', Insert: 'INS', Delete: 'DEL', Home: 'HOME', End: 'END', PageUp: 'PGUP', PageDown: 'PGDN', NumpadAdd: 'NUM +', NumpadSubtract: 'NUM -', NumpadMultiply: 'NUM *', NumpadDivide: 'NUM /', NumpadEnter: 'NUM ENTER', NumpadDecimal: 'NUM .' };
  ST.name = function (code) {
    if (!code) return 'UNBOUND'; if (NAMES[code]) return NAMES[code];
    if (code.startsWith('Key')) return code.slice(3); if (code.startsWith('Digit')) return code.slice(5); if (code.startsWith('Numpad')) return 'NUM ' + code.slice(6);
    return code.toUpperCase();
  };
  ST.shortName = function (code) { const n = ST.name(code); return n.replace('L-SHIFT', 'SHIFT').replace('L-CTRL', 'CTRL').replace('L-ALT', 'ALT').replace('MOUSE ', 'M').replace('NUM ', 'N'); };
  ST.get = (k) => ST.data[k];

  // ---------- persistence ----------
  ST.load = function () {
    try { const s = JSON.parse(localStorage.getItem('fnog_settings') || '{}'); if (s.keys) for (const k in s.keys) if (k in C.KEYS) C.KEYS[k] = s.keys[k]; for (const k of ['sens', 'invertY', 'shadows', 'grass', 'aimbot', 'fps', 'gfx', 'volume']) if (s[k] !== undefined) ST.data[k] = s[k]; if (['easy', 'medium', 'hard', 'ultra', 'impossible'].includes(s.botDifficulty)) ST.data.botDifficulty = s.botDifficulty; ST.data.botCount = Math.max(1, Math.min(99, Math.floor(Number(s.botCount) || 99))); } catch (e) { } ST.data.renderDistance = 'high'; ST.save();
  };
  ST.save = function () { try { localStorage.setItem('fnog_settings', JSON.stringify(Object.assign({ keys: C.KEYS }, ST.data))); } catch (e) { } };
  ST.applyAll = function () {
    if (FN.Engine && FN.Engine.renderer) FN.Engine.setShadows(!!ST.data.shadows);
    if (FN.Grass) FN.Grass.setEnabled(!!ST.data.grass);
    if (FN.HUD && FN.HUD.refreshBinds) FN.HUD.refreshBinds();
    if (FN.HUD && FN.HUD.setFpsVisible) FN.HUD.setFpsVisible(!!ST.data.fps);
    if (FN.Audio) FN.Audio.setMasterVolume(ST.data.volume !== undefined ? ST.data.volume : 0.7);
    // Graphics quality and render distance are independent controls.
    if (FN.Engine && FN.Engine.PRESETS) {
      const g = ST.data.gfx || 'auto';
      if (g === 'auto') FN.Engine.quality.auto = true;
      else { FN.Engine.quality.auto = false; FN.Engine.setPreset(g); }
      if (FN.Engine.setRenderDistance) FN.Engine.setRenderDistance(ST.data.renderDistance || 'potato');
    }
  };

  // ---------- UI ----------
  ST.init = function () {
    ST.load();
    const el = document.createElement('div'); el.id = 'settings'; el.style.display = 'none';
    el.innerHTML = `<div class="st-panel">
      <div class="st-head"><span>SETTINGS</span><span class="st-close" id="st-close">&#10005;</span></div>
      <div class="st-tabs"><span class="sel" data-t="input">INPUT</span><span data-t="game">GAME</span></div>
      <div class="st-body">
        <div class="st-page" data-page="input"><div class="st-hint">Click a binding, then press the key or mouse button you want. ESC cancels. The same key may be used by more than one action (shown in orange).</div><div id="st-binds"></div></div>
        <div class="st-page" data-page="game" style="display:none">
          <div class="st-row"><span class="st-label">Master Volume</span><input type="range" id="st-volume" min="0" max="1" step="0.05"><span class="st-val" id="st-volume-v">70%</span></div>
          <div class="st-row"><span class="st-label">Mouse Sensitivity</span><input type="range" id="st-sens" min="0.2" max="3" step="0.05"><span class="st-val" id="st-sens-v">1.00</span></div>
          <div class="st-row"><span class="st-label">Invert Vertical Look</span><label class="st-toggle"><input type="checkbox" id="st-invert"><span></span></label></div>
          <div class="st-row"><span class="st-label">Shadows</span><label class="st-toggle"><input type="checkbox" id="st-shadows"><span></span></label></div>
          <div class="st-row"><span class="st-label">Grass</span><label class="st-toggle"><input type="checkbox" id="st-grass"><span></span></label></div>
          <div class="st-row"><span class="st-label">Number Of Bots</span><input type="number" id="st-bots" min="1" max="99" step="1" style="width:72px;background:#1c2430;color:#fff;border:1px solid #3a4a5e;padding:5px 8px;font:inherit;border-radius:4px;outline:none"><span class="st-val">1-99</span></div>
          <div class="st-row"><span class="st-label">Bot Difficulty</span><select id="st-bot-difficulty" style="background:#1c2430;color:#fff;border:1px solid #3a4a5e;padding:5px 8px;font:inherit;border-radius:4px;outline:none"><option value="easy">EASY</option><option value="medium">MEDIUM</option><option value="hard">HARD</option><option value="ultra">ULTRA HARD</option><option value="impossible">IMPOSSIBLE</option></select></div>
          <div class="st-row"><span class="st-label">Graphics Quality</span><select id="st-gfx" style="background:#1c2430;color:#fff;border:1px solid #3a4a5e;padding:5px 8px;font:inherit;border-radius:4px;outline:none"><option value="auto">AUTO (ADAPTIVE)</option><option value="potato">POTATO</option><option value="low">LOW</option><option value="medium">MEDIUM</option><option value="high">HIGH</option></select></div>
          <div class="st-row"><span class="st-label">Render Distance</span><select id="st-render-distance" style="background:#1c2430;color:#fff;border:1px solid #3a4a5e;padding:5px 8px;font:inherit;border-radius:4px;outline:none"><option value="potato">POTATO</option><option value="low">LOW</option><option value="medium">MEDIUM</option><option value="high">HIGH</option><option value="maxed">MAXED</option></select></div>
          <div class="st-row"><span class="st-label">Show FPS</span><label class="st-toggle"><input type="checkbox" id="st-fps"><span></span></label></div>
          <div class="st-row"><span class="st-label">Aim-bot</span><label class="st-toggle"><input type="checkbox" id="st-aimbot"><span></span></label></div>
          <div class="st-hint">Graphics Quality changes visual fidelity. Render Distance changes how far the world and bots are processed.</div>
        </div>
      </div>
      <div class="st-foot"><span class="st-btn" id="st-reset">RESET TO DEFAULTS</span><span class="st-btn primary" id="st-done">DONE</span></div>
    </div>`;
    document.body.appendChild(el); ST.el = el;
    el.querySelectorAll('.st-tabs span').forEach(t => t.addEventListener('click', () => ST.showPage(t.dataset.t)));
    document.getElementById('st-close').addEventListener('click', () => ST.hide());
    document.getElementById('st-done').addEventListener('click', () => ST.hide());
    document.getElementById('st-reset').addEventListener('click', () => { Object.assign(C.KEYS, ST.DEFAULT_KEYS); ST.data.sens = 1; ST.data.invertY = false; ST.data.shadows = true; ST.data.grass = true; ST.data.aimbot = false; ST.data.fps = false; ST.data.gfx = 'auto'; ST.data.renderDistance = 'high'; ST.data.botCount = 99; ST.data.botDifficulty = 'medium'; ST.data.volume = 0.7; ST.save(); ST.applyAll(); ST.render(); if (FN.Audio) FN.Audio.play('ui_click'); });
    const sens = document.getElementById('st-sens'); sens.addEventListener('input', () => { ST.data.sens = parseFloat(sens.value); document.getElementById('st-sens-v').textContent = ST.data.sens.toFixed(2); ST.save(); });
    const vol = document.getElementById('st-volume'); vol.addEventListener('input', () => { ST.data.volume = parseFloat(vol.value); document.getElementById('st-volume-v').textContent = Math.round(ST.data.volume * 100) + '%'; ST.save(); ST.applyAll(); });
    document.getElementById('st-invert').addEventListener('change', (e) => { ST.data.invertY = e.target.checked; ST.save(); });
    document.getElementById('st-shadows').addEventListener('change', (e) => { ST.data.shadows = e.target.checked; ST.save(); ST.applyAll(); });
    document.getElementById('st-grass').addEventListener('change', (e) => { ST.data.grass = e.target.checked; ST.save(); ST.applyAll(); });
    document.getElementById('st-aimbot').addEventListener('change', (e) => { ST.data.aimbot = e.target.checked; ST.save(); });
    document.getElementById('st-gfx').addEventListener('change', (e) => { ST.data.gfx = e.target.value; ST.save(); ST.applyAll(); if (FN.Audio) FN.Audio.play('ui_click'); });
    document.getElementById('st-render-distance').addEventListener('change', (e) => { ST.data.renderDistance = e.target.value; ST.save(); ST.applyAll(); if (FN.Audio) FN.Audio.play('ui_click'); });
    document.getElementById('st-bots').addEventListener('input', (e) => { const value = ST.normalizeBotCount(e.target.value); e.target.step = 1; e.target.value = value; ST.data.botCount = value; ST.save(); });
    document.getElementById('st-bot-difficulty').addEventListener('change', (e) => { ST.data.botDifficulty = e.target.value; ST.save(); if (FN.Audio) FN.Audio.play('ui_click'); });
    document.getElementById('st-fps').addEventListener('change', (e) => { ST.data.fps = e.target.checked; ST.save(); ST.applyAll(); });
    // capture-phase listeners so a key pressed while binding never reaches the game
    window.addEventListener('keydown', (e) => { if (!ST.binding) return; e.preventDefault(); e.stopImmediatePropagation(); if (e.code === 'Escape') { ST.endBind(null); return; } ST.endBind(e.code); }, true);
    window.addEventListener('mousedown', (e) => { if (!ST.binding) return; if (e.button === 0) return; e.preventDefault(); e.stopImmediatePropagation(); ST.endBind('Mouse' + e.button); }, true);
    window.addEventListener('contextmenu', (e) => { if (ST.open) e.preventDefault(); });
    ST.render();
  };
  ST.showPage = function (p) { ST.page = p; ST.el.querySelectorAll('.st-tabs span').forEach(t => t.classList.toggle('sel', t.dataset.t === p)); ST.el.querySelectorAll('.st-page').forEach(pg => { pg.style.display = pg.dataset.page === p ? '' : 'none'; }); if (FN.Audio) FN.Audio.play('ui_click'); };
  ST.render = function () {
    const box = document.getElementById('st-binds'); const K = C.KEYS;
    const used = {}; for (const k in K) { if (!K[k]) continue; used[K[k]] = (used[K[k]] || 0) + 1; }
    box.innerHTML = ACTIONS.map(g => `<div class="st-group">${g.group}</div>` + g.items.map(([a, label]) => `<div class="st-row bind"><span class="st-label">${label}</span><span class="st-bind ${used[K[a]] > 1 ? 'dup' : ''} ${K[a] ? '' : 'none'}" data-a="${a}">${ST.name(K[a])}</span><span class="st-clear" data-a="${a}" title="Unbind">&#10005;</span></div>`).join('')).join('');
    box.querySelectorAll('.st-bind').forEach(b => b.addEventListener('click', () => ST.beginBind(b.dataset.a, b)));
    box.querySelectorAll('.st-clear').forEach(b => b.addEventListener('click', () => { C.KEYS[b.dataset.a] = ''; ST.save(); ST.applyAll(); ST.render(); }));
    document.getElementById('st-sens').value = ST.data.sens; document.getElementById('st-sens-v').textContent = Number(ST.data.sens).toFixed(2);
    const volEl = document.getElementById('st-volume'); if (volEl) { volEl.value = ST.data.volume; document.getElementById('st-volume-v').textContent = Math.round(ST.data.volume * 100) + '%'; }
    document.getElementById('st-invert').checked = !!ST.data.invertY; document.getElementById('st-shadows').checked = !!ST.data.shadows; document.getElementById('st-grass').checked = !!ST.data.grass; document.getElementById('st-aimbot').checked = !!ST.data.aimbot; document.getElementById('st-fps').checked = !!ST.data.fps;
    const botEl = document.getElementById('st-bots'); if (botEl) { botEl.step = 1; botEl.value = ST.normalizeBotCount(ST.data.botCount); }
    const botDifficulty = document.getElementById('st-bot-difficulty'); if (botDifficulty) botDifficulty.value = ST.data.botDifficulty || 'medium';
    const gfxSel = document.getElementById('st-gfx'); if (gfxSel) gfxSel.value = ST.data.gfx || 'auto';
    const renderSel = document.getElementById('st-render-distance'); if (renderSel) renderSel.value = ST.data.renderDistance || 'potato';
  };
  ST.beginBind = function (action, el) {
    if (ST.binding) ST.endBind(null);
    ST.binding = { action, el }; el.classList.add('listening'); el.textContent = 'PRESS A KEY...'; if (FN.Audio) FN.Audio.play('ui_hover');
  };
  ST.endBind = function (code) {
    const b = ST.binding; ST.binding = null; if (!b) return;
    if (code) { C.KEYS[b.action] = code; ST.save(); ST.applyAll(); if (FN.Audio) FN.Audio.play('ui_click'); }
    ST.render();
  };
  ST.show = function () { if (!ST.el) return; ST.open = true; ST.el.style.display = 'flex'; ST.render(); if (FN.Input && FN.Input.isLocked && FN.Input.isLocked() && !FN.Input.forceLocked) FN.Input.unlock(); };
  ST.hide = function () { if (ST.binding) ST.endBind(null); ST.open = false; ST.el.style.display = 'none'; ST.applyAll(); if (FN.Audio) FN.Audio.play('ui_click'); if (FN.Match && FN.Match.refreshAudio) FN.Match.refreshAudio(); if (ST.onClose) ST.onClose(); };
  // Text summary of the current binds for the pause screen
  ST.controlsHtml = function () {
    const K = C.KEYS, n = ST.name;
    return `<b>${n(K.forward)}${n(K.left)}${n(K.back)}${n(K.right)}</b> move/sprint &nbsp;<b>${n(K.crouch)}</b> crouch &nbsp;<b>${n(K.jump)}</b> jump / glider<br>` +
      `<b>LMB</b> fire / swing / place &nbsp;<b>RMB</b> aim &nbsp;<b>${n(K.reload)}</b> reload &nbsp;<b>${n(K.rotate)}</b> rotate build<br>` +
      `<b>${n(K.interact)}</b> search / pick up &nbsp;<b>${n(K.slot1)}</b>-<b>${n(K.slot6)}</b> hotbar &nbsp;<b>G</b> drop selected &nbsp;<b>Wheel</b> cycle<br>` +
      `<b>${n(K.wall)} ${n(K.floor)} ${n(K.stairs)} ${n(K.roof)}</b> wall / floor / stairs / roof &nbsp;<b>${n(K.buildToggle)}</b> build mode<br>` +
      `<b>RMB</b> (build) change material &nbsp;<b>${n(K.matWood)}/${n(K.matBrick)}/${n(K.matMetal)}</b> materials &nbsp;<b>${n(K.map)}</b> map &nbsp;<b>ESC</b> pause`;
  };
  FN.Settings = ST;
})();
