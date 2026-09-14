// OG Season 1 map layout data. Image-space coords (728x728 reference map) converted to world metres.
window.FN = window.FN || {};
(function () {
  const SIZE = FN.CONFIG.WORLD_SIZE; // 2560
  const U = FN.U;
  const px = (x, y) => [(x / 728 - 0.5) * SIZE, (y / 728 - 0.5) * SIZE];
  const M = {};
  M.px = px;
  // Coastline polygon (image coords, clockwise from the north-west)
  M.coastPx = [[72, 178], [108, 112], [168, 72], [248, 46], [330, 36], [430, 30], [500, 40], [560, 50], [620, 70], [670, 104], [700, 150], [712, 220], [708, 300], [712, 380], [705, 460], [700, 520], [708, 580], [690, 640], [640, 690], [580, 705], [500, 712], [430, 706], [370, 712], [300, 708], [240, 700], [190, 680], [140, 640], [95, 590], [60, 530], [45, 470], [42, 400], [50, 320], [55, 250]];
  M.coast = M.coastPx.map(p => px(p[0], p[1]));

  // Named POIs: image position, radius (m) of the flattened pad, kind of layout
  M.pois = [
    { id: 'anarchy', name: 'Anarchy Acres', p: px(378, 158), r: 120, kind: 'farm' },
    { id: 'pleasant', name: 'Pleasant Park', p: px(200, 205), r: 150, kind: 'suburb' },
    { id: 'tomato', name: 'Tomato Town', p: px(480, 222), r: 115, kind: 'town' },
    { id: 'wailing', name: 'Wailing Woods', p: px(590, 210), r: 130, kind: 'woods' },
    { id: 'lootlake', name: 'Loot Lake', p: px(305, 268), r: 0, kind: 'lake' },
    { id: 'lonely', name: 'Lonely Lodge', p: px(640, 300), r: 110, kind: 'lodge' },
    { id: 'dusty', name: 'Dusty Depot', p: px(425, 327), r: 150, kind: 'depot' },
    { id: 'retail', name: 'Retail Row', p: px(545, 382), r: 150, kind: 'retail' },
    { id: 'greasy', name: 'Greasy Grove', p: px(160, 448), r: 130, kind: 'greasy' },
    { id: 'salty', name: 'Salty Springs', p: px(412, 440), r: 125, kind: 'salty' },
    { id: 'fatal', name: 'Fatal Fields', p: px(434, 555), r: 130, kind: 'farm2' },
    { id: 'moisty', name: 'Moisty Mire', p: px(580, 587), r: 130, kind: 'swamp' },
    { id: 'flush', name: 'Flush Factory', p: px(255, 660), r: 110, kind: 'factory' },
    // unnamed landmarks
    { id: 'motel', name: '', p: px(300, 78), r: 60, kind: 'motel' },
    { id: 'prison', name: '', p: px(520, 628), r: 70, kind: 'prison' },
    { id: 'racetrack', name: '', p: px(655, 420), r: 80, kind: 'track' },
    { id: 'factories', name: '', p: px(495, 330), r: 70, kind: 'factories' },
    { id: 'lakehouse', name: '', p: px(305, 268), r: 0, kind: 'lakehouse' },
    { id: 'containers', name: '', p: px(600, 120), r: 55, kind: 'containers' },
    { id: 'towerhill', name: '', p: px(640, 350), r: 0, kind: 'tower' },
    { id: 'spawnisland', name: 'Spawn Island', p: [-1125, 1125], r: 90, kind: 'spawnisland', hidden: true },
  ];
  M.poiById = {}; M.pois.forEach(p => { M.poiById[p.id] = p; });
  const P = (id) => M.poiById[id].p;
  const J = (id, dx, dz) => [P(id)[0] + dx, P(id)[1] + dz]; // junction relative to a POI centre
  M.J = J;

  // Hills: world x,z, radius, height, rocky?
  M.hills = [
    { x: -900, z: -460, r: 250, h: 62, rocky: true }, { x: -760, z: -250, r: 200, h: 48, rocky: true }, { x: -1010, z: -680, r: 190, h: 40, rocky: true },
    { x: -560, z: -320, r: 140, h: 34 }, { x: -890, z: 20, r: 230, h: 56, rocky: true }, { x: -700, z: 120, r: 130, h: 26 },
    { x: -840, z: 620, r: 220, h: 46, rocky: true }, { x: -620, z: 820, r: 170, h: 36 }, { x: -60, z: 900, r: 190, h: 30 },
    { x: 20, z: 470, r: 120, h: 18 }, { x: 470, z: 850, r: 190, h: 42, rocky: true }, { x: 850, z: 90, r: 150, h: 26 },
    { x: 1010, z: -720, r: 190, h: 38, rocky: true }, { x: 320, z: 60, r: 110, h: 16 }, { x: -320, z: -930, r: 210, h: 40, rocky: true },
    { x: 620, z: -310, r: 140, h: 22 }, { x: 0, z: -520, r: 90, h: 12 }, { x: -1000, z: 350, r: 160, h: 36, rocky: true },
    { x: 1080, z: -280, r: 130, h: 24 }, { x: 250, z: -1000, r: 160, h: 18 }, { x: 600, z: 500, r: 120, h: 20 },
  ];

  // Loot Lake ellipse
  M.lake = { x: P('lootlake')[0], z: P('lootlake')[1], rx: 150, rz: 215, rot: 0.25, level: 10.0, island: { r: 42 } };

  // Rivers (world polylines, width)
  M.rivers = [
    { w: 16, pts: [[400, -1300], [420, -1050], [400, -880], [300, -700], [150, -560], [-40, -470], [-110, -400]] },
    { w: 15, pts: [[-190, -130], [-160, 60], [-90, 250], [-70, 470], [-110, 640], [-200, 800], [-190, 950], [-120, 1100], [-100, 1300]] },
  ];

  // ---------- Roads ----------
  // Town street layouts (local streets) + highways that end at junctions on those streets, so no road cuts through a building.
  const R = [], D = [];
  const road = (...pts) => R.push(pts);
  const dirt = (...pts) => D.push(pts);
  const loop = (id, w, d) => [J(id, -w, -d), J(id, w, -d), J(id, w, d), J(id, -w, d), J(id, -w, -d)];
  road(...loop('pleasant', 60, 80));                                  // Pleasant Park ring road
  road(J('salty', -70, 15), J('salty', 70, 15));                      // Salty cross street (highway runs N-S)
  road(J('tomato', -95, 70), J('tomato', 95, 70)); road(J('tomato', 10, -90), J('tomato', 10, 70)); // Tomato crossroads
  road(J('greasy', -110, 5), J('greasy', 110, 5));                    // Greasy cross street
  road(J('retail', -170, 55), J('retail', 170, 55));                  // Retail main street
  road(J('dusty', -135, 95), J('dusty', 130, 95));                    // Dusty access street
  // Highways
  road(J('anarchy', 0, 100), [70, -560], [40, -420], J('dusty', -135, -100), J('dusty', -135, 95), [150, 60], J('salty', 0, -100), J('salty', 0, 100), [180, 430], J('fatal', -120, -40), J('fatal', -120, 60), [150, 900], [170, 1150]);
  road(J('pleasant', 0, -82), J('pleasant', 0, -130), [-450, -700], [-250, -740], J('anarchy', -130, 0));
  road(J('pleasant', 0, -82), J('pleasant', -30, -140), [-520, -820], J('motel', 0, 40), [-120, -870], J('anarchy', 0, -100));
  road(J('pleasant', 62, 0), J('pleasant', 110, 0), [-470, -400], [-420, -120], [-260, -60], [-100, -100], J('dusty', -135, 95));
  road(J('pleasant', -62, 0), J('pleasant', -110, 0), [-720, -350], [-720, -100], J('greasy', 0, -90), J('greasy', 0, 90), [-640, 560], [-520, 820], J('flush', -110, 0));
  road(J('flush', 110, 0), [-150, 980], [50, 780], J('fatal', -120, 60));
  road(J('fatal', 120, 60), [480, 720], J('moisty', -120, 0));
  road(J('moisty', 0, -120), [820, 460], [720, 260], J('retail', 170, 55));
  road(J('retail', -170, 55), [420, 190], J('salty', 70, 15));
  road(J('retail', 170, 55), [880, -60], J('lonely', 0, 90));
  road(J('lonely', 0, -90), [860, -420], J('wailing', 0, 110), [600, -520], J('tomato', 95, 70));
  road(J('tomato', 10, -90), [250, -640], J('anarchy', 130, 0));
  road(J('tomato', -95, 70), [200, -330], J('dusty', -135, -100));
  road(J('dusty', 130, 95), J('factories', 0, 70), [520, 20], J('retail', -170, 55));
  road(J('retail', 170, 55), [860, 180], J('racetrack', -90, 0));
  road(J('salty', 0, 100), [300, 560], J('prison', 0, -70));
  // Dirt tracks
  dirt(J('anarchy', -130, 0), [-20, -700], [60, -700], [60, -760]);
  dirt(J('anarchy', 0, -100), [30, -800], [30, -830]);
  dirt(J('fatal', -120, 60), [180, 700], [250, 700], [330, 740]);
  dirt(J('lonely', 0, 90), [940, -200], J('lonely', -20, -20), J('lonely', 80, 40));
  dirt(J('moisty', -120, 0), [720, 760], [800, 800], [770, 860]);
  dirt(J('wailing', 0, 110), J('wailing', 0, 30));
  dirt(J('flush', 110, 0), J('flush', 20, 20));
  dirt(J('motel', 0, 40), J('motel', -40, 25), J('motel', 40, 25));
  dirt(J('prison', 0, -70), J('prison', 0, -30));
  M.roads = R; M.dirtRoads = D;

  // Catmull-Rom smoothing into dense polylines (points every ~4 m)
  function smooth(pts, step) {
    if (pts.length < 2) return pts.slice();
    const out = []; const n = pts.length;
    for (let i = 0; i < n - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n - 1, i + 2)];
      const segLen = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]); const segs = Math.max(1, Math.ceil(segLen / step));
      for (let k = 0; k < segs; k++) {
        const t = k / segs, t2 = t * t, t3 = t2 * t;
        const x = 0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3);
        const z = 0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3);
        out.push([x, z]);
      }
    }
    out.push(pts[n - 1].slice()); return out;
  }
  M.roadPaths = R.map(r => smooth(r, 4)); M.dirtPaths = D.map(r => smooth(r, 4));
  // Spatial index of road segments for fast distance queries
  const CELL = 64; const idx = new Map();
  function addSeg(a, b, type) {
    const minx = Math.min(a[0], b[0]) - 16, maxx = Math.max(a[0], b[0]) + 16, minz = Math.min(a[1], b[1]) - 16, maxz = Math.max(a[1], b[1]) + 16;
    for (let cz = Math.floor(minz / CELL); cz <= Math.floor(maxz / CELL); cz++) for (let cx = Math.floor(minx / CELL); cx <= Math.floor(maxx / CELL); cx++) { const k = cx + ',' + cz; let arr = idx.get(k); if (!arr) { arr = []; idx.set(k, arr); } arr.push([a[0], a[1], b[0], b[1], type]); }
  }
  M.roadPaths.forEach(p => { for (let i = 0; i + 1 < p.length; i++) addSeg(p[i], p[i + 1], 0); });
  M.dirtPaths.forEach(p => { for (let i = 0; i + 1 < p.length; i++) addSeg(p[i], p[i + 1], 1); });
  // distance to the nearest road within ~16 m (else 999); the type of that road is left in M.lastRoadType (0 asphalt, 1 dirt)
  M.roadDist = function (x, z) {
    const arr = idx.get(Math.floor(x / CELL) + ',' + Math.floor(z / CELL)); if (!arr) { M.lastRoadType = -1; return 999; }
    let best = 999, bt = -1;
    for (const s of arr) { const d = U.segDist(x, z, s[0], s[1], s[2], s[3]); if (d < best) { best = d; bt = s[4]; } }
    M.lastRoadType = bt; return best;
  };

  // Painted ground features (drawn onto the ground texture): rects in world coords
  M.paint = [
    { type: 'rect', x: P('dusty')[0], z: P('dusty')[1] + 10, w: 250, d: 150, color: '#5a5c5f' },
    { type: 'rect', x: P('flush')[0], z: P('flush')[1], w: 200, d: 160, color: '#5c5e60' },
    { type: 'rect', x: P('retail')[0] + 5, z: P('retail')[1] + 8, w: 260, d: 52, color: '#585a5d', bays: true },
    { type: 'rect', x: P('factories')[0], z: P('factories')[1], w: 130, d: 110, color: '#5c5e60' },
    { type: 'rect', x: P('prison')[0], z: P('prison')[1], w: 120, d: 100, color: '#6a6a66' },
    { type: 'field', x: P('anarchy')[0] - 90, z: P('anarchy')[1] + 40, w: 110, d: 140, color: '#a8823f' },
    { type: 'field', x: P('anarchy')[0] + 110, z: P('anarchy')[1] - 30, w: 90, d: 120, color: '#9a7a3a' },
    { type: 'field', x: P('fatal')[0] + 110, z: P('fatal')[1] + 20, w: 120, d: 150, color: '#b08a3f' },
    { type: 'field', x: P('fatal')[0] - 120, z: P('fatal')[1] - 40, w: 100, d: 120, color: '#a07f3a' },
    { type: 'soccer', x: P('pleasant')[0], z: P('pleasant')[1], w: 64, d: 100, color: '#5fb544' },
    { type: 'track', x: P('racetrack')[0], z: P('racetrack')[1], w: 150, d: 110, color: '#8a6d3b' },
    { type: 'rect', x: P('motel')[0], z: P('motel')[1] + 25, w: 110, d: 30, color: '#5c5e60', bays: true },
    { type: 'rect', x: P('greasy')[0] + 50, z: P('greasy')[1] - 45, w: 70, d: 60, color: '#5c5e60', bays: true },
    { type: 'rect', x: P('tomato')[0] - 60, z: P('tomato')[1] - 10, w: 90, d: 60, color: '#5c5e60', bays: true },
    { type: 'rect', x: -1125, z: 1145, w: 150, d: 16, color: '#4e5256' },
    { type: 'rect', x: -1150, z: 1105, w: 60, d: 40, color: '#6a6d70' },
  ];

  // Forest zones: dense tree areas (x,z,r,type,density)
  M.forests = [
    { x: P('wailing')[0], z: P('wailing')[1], r: 190, type: 'pine', density: 0.9, ring: true },
    { x: P('lonely')[0], z: P('lonely')[1], r: 170, type: 'pine', density: 0.7, ring: true },
    { x: P('moisty')[0], z: P('moisty')[1], r: 170, type: 'dead', density: 0.6 },
    { x: -820, z: -60, r: 160, type: 'pine', density: 0.4 },
    { x: 900, z: -650, r: 160, type: 'pine', density: 0.55 },
  ];

  M.mapGridLabels = { cols: 'ABCDEFGHIJ', rows: 10 };
  FN.MapData = M;
})();
