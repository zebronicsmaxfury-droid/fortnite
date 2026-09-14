// Keyboard / mouse input with pointer lock.
window.FN = window.FN || {};
(function () {
  const I = {
    down: new Set(), pressed: new Set(), released: new Set(),
    mouseDX: 0, mouseDY: 0, wheel: 0,
    buttons: [false, false, false], clicked: [false, false, false], releasedBtn: [false, false, false],
    locked: false, forceLocked: false, wantLock: false,
    enabled: true, canvas: null,
    onLockChange: null,
    _mb: [false, false, false], // raw mouse buttons, tracked separately from merged button state
  };
  I.init = function (canvas) {
    I.canvas = canvas;
    window.addEventListener('keydown', (e) => {
      if (FN.TeamChat && FN.TeamChat.isOpen && FN.TeamChat.isOpen()) { if (e.code !== 'Escape' && e.code !== 'Tab') return; }
      if (e.repeat) return;
      if ((I.locked || I.forceLocked) && (['F1', 'F2', 'F3', 'F4', 'F5', 'Tab', 'Space'].includes(e.code) || Object.values(FN.CONFIG.KEYS).includes(e.code))) e.preventDefault();
      if (!I.down.has(e.code)) { I.down.add(e.code); I.pressed.add(e.code); }
    });
    window.addEventListener('keyup', (e) => { I.down.delete(e.code); I.released.add(e.code); });
    window.addEventListener('blur', () => { I.down.clear(); I.buttons = [false, false, false]; });
    document.addEventListener('mousemove', (e) => {
      if (I.locked || I.forceLocked) { I.mouseDX += e.movementX || 0; I.mouseDY += e.movementY || 0; }
    });
    document.addEventListener('mousedown', (e) => {
      if (!(I.locked || I.forceLocked)) return;
      if (e.button < 3) { I.buttons[e.button] = true; I._mb[e.button] = true; I.clicked[e.button] = true; }
      if (e.button >= 1) { const code = 'Mouse' + e.button; if (!I.down.has(code)) { I.down.add(code); I.pressed.add(code); } e.preventDefault(); }
    });
    document.addEventListener('mouseup', (e) => { if (e.button < 3) { I.buttons[e.button] = false; I._mb[e.button] = false; I.releasedBtn[e.button] = true; } if (e.button >= 1) { const code = 'Mouse' + e.button; I.down.delete(code); I.released.add(code); } });
    document.addEventListener('contextmenu', (e) => { if (I.locked || I.forceLocked) e.preventDefault(); });
    document.addEventListener('wheel', (e) => { if (I.locked || I.forceLocked) { I.wheel += Math.sign(e.deltaY); } }, { passive: true });
    document.addEventListener('pointerlockchange', () => {
      I.locked = document.pointerLockElement === canvas;
      if (I.onLockChange) I.onLockChange(I.locked);
    });
    document.addEventListener('pointerlockerror', () => { I.locked = false; });
  };
  I.lock = function () {
    if (I.forceLocked) { I.locked = true; if (I.onLockChange) I.onLockChange(true); return; }
    if (I.canvas && document.pointerLockElement !== I.canvas) { try { const p = I.canvas.requestPointerLock({ unadjustedMovement: true }); if (p && p.catch) p.catch(() => { try { I.canvas.requestPointerLock(); } catch (e) { } }); } catch (e) { try { I.canvas.requestPointerLock(); } catch (e2) { } } }
  };
  I.unlock = function () { if (I.forceLocked) { I.locked = false; if (I.onLockChange) I.onLockChange(false); return; } if (document.pointerLockElement) document.exitPointerLock(); };
  I.isLocked = () => I.locked || I.forceLocked;
  I.isDown = (code) => I.enabled && I.down.has(code);
  I.wasPressed = (code) => I.enabled && I.pressed.has(code);
  I.wasReleased = (code) => I.released.has(code);
  I.btn = (b) => I.enabled && I.buttons[b];
  I.btnClicked = (b) => I.enabled && I.clicked[b];
  I.btnReleased = (b) => I.releasedBtn[b];
  I.axis = function () { // strafe/forward from WASD + left stick
    const K = FN.CONFIG.KEYS; let x = 0, z = 0;
    if (I.isDown(K.forward)) z += 1; if (I.isDown(K.back)) z -= 1;
    if (I.isDown(K.right)) x += 1; if (I.isDown(K.left)) x -= 1;
    const G = I.gp;
    if (G && G.connected) { x = FN.U.clamp(x + G.moveX, -1, 1); z = FN.U.clamp(z + G.moveZ, -1, 1); }
    return { x, z };
  };
  I.consumeMouse = function () { const d = { x: I.mouseDX, y: I.mouseDY }; I.mouseDX = 0; I.mouseDY = 0; return d; };
  I.consumeWheel = function () { const w = I.wheel; I.wheel = 0; return w; };
  I.endFrame = function () { I.pressed.clear(); I.released.clear(); I.clicked = [false, false, false]; I.releasedBtn = [false, false, false]; };
  I.injectMouse = function (dx, dy) { I.mouseDX += dx; I.mouseDY += dy; };
  I.injectKey = function (code, down) { if (down) { if (!I.down.has(code)) { I.down.add(code); I.pressed.add(code); } } else { I.down.delete(code); I.released.add(code); } };
  I.injectClick = function (b) { I.clicked[b] = true; };

  // ===================== CONTROLLER SUPPORT — HARD-CODED (NOT configurable in settings) =====================
  // Standard mapping: A=0 B=1 X=2 Y=3 LB=4 RB=5 LT=6 RT=7 Back=8 Start=9 LS=10 RS=11
  const GP_BIND = {
    buttons: {
      0: 'jump',     // A        -> jump (also bus jump / glider via the keyboard jump path)
      3: 'reload',   // Y        -> reload
      2: 'drop',     // X        -> jump off bus (airborne) / drop weapon (after landing)
      1: 'glider',   // B        -> open/close glider (airborne) / toggle build mode (after landing)
      6: 'shoot',    // R2 / LT2 -> shoot (hold)
      7: 'ads',      // L2       -> aim down sights (edge toggles, like RMB)
      4: 'prev',     // L1       -> previous weapon / previous building piece (build mode)
      5: 'next',     // R1       -> next weapon / next building piece (build mode)
      9: 'pause',    // Start    -> normal pause menu
    },
    deadzone: 0.18,
    lookSens: 620,     // right-stick look speed (px/sec at full deflection, scaled by in-game sensitivity)
  };
  const G = {
    connected: false, prev: new Uint8Array(20), cur: new Uint8Array(20),
    pressed: new Set(), released: new Set(), held: new Set(),
    moveX: 0, moveZ: 0, shoot: false, ads: false,
  };
  I.gp = G;
  I.gpPressed = (a) => I.enabled && G.connected && G.pressed.has(a);
  I.gpReleased = (a) => I.enabled && G.connected && G.released.has(a);
  I.gpDown = (a) => I.enabled && G.connected && G.held.has(a);
  const dz = (v) => Math.abs(v) < GP_BIND.deadzone ? 0 : (v - Math.sign(v) * GP_BIND.deadzone) / (1 - GP_BIND.deadzone);
  I.pollGamepad = function (dt) {
    G.pressed.clear(); G.released.clear();
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    let pad = null;
    for (let i = 0; i < pads.length; i++) { const p = pads[i]; if (p && p.connected) { pad = p; break; } }
    if (!pad) {
      if (G.connected) { // disconnected mid-play: release everything it was holding
        G.connected = false; G.held.clear(); G.shoot = false; G.ads = false; G.moveX = 0; G.moveZ = 0;
        I.buttons[0] = I._mb[0]; I.buttons[2] = I._mb[2];
      }
      return;
    }
    G.connected = true;
    const btns = pad.buttons;
    for (let b = 0; b < 20; b++) {
      const on = b < btns.length && btns[b].pressed ? 1 : 0;
      const act = GP_BIND.buttons[b];
      if (on && !G.prev[b]) { if (act) G.pressed.add(act); }
      if (!on && G.prev[b]) { if (act) G.released.add(act); }
      if (act) { if (on) G.held.add(act); else G.held.delete(act); }
      G.cur[b] = on;
    }
    G.prev.set(G.cur);
    // left stick -> movement (merged into I.axis), right stick -> look (injected through the mouse path so
    // it automatically respects the in-game sensitivity + invert-Y settings)
    G.moveX = dz(pad.axes[0] || 0); G.moveZ = -dz(pad.axes[1] || 0);
    const lx = dz(pad.axes[2] || 0), ly = dz(pad.axes[3] || 0);
    if (lx || ly) {
      const s = FN.Settings ? FN.Settings.data.sens : 1;
      I.mouseDX += lx * GP_BIND.lookSens * dt * s;
      I.mouseDY += ly * GP_BIND.lookSens * dt * s;
    }
    // R2 shoot (hold-to-fire) and L2 ADS (edge-to-toggle), merged safely with mouse buttons
    const shoot = G.cur[6], ads = G.cur[7];
    if (shoot && !G.shoot) I.clicked[0] = true;
    if (ads && !G.ads) I.clicked[2] = true;
    G.shoot = shoot; G.ads = ads;
    I.buttons[0] = I._mb[0] || !!shoot;
    I.buttons[2] = I._mb[2] || !!ads;
  };
  // ===================== END CONTROLLER SUPPORT =====================

  FN.Input = I;
})();
