// Item models: chest, ammo box, consumables, ammo pickups, glider, battle bus.
window.FN = window.FN || {};
(function () {
  const G = FN.GeoUtil, U = FN.U;
  const IM = {};
  const B = (w, h, d, x, y, z, rx, ry, rz) => G.box(w, h, d, x, y, z, rx, ry, rz);
  const GOLD = 0xd9a441, WOODC = 0xc49a4e, DARKW = 0x8a6a34;

  // Chest: returns group with .lid (rotates open), .glow sprite, .beam
  IM.chest = function () {
    const grp = new THREE.Group();
    const body = G.coloredMesh([
      { geo: B(1.0, 0.5, 0.62, 0, 0.25, 0), color: WOODC },
      { geo: B(1.04, 0.08, 0.66, 0, 0.06, 0), color: GOLD }, { geo: B(1.04, 0.08, 0.66, 0, 0.46, 0), color: GOLD },
      { geo: B(0.08, 0.52, 0.66, -0.35, 0.25, 0), color: GOLD }, { geo: B(0.08, 0.52, 0.66, 0.35, 0.25, 0), color: GOLD },
      { geo: B(0.14, 0.14, 0.05, 0, 0.42, -0.33), color: 0x5a4a2a },
    ], { map: FN.Tex.wood() });
    body.material.map = null; body.material.needsUpdate = true;
    grp.add(body);
    const lid = new THREE.Group(); lid.position.set(0, 0.5, 0.31);
    const lidMesh = G.coloredMesh([
      { geo: G.cyl(0.31, 0.31, 1.0, 10, 0, 0, -0.31, 0, 0, Math.PI / 2).scale(1, 0.7, 1), color: WOODC },
      { geo: G.cyl(0.33, 0.33, 0.08, 10, -0.35, 0, -0.31, 0, 0, Math.PI / 2).scale(1, 0.72, 1), color: GOLD },
      { geo: G.cyl(0.33, 0.33, 0.08, 10, 0.35, 0, -0.31, 0, 0, Math.PI / 2).scale(1, 0.72, 1), color: GOLD },
      { geo: G.cyl(0.33, 0.33, 0.08, 10, 0, 0, -0.31, 0, 0, Math.PI / 2).scale(1, 0.72, 1), color: GOLD },
    ]);
    // keep only the top half of the lid cylinder: cheap trick - hide bottom by translating (cylinder is full; visually fine when closed)
    lid.add(lidMesh); grp.add(lid); grp.lid = lid;
    // inner glow (visible when open)
    const inner = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.3, 0.55), new THREE.MeshBasicMaterial({ color: 0xffd36a })); inner.position.set(0, 0.35, 0); inner.visible = false; grp.add(inner); grp.inner = inner;
    // glow sprite + light beam
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: FN.Tex.glow(), color: 0xffc040, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending })); glow.scale.set(2.2, 2.2, 1); glow.position.set(0, 0.45, 0); grp.add(glow); grp.glow = glow;
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 5, 10, 1, true), new THREE.MeshBasicMaterial({ color: 0xffd060, transparent: true, opacity: 0.18, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })); beam.position.set(0, 3.0, 0); grp.add(beam); grp.beam = beam;
    return grp;
  };
  IM.ammoBox = function () {
    const grp = new THREE.Group();
    const GRN = 0x3e6b2e, LGRN = 0x5a8f3a;
    const body = G.coloredMesh([{ geo: B(0.75, 0.42, 0.45, 0, 0.21, 0), color: GRN }, { geo: B(0.79, 0.06, 0.49, 0, 0.05, 0), color: 0x2a4a1e }, { geo: B(0.06, 0.44, 0.49, -0.25, 0.22, 0), color: 0x2a4a1e }, { geo: B(0.06, 0.44, 0.49, 0.25, 0.22, 0), color: 0x2a4a1e }]);
    grp.add(body);
    const lid = new THREE.Group(); lid.position.set(0, 0.42, 0.225);
    lid.add(G.coloredMesh([{ geo: B(0.77, 0.1, 0.47, 0, 0.05, -0.225), color: LGRN }, { geo: B(0.3, 0.04, 0.2, 0, 0.12, -0.225), color: 0xd9d9c0 }]));
    grp.add(lid); grp.lid = lid;
    const tex = FN.Tex.label('ammo', 'AMMO', '#5a8f3a', '#f0f0d8', 256, 96);
    const lab = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.18), new THREE.MeshLambertMaterial({ map: tex })); lab.position.set(0, 0.24, -0.226); lab.rotation.y = Math.PI; grp.add(lab);
    return grp;
  };
  // Consumables
  IM.consumable = function (id) {
    const grp = new THREE.Group(); let m;
    if (id === 'bandage') m = G.coloredMesh([{ geo: G.cyl(0.11, 0.11, 0.16, 12, 0, 0.08, 0, Math.PI / 2, 0, 0), color: 0xf4f4f0 }, { geo: G.cyl(0.05, 0.05, 0.17, 8, 0, 0.08, 0, Math.PI / 2, 0, 0), color: 0xd8d0c0 }]);
    else if (id === 'medkit') m = G.coloredMesh([{ geo: B(0.36, 0.24, 0.2, 0, 0.12, 0), color: 0xf4f4f4 }, { geo: B(0.05, 0.16, 0.21, 0, 0.12, 0), color: 0xd8302a }, { geo: B(0.16, 0.05, 0.21, 0, 0.12, 0), color: 0xd8302a }, { geo: B(0.14, 0.04, 0.06, 0, 0.26, 0), color: 0x666666 }]);
    else if (id === 'minishield') m = G.coloredMesh([{ geo: G.cyl(0.05, 0.06, 0.18, 10, 0, 0.09, 0), color: 0x3fa9f5 }, { geo: G.cyl(0.025, 0.03, 0.05, 8, 0, 0.2, 0), color: 0x3fa9f5 }, { geo: G.cyl(0.03, 0.03, 0.03, 8, 0, 0.24, 0), color: 0xe0e0e0 }]);
    else if (id === 'shield') m = G.coloredMesh([{ geo: G.cyl(0.07, 0.08, 0.26, 10, 0, 0.13, 0), color: 0x2f8fe0 }, { geo: G.cyl(0.035, 0.05, 0.08, 8, 0, 0.3, 0), color: 0x2f8fe0 }, { geo: G.cyl(0.04, 0.04, 0.04, 8, 0, 0.36, 0), color: 0xe0e0e0 }, { geo: B(0.15, 0.1, 0.01, 0, 0.13, -0.08), color: 0xffffff }]);
    else if (id === 'chugjug') m = G.coloredMesh([{ geo: G.cyl(0.14, 0.16, 0.4, 12, 0, 0.2, 0), color: 0x3a8fe0 }, { geo: G.cyl(0.06, 0.08, 0.1, 8, 0, 0.45, 0), color: 0x3a8fe0 }, { geo: G.cyl(0.07, 0.07, 0.05, 8, 0, 0.52, 0), color: 0xe0e0e0 }, { geo: B(0.08, 0.16, 0.03, 0.15, 0.3, 0), color: 0x3a8fe0 }]);
    else m = G.coloredMesh([{ geo: B(0.2, 0.2, 0.2, 0, 0.1, 0), color: 0xffffff }]);
    grp.add(m); return grp;
  };
  IM.ammoPickup = function (type) {
    const col = { light: 0xe8c040, medium: 0x5aa83a, heavy: 0xa050d0, shells: 0xd8452f, rockets: 0x8a8a8a }[type] || 0xffffff;
    const grp = new THREE.Group();
    if (type === 'rockets') grp.add(G.coloredMesh([{ geo: G.cyl(0.05, 0.05, 0.4, 8, 0, 0.1, 0, Math.PI / 2, 0, 0), color: 0x5b6b3c }, { geo: G.cone(0.05, 0.1, 8, 0, 0, 0).rotateX(-Math.PI / 2).translate(0, 0.1, -0.25), color: 0xd8452f }]));
    else grp.add(G.coloredMesh([{ geo: B(0.28, 0.16, 0.2, 0, 0.08, 0), color: col }, { geo: B(0.3, 0.03, 0.22, 0, 0.16, 0), color: 0x333333 }, { geo: G.cyl(0.02, 0.02, 0.1, 6, -0.06, 0.2, 0), color: 0xd0a040 }, { geo: G.cyl(0.02, 0.02, 0.1, 6, 0.0, 0.2, 0), color: 0xd0a040 }, { geo: G.cyl(0.02, 0.02, 0.1, 6, 0.06, 0.2, 0), color: 0xd0a040 }]));
    return grp;
  };
  IM.materialPickup = function (mat) {
    const grp = new THREE.Group();
    if (mat === 'wood') grp.add(G.coloredMesh([{ geo: G.cyl(0.08, 0.08, 0.5, 8, -0.1, 0.08, 0, 0, 0, Math.PI / 2), color: 0x9a6a3a }, { geo: G.cyl(0.08, 0.08, 0.5, 8, 0.08, 0.08, 0, 0, 0, Math.PI / 2), color: 0x8a5a2b }, { geo: G.cyl(0.08, 0.08, 0.5, 8, 0, 0.22, 0, 0, 0, Math.PI / 2), color: 0xa07040 }]));
    else if (mat === 'brick') grp.add(G.coloredMesh([{ geo: B(0.3, 0.12, 0.16, -0.1, 0.06, 0), color: 0x9a9a9a }, { geo: B(0.3, 0.12, 0.16, 0.12, 0.06, 0.05), color: 0x8a8a8a }, { geo: B(0.3, 0.12, 0.16, 0, 0.18, 0.02), color: 0xa5a5a5 }]));
    else grp.add(G.coloredMesh([{ geo: B(0.3, 0.06, 0.2, 0, 0.03, 0), color: 0x9aa4ad }, { geo: B(0.3, 0.06, 0.2, 0, 0.09, 0.03), color: 0x8e9aa6 }, { geo: B(0.3, 0.06, 0.2, 0, 0.15, -0.02), color: 0xa5adb5 }]));
    return grp;
  };
  // Glider: default rectangular canopy hang-glider
  IM.glider = function () {
    const grp = new THREE.Group();
    const parts = [];
    const BLUE = 0x2f6fd8, WHT = 0xf0f0f0, GRY = 0x5a6068;
    // canopy: 6 strips alternating colours, slightly curved
    for (let i = 0; i < 6; i++) { const x = -1.5 + i * 0.5 + 0.25; const y = 0.15 - Math.abs(x) * 0.12; parts.push({ geo: G.box(0.5, 0.05, 1.6, x, y, 0, 0, 0, x * 0.12), color: i % 2 ? WHT : BLUE }); }
    parts.push({ geo: G.cyl(0.02, 0.02, 3.2, 6, 0, 0.05, -0.75, 0, 0, Math.PI / 2), color: GRY }, { geo: G.cyl(0.02, 0.02, 3.2, 6, 0, 0.05, 0.75, 0, 0, Math.PI / 2), color: GRY });
    parts.push({ geo: G.cyl(0.02, 0.02, 1.7, 6, 0, 0.02, 0, Math.PI / 2, 0, 0), color: GRY });
    // control bar / frame down to the character
    parts.push({ geo: G.cyl(0.02, 0.02, 1.3, 6, -0.35, -0.6, 0, 0, 0, 0.3), color: GRY }, { geo: G.cyl(0.02, 0.02, 1.3, 6, 0.35, -0.6, 0, 0, 0, -0.3), color: GRY }, { geo: G.cyl(0.025, 0.025, 0.9, 6, 0, -1.2, 0, 0, 0, Math.PI / 2), color: GRY });
    grp.add(G.coloredMesh(parts));
    return grp;
  };
  // Battle Bus with balloon
  IM.battleBus = function () {
    const grp = new THREE.Group();
    const BLUE = 0x2b5bb8, DBLUE = 0x1e3f86, WIN = 0x9fd0ee, TEAL = 0x2fb8c8;
    const parts = [
      { geo: B(12, 3.2, 3.0, 0, 2.2, 0), color: BLUE }, { geo: B(12.2, 0.4, 3.1, 0, 0.7, 0), color: DBLUE }, { geo: B(12.2, 0.3, 3.1, 0, 3.7, 0), color: DBLUE },
      { geo: B(12.1, 0.9, 3.05, 0, 2.6, 0), color: WIN }, { geo: B(0.3, 0.9, 3.1, -5.7, 2.6, 0), color: WIN },
      { geo: B(1.0, 0.6, 3.1, 5.6, 1.4, 0), color: 0x111111 }, { geo: B(0.6, 0.3, 0.3, 5.9, 1.2, 1.1), color: 0xffe08a }, { geo: B(0.6, 0.3, 0.3, 5.9, 1.2, -1.1), color: 0xffe08a },
      { geo: B(12.4, 0.2, 3.2, 0, 3.85, 0), color: 0x2a2a2a },
      { geo: G.cyl(0.55, 0.55, 0.5, 12, -4.2, 0.55, 1.4, Math.PI / 2, 0, 0), color: 0x111111 }, { geo: G.cyl(0.55, 0.55, 0.5, 12, -4.2, 0.55, -1.4, Math.PI / 2, 0, 0), color: 0x111111 },
      { geo: G.cyl(0.55, 0.55, 0.5, 12, 4.0, 0.55, 1.4, Math.PI / 2, 0, 0), color: 0x111111 }, { geo: G.cyl(0.55, 0.55, 0.5, 12, 4.0, 0.55, -1.4, Math.PI / 2, 0, 0), color: 0x111111 },
      // burner rig on top
      { geo: B(1.4, 1.2, 1.4, 0, 4.5, 0), color: 0x333333 }, { geo: G.cyl(0.3, 0.4, 0.8, 10, 0, 5.3, 0), color: 0x555555 },
      // balloon (squashed sphere) + stripes
      { geo: G.sphere(7.2, 16, 0, 15.5, 0, 1, 1.15, 1), color: TEAL },
    ];
    // ropes
    for (const [x, z] of [[-4, 1.2], [4, 1.2], [-4, -1.2], [4, -1.2]]) { const dx = -x * 0.6, dz = -z * 0.6; parts.push({ geo: G.cyl(0.04, 0.04, 5.5, 5, x + dx / 2, 6.5, z + dz / 2, Math.atan2(dz, 5.5) * 0, 0, -Math.atan2(dx, 5.5)), color: 0xd9c9a0 }); }
    const mesh = G.coloredMesh(parts); mesh.castShadow = false; grp.add(mesh);
    // text banner on the side
    const tex = FN.Tex.label('battlebus', 'BATTLE BUS', '#2b5bb8', '#ffffff', 512, 96);
    const lab = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.1), new THREE.MeshLambertMaterial({ map: tex })); lab.position.set(-1, 1.5, 1.52); grp.add(lab);
    const lab2 = lab.clone(); lab2.position.z = -1.52; lab2.rotation.y = Math.PI; grp.add(lab2);
    // burner flame
    const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: FN.Tex.glow(), color: 0x66aaff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); flame.scale.set(2.5, 3.5, 1); flame.position.set(0, 6.4, 0); grp.add(flame); grp.flame = flame;
    return grp;
  };
  FN.ItemModels = IM;
})();
