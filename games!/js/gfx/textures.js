// Procedural canvas textures (so the game runs from file:// with no asset downloads).
window.FN = window.FN || {};
(function () {
  const T = { cache: {} };
  function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  T.make = function (name, w, h, draw, opts) {
    if (T.cache[name]) return T.cache[name];
    const c = canvas(w, h); const ctx = c.getContext('2d'); draw(ctx, w, h);
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.colorSpace = THREE.SRGBColorSpace;
    // anisotropy lowered from 4 to 1 — Intel HD Sandy Bridge gains nothing from anisotropy
    // but pays for it in texture sample cost every frame.
    tex.anisotropy = 1;
    if (opts && opts.repeat) tex.repeat.set(opts.repeat[0], opts.repeat[1]);
    if (opts && opts.nearest) { tex.magFilter = THREE.NearestFilter; }
    T.cache[name] = tex; return tex;
  };
  const rnd = FN.U.mulberry32(4242);
  function noiseFill(ctx, w, h, base, amount, count) {
    ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < count; i++) {
      const v = (rnd() - 0.5) * amount; ctx.fillStyle = 'rgba(' + (v > 0 ? '255,255,255,' : '0,0,0,') + Math.abs(v) + ')';
      ctx.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 3, 1 + rnd() * 3);
    }
  }
  // Wood planks (walls / floors) — 128 instead of 256 to save VRAM on Intel HD Sandy Bridge
  T.wood = () => T.make('wood', 128, 128, (ctx, w, h) => {
    noiseFill(ctx, w, h, '#c99a55', 0.18, 800);
    const rows = 6;
    for (let r = 0; r < rows; r++) {
      const y = r * (h / rows);
      ctx.fillStyle = 'rgba(80,45,10,0.55)'; ctx.fillRect(0, y, w, 3);
      ctx.fillStyle = 'rgba(255,220,160,0.18)'; ctx.fillRect(0, y + 3, w, 2);
      const off = (r % 2) * 35 + 10; ctx.fillStyle = 'rgba(80,45,10,0.45)'; ctx.fillRect(off, y, 3, h / rows); ctx.fillRect((off + 64) % w, y, 3, h / rows);
      for (let k = 0; k < 4; k++) { ctx.strokeStyle = 'rgba(120,70,20,0.25)'; ctx.lineWidth = 1; ctx.beginPath(); const yy = y + 4 + rnd() * (h / rows - 6); ctx.moveTo(0, yy); ctx.bezierCurveTo(w * 0.3, yy + rnd() * 4 - 2, w * 0.6, yy + rnd() * 4 - 2, w, yy); ctx.stroke(); }
    }
  });
  T.woodDark = () => T.make('woodDark', 128, 128, (ctx, w, h) => {
    noiseFill(ctx, w, h, '#8a5a2b', 0.2, 800);
    for (let r = 0; r < 8; r++) { const y = r * 16; ctx.fillStyle = 'rgba(40,20,5,0.6)'; ctx.fillRect(0, y, w, 3); ctx.fillStyle = 'rgba(255,200,140,0.12)'; ctx.fillRect(0, y + 3, w, 2); }
  });
  T.brick = () => T.make('brick', 128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#8f8f8f'; ctx.fillRect(0, 0, w, h);
    const bw = 32, bh = 16;
    for (let r = 0; r < h / bh; r++) {
      for (let c = -1; c < w / bw + 1; c++) {
        const x = c * bw + (r % 2) * 16, y = r * bh;
        const shade = 0.85 + rnd() * 0.3; const g = Math.floor(150 * shade), rr = Math.floor(160 * shade), b = Math.floor(140 * shade);
        ctx.fillStyle = 'rgb(' + rr + ',' + g + ',' + b + ')'; ctx.fillRect(x + 2, y + 2, bw - 4, bh - 4);
        ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(x + 2, y + 2, bw - 4, 2);
        ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(x + 2, y + bh - 4, bw - 4, 2);
      }
    }
    for (let i = 0; i < 500; i++) { ctx.fillStyle = 'rgba(0,0,0,' + rnd() * 0.12 + ')'; ctx.fillRect(rnd() * w, rnd() * h, 2, 2); }
  });
  T.metal = () => T.make('metal', 128, 128, (ctx, w, h) => {
    noiseFill(ctx, w, h, '#9aa4ad', 0.14, 700);
    ctx.strokeStyle = 'rgba(30,40,50,0.55)'; ctx.lineWidth = 2;
    for (let i = 0; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(0, i * 64); ctx.lineTo(w, i * 64); ctx.stroke(); ctx.beginPath(); ctx.moveTo(i * 64, 0); ctx.lineTo(i * 64, h); ctx.stroke(); }
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) { for (let k = 0; k < 4; k++) { const x = c * 64 + 6 + (k % 2) * 52, y = r * 64 + 6 + Math.floor(k / 2) * 52; ctx.fillStyle = 'rgba(40,50,60,0.6)'; ctx.beginPath(); ctx.arc(x, y, 3, 0, 6.28); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.arc(x - 1, y - 1, 1.5, 0, 6.28); ctx.fill(); } }
  });
  T.roofShingle = () => T.make('roof', 128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#6b4a3a'; ctx.fillRect(0, 0, w, h);
    for (let r = 0; r < 8; r++) for (let c = -1; c < 9; c++) { const x = c * 16 + (r % 2) * 8, y = r * 16; const s = 0.8 + rnd() * 0.4; ctx.fillStyle = 'rgb(' + Math.floor(120 * s) + ',' + Math.floor(80 * s) + ',' + Math.floor(62 * s) + ')'; ctx.fillRect(x + 1, y + 1, 14, 14); ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x + 1, y + 13, 14, 3); }
  });
  T.concrete = () => T.make('concrete', 128, 128, (ctx, w, h) => { noiseFill(ctx, w, h, '#b9b9b4', 0.12, 1200); });
  T.asphalt = () => T.make('asphalt', 128, 128, (ctx, w, h) => { noiseFill(ctx, w, h, '#4a4a4c', 0.16, 1200); });
  T.siding = () => T.make('siding', 128, 128, (ctx, w, h) => {
    noiseFill(ctx, w, h, '#ffffff', 0.06, 400);
    for (let r = 0; r < 16; r++) { const y = r * 8; ctx.fillStyle = 'rgba(0,0,0,0.16)'; ctx.fillRect(0, y + 6, w, 2); ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(0, y, w, 1); }
  });
  T.grassTile = () => T.make('grass', 128, 128, (ctx, w, h) => {
    noiseFill(ctx, w, h, '#6fae3a', 0.16, 2500);
    for (let i = 0; i < 400; i++) { ctx.strokeStyle = 'rgba(' + (40 + rnd() * 40) + ',' + (110 + rnd() * 60) + ',' + (30 + rnd() * 20) + ',0.5)'; ctx.lineWidth = 1; const x = rnd() * w, y = rnd() * h; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + rnd() * 4 - 2, y - 4 - rnd() * 6); ctx.stroke(); }
  });
  T.sand = () => T.make('sand', 128, 128, (ctx, w, h) => { noiseFill(ctx, w, h, '#e6d59a', 0.1, 1500); });
  T.tarmac = () => T.make('tarmac', 128, 128, (ctx, w, h) => { noiseFill(ctx, w, h, '#575a5e', 0.14, 1200); ctx.fillStyle = 'rgba(0,0,0,0.25)'; for (let i = 0; i < 20; i++) ctx.fillRect(rnd() * w, rnd() * h, 2 + rnd() * 8, 1); });
  // Radial glow sprite
  T.glow = () => T.make('glow', 128, 128, (ctx, w, h) => {
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  });
  T.softDot = () => T.make('softdot', 64, 64, (ctx, w, h) => {
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.6, 'rgba(255,255,255,0.8)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  });
  T.cloud = (i) => T.make('cloud' + i, 256, 128, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const r = FN.U.mulberry32(77 + i * 13);
    for (let k = 0; k < 18; k++) {
      const x = 40 + r() * (w - 80), y = 50 + r() * 40, rad = 22 + r() * 30;
      const g = ctx.createRadialGradient(x, y, 0, x, y, rad); g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(0.7, 'rgba(255,255,255,0.7)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    }
    // flat bottom shade
    const g2 = ctx.createLinearGradient(0, 60, 0, h); g2.addColorStop(0, 'rgba(180,200,230,0)'); g2.addColorStop(1, 'rgba(150,175,215,0.35)'); ctx.globalCompositeOperation = 'source-atop'; ctx.fillStyle = g2; ctx.fillRect(0, 0, w, h); ctx.globalCompositeOperation = 'source-over';
  });
  T.muzzle = () => T.make('muzzle', 64, 64, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h); ctx.translate(32, 32);
    for (let k = 0; k < 7; k++) { ctx.rotate(Math.PI * 2 / 7); ctx.fillStyle = 'rgba(255,220,120,0.9)'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(6, -6); ctx.lineTo(30, 0); ctx.lineTo(6, 6); ctx.fill(); }
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 16); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,200,80,0)'); ctx.fillStyle = g; ctx.fillRect(-32, -32, 64, 64);
  });
  T.storm = () => T.make('storm', 256, 64, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    for (let i = 0; i < 150; i++) { const x = rnd() * w, y = rnd() * h; const g = ctx.createRadialGradient(x, y, 0, x, y, 6 + rnd() * 16); g.addColorStop(0, 'rgba(210,120,255,0.35)'); g.addColorStop(1, 'rgba(120,40,200,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); }
  });
  T.water = () => T.make('water', 128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#2f7fc8'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 45; i++) { ctx.strokeStyle = 'rgba(255,255,255,' + (0.12 + rnd() * 0.2) + ')'; ctx.lineWidth = 1 + rnd() * 2; const x = rnd() * w, y = rnd() * h; ctx.beginPath(); ctx.moveTo(x, y); ctx.bezierCurveTo(x + 8, y - 3, x + 18, y + 3, x + 28 + rnd() * 16, y); ctx.stroke(); }
  });
  T.hedge = () => T.make('hedge', 128, 128, (ctx, w, h) => { noiseFill(ctx, w, h, '#2f7a2a', 0.3, 3000); });
  T.tomato = () => T.make('tomato', 128, 128, (ctx, w, h) => { ctx.fillStyle = '#e2352b'; ctx.fillRect(0, 0, w, h); });
  T.checker = () => T.make('checker', 64, 64, (ctx, w, h) => { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#222'; ctx.fillRect(0, 0, 32, 32); ctx.fillRect(32, 32, 32, 32); });
  // Text label texture (signs)
  T.label = (key, text, bg, fg, w, h, font) => T.make('label_' + key, w || 512, h || 128, (ctx, W, H) => {
    ctx.fillStyle = bg || '#ffffff'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = fg || '#222'; ctx.font = font || ('bold ' + Math.floor(H * 0.6) + 'px Impact, Arial Narrow, sans-serif'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, W / 2, H / 2 + 2);
  });
  FN.Tex = T;
})();
