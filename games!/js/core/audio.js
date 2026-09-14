// Procedural Web Audio sound effects (no external files).
window.FN = window.FN || {};
(function () {
  const U = FN.U;
  const A = { ctx: null, master: null, sfx: null, music: null, ready: false, loops: {}, listener: { x: 0, y: 0, z: 0, fx: 0, fz: -1 }, volume: 0.8, musicVolume: 0.35, activeVoices: 0, maxVoices: 28, lastPlay: Object.create(null) };
  A.init = function () {
    if (A.ready) return;
    try {
      A.ctx = new (window.AudioContext || window.webkitAudioContext)();
      A.master = A.ctx.createGain(); A.master.gain.value = A.volume; A.master.connect(A.ctx.destination);
      A.sfx = A.ctx.createGain(); A.sfx.gain.value = 1; A.sfx.connect(A.master);
      A.music = A.ctx.createGain(); A.music.gain.value = A.musicVolume; A.music.connect(A.master);
      A.comp = A.ctx.createDynamicsCompressor(); A.comp.threshold.value = -12; A.comp.ratio.value = 6; A.sfx.disconnect(); A.sfx.connect(A.comp); A.comp.connect(A.master);
      A.ready = true;
      // apply saved master volume
      try { const s = JSON.parse(localStorage.getItem('fnog_settings') || '{}'); if (s.volume !== undefined) A.setMasterVolume(s.volume); } catch (e) {}
      const nb = A.ctx.createBuffer(1, A.ctx.sampleRate * 2, A.ctx.sampleRate); const d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; A.noiseBuf = nb;
    } catch (e) { console.warn('audio unavailable', e); }
  };
  A.resume = function () { if (A.ctx && A.ctx.state === 'suspended') A.ctx.resume(); };
  A.setMasterVolume = function (v) { A.volume = U.clamp(v, 0, 1); if (A.master) A.master.gain.value = A.volume; };
  A.setListener = function (x, y, z, fx, fz) { A.listener.x = x; A.listener.y = y; A.listener.z = z; A.listener.fx = fx; A.listener.fz = fz; };

  // spatial gain/pan for a position
  function spatial(pos, maxDist) {
    if (!pos) return { g: 1, pan: 0 };
    const L = A.listener; const dx = pos.x - L.x, dy = pos.y - L.y, dz = pos.z - L.z;
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const md = maxDist || 120; if (d > md) return null;
    const g = 1 - Math.pow(d / md, 0.7);
    // right vector = (−fz, fx)
    const rx = -L.fz, rz = L.fx; const pan = d > 0.5 ? Math.max(-1, Math.min(1, (dx * rx + dz * rz) / d)) : 0;
    return { g, pan };
  }
  function out(gain, pos, maxDist) {
    const s = spatial(pos, maxDist); if (!s) return null;
    const g = A.ctx.createGain(); g.gain.value = gain * s.g;
    const p = A.ctx.createStereoPanner(); p.pan.value = s.pan * 0.8;
    g.connect(p); p.connect(A.sfx); return g;
  }
  function noise(dest, dur, opts) {
    const src = A.ctx.createBufferSource(); src.buffer = A.noiseBuf; src.loop = true;
    const f = A.ctx.createBiquadFilter(); f.type = opts.type || 'lowpass'; f.frequency.value = opts.f0 || 2000; f.Q.value = opts.q || 0.7;
    const g = A.ctx.createGain(); const t = A.ctx.currentTime;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(opts.peak || 1, t + (opts.attack || 0.005)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    if (opts.f1) f.frequency.exponentialRampToValueAtTime(opts.f1, t + dur * (opts.fTime || 1));
    src.connect(f); f.connect(g); g.connect(dest); src.start(t); src.stop(t + dur + 0.05);
  }
  function tone(dest, freq, dur, opts) {
    opts = opts || {};
    const o = A.ctx.createOscillator(); o.type = opts.type || 'sine'; const t = A.ctx.currentTime;
    o.frequency.setValueAtTime(freq, t); if (opts.f1) o.frequency.exponentialRampToValueAtTime(opts.f1, t + dur * (opts.fTime || 1));
    const g = A.ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(opts.peak || 0.5, t + (opts.attack || 0.005)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node = o;
    if (opts.filter) { const f = A.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = opts.filter; o.connect(f); node = f; }
    node.connect(g); g.connect(dest); o.start(t + (opts.delay || 0)); o.stop(t + (opts.delay || 0) + dur + 0.05);
  }
  const R = () => Math.random();

  const DEFS = {
    shot_ar: (d) => { noise(d, 0.16, { f0: 3500, f1: 500, peak: 1.0, type: 'lowpass' }); tone(d, 180, 0.09, { type: 'square', f1: 60, peak: 0.5 }); },
    shot_scar: (d) => { noise(d, 0.18, { f0: 3000, f1: 400, peak: 1.1 }); tone(d, 150, 0.1, { type: 'square', f1: 55, peak: 0.55 }); },
    shot_scoped: (d) => { noise(d, 0.2, { f0: 2800, f1: 400, peak: 1.0 }); tone(d, 160, 0.1, { type: 'sawtooth', f1: 50, peak: 0.5 }); },
    shot_tac: (d) => { noise(d, 0.3, { f0: 1800, f1: 200, peak: 1.3 }); tone(d, 110, 0.18, { type: 'square', f1: 40, peak: 0.7 }); noise(d, 0.5, { f0: 600, f1: 120, peak: 0.5, type: 'bandpass', attack: 0.02 }); },
    shot_sniper: (d) => { noise(d, 0.35, { f0: 5000, f1: 300, peak: 1.4 }); tone(d, 200, 0.25, { type: 'sawtooth', f1: 40, peak: 0.7 }); noise(d, 0.9, { f0: 900, f1: 150, peak: 0.35, attack: 0.05 }); },
    shot_pistol: (d) => { noise(d, 0.12, { f0: 4000, f1: 700, peak: 0.9 }); tone(d, 260, 0.07, { type: 'square', f1: 90, peak: 0.4 }); },
    shot_smg: (d) => { noise(d, 0.09, { f0: 3800, f1: 700, peak: 0.8 }); tone(d, 220, 0.06, { type: 'square', f1: 80, peak: 0.35 }); },
    shot_pump: (d) => { noise(d, 0.32, { f0: 1900, f1: 220, peak: 1.35 }); tone(d, 100, 0.2, { type: 'square', f1: 38, peak: 0.75 }); noise(d, 0.55, { f0: 550, f1: 110, peak: 0.5, type: 'bandpass', attack: 0.02 }); },
    shot_db: (d) => { noise(d, 0.4, { f0: 1500, f1: 180, peak: 1.6 }); tone(d, 85, 0.25, { type: 'square', f1: 32, peak: 0.85 }); noise(d, 0.7, { f0: 500, f1: 100, peak: 0.55, type: 'bandpass', attack: 0.02 }); },
    shot_suppressed: (d) => { noise(d, 0.07, { f0: 1600, f1: 500, peak: 0.28, type: 'bandpass' }); tone(d, 150, 0.05, { type: 'sine', f1: 70, peak: 0.12 }); },
    shot_revolver: (d) => { noise(d, 0.2, { f0: 3200, f1: 450, peak: 1.15 }); tone(d, 130, 0.14, { type: 'square', f1: 48, peak: 0.6 }); },
    shot_leveraction: (d) => { noise(d, 0.26, { f0: 3600, f1: 260, peak: 1.2 }); tone(d, 135, 0.18, { type: 'square', f1: 42, peak: 0.65 }); },
    shot_drumshotgun: (d) => { noise(d, 0.27, { f0: 1700, f1: 180, peak: 1.2 }); tone(d, 105, 0.16, { type: 'square', f1: 35, peak: 0.62 }); },
    shot_burstsmg: (d) => { noise(d, 0.08, { f0: 4300, f1: 800, peak: 0.78 }); tone(d, 250, 0.05, { type: 'square', f1: 90, peak: 0.3 }); },
    shot_combatsmg: (d) => { noise(d, 0.1, { f0: 4700, f1: 600, peak: 0.9 }); tone(d, 190, 0.07, { type: 'square', f1: 65, peak: 0.38 }); },
    shot_heavyar: (d) => { noise(d, 0.2, { f0: 2800, f1: 300, peak: 1.15 }); tone(d, 125, 0.13, { type: 'square', f1: 45, peak: 0.6 }); },
    shot_flintknock: (d) => { noise(d, 0.24, { f0: 2500, f1: 280, peak: 1.3 }); tone(d, 90, 0.2, { type: 'sawtooth', f1: 35, peak: 0.7 }); },
    shot_suppressedpistol: (d) => { noise(d, 0.065, { f0: 1400, f1: 420, peak: 0.22, type: 'bandpass' }); tone(d, 125, 0.05, { type: 'sine', f1: 60, peak: 0.1 }); },
    shot_huntingrifle: (d) => { noise(d, 0.3, { f0: 5200, f1: 250, peak: 1.25 }); tone(d, 180, 0.2, { type: 'sawtooth', f1: 35, peak: 0.6 }); },
    shot_autoshotgun: (d) => { noise(d, 0.24, { f0: 2000, f1: 190, peak: 1.15 }); tone(d, 115, 0.15, { type: 'square', f1: 38, peak: 0.6 }); },
    shot_tacticalar: (d) => { noise(d, 0.14, { f0: 3300, f1: 420, peak: 1.0 }); tone(d, 165, 0.09, { type: 'square', f1: 55, peak: 0.48 }); },
    shot_minigun: (d) => { noise(d, 0.06, { f0: 4800, f1: 900, peak: 0.7 }); tone(d, 280, 0.04, { type: 'square', f1: 100, peak: 0.28 }); },
    shot_infernoar: (d) => { noise(d, 0.08, { f0: 2200, f1: 1800, peak: 0.5, type: 'bandpass' }); tone(d, 320, 0.12, { type: 'sine', f1: 180, peak: 0.6 }); tone(d, 640, 0.08, { type: 'sine', peak: 0.3, delay: 0.04 }); },
    shot_plasmarifle: (d) => { tone(d, 480, 0.18, { type: 'sine', f1: 120, peak: 0.7 }); tone(d, 960, 0.14, { type: 'sine', f1: 300, peak: 0.4, delay: 0.02 }); noise(d, 0.06, { f0: 3000, f1: 2000, peak: 0.2, type: 'bandpass' }); },
    shot_crossbow: (d) => { noise(d, 0.08, { f0: 900, f1: 2500, peak: 0.35, attack: 0.01, type: 'bandpass' }); tone(d, 180, 0.12, { type: 'triangle', f1: 90, peak: 0.25 }); },
    shot_recurvebow: (d) => { noise(d, 0.06, { f0: 700, f1: 2200, peak: 0.28, attack: 0.01, type: 'bandpass' }); tone(d, 220, 0.09, { type: 'triangle', f1: 110, peak: 0.2 }); },
    shot_zapsmg: (d) => { tone(d, 660, 0.06, { type: 'sine', f1: 220, peak: 0.55 }); tone(d, 1100, 0.04, { type: 'sine', peak: 0.25, delay: 0.01 }); noise(d, 0.04, { f0: 4000, f1: 2500, peak: 0.15, type: 'highpass' }); },
    shot_heavysniper: (d) => { noise(d, 0.5, { f0: 6000, f1: 200, peak: 1.8 }); tone(d, 80, 0.4, { type: 'sawtooth', f1: 28, peak: 0.9 }); noise(d, 1.2, { f0: 700, f1: 100, peak: 0.5, attack: 0.06 }); },
    shot_suppressedar: (d) => { noise(d, 0.05, { f0: 1200, f1: 380, peak: 0.18, type: 'bandpass' }); tone(d, 190, 0.04, { type: 'sine', f1: 80, peak: 0.08 }); },
    shot_trophygun: (d) => { noise(d, 0.28, { f0: 3800, f1: 380, peak: 1.3 }); tone(d, 105, 0.2, { type: 'sawtooth', f1: 40, peak: 0.68 }); noise(d, 0.45, { f0: 700, f1: 130, peak: 0.4, attack: 0.03 }); },
    shot_quadlauncher: (d) => { noise(d, 0.45, { f0: 1400, f1: 320, peak: 0.85, attack: 0.01 }); tone(d, 95, 0.38, { type: 'sawtooth', f1: 48, peak: 0.48 }); },
    shot_infernoshotgun: (d) => { noise(d, 0.12, { f0: 2600, f1: 1400, peak: 0.9, type: 'bandpass' }); tone(d, 140, 0.16, { type: 'sine', f1: 55, peak: 0.55 }); tone(d, 420, 0.1, { type: 'sine', peak: 0.35, delay: 0.03 }); },
    shot_burstpistol: (d) => { noise(d, 0.1, { f0: 4200, f1: 750, peak: 0.82 }); tone(d, 240, 0.065, { type: 'square', f1: 85, peak: 0.36 }); },
    shot_compactsmg: (d) => { noise(d, 0.07, { f0: 5000, f1: 1000, peak: 0.72 }); tone(d, 300, 0.045, { type: 'square', f1: 110, peak: 0.28 }); },
    shot_longbow: (d) => { noise(d, 0.09, { f0: 650, f1: 2000, peak: 0.32, attack: 0.01, type: 'bandpass' }); tone(d, 160, 0.14, { type: 'triangle', f1: 75, peak: 0.22 }); },
    shot_thermalar: (d) => { tone(d, 380, 0.14, { type: 'sine', f1: 100, peak: 0.65 }); tone(d, 760, 0.1, { type: 'sine', f1: 240, peak: 0.35, delay: 0.03 }); noise(d, 0.05, { f0: 2500, f1: 1500, peak: 0.18, type: 'bandpass' }); },
    shot_rpg: (d) => { noise(d, 0.6, { f0: 1200, f1: 300, peak: 0.9, attack: 0.02 }); tone(d, 90, 0.5, { type: 'sawtooth', f1: 45, peak: 0.5 }); },
    rocket_fly: (d) => { noise(d, 0.8, { f0: 760, f1: 520, peak: 0.22, attack: 0.05, type: 'bandpass' }); },
    explosion: (d) => { noise(d, 0.72, { f0: 760, f1: 70, peak: 0.95, attack: 0.01 }); tone(d, 62, 0.55, { type: 'sine', f1: 30, peak: 0.52 }); },
    pickaxe_swing: (d) => { noise(d, 0.18, { f0: 500, f1: 2500, peak: 0.25, type: 'bandpass', attack: 0.06 }); },
    pickaxe_hit: (d) => { noise(d, 0.12, { f0: 1500, f1: 300, peak: 0.8 }); tone(d, 320, 0.08, { type: 'triangle', f1: 120, peak: 0.4 }); },
    pickaxe_crit: (d) => { noise(d, 0.12, { f0: 2500, f1: 500, peak: 0.8 }); tone(d, 880, 0.14, { type: 'sine', peak: 0.5 }); tone(d, 1320, 0.16, { type: 'sine', peak: 0.3, delay: 0.03 }); },
    hit_stone: (d) => { noise(d, 0.1, { f0: 2500, f1: 400, peak: 0.9 }); tone(d, 200, 0.06, { type: 'square', peak: 0.3 }); },
    hit_metal: (d) => { tone(d, 1400, 0.25, { type: 'triangle', f1: 900, peak: 0.4 }); noise(d, 0.08, { f0: 4000, f1: 800, peak: 0.6 }); },
    chest_open: (d) => { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(d, f, 0.5, { type: 'sine', peak: 0.35, delay: i * 0.06 })); noise(d, 0.3, { f0: 800, f1: 200, peak: 0.3 }); },
    ammo_open: (d) => { noise(d, 0.15, { f0: 1200, f1: 300, peak: 0.6 }); tone(d, 440, 0.12, { type: 'triangle', peak: 0.3 }); tone(d, 660, 0.15, { type: 'triangle', peak: 0.25, delay: 0.08 }); },
    pickup: (d) => { tone(d, 700, 0.08, { type: 'sine', peak: 0.35 }); tone(d, 1050, 0.12, { type: 'sine', peak: 0.3, delay: 0.05 }); },
    material_gain: (d) => { tone(d, 900, 0.05, { type: 'triangle', peak: 0.2 }); },
    equip: (d) => { noise(d, 0.08, { f0: 2000, f1: 600, peak: 0.35 }); tone(d, 500, 0.05, { type: 'square', peak: 0.12 }); },
    reload: (d) => { noise(d, 0.06, { f0: 2500, f1: 800, peak: 0.5 }); tone(d, 300, 0.05, { type: 'square', peak: 0.2 }); noise(d, 0.06, { f0: 3000, f1: 900, peak: 0.5, attack: 0.3 }); },
    empty_click: (d) => { tone(d, 1200, 0.04, { type: 'square', peak: 0.2 }); },
    hitmarker: (d) => { tone(d, 1800, 0.05, { type: 'square', peak: 0.25 }); tone(d, 2400, 0.04, { type: 'square', peak: 0.15, delay: 0.02 }); },
    headshot: (d) => { tone(d, 1400, 0.08, { type: 'square', peak: 0.3 }); tone(d, 2100, 0.1, { type: 'square', peak: 0.25, delay: 0.04 }); },
    shield_break: (d) => { noise(d, 0.3, { f0: 5000, f1: 1500, peak: 0.6, type: 'highpass' }); tone(d, 1600, 0.25, { type: 'triangle', f1: 400, peak: 0.4 }); },
    damage_taken: (d) => { noise(d, 0.15, { f0: 600, f1: 150, peak: 0.6 }); tone(d, 120, 0.12, { type: 'sine', f1: 60, peak: 0.6 }); },
    elim: (d) => { [880, 1108, 1318, 1760].forEach((f, i) => tone(d, f, 0.35, { type: 'triangle', peak: 0.35, delay: i * 0.07 })); },
    knock: (d) => { tone(d, 300, 0.3, { type: 'sawtooth', f1: 120, peak: 0.4 }); },
    build: (d) => { noise(d, 0.12, { f0: 1500, f1: 400, peak: 0.6 }); tone(d, 180, 0.1, { type: 'triangle', peak: 0.3 }); },
    build_destroy: (d) => { noise(d, 0.35, { f0: 1000, f1: 150, peak: 0.8 }); },
    heal_start: (d) => { noise(d, 0.3, { f0: 1800, f1: 900, peak: 0.25, type: 'bandpass' }); },
    potion: (d) => { [300, 250, 320, 260].forEach((f, i) => tone(d, f, 0.12, { type: 'sine', f1: f * 1.4, peak: 0.25, delay: i * 0.18 })); },
    heal_done: (d) => { tone(d, 660, 0.2, { type: 'sine', peak: 0.3 }); tone(d, 990, 0.3, { type: 'sine', peak: 0.3, delay: 0.1 }); },
    jump: (d) => { noise(d, 0.15, { f0: 400, f1: 1000, peak: 0.2, type: 'bandpass', attack: 0.02 }); tone(d, 100, 0.1, { type: 'sine', peak: 0.2 }); },
    land: (d) => { noise(d, 0.12, { f0: 500, f1: 120, peak: 0.4 }); tone(d, 60, 0.1, { type: 'sine', peak: 0.3 }); },
    footstep: (d) => { noise(d, 0.05, { f0: 1000, f1: 400, peak: 0.12, type: 'bandpass' }); tone(d, 80, 0.04, { type: 'sine', peak: 0.1, attack: 0.01 }); },
    footstep_grass: (d) => { noise(d, 0.08, { f0: 800, f1: 300, peak: 0.14, type: 'lowpass' }); },
    footstep_wood: (d) => { tone(d, 150, 0.06, { type: 'triangle', f1: 100, peak: 0.18 }); noise(d, 0.05, { f0: 1200, f1: 600, peak: 0.08, type: 'bandpass' }); },
    footstep_stone: (d) => { noise(d, 0.06, { f0: 2500, f1: 1200, peak: 0.15, type: 'highpass' }); tone(d, 120, 0.04, { type: 'sine', peak: 0.08 }); },
    footstep_metal: (d) => { tone(d, 800, 0.05, { type: 'sine', peak: 0.08 }); noise(d, 0.06, { f0: 3000, f1: 1500, peak: 0.12, type: 'highpass' }); },
    glider_open: (d) => { noise(d, 0.5, { f0: 800, f1: 2500, peak: 0.6, attack: 0.02, type: 'bandpass' }); tone(d, 200, 0.2, { type: 'triangle', f1: 400, peak: 0.2 }); },
    countdown_tick: (d) => { tone(d, 1000, 0.08, { type: 'square', peak: 0.25 }); },
    countdown_go: (d) => { tone(d, 1400, 0.3, { type: 'square', peak: 0.3 }); },
    ui_click: (d) => { tone(d, 900, 0.05, { type: 'square', peak: 0.15 }); tone(d, 1300, 0.06, { type: 'square', peak: 0.1, delay: 0.03 }); },
    ui_hover: (d) => { tone(d, 1200, 0.03, { type: 'sine', peak: 0.08 }); },
    victory: (d) => { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(d, f, 0.45, { type: 'triangle', peak: 0.35, delay: i * 0.13 })); },
    death: (d) => { tone(d, 400, 0.6, { type: 'sawtooth', f1: 80, peak: 0.4 }); noise(d, 0.5, { f0: 800, f1: 100, peak: 0.5 }); },
    storm_warning: (d) => { tone(d, 440, 0.25, { type: 'square', peak: 0.2 }); tone(d, 440, 0.25, { type: 'square', peak: 0.2, delay: 0.35 }); },
    storm_tick: (d) => { noise(d, 0.2, { f0: 300, f1: 100, peak: 0.4 }); tone(d, 90, 0.2, { type: 'sine', peak: 0.4 }); },
    vehicle_start: (d) => { tone(d, 60, 0.5, { type: 'sawtooth', f1: 150, peak: 0.3 }); noise(d, 0.4, { f0: 300, f1: 100, peak: 0.2 }); },
    vehicle_stop: (d) => { tone(d, 80, 0.4, { type: 'sawtooth', f1: 30, peak: 0.25 }); noise(d, 0.3, { f0: 200, f1: 50, peak: 0.15 }); },
    vehicle_brake: (d) => { noise(d, 0.2, { f0: 2000, f1: 500, peak: 0.2, type: 'bandpass' }); },
    vehicle_engine: (d) => { /* Placeholder for loop definition below */ },
    whoosh: (d) => { noise(d, 0.25, { f0: 400, f1: 2000, peak: 0.3, attack: 0.08, type: 'bandpass' }); },
    tree_fall: (d) => { noise(d, 0.6, { f0: 600, f1: 100, peak: 0.7, attack: 0.02 }); },
    hit_flesh: (d) => { noise(d, 0.08, { f0: 900, f1: 200, peak: 0.5 }); },
  };
  A.play = function (name, pos, gain, maxDist) {
    if (!A.ready) return; A.resume();
    const def = DEFS[name]; if (!def) return;
    const now = performance.now();
    const throttle = name === 'rocket_fly' ? 140 : name === 'explosion' ? 65 : 0;
    if (throttle && now - (A.lastPlay[name] || 0) < throttle) return;
    // Prevent a burst of procedural voices from overwhelming the Web Audio thread.
    if (A.activeVoices >= A.maxVoices && name !== 'explosion') return;
    A.lastPlay[name] = now;
    const dest = out(gain === undefined ? 1 : gain, pos, maxDist); if (!dest) return;
    A.activeVoices++;
    const hold = name === 'explosion' ? 850 : name === 'rocket_fly' ? 900 : 500;
    setTimeout(() => { A.activeVoices = Math.max(0, A.activeVoices - 1); }, hold);
    try { def(dest); } catch (e) { A.activeVoices = Math.max(0, A.activeVoices - 1); }
  };
  // ----- loops -----
  A.loop = function (name, on, params) {
    if (!A.ready) return;
    let L = A.loops[name];
    if (on && !L) {
      L = {}; const t = A.ctx.currentTime;
      L.gain = A.ctx.createGain(); L.gain.gain.value = 0; L.gain.connect(A.sfx);
        if (name === 'wind' || name === 'glider' || name === 'storm' || name === 'chest_hum' || name === 'bus' || name === 'vehicle_engine') {

        const src = A.ctx.createBufferSource(); src.buffer = A.noiseBuf; src.loop = true;
        const f = A.ctx.createBiquadFilter(); f.type = name === 'chest_hum' ? 'bandpass' : 'lowpass'; f.frequency.value = name === 'storm' ? 150 : 900; f.Q.value = name === 'chest_hum' ? 8 : 0.8;
        src.connect(f); f.connect(L.gain); src.start(t); L.src = src; L.filter = f;
        if (name === 'bus' || name === 'vehicle_engine') { const o = A.ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 55; const og = A.ctx.createGain(); og.gain.value = 0.35; const lf = A.ctx.createBiquadFilter(); lf.frequency.value = 300; o.connect(lf); lf.connect(og); og.connect(L.gain); o.start(t); L.osc = o; L.filter = lf; }
        if (name === 'chest_hum') { const oscs = [523.25, 659.25, 783.99, 1046.5].map((fr, i) => { const o = A.ctx.createOscillator(); o.type = 'sine'; o.frequency.value = fr; o.detune.value = (i % 2 ? 6 : -6); const og = A.ctx.createGain(); og.gain.value = 0.08; o.connect(og); og.connect(L.gain); o.start(t); return o; }); L.oscs = oscs; }
      }
      A.loops[name] = L;
    }
    if (!L) return;
    const target = on ? (params && params.gain !== undefined ? params.gain : 0.5) : 0;
    L.gain.gain.setTargetAtTime(target, A.ctx.currentTime, 0.12);
    if (params && params.freq && L.filter) L.filter.frequency.setTargetAtTime(params.freq, A.ctx.currentTime, 0.1);
    if (!on) { const l = L; delete A.loops[name]; setTimeout(() => { try { l.src && l.src.stop(); l.osc && l.osc.stop(); l.oscs && l.oscs.forEach(o => o.stop()); } catch (e) { } }, 600); }
  };
  A.stopAllLoops = function () { for (const k of Object.keys(A.loops)) A.loop(k, false); };

  // ----- lobby music: simple looping chord pad + pluck melody -----
  A.musicOn = false;
  A.startMusic = function () {
    if (!A.ready || A.musicOn) return; A.musicOn = true;
    const chords = [[261.6, 329.6, 392.0, 493.9], [196.0, 246.9, 293.7, 392.0], [220.0, 261.6, 329.6, 415.3], [174.6, 220.0, 261.6, 349.2]];
    const melody = [523.3, 587.3, 659.3, 784.0, 659.3, 587.3, 523.3, 493.9, 440.0, 493.9, 523.3, 587.3, 659.3, 523.3, 493.9, 440.0];
    let bar = 0;
    function playBar() {
      if (!A.musicOn) return;
      const t = A.ctx.currentTime; const ch = chords[bar % chords.length];
      ch.forEach((f) => {
        const o = A.ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = f / 2; const o2 = A.ctx.createOscillator(); o2.type = 'sawtooth'; o2.frequency.value = f / 2; o2.detune.value = 7;
        const g = A.ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.06, t + 0.4); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.4);
        const fl = A.ctx.createBiquadFilter(); fl.frequency.value = 900; o.connect(fl); o2.connect(fl); fl.connect(g); g.connect(A.music); o.start(t); o2.start(t); o.stop(t + 2.5); o2.stop(t + 2.5);
      });
      for (let i = 0; i < 4; i++) {
        const f = melody[(bar * 4 + i) % melody.length]; const st = t + i * 0.6;
        const o = A.ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f; const g = A.ctx.createGain(); g.gain.setValueAtTime(0.0001, st); g.gain.exponentialRampToValueAtTime(0.09, st + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, st + 0.5);
        o.connect(g); g.connect(A.music); o.start(st); o.stop(st + 0.55);
      }
      bar++; A._musicTimer = setTimeout(playBar, 2400);
    }
    playBar();
  };
  A.stopMusic = function () { A.musicOn = false; clearTimeout(A._musicTimer); };
  FN.Audio = A;
})();
