// Weapon + pickaxe models built from primitives (one mesh each, vertex colors). Barrel points along local -Z, grip at origin.
window.FN = window.FN || {};
(function () {
  const G = FN.GeoUtil;
  const WM = { cache: {} };
  const B = (w, h, d, x, y, z, rx, ry, rz) => G.box(w, h, d, x, y, z, rx, ry, rz);
  const Cz = (r, len, x, y, z, seg) => G.cyl(r, r, len, seg || 10, x, y, z, Math.PI / 2, 0, 0); // cylinder along Z
  const BLK = 0x1f2124, DGRY = 0x3a3d41, GRY = 0x6b6f74, LGRY = 0x9aa0a6, TAN = 0xc9a86a, WOOD = 0x8a5a2b;

  const BUILD = {
    m16() { // Assault Rifle (M16A1 look)
      return [
        { geo: B(0.07, 0.11, 0.42, 0, 0.14, -0.05), color: DGRY },          // receiver
        { geo: B(0.05, 0.05, 0.16, 0, 0.225, -0.05), color: DGRY },         // carry handle
        { geo: B(0.02, 0.04, 0.04, 0, 0.24, -0.12), color: BLK },
        { geo: G.cyl(0.035, 0.032, 0.34, 8, 0, 0.15, -0.44, Math.PI / 2, 0, 0), color: DGRY }, // handguard
        { geo: Cz(0.013, 0.34, 0, 0.15, -0.74, 8), color: BLK },            // barrel
        { geo: B(0.02, 0.07, 0.03, 0, 0.19, -0.62), color: BLK },           // front sight
        { geo: Cz(0.018, 0.06, 0, 0.15, -0.94, 8), color: BLK },            // flash hider
        { geo: B(0.05, 0.2, 0.06, 0, 0.0, -0.02, 0.15, 0, 0), color: BLK },  // magazine
        { geo: B(0.04, 0.12, 0.05, 0, 0.03, 0.14, -0.35, 0, 0), color: BLK }, // pistol grip
        { geo: B(0.05, 0.1, 0.3, 0, 0.13, 0.33), color: DGRY },             // stock
        { geo: B(0.03, 0.05, 0.02, 0, 0.09, -0.12), color: BLK },            // trigger guard
      ];
    },
    scar() {
      return [
        { geo: B(0.075, 0.11, 0.4, 0, 0.14, -0.05), color: TAN },
        { geo: B(0.05, 0.03, 0.42, 0, 0.215, -0.1), color: BLK },              // top rail
        { geo: B(0.06, 0.07, 0.3, 0, 0.14, -0.42), color: TAN },               // handguard
        { geo: Cz(0.014, 0.3, 0, 0.15, -0.72, 8), color: BLK },
        { geo: Cz(0.02, 0.07, 0, 0.15, -0.9, 8), color: BLK },
        { geo: B(0.05, 0.2, 0.07, 0, 0.0, -0.03, 0.2, 0, 0), color: BLK },      // mag
        { geo: B(0.04, 0.12, 0.05, 0, 0.03, 0.13, -0.35, 0, 0), color: BLK },
        { geo: B(0.06, 0.05, 0.28, 0, 0.17, 0.32), color: TAN },               // stock bar
        { geo: B(0.05, 0.11, 0.06, 0, 0.13, 0.45), color: TAN },               // butt plate
        { geo: B(0.02, 0.05, 0.03, 0, 0.245, -0.28), color: BLK },
      ];
    },
    tac() { // Tactical Shotgun (red + white)
      const RED = 0xc8322a, WHT = 0xdedede;
      return [
        { geo: B(0.075, 0.1, 0.3, 0, 0.14, 0.02), color: RED },               // receiver
        { geo: B(0.055, 0.06, 0.16, 0, 0.14, -0.28), color: WHT },             // fore-end / pump
        { geo: Cz(0.02, 0.42, 0, 0.17, -0.42, 8), color: LGRY },               // barrel
        { geo: Cz(0.017, 0.4, 0, 0.115, -0.4, 8), color: LGRY },               // tube mag
        { geo: B(0.04, 0.11, 0.05, 0, 0.04, 0.12, -0.35, 0, 0), color: RED },   // grip
        { geo: B(0.05, 0.09, 0.28, 0, 0.13, 0.33), color: RED },               // stock
        { geo: B(0.05, 0.05, 0.05, 0, 0.13, 0.48), color: WHT },
        { geo: B(0.02, 0.03, 0.03, 0, 0.21, -0.6), color: BLK },
      ];
    },
    bolt() { // Bolt-action sniper (tan with scope)
      return [
        { geo: B(0.065, 0.09, 0.5, 0, 0.13, -0.1), color: TAN },
        { geo: B(0.06, 0.08, 0.34, 0, 0.12, 0.34), color: TAN },               // stock
        { geo: B(0.045, 0.1, 0.06, 0, 0.05, 0.16, -0.3, 0, 0), color: TAN },    // grip
        { geo: Cz(0.02, 0.24, 0, 0.16, -0.3, 8), color: BLK },
        { geo: Cz(0.015, 0.6, 0, 0.16, -0.68, 8), color: BLK },                // long barrel
        { geo: Cz(0.03, 0.2, 0, 0.245, -0.08, 10), color: BLK },               // scope
        { geo: Cz(0.036, 0.05, 0, 0.245, -0.18, 10), color: DGRY }, { geo: Cz(0.036, 0.05, 0, 0.245, 0.02, 10), color: DGRY },
        { geo: B(0.02, 0.04, 0.03, 0, 0.21, -0.05), color: BLK }, { geo: B(0.02, 0.04, 0.03, 0, 0.21, -0.11), color: BLK },
        { geo: G.cyl(0.012, 0.012, 0.09, 6, 0.06, 0.16, 0.06, 0, 0, Math.PI / 2), color: BLK }, // bolt handle
        { geo: B(0.04, 0.11, 0.03, 0, 0.03, 0.0, 0.1, 0, 0), color: BLK },      // mag
      ];
    },
    scopedar() { // Scoped AR (grey/blue)
      const BLU = 0x4a5f7a;
      return [
        { geo: B(0.075, 0.11, 0.42, 0, 0.14, -0.05), color: GRY },
        { geo: B(0.05, 0.03, 0.34, 0, 0.215, -0.1), color: BLK },
        { geo: B(0.06, 0.07, 0.28, 0, 0.14, -0.42), color: BLU },
        { geo: Cz(0.025, 0.36, 0, 0.15, -0.72, 8), color: DGRY },              // thick barrel
        { geo: B(0.04, 0.1, 0.05, 0, 0.06, -0.36, 0.2, 0, 0), color: BLK },     // foregrip
        { geo: Cz(0.03, 0.18, 0, 0.26, -0.08, 10), color: BLK }, { geo: Cz(0.037, 0.04, 0, 0.26, -0.17, 10), color: BLU }, { geo: Cz(0.037, 0.04, 0, 0.26, 0.01, 10), color: BLU },
        { geo: B(0.02, 0.04, 0.03, 0, 0.225, -0.05), color: BLK }, { geo: B(0.02, 0.04, 0.03, 0, 0.225, -0.11), color: BLK },
        { geo: B(0.05, 0.2, 0.07, 0, 0.0, -0.03, 0.2, 0, 0), color: BLK },
        { geo: B(0.04, 0.12, 0.05, 0, 0.03, 0.13, -0.35, 0, 0), color: BLK },
        { geo: B(0.05, 0.1, 0.3, 0, 0.13, 0.33), color: GRY },
      ];
    },
    pistol() { // silver semi-auto with wooden grips
      const SLV = 0xb8bcc0;
      return [
        { geo: B(0.05, 0.06, 0.24, 0, 0.16, -0.06), color: SLV },              // slide
        { geo: B(0.045, 0.04, 0.2, 0, 0.115, -0.05), color: LGRY },            // frame
        { geo: Cz(0.012, 0.05, 0, 0.16, -0.2, 8), color: BLK },
        { geo: B(0.045, 0.13, 0.07, 0, 0.04, 0.03, -0.25, 0, 0), color: WOOD },  // grip
        { geo: B(0.02, 0.03, 0.02, 0, 0.09, -0.04), color: BLK },              // trigger
        { geo: B(0.02, 0.03, 0.03, 0, 0.2, -0.16), color: BLK }, { geo: B(0.03, 0.03, 0.02, 0, 0.2, 0.05), color: BLK },
      ];
    },
    rpg() { // Rocket launcher with shark-face warhead
      const OLV = 0x5b6b3c, ORG = 0xd8452f;
      const tex = FN.Tex.make('shark', 256, 128, (ctx, w, h) => {
        ctx.fillStyle = '#5b6b3c'; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#c8302a'; ctx.beginPath(); ctx.moveTo(30, 64); ctx.quadraticCurveTo(140, 20, 250, 60); ctx.quadraticCurveTo(140, 108, 30, 64); ctx.fill();
        ctx.fillStyle = '#ffffff'; for (let i = 0; i < 9; i++) { const x = 50 + i * 22; ctx.beginPath(); ctx.moveTo(x, 40 + i * 0.5); ctx.lineTo(x + 10, 62); ctx.lineTo(x + 20, 40); ctx.fill(); ctx.beginPath(); ctx.moveTo(x, 88); ctx.lineTo(x + 10, 66); ctx.lineTo(x + 20, 88); ctx.fill(); }
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(60, 22, 9, 0, 6.3); ctx.fill(); ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(63, 22, 4, 0, 6.3); ctx.fill();
      });
      WM._sharkTex = tex;
      return [
        { geo: Cz(0.045, 0.7, 0, 0.16, 0.0, 12), color: OLV },                  // tube
        { geo: G.cyl(0.06, 0.045, 0.16, 12, 0, 0.16, 0.42, Math.PI / 2, 0, 0), color: OLV }, // rear flare
        { geo: G.cyl(0.03, 0.06, 0.1, 12, 0, 0.16, 0.52, Math.PI / 2, 0, 0), color: BLK },
        { geo: B(0.04, 0.12, 0.05, 0, 0.05, 0.05, -0.2, 0, 0), color: WOOD },    // grip
        { geo: B(0.04, 0.1, 0.05, 0, 0.06, -0.22, 0.2, 0, 0), color: WOOD },     // front grip
        { geo: B(0.03, 0.06, 0.16, 0, 0.23, 0.0), color: DGRY },                // sight block
        { geo: G.cyl(0.085, 0.045, 0.28, 12, 0, 0.16, -0.48, Math.PI / 2, 0, 0), color: OLV, shark: true }, // warhead
        { geo: G.cone(0.085, 0.16, 12, 0, 0, 0).rotateX(-Math.PI / 2).translate(0, 0.16, -0.7), color: ORG },
        { geo: B(0.02, 0.12, 0.08, 0, 0.16, -0.36, 0, 0, 0), color: OLV }, { geo: B(0.12, 0.02, 0.08, 0, 0.16, -0.36, 0, 0, 0), color: OLV }, // fins
      ];
    },
    pickaxe() { // default pickaxe: wrapped wooden handle + steel-blue head
      const STL = 0x6f8194, HND = 0x7a4a24, WRAP = 0x3a2a1a;
      return [
        { geo: G.cyl(0.025, 0.03, 0.95, 8, 0, 0.42, 0), color: HND },          // handle (vertical in local space, head at top)
        { geo: G.cyl(0.032, 0.032, 0.22, 8, 0, 0.1, 0), color: WRAP },
        { geo: B(0.05, 0.07, 0.5, 0, 0.9, -0.05), color: STL },                // head bar
        { geo: G.cone(0.035, 0.22, 6, 0, 0, 0).rotateX(-Math.PI / 2).translate(0, 0.9, -0.4), color: STL }, // spike
        { geo: B(0.02, 0.16, 0.16, 0, 0.9, 0.24), color: STL },                // blade
        { geo: B(0.06, 0.09, 0.08, 0, 0.9, 0.0), color: 0x4a5a6a },
      ];
    },
    pump() { // Pump Shotgun (wood pump + steel receiver)
      return [
        { geo: B(0.07, 0.1, 0.32, 0, 0.14, 0.02), color: DGRY },               // receiver
        { geo: Cz(0.02, 0.5, 0, 0.17, -0.48, 8), color: BLK },                 // barrel
        { geo: Cz(0.017, 0.46, 0, 0.115, -0.44, 8), color: BLK },              // tube mag
        { geo: B(0.055, 0.06, 0.16, 0, 0.12, -0.3), color: WOOD },             // pump fore-end
        { geo: B(0.04, 0.11, 0.05, 0, 0.04, 0.12, -0.35, 0, 0), color: WOOD }, // grip
        { geo: B(0.05, 0.1, 0.28, 0, 0.13, 0.32), color: WOOD },               // stock
        { geo: B(0.02, 0.03, 0.03, 0, 0.21, -0.68), color: BLK },              // front sight
        { geo: B(0.02, 0.04, 0.03, 0, 0.2, 0.05), color: BLK },                // ejection port
      ];
    },
    burst() { // Burst Assault Rifle (M16A2 look, green furniture + round handguard)
      const GRN = 0x39502e;
      return [
        { geo: B(0.07, 0.11, 0.42, 0, 0.14, -0.05), color: GRN },              // receiver
        { geo: B(0.05, 0.05, 0.18, 0, 0.225, -0.06), color: GRN },             // carry handle
        { geo: Cz(0.013, 0.38, 0, 0.15, -0.62, 8), color: BLK },               // barrel
        { geo: G.cyl(0.032, 0.032, 0.3, 8, 0, 0.15, -0.42, Math.PI / 2, 0, 0), color: GRN }, // round handguard
        { geo: Cz(0.018, 0.06, 0, 0.15, -0.86, 8), color: BLK },               // flash hider
        { geo: B(0.05, 0.22, 0.06, 0, -0.02, -0.03, 0.1, 0, 0), color: BLK },  // long magazine
        { geo: B(0.04, 0.12, 0.05, 0, 0.03, 0.14, -0.35, 0, 0), color: BLK },  // pistol grip
        { geo: B(0.05, 0.1, 0.3, 0, 0.13, 0.33), color: GRN },                 // stock
        { geo: B(0.03, 0.05, 0.02, 0, 0.09, -0.12), color: BLK },
      ];
    },
    smg() { // Submachine Gun (MP5-like: compact receiver + long thin mag)
      const DK = 0x24262a;
      return [
        { geo: B(0.06, 0.09, 0.3, 0, 0.14, -0.02), color: DK },                // receiver
        { geo: Cz(0.014, 0.2, 0, 0.16, -0.26, 8), color: BLK },                // barrel
        { geo: Cz(0.022, 0.08, 0, 0.16, -0.38, 8), color: DK },                // front cap
        { geo: B(0.035, 0.24, 0.05, 0, -0.02, -0.06, 0.12, 0, 0), color: DK }, // long thin mag
        { geo: B(0.04, 0.11, 0.05, 0, 0.04, 0.08, -0.35, 0, 0), color: DK },   // grip
        { geo: B(0.03, 0.035, 0.22, 0, 0.13, 0.2), color: DGRY },              // folded stock bar
        { geo: B(0.045, 0.06, 0.04, 0, 0.11, 0.31), color: DK },               // stock plate
        { geo: B(0.02, 0.03, 0.1, 0, 0.2, -0.08), color: BLK },                // sight rail
      ];
    },
    tacsmg() { // Tactical Submachine Gun (compact + angled foregrip, tan accents)
      return [
        { geo: B(0.065, 0.09, 0.28, 0, 0.14, 0.0), color: DGRY },              // receiver
        { geo: Cz(0.015, 0.16, 0, 0.16, -0.22, 8), color: BLK },               // barrel
        { geo: B(0.04, 0.18, 0.05, 0, 0.0, -0.02, 0.15, 0, 0), color: BLK },   // mag
        { geo: B(0.035, 0.08, 0.05, 0, 0.08, -0.2, 0.5, 0, 0), color: TAN },   // angled foregrip
        { geo: B(0.04, 0.11, 0.05, 0, 0.04, 0.1, -0.35, 0, 0), color: TAN },   // grip
        { geo: B(0.05, 0.07, 0.2, 0, 0.14, 0.22), color: DGRY },               // stock
        { geo: B(0.02, 0.03, 0.08, 0, 0.2, -0.06), color: BLK },               // rail
      ];
    },
    suppressedsmg() { // Suppressed Submachine Gun (SMG + long suppressor, all black)
      const DK = 0x1c1e21;
      return [
        { geo: B(0.06, 0.09, 0.3, 0, 0.14, 0.0), color: DK },                  // receiver
        { geo: Cz(0.03, 0.26, 0, 0.155, -0.34, 10), color: BLK },              // suppressor
        { geo: Cz(0.014, 0.1, 0, 0.155, -0.12, 8), color: DK },                // barrel stub
        { geo: B(0.035, 0.22, 0.05, 0, -0.01, -0.04, 0.12, 0, 0), color: DK }, // mag
        { geo: B(0.04, 0.11, 0.05, 0, 0.04, 0.1, -0.35, 0, 0), color: DK },    // grip
        { geo: B(0.03, 0.035, 0.2, 0, 0.13, 0.2), color: DK },                 // stock bar
        { geo: B(0.02, 0.03, 0.1, 0, 0.2, -0.05), color: 0x2e3134 },           // rail
      ];
    },
    semisniper() { // Semi-Auto Sniper Rifle (sleek dark-blue marksman rifle with scope, no bolt handle)
      const BLU = 0x33404e;
      return [
        { geo: B(0.06, 0.09, 0.48, 0, 0.13, -0.08), color: BLU },              // receiver
        { geo: B(0.055, 0.08, 0.32, 0, 0.12, 0.34), color: BLU },              // stock
        { geo: B(0.04, 0.1, 0.06, 0, 0.05, 0.18, -0.3, 0, 0), color: BLU },    // grip
        { geo: Cz(0.018, 0.3, 0, 0.16, -0.42, 8), color: BLK },                // barrel
        { geo: Cz(0.024, 0.06, 0, 0.16, -0.6, 8), color: BLK },                // muzzle brake
        { geo: Cz(0.035, 0.22, 0, 0.24, -0.1, 10), color: BLK },               // scope tube
        { geo: Cz(0.042, 0.03, 0, 0.24, -0.22, 10), color: 0x111318 },         // scope front
        { geo: B(0.02, 0.05, 0.03, 0, 0.19, -0.02), color: BLK },              // scope mount
        { geo: B(0.045, 0.16, 0.06, 0, 0.02, -0.02, 0.05, 0, 0), color: BLK }, // magazine
      ];
    },
    revolver() { // Revolver (big frame + cylinder + wooden grip)
      const STL = 0x565c63;
      return [
        { geo: B(0.05, 0.07, 0.2, 0, 0.13, -0.08), color: STL },               // frame
        { geo: Cz(0.045, 0.07, 0, 0.13, -0.04, 10), color: 0x3b4046 },         // cylinder
        { geo: Cz(0.016, 0.18, 0, 0.13, -0.24, 8), color: STL },               // barrel
        { geo: B(0.012, 0.03, 0.03, 0, 0.19, -0.32), color: STL },             // front sight
        { geo: B(0.02, 0.05, 0.03, 0, 0.2, -0.02, 0.3, 0, 0), color: STL },    // hammer
        { geo: B(0.04, 0.12, 0.05, 0, 0.02, 0.06, -0.4, 0, 0), color: WOOD },  // wooden grip
        { geo: B(0.015, 0.03, 0.06, 0, 0.08, 0.02), color: STL },              // trigger guard
      ];
    },
    handcannon() { // Hand Cannon (oversized heavy revolver, black + gold trim)
      const GLD = 0xc7a23c;
      return [
        { geo: B(0.065, 0.085, 0.24, 0, 0.14, -0.1), color: 0x1f2226 },        // frame
        { geo: Cz(0.055, 0.09, 0, 0.14, -0.04, 10), color: 0x2a2e33 },         // cylinder
        { geo: Cz(0.02, 0.24, 0, 0.14, -0.3, 8), color: 0x1f2226 },            // barrel
        { geo: Cz(0.026, 0.05, 0, 0.14, -0.44, 8), color: GLD },               // muzzle ring
        { geo: B(0.014, 0.035, 0.03, 0, 0.21, -0.4), color: GLD },             // front sight
        { geo: B(0.024, 0.06, 0.03, 0, 0.22, -0.02, 0.3, 0, 0), color: 0x1f2226 }, // hammer
        { geo: B(0.045, 0.13, 0.055, 0, 0.02, 0.07, -0.4, 0, 0), color: 0x2a2018 }, // grip
        { geo: B(0.016, 0.03, 0.07, 0, 0.09, 0.03), color: GLD },              // trigger guard
      ];
    },
    grenadelauncher() { // Grenade Launcher (fat tube + drum mag, olive drab)
      const OLV = 0x5d6638;
      return [
        { geo: Cz(0.05, 0.44, 0, 0.15, -0.3, 12), color: OLV },                // fat barrel
        { geo: Cz(0.058, 0.05, 0, 0.15, -0.53, 12), color: BLK },              // muzzle
        { geo: B(0.07, 0.1, 0.24, 0, 0.14, 0.08), color: 0x3e4626 },           // receiver
        { geo: G.cyl(0.075, 0.075, 0.06, 12, 0, 0.0, -0.08, Math.PI / 2, 0, 0), color: 0x2e3320 }, // drum mag
        { geo: B(0.04, 0.11, 0.05, 0, 0.03, 0.16, -0.35, 0, 0), color: OLV },  // grip
        { geo: B(0.05, 0.08, 0.18, 0, 0.15, 0.3), color: 0x3e4626 },           // stock
        { geo: B(0.02, 0.04, 0.03, 0, 0.21, -0.34), color: BLK },              // sight
      ];
    },
    doublebarrel() { // Double Barrel Shotgun (side-by-side barrels, wood stock)
      return [
        { geo: Cz(0.02, 0.4, -0.023, 0.165, -0.34, 8), color: BLK },           // left barrel
        { geo: Cz(0.02, 0.4, 0.023, 0.165, -0.34, 8), color: BLK },            // right barrel
        { geo: B(0.06, 0.05, 0.14, 0, 0.145, -0.08), color: 0x2e3134 },        // breech block
        { geo: B(0.045, 0.05, 0.14, 0, 0.115, -0.12), color: WOOD },           // fore-end wood
        { geo: B(0.04, 0.11, 0.05, 0, 0.04, 0.06, -0.35, 0, 0), color: WOOD }, // grip
        { geo: B(0.05, 0.1, 0.26, 0, 0.12, 0.24, 0.08, 0, 0), color: WOOD },   // stock
        { geo: B(0.014, 0.025, 0.02, -0.023, 0.19, -0.52), color: BLK },       // left bead
        { geo: B(0.014, 0.025, 0.02, 0.023, 0.19, -0.52), color: BLK },        // right bead
      ];
    },
    leveraction() { return [{ geo: B(0.07, 0.09, 0.42, 0, 0.14, -0.08), color: WOOD }, { geo: Cz(0.016, 0.62, 0, 0.16, -0.58, 8), color: BLK }, { geo: B(0.045, 0.06, 0.12, 0, 0.05, -0.12), color: BLK }, { geo: B(0.04, 0.12, 0.05, 0, 0.04, 0.16, -0.4, 0, 0), color: WOOD }, { geo: B(0.05, 0.1, 0.28, 0, 0.13, 0.34), color: WOOD }]; },
    drumshotgun() { return [{ geo: B(0.08, 0.11, 0.28, 0, 0.15, 0.02), color: DGRY }, { geo: Cz(0.075, 0.1, 0, 0.02, -0.08, 12), color: BLK }, { geo: Cz(0.02, 0.43, 0, 0.18, -0.42, 8), color: BLK }, { geo: B(0.045, 0.12, 0.05, 0, 0.04, 0.12, -0.35, 0, 0), color: WOOD }, { geo: B(0.05, 0.1, 0.3, 0, 0.13, 0.34), color: WOOD }]; },
    burstsmg() { return [{ geo: B(0.06, 0.1, 0.32, 0, 0.15, 0), color: 0x334b58 }, { geo: Cz(0.014, 0.25, 0, 0.16, -0.3, 8), color: BLK }, { geo: B(0.035, 0.25, 0.06, 0, -0.01, -0.04, 0.1, 0, 0), color: 0x20272d }, { geo: B(0.04, 0.1, 0.05, 0, 0.04, 0.1, -0.35, 0, 0), color: 0x20272d }, { geo: B(0.03, 0.04, 0.22, 0, 0.13, 0.22), color: 0x526776 }]; },
    combatsmg() { return [{ geo: B(0.07, 0.1, 0.3, 0, 0.15, 0), color: 0x6d4b32 }, { geo: Cz(0.018, 0.3, 0, 0.16, -0.34, 8), color: BLK }, { geo: B(0.045, 0.23, 0.06, 0, -0.01, -0.03, 0.1, 0, 0), color: BLK }, { geo: B(0.04, 0.11, 0.05, 0, 0.04, 0.1, -0.35, 0, 0), color: 0x8a5a2b }, { geo: B(0.04, 0.07, 0.24, 0, 0.14, 0.24), color: 0x6d4b32 }]; },
    heavyar() { return [{ geo: B(0.09, 0.13, 0.42, 0, 0.15, -0.04), color: 0x5b6470 }, { geo: B(0.06, 0.08, 0.38, 0, 0.23, -0.1), color: BLK }, { geo: Cz(0.018, 0.4, 0, 0.15, -0.58, 8), color: 0x252a30 }, { geo: B(0.06, 0.24, 0.08, 0, -0.01, -0.02), color: BLK }, { geo: B(0.06, 0.1, 0.3, 0, 0.13, 0.35), color: 0x5b6470 }]; },
    flintknock() { return [{ geo: B(0.06, 0.08, 0.25, 0, 0.16, -0.06), color: 0x8f979e }, { geo: Cz(0.02, 0.24, 0, 0.16, -0.28, 8), color: BLK }, { geo: B(0.05, 0.14, 0.07, 0, 0.04, 0.04, -0.3, 0, 0), color: WOOD }, { geo: B(0.03, 0.04, 0.08, 0, 0.21, -0.13), color: TAN }]; },
    suppressedpistol() { return [{ geo: B(0.05, 0.06, 0.23, 0, 0.16, -0.04), color: 0x25282c }, { geo: Cz(0.032, 0.28, 0, 0.16, -0.3, 10), color: BLK }, { geo: B(0.045, 0.14, 0.07, 0, 0.04, 0.04, -0.3, 0, 0), color: 0x3c4248 }, { geo: B(0.02, 0.03, 0.12, 0, 0.21, -0.08), color: 0x151719 }]; },
    huntingrifle() { return [{ geo: B(0.055, 0.08, 0.46, 0, 0.13, -0.08), color: TAN }, { geo: Cz(0.014, 0.58, 0, 0.16, -0.6, 8), color: BLK }, { geo: Cz(0.028, 0.18, 0, 0.25, -0.12, 10), color: DGRY }, { geo: B(0.04, 0.11, 0.05, 0, 0.04, 0.15, -0.35, 0, 0), color: WOOD }, { geo: B(0.04, 0.1, 0.28, 0, 0.12, 0.35), color: WOOD }]; },
    autoshotgun() { return [{ geo: B(0.08, 0.11, 0.34, 0, 0.15, 0), color: 0x4f6871 }, { geo: Cz(0.022, 0.5, 0, 0.17, -0.46, 8), color: BLK }, { geo: Cz(0.04, 0.14, 0, 0.02, -0.08, 10), color: 0x252a2e }, { geo: B(0.045, 0.12, 0.05, 0, 0.04, 0.12, -0.35, 0, 0), color: BLK }, { geo: B(0.05, 0.1, 0.28, 0, 0.13, 0.33), color: 0x4f6871 }]; },
    tacticalar() { return [{ geo: B(0.075, 0.11, 0.4, 0, 0.14, -0.04), color: 0x687b58 }, { geo: B(0.045, 0.035, 0.36, 0, 0.22, -0.08), color: BLK }, { geo: Cz(0.015, 0.38, 0, 0.15, -0.62, 8), color: 0x22272a }, { geo: B(0.05, 0.2, 0.07, 0, 0, -0.03, 0.15, 0, 0), color: BLK }, { geo: B(0.05, 0.1, 0.3, 0, 0.13, 0.33), color: 0x687b58 }]; },
    minigun() {
      const SLV = 0x8a9199, YEL = 0xd4b030;
      return [
        { geo: B(0.1, 0.12, 0.46, 0, 0.15, -0.06), color: DGRY },
        { geo: Cz(0.016, 0.58, -0.04, 0.165, -0.56, 8), color: SLV },
        { geo: Cz(0.016, 0.58,  0.04, 0.165, -0.56, 8), color: SLV },
        { geo: Cz(0.016, 0.58,  0.00, 0.205, -0.56, 8), color: SLV },
        { geo: Cz(0.032, 0.12,  0.0,  0.165, -0.82, 10), color: BLK },
        { geo: Cz(0.048, 0.08,  0.0,  0.165, -0.3,  12), color: DGRY },
        { geo: B(0.06, 0.25, 0.08, 0, -0.01, -0.04, 0.1, 0, 0), color: BLK },
        { geo: B(0.05, 0.11, 0.05, 0, 0.03, 0.14, -0.35, 0, 0), color: DGRY },
        { geo: B(0.05, 0.08, 0.18, 0, 0.15, 0.32), color: DGRY },
        { geo: B(0.02, 0.04, 0.04, 0, 0.22, -0.04), color: YEL },
      ];
    },
    infernoar() {
      // Bullpup energy rifle: grip is at rear, action behind the mag, barrel runs full length with no stock
      const ORG = 0xe05a10, DRK = 0x1a1c1f, EMB = 0xff6a00;
      return [
        { geo: B(0.08, 0.13, 0.56, 0, 0.13, -0.12), color: DRK },           // long bullpup body
        { geo: B(0.06, 0.04, 0.5, 0, 0.215, -0.12), color: ORG },           // top rail glow strip
        { geo: Cz(0.013, 0.52, 0, 0.155, -0.55, 8), color: ORG },           // barrel (starts near grip)
        { geo: Cz(0.022, 0.05, 0, 0.155, -0.82, 8), color: EMB },           // muzzle brake glow
        { geo: B(0.05, 0.19, 0.06, 0, 0.0, 0.14, 0.2, 0, 0), color: DRK }, // rear pistol grip (bullpup position)
        { geo: B(0.04, 0.05, 0.06, 0, 0.07, -0.12), color: DRK },          // trigger guard
        { geo: B(0.045, 0.22, 0.05, 0, -0.01, -0.16, 0.08, 0, 0), color: ORG }, // mid-body mag
        { geo: B(0.055, 0.04, 0.18, 0, 0.085, -0.3), color: ORG },         // forward handguard vent
        { geo: B(0.06, 0.055, 0.04, 0, 0.13, 0.26), color: DRK },          // rear cheek pad
      ];
    },
    plasmarifle() {
      const PRP = 0x7733bb, DRK = 0x18191d;
      return [
        { geo: B(0.07, 0.1, 0.46, 0, 0.14, -0.08), color: DRK },
        { geo: B(0.04, 0.025, 0.4, 0, 0.215, -0.1), color: PRP },
        { geo: Cz(0.022, 0.42, 0, 0.15, -0.62, 8), color: DRK },
        { geo: Cz(0.028, 0.06, 0, 0.15, -0.84, 8), color: PRP },
        { geo: Cz(0.034, 0.2, 0, 0.246, -0.1, 10), color: BLK },
        { geo: Cz(0.04, 0.04, 0, 0.246, -0.2, 10), color: PRP },
        { geo: B(0.05, 0.18, 0.07, 0, 0.0, -0.03, 0.18, 0, 0), color: DRK },
        { geo: B(0.04, 0.12, 0.05, 0, 0.03, 0.13, -0.35, 0, 0), color: DRK },
        { geo: B(0.05, 0.1, 0.3, 0, 0.13, 0.33), color: DRK },
      ];
    },
    crossbow() {
      const TN = 0xb89a60, DK = 0x2a2c30;
      return [
        { geo: B(0.04, 0.08, 0.34, 0, 0.14, -0.04), color: DK },
        { geo: Cz(0.012, 0.38, 0, 0.16, -0.36, 8), color: DK },
        { geo: B(0.36, 0.02, 0.04, 0, 0.22, -0.18), color: TN },
        { geo: B(0.36, 0.015, 0.02, 0, 0.23, -0.18), color: DK },
        { geo: B(0.04, 0.12, 0.05, 0, 0.04, 0.12, -0.35, 0, 0), color: TN },
        { geo: B(0.04, 0.1, 0.24, 0, 0.12, 0.28), color: TN },
        { geo: Cz(0.034, 0.22, 0, 0.248, -0.08, 10), color: DK },
        { geo: Cz(0.04, 0.04, 0, 0.248, -0.19, 10), color: DK },
        { geo: B(0.02, 0.04, 0.04, 0, 0.225, -0.04), color: DK },
      ];
    },
    recurvebow() {
      const TN = 0xc4a060, DK = 0x282a2e;
      return [
        { geo: B(0.03, 0.5, 0.04, 0, 0.14, -0.06), color: TN },
        { geo: B(0.02, 0.54, 0.015, 0, 0.14, -0.06), color: DK },
        { geo: Cz(0.008, 0.5, 0, 0.14, -0.06, 6), color: 0x888888 },
        { geo: B(0.03, 0.08, 0.04, 0, 0.14, -0.06), color: DK },
        { geo: B(0.04, 0.14, 0.05, 0, 0.04, 0.1, -0.35, 0, 0), color: TN },
      ];
    },
    zapsmg() {
      // Energy SMG: no stock at all, large glowing power cell on left side, top-mounted charging handle
      const CYN = 0x00c4cc, DK = 0x141618, PNL = 0x0a9aa0;
      return [
        { geo: B(0.055, 0.08, 0.2, 0, 0.13, 0.02), color: DK },             // very short receiver
        { geo: Cz(0.013, 0.26, 0, 0.155, -0.2, 8), color: CYN },            // glowing barrel
        { geo: Cz(0.02, 0.04, 0, 0.155, -0.34, 8), color: DK },             // muzzle cap
        { geo: B(0.025, 0.18, 0.1, 0.055, 0.13, -0.02), color: PNL },       // power cell (left side, tall slab)
        { geo: B(0.015, 0.16, 0.08, 0.055, 0.14, -0.02), color: CYN },      // power cell glow face
        { geo: B(0.04, 0.17, 0.055, 0, 0.01, 0.06, 0.15, 0, 0), color: DK }, // pistol grip
        { geo: B(0.06, 0.022, 0.16, 0, 0.215, 0.02), color: CYN },          // top charging rail
        { geo: B(0.018, 0.03, 0.03, 0, 0.215, 0.06), color: DK },           // charging handle nub
        { geo: B(0.05, 0.04, 0.04, 0, 0.13, 0.18), color: DK },             // rear block (no stock)
      ];
    },
    heavysniper() {
      const TN = 0xb09060, DK = 0x1e2124;
      return [
        { geo: B(0.075, 0.1, 0.54, 0, 0.13, -0.1), color: DK },
        { geo: B(0.065, 0.09, 0.36, 0, 0.12, 0.36), color: DK },
        { geo: B(0.045, 0.1, 0.06, 0, 0.05, 0.16, -0.3, 0, 0), color: TN },
        { geo: Cz(0.026, 0.28, 0, 0.16, -0.4, 8), color: DK },
        { geo: Cz(0.018, 0.66, 0, 0.16, -0.84, 8), color: DK },
        { geo: Cz(0.03, 0.06, 0, 0.16, -1.2, 8), color: TN },
        { geo: Cz(0.038, 0.26, 0, 0.248, -0.12, 10), color: BLK },
        { geo: Cz(0.045, 0.05, 0, 0.248, -0.25, 10), color: DK }, { geo: Cz(0.045, 0.05, 0, 0.248, 0.01, 10), color: DK },
        { geo: G.cyl(0.012, 0.012, 0.09, 6, 0.06, 0.16, 0.06, 0, 0, Math.PI / 2), color: DK },
        { geo: B(0.04, 0.1, 0.03, 0, 0.03, 0.0, 0.1, 0, 0), color: DK },
      ];
    },
    suppressedar() {
      // Integrally suppressed PDW: very short boxy body, no traditional stock, large integral can
      const DK = 0x22252a, SLT = 0x3a3e44;
      return [
        { geo: B(0.07, 0.1, 0.22, 0, 0.14, 0.04), color: DK },              // short boxy receiver
        { geo: Cz(0.038, 0.38, 0, 0.155, -0.28, 12), color: SLT },          // fat integral suppressor
        { geo: Cz(0.013, 0.12, 0, 0.155, -0.12, 8), color: DK },            // barrel stub inside can
        { geo: B(0.06, 0.035, 0.2, 0, 0.215, 0.0), color: BLK },            // top flat rail
        { geo: B(0.04, 0.19, 0.06, 0, -0.01, 0.04, 0.15, 0, 0), color: DK }, // pistol grip
        { geo: B(0.04, 0.14, 0.05, 0, 0.0, -0.06, 0.12, 0, 0), color: DK }, // forward mag
        { geo: B(0.055, 0.05, 0.06, 0, 0.13, 0.2), color: SLT },            // rear plate (no stock)
        { geo: B(0.02, 0.04, 0.04, 0, 0.08, -0.04), color: BLK },           // trigger guard
        { geo: B(0.025, 0.03, 0.12, 0, 0.205, 0.04), color: BLK },          // sight rail
      ];
    },
    trophygun() {
      const GLD = 0xd4a830, DK = 0x1c1e22;
      return [
        { geo: B(0.065, 0.085, 0.26, 0, 0.14, -0.1), color: GLD },
        { geo: B(0.05, 0.06, 0.22, 0, 0.115, -0.05), color: DK },
        { geo: Cz(0.016, 0.14, 0, 0.16, -0.28, 8), color: GLD },
        { geo: Cz(0.022, 0.04, 0, 0.16, -0.36, 8), color: DK },
        { geo: B(0.014, 0.03, 0.03, 0, 0.205, -0.32), color: GLD },
        { geo: B(0.045, 0.14, 0.07, 0, 0.04, 0.04, -0.3, 0, 0), color: GLD },
        { geo: B(0.02, 0.03, 0.02, 0, 0.09, -0.04), color: DK },
        { geo: B(0.02, 0.03, 0.03, 0, 0.2, -0.16), color: DK }, { geo: B(0.03, 0.03, 0.02, 0, 0.2, 0.05), color: GLD },
      ];
    },
    quadlauncher() {
      const OLV = 0x4e5c2e, DK = 0x272b20;
      return [
        { geo: Cz(0.038, 0.58, -0.028, 0.175, -0.06, 10), color: OLV },
        { geo: Cz(0.038, 0.58,  0.028, 0.175, -0.06, 10), color: OLV },
        { geo: Cz(0.038, 0.58, -0.028, 0.122, -0.06, 10), color: OLV },
        { geo: Cz(0.038, 0.58,  0.028, 0.122, -0.06, 10), color: OLV },
        { geo: B(0.08, 0.12, 0.26, 0, 0.15, 0.22), color: DK },
        { geo: B(0.04, 0.12, 0.05, 0, 0.03, 0.16, -0.35, 0, 0), color: OLV },
        { geo: B(0.05, 0.08, 0.18, 0, 0.15, 0.38), color: DK },
        { geo: B(0.02, 0.04, 0.03, 0, 0.21, -0.16), color: BLK },
        { geo: Cz(0.05, 0.04, 0, 0.15, -0.35, 12), color: DK },
      ];
    },
    infernoshotgun() {
      // Energy trench gun: wide hexagonal receiver, glowing vent slots, no tube mag, side-loading drum
      const ORG = 0xe05a10, DK = 0x0e0f11, VNT = 0xff4400;
      return [
        { geo: B(0.1, 0.1, 0.3, 0, 0.14, 0.02), color: DK },                // wide hex receiver
        { geo: B(0.095, 0.016, 0.22, 0, 0.195, 0.02), color: ORG },         // top vent strip
        { geo: B(0.095, 0.016, 0.22, 0, 0.085, 0.02), color: VNT },         // bottom vent strip (glow)
        { geo: Cz(0.028, 0.32, 0, 0.175, -0.38, 8), color: DK },            // wide short barrel
        { geo: Cz(0.034, 0.04, 0, 0.175, -0.56, 10), color: ORG },          // muzzle ring
        { geo: G.cyl(0.072, 0.072, 0.07, 10, -0.06, 0.07, 0.08, Math.PI / 2, 0, 0), color: ORG }, // side drum mag
        { geo: B(0.04, 0.17, 0.055, 0, 0.0, 0.1, 0.15, 0, 0), color: DK }, // pistol grip
        { geo: B(0.06, 0.09, 0.26, 0, 0.13, 0.34), color: DK },             // stock
        { geo: B(0.055, 0.055, 0.04, 0, 0.13, 0.49), color: ORG },          // stock pad
      ];
    },
    burstpistol() {
      const SLV = 0x8c9198, DK = 0x1e2124;
      return [
        { geo: B(0.05, 0.065, 0.22, 0, 0.16, -0.05), color: SLV },
        { geo: B(0.045, 0.04, 0.18, 0, 0.115, -0.04), color: DK },
        { geo: Cz(0.012, 0.06, 0, 0.16, -0.18, 8), color: BLK },
        { geo: B(0.022, 0.03, 0.02, 0, 0.205, -0.2), color: SLV },
        { geo: B(0.045, 0.13, 0.07, 0, 0.04, 0.03, -0.25, 0, 0), color: DK },
        { geo: B(0.02, 0.03, 0.02, 0, 0.09, -0.04), color: BLK },
        { geo: B(0.02, 0.03, 0.03, 0, 0.2, -0.14), color: BLK },
      ];
    },
    compactsmg() {
      // Micro machine pistol: tiny receiver, underbarrel magazine, wire stock folded tight
      const DK = 0x1c1f24, TN = 0xb09060, BRS = 0x8a6a3a;
      return [
        { geo: B(0.04, 0.065, 0.16, 0, 0.12, 0.0), color: DK },             // tiny receiver
        { geo: Cz(0.011, 0.18, 0, 0.145, -0.14, 8), color: DK },            // short barrel
        { geo: B(0.032, 0.24, 0.05, 0, -0.04, 0.02, 0.12, 0, 0), color: BRS }, // underbarrel mag (vertical)
        { geo: B(0.04, 0.16, 0.05, 0, 0.01, 0.06, 0.18, 0, 0), color: TN }, // grip (wood accents)
        { geo: B(0.04, 0.038, 0.08, 0, 0.19, 0.0), color: DK },             // charging rail
        { geo: B(0.02, 0.025, 0.02, 0, 0.18, -0.08), color: BRS },          // rear sight
        { geo: B(0.02, 0.025, 0.02, 0, 0.18, 0.08), color: BRS },           // front sight
        { geo: B(0.035, 0.018, 0.08, 0, 0.125, 0.0), color: 0x444444 },     // folded wire stock (tight against back)
      ];
    },
    longbow() {
      const DK = 0x2a2c30, WD = 0x6e3e18;
      return [
        { geo: B(0.032, 0.58, 0.04, 0, 0.14, -0.06), color: WD },
        { geo: B(0.02, 0.62, 0.015, 0, 0.14, -0.06), color: DK },
        { geo: Cz(0.008, 0.58, 0, 0.14, -0.06, 6), color: 0x777777 },
        { geo: B(0.035, 0.09, 0.045, 0, 0.14, -0.06), color: DK },
        { geo: B(0.04, 0.14, 0.05, 0, 0.04, 0.1, -0.35, 0, 0), color: WD },
        { geo: Cz(0.028, 0.18, 0, 0.246, -0.1, 10), color: BLK },
        { geo: Cz(0.034, 0.03, 0, 0.246, -0.19, 10), color: DK },
      ];
    },
    thermalar() {
      // Futuristic flat-top with wide thermal housing — hexagonal body, no carry handle, side-fed mag
      const GRN = 0x1a3a1a, DK = 0x101410, LGN = 0x3aee3a;
      return [
        { geo: B(0.09, 0.09, 0.48, 0, 0.14, -0.08), color: DK },            // hexagonal body (wide flat)
        { geo: B(0.1, 0.055, 0.36, 0, 0.205, -0.1), color: GRN },           // wide thermal housing on top
        { geo: B(0.08, 0.018, 0.3, 0, 0.252, -0.1), color: LGN },           // thermal lens strip (glow)
        { geo: Cz(0.015, 0.44, 0, 0.145, -0.6, 8), color: DK },             // barrel
        { geo: Cz(0.024, 0.06, 0, 0.145, -0.84, 8), color: GRN },           // muzzle device
        { geo: B(0.04, 0.05, 0.28, 0, 0.09, -0.24), color: GRN },           // lower handguard
        { geo: B(0.04, 0.19, 0.06, 0, 0.0, 0.06, 0.18, 0, 0), color: DK }, // pistol grip
        { geo: B(0.05, 0.18, 0.06, 0, 0.01, -0.12, 0.1, 0, 0), color: GRN }, // side-fed curved mag
        { geo: B(0.06, 0.09, 0.3, 0, 0.13, 0.34), color: DK },              // folding stock (closed)
        { geo: B(0.055, 0.055, 0.04, 0, 0.13, 0.5), color: GRN },           // stock butt
      ];
    },
  };
  WM.build = function (model) {
    const parts = BUILD[model] ? BUILD[model]() : BUILD.m16();
    const shark = parts.find(p => p.shark);
    const mesh = G.coloredMesh(parts.filter(p => !p.shark));
    mesh.castShadow = true; mesh.receiveShadow = false;
    const grp = new THREE.Group(); grp.add(mesh);
    if (shark) { const m = new THREE.Mesh(shark.geo, new THREE.MeshLambertMaterial({ map: WM._sharkTex })); grp.add(m); }
    grp.userData.model = model;
    return grp;
  };
  WM.get = function (model) { return WM.build(model); };
  // muzzle offset in local space
  WM.MUZZLE = {
    m16: [0, 0.15, -0.97], scar: [0, 0.15, -0.93], tac: [0, 0.17, -0.63], bolt: [0, 0.16, -0.98], scopedar: [0, 0.15, -0.9], pistol: [0, 0.16, -0.22], rpg: [0, 0.16, -0.78], pickaxe: [0, 0.9, -0.4], leveraction: [0, 0.16, -0.92], drumshotgun: [0, 0.17, -0.68], burstsmg: [0, 0.16, -0.43], combatsmg: [0, 0.16, -0.4], heavyar: [0, 0.15, -0.85], flintknock: [0, 0.16, -0.3], suppressedpistol: [0, 0.16, -0.42], huntingrifle: [0, 0.16, -0.9], autoshotgun: [0, 0.17, -0.65], tacticalar: [0, 0.15, -0.86],
    pump: [0, 0.17, -0.73], burst: [0, 0.15, -0.89], smg: [0, 0.16, -0.42], tacsmg: [0, 0.16, -0.3], suppressedsmg: [0, 0.155, -0.47], semisniper: [0, 0.16, -0.63],
    revolver: [0, 0.13, -0.33], handcannon: [0, 0.14, -0.47], grenadelauncher: [0, 0.15, -0.56], doublebarrel: [0, 0.165, -0.54],
    minigun: [0, 0.165, -0.88], infernoar: [0, 0.15, -0.82], plasmarifle: [0, 0.15, -0.88], crossbow: [0, 0.16, -0.56], recurvebow: [0, 0.14, -0.28],
    zapsmg: [0, 0.16, -0.42], heavysniper: [0, 0.16, -1.22], suppressedar: [0, 0.15, -0.97], trophygun: [0, 0.16, -0.38], quadlauncher: [0, 0.165, -0.37],
    infernoshotgun: [0, 0.17, -0.65], burstpistol: [0, 0.16, -0.21], compactsmg: [0, 0.155, -0.28], longbow: [0, 0.14, -0.28], thermalar: [0, 0.15, -0.87],
  };
  // wrist targets for the right (r) and left (l) hands, per model
  WM.GRIP = {
    m16: { r: [0.0, 0.10, 0.16], l: [0.0, 0.07, -0.40] }, scar: { r: [0.0, 0.10, 0.15], l: [0.0, 0.07, -0.40] }, tac: { r: [0.0, 0.10, 0.14], l: [0.0, 0.07, -0.30] },
    bolt: { r: [0.0, 0.11, 0.18], l: [0.0, 0.06, -0.34] }, scopedar: { r: [0.0, 0.10, 0.15], l: [0.0, 0.02, -0.34] }, pistol: { r: [0.02, 0.11, 0.06], l: [-0.045, 0.09, 0.03] },
    rpg: { r: [0.0, 0.09, 0.07], l: [0.0, 0.10, -0.24] },
    pump: { r: [0.0, 0.10, 0.13], l: [0.0, 0.12, -0.30] }, burst: { r: [0.0, 0.10, 0.16], l: [0.0, 0.08, -0.42] }, smg: { r: [0.0, 0.10, 0.09], l: [0.0, 0.04, -0.12] },
    tacsmg: { r: [0.0, 0.10, 0.09], l: [0.0, 0.08, -0.20] }, suppressedsmg: { r: [0.0, 0.10, 0.09], l: [0.0, 0.04, -0.10] }, semisniper: { r: [0.0, 0.11, 0.18], l: [0.0, 0.06, -0.32] },
    revolver: { r: [0.02, 0.11, 0.06], l: [-0.045, 0.09, 0.03] }, handcannon: { r: [0.02, 0.11, 0.07], l: [-0.05, 0.09, 0.03] },
    grenadelauncher: { r: [0.0, 0.10, 0.15], l: [0.0, 0.04, -0.10] }, doublebarrel: { r: [0.0, 0.10, 0.08], l: [0.0, 0.11, -0.16] }, leveraction: { r: [0, 0.11, 0.17], l: [0, 0.07, -0.38] }, drumshotgun: { r: [0, 0.1, 0.13], l: [0, 0.1, -0.3] }, burstsmg: { r: [0, 0.1, 0.09], l: [0, 0.05, -0.14] }, combatsmg: { r: [0, 0.1, 0.09], l: [0, 0.05, -0.16] }, heavyar: { r: [0, 0.1, 0.15], l: [0, 0.07, -0.38] }, flintknock: { r: [0.02, 0.11, 0.05], l: [-0.04, 0.09, 0.03] }, suppressedpistol: { r: [0.02, 0.11, 0.05], l: [-0.04, 0.09, 0.03] }, huntingrifle: { r: [0, 0.11, 0.17], l: [0, 0.06, -0.34] }, autoshotgun: { r: [0, 0.1, 0.13], l: [0, 0.08, -0.3] }, tacticalar: { r: [0, 0.1, 0.15], l: [0, 0.07, -0.38] },
    minigun: { r: [0, 0.1, 0.14], l: [0, 0.07, -0.42] }, infernoar: { r: [0, 0.1, 0.15], l: [0, 0.07, -0.38] }, plasmarifle: { r: [0, 0.1, 0.15], l: [0, 0.06, -0.38] }, crossbow: { r: [0, 0.1, 0.14], l: [0, 0.09, -0.28] }, recurvebow: { r: [0.02, 0.1, 0.06], l: [-0.04, 0.09, 0.04] },
    zapsmg: { r: [0, 0.1, 0.09], l: [0, 0.04, -0.12] }, heavysniper: { r: [0, 0.11, 0.18], l: [0, 0.06, -0.36] }, suppressedar: { r: [0, 0.1, 0.15], l: [0, 0.07, -0.40] }, trophygun: { r: [0.02, 0.11, 0.06], l: [-0.045, 0.09, 0.03] }, quadlauncher: { r: [0, 0.1, 0.16], l: [0, 0.04, -0.12] },
    infernoshotgun: { r: [0, 0.1, 0.13], l: [0, 0.08, -0.28] }, burstpistol: { r: [0.02, 0.11, 0.06], l: [-0.04, 0.09, 0.03] }, compactsmg: { r: [0, 0.1, 0.09], l: [0, 0.05, -0.14] }, longbow: { r: [0.02, 0.1, 0.06], l: [-0.04, 0.09, 0.04] }, thermalar: { r: [0, 0.1, 0.15], l: [0, 0.02, -0.34] },
  };
  FN.WeaponModels = WM;
})();
