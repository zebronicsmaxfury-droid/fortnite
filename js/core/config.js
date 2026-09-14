// All gameplay tunables (OG Season 1–2 values where known; marked ~ where approximated).
window.FN = window.FN || {};
FN.CONFIG = {
  WORLD_SIZE: 2560,          // metres, square island canvas (10x10 grid of 256 m cells)
  SEA_LEVEL: 0,
  TERRAIN_RES: 512,          // heightmap samples per side (5 m)
  CELL: 5.12,                // building grid (512 uu)
  WALL_H: 3.84,              // wall height (384 uu)
  GRAVITY: 20,
  PLAYER: {
    HEALTH: 100, SHIELD: 100,
    RADIUS: 0.42, HEIGHT: 1.9, EYE: 1.65, CROUCH_HEIGHT: 1.3,
    WALK: 4.0, SPRINT: 5.7, CROUCH: 2.3, ADS: 2.6, BACK: 3.4, AIR_CONTROL: 0.35,
    JUMP_VEL: 7.4,
    FALL_DMG_MIN: 9.5, FALL_DMG_PER_M: 8.5,
    MAX_MATS: 999,
    HARVEST_RATE: 0.86,      // seconds per pickaxe swing
    PICKAXE_DMG_PLAYER: 20,
    PICKAXE_DMG_STRUCT: 50,
  },
  CAMERA: {
    FOV: 80, DIST: 3.4, HEIGHT: 1.75, SIDE: 0.75, ADS_FOV: 55, ADS_DIST: 1.6, ADS_SIDE: 0.7,
    SCOPE_AR_FOV: 28, SNIPER_FOV: 12,
    SENS: 0.0021,
  },
  BUS: {
    ALT: 780, SPEED: 44, JUMP_KEY_DELAY: 3.5,   // ~ seconds after "doors open" before jump allowed (bus enters island)
    DOOR_COUNTDOWN: 5,
  },
  SKYDIVE: {
    FALL_MAX: 60, FALL_MIN: 28, FWD_MAX: 24, ACCEL: 18,
    GLIDER_AUTO_H: 110,       // auto-deploy height above what's below you
    GLIDER_FORCE_H: 45,       // below this you cannot retract
    GLIDE_FALL: 6.5, GLIDE_FWD: 14, GLIDE_DIVE_FALL: 14,
  },
  STORM: {
    START_RADIUS: 1900,
    // wait = seconds before shrinking, shrink = seconds of shrinking, r = end radius, dps = damage/sec outside
    PHASES: [
      { wait: 165, shrink: 180, r: 820, dps: 1 },
      { wait: 120, shrink: 120, r: 500, dps: 1 },
      { wait: 90, shrink: 90, r: 300, dps: 1 },
      { wait: 75, shrink: 75, r: 190, dps: 2 },
      { wait: 50, shrink: 50, r: 120, dps: 2 },
      { wait: 30, shrink: 30, r: 75, dps: 5 },
      { wait: 30, shrink: 30, r: 42, dps: 5 },
      { wait: 25, shrink: 30, r: 18, dps: 10 },
      { wait: 20, shrink: 30, r: 0, dps: 10 },
    ],
  },
  ISLAND_COUNTDOWN: 6,        // seconds on spawn island before bus launch (fast launch for low-end PCs)
  ISLAND_LAUNCH_COUNT: 3,
  BUILD: {
    COST: 10,
    MAT: {
      wood: { hp: 150, time: 5.0, startFrac: 0.3, color: 0xb8863b },
      brick: { hp: 300, time: 12.0, startFrac: 0.25, color: 0x9a9a9a },
      metal: { hp: 400, time: 20.0, startFrac: 0.2, color: 0x8e9aa6 },
    },
  },
  HARVEST: {
    tree: { hp: 500, mat: 'wood', perHit: 5, crit: 9 },
    pine: { hp: 550, mat: 'wood', perHit: 5, crit: 9 },
    rock: { hp: 600, mat: 'brick', perHit: 4, crit: 8 },
    car: { hp: 500, mat: 'metal', perHit: 4, crit: 8 },
    bush: { hp: 60, mat: 'wood', perHit: 2, crit: 3 },
    fence: { hp: 100, mat: 'wood', perHit: 3, crit: 5 },
    hay: { hp: 120, mat: 'wood', perHit: 3, crit: 5 },
    struct_wood: { perHit: 3, crit: 6 },
    struct_brick: { perHit: 3, crit: 6 },
    struct_metal: { perHit: 3, crit: 6 },
  },
  RARITY: {
    common: { name: 'Common', color: '#b1b1b1', hex: 0xb1b1b1, w: 40 },
    uncommon: { name: 'Uncommon', color: '#60aa3a', hex: 0x60aa3a, w: 30 },
    rare: { name: 'Rare', color: '#49acf2', hex: 0x49acf2, w: 18 },
    epic: { name: 'Epic', color: '#b15be2', hex: 0xb15be2, w: 8 },
    legendary: { name: 'Legendary', color: '#e99b4e', hex: 0xe99b4e, w: 4 },
  },
  RARITY_ORDER: ['common', 'uncommon', 'rare', 'epic', 'legendary'],
  AMMO: {
    light: { name: 'Light Bullets', max: 999, box: 18, icon: 'light' },
    medium: { name: 'Medium Bullets', max: 999, box: 20, icon: 'medium' },
    heavy: { name: 'Heavy Bullets', max: 999, box: 6, icon: 'heavy' },
    shells: { name: 'Shells', max: 999, box: 8, icon: 'shells' },
    rockets: { name: 'Rockets', max: 12, box: 2, icon: 'rockets' },
    energy: { name: 'Energy Cells', max: 999, box: 16, icon: 'energy' },

  },
  // Weapon definitions. dmg indexed by rarity in "rarities" order.
  WEAPONS: {
    ar: { name: 'Assault Rifle', kind: 'ar', model: 'm16', ammo: 'medium', rarities: ['common', 'uncommon', 'rare'], dmg: [30, 31, 33], hs: 2.0, rate: 5.5, mag: 30, reload: [2.4, 2.3, 2.2], auto: true, spread: 1.6, adsSpread: 0.55, bloom: 0.55, range: 250, pickupAmmo: 30, tracer: true, feed: 'assault rifle' },
    scar: { name: 'Assault Rifle', kind: 'ar', model: 'scar', ammo: 'medium', rarities: ['epic', 'legendary'], dmg: [35, 36], hs: 2.0, rate: 5.5, mag: 30, reload: [2.2, 2.1], auto: true, spread: 1.4, adsSpread: 0.45, bloom: 0.5, range: 260, pickupAmmo: 30, tracer: true, feed: 'assault rifle' },
    tac: { name: 'Tactical Shotgun', kind: 'shotgun', model: 'tac', ammo: 'shells', rarities: ['common', 'uncommon', 'rare'], dmg: [67, 70, 74], hs: 2.0, rate: 1.5, mag: 8, reload: [6.3, 6.0, 5.7], auto: false, pellets: 10, spread: 3.8, adsSpread: 3.0, bloom: 0, range: 60, falloffStart: 9, falloffEnd: 32, minFrac: 0.28, pickupAmmo: 8, feed: 'shotgunned' },
    sniper: { name: 'Bolt-Action Sniper Rifle', kind: 'sniper', model: 'bolt', ammo: 'heavy', rarities: ['rare', 'epic', 'legendary'], dmg: [105, 110, 116], hs: 2.5, rate: 0.33, mag: 1, reload: [3.0, 2.9, 2.8], auto: false, projectile: true, speed: 260, drop: 1.0, spread: 0.0, adsSpread: 0.0, bloom: 0, range: 600, pickupAmmo: 6, scope: 'sniper', feed: 'sniped' },
    scoped: { name: 'Scoped Assault Rifle', kind: 'ar', model: 'scopedar', ammo: 'medium', rarities: ['rare', 'epic'], dmg: [23, 24], hs: 2.0, rate: 3.5, mag: 20, reload: [2.3, 2.2], auto: true, spread: 0.9, adsSpread: 0.12, bloom: 0.25, range: 400, pickupAmmo: 30, scope: 'ar', tracer: true, feed: 'assault rifle' },
    pistol: { name: 'Pistol', kind: 'pistol', model: 'pistol', ammo: 'light', rarities: ['common', 'uncommon', 'rare'], dmg: [23, 24, 25], hs: 2.0, rate: 6.75, mag: 16, reload: [1.5, 1.4, 1.3], auto: false, spread: 1.5, adsSpread: 0.7, bloom: 0.5, range: 160, pickupAmmo: 18, tracer: true, feed: 'pistol' },
    pump: { name: 'Pump Shotgun', kind: 'shotgun', model: 'pump', ammo: 'shells', rarities: ['common', 'uncommon', 'rare', 'epic', 'legendary'], dmg: [90, 95, 100, 105, 110], hs: 2.0, rate: 0.7, mag: 5, reload: [4.8, 4.6, 4.4, 4.2, 4.0], auto: false, pellets: 10, spread: 3.6, adsSpread: 2.8, bloom: 0, range: 60, falloffStart: 8, falloffEnd: 30, minFrac: 0.25, pickupAmmo: 8, feed: 'shotgunned' },
    burst: { name: 'Burst Assault Rifle', kind: 'ar', model: 'burst', ammo: 'medium', rarities: ['common', 'uncommon', 'rare'], dmg: [27, 28, 30], hs: 2.0, burst: 3, rate: 5.5, mag: 30, reload: [2.4, 2.3, 2.2], auto: false, spread: 1.2, adsSpread: 0.4, bloom: 0.4, range: 250, pickupAmmo: 30, tracer: true, feed: 'assault rifle' },
    smg: { name: 'Submachine Gun', kind: 'smg', model: 'smg', ammo: 'light', rarities: ['common', 'uncommon', 'rare'], dmg: [16, 17, 18], hs: 1.75, rate: 13, mag: 30, reload: [2.2, 2.1, 2.0], auto: true, spread: 2.2, adsSpread: 1.4, bloom: 0.35, range: 180, pickupAmmo: 30, tracer: true, feed: 'SMG' },
    tacsmg: { name: 'Tactical Submachine Gun', kind: 'smg', model: 'tacsmg', ammo: 'light', rarities: ['common', 'uncommon', 'rare'], dmg: [15, 16, 17], hs: 1.75, rate: 15, mag: 35, reload: [2.4, 2.3, 2.2], auto: true, spread: 2.0, adsSpread: 1.3, bloom: 0.3, range: 180, pickupAmmo: 35, tracer: true, feed: 'SMG' },
    suppressedsmg: { name: 'Suppressed Submachine Gun', kind: 'smg', model: 'suppressedsmg', ammo: 'light', rarities: ['uncommon', 'rare', 'epic'], dmg: [16, 17, 18], hs: 1.75, rate: 12.5, mag: 30, reload: [2.2, 2.1, 2.0], auto: true, spread: 2.0, adsSpread: 1.2, bloom: 0.3, range: 180, pickupAmmo: 30, suppressed: true, tracer: true, feed: 'SMG' },
    semisniper: { name: 'Semi-Auto Sniper Rifle', kind: 'sniper', model: 'semisniper', ammo: 'heavy', rarities: ['rare', 'epic', 'legendary'], dmg: [85, 90, 95], hs: 2.5, rate: 1.4, mag: 10, reload: [2.6, 2.5, 2.4], auto: false, projectile: true, speed: 320, drop: 0.6, spread: 0.0, adsSpread: 0.0, bloom: 0, range: 500, pickupAmmo: 10, scope: 'sniper', feed: 'sniped' },
    revolver: { name: 'Revolver', kind: 'pistol', model: 'revolver', ammo: 'light', rarities: ['common', 'uncommon', 'rare', 'epic', 'legendary'], dmg: [38, 42, 46, 50, 54], hs: 2.0, rate: 1.9, mag: 6, reload: [3.0, 2.9, 2.8, 2.7, 2.6], auto: false, spread: 1.0, adsSpread: 0.4, bloom: 0.4, range: 150, pickupAmmo: 12, tracer: true, feed: 'pistol' },
    handcannon: { name: 'Hand Cannon', kind: 'pistol', model: 'handcannon', ammo: 'heavy', rarities: ['rare', 'epic', 'legendary'], dmg: [78, 82, 86], hs: 2.0, rate: 1.1, mag: 7, reload: [2.6, 2.5, 2.4], auto: false, spread: 0.8, adsSpread: 0.3, bloom: 0.5, range: 200, pickupAmmo: 7, tracer: true, feed: 'pistol' },
    grenadelauncher: { name: 'Grenade Launcher', kind: 'launcher', model: 'grenadelauncher', ammo: 'rockets', rarities: ['rare', 'epic', 'legendary'], dmg: [100, 105, 110], hs: 1.0, rate: 0.7, mag: 6, reload: [3.2, 3.1, 3.0], auto: false, projectile: true, speed: 30, drop: 1.6, splash: 4.0, structDmg: 300, spread: 0.5, adsSpread: 0.3, bloom: 0, range: 300, pickupAmmo: 6, feed: 'grenade launcher' },
    doublebarrel: { name: 'Double Barrel Shotgun', kind: 'shotgun', model: 'doublebarrel', ammo: 'shells', rarities: ['common', 'uncommon', 'rare', 'epic'], dmg: [86, 90, 95, 100], hs: 2.0, rate: 1.9, mag: 2, reload: [2.6, 2.5, 2.4, 2.3], auto: false, pellets: 10, spread: 4.4, adsSpread: 3.6, bloom: 0, range: 40, falloffStart: 3, falloffEnd: 14, minFrac: 0.2, pickupAmmo: 4, feed: 'shotgunned' },
    rpg: { name: 'Rocket Launcher', kind: 'launcher', model: 'rpg', ammo: 'rockets', rarities: ['rare', 'epic', 'legendary'], dmg: [110, 116, 121], hs: 1.0, rate: 0.75, mag: 1, reload: [3.6, 3.4, 3.2], auto: false, projectile: true, speed: 34, drop: 0, splash: 5.0, structDmg: 400, spread: 0, adsSpread: 0, bloom: 0, range: 400, pickupAmmo: 2, feed: 'rocket launcher' },
    leveraction: { name: 'Lever Action Rifle', kind: 'sniper', model: 'leveraction', ammo: 'medium', rarities: ['uncommon', 'rare', 'epic'], dmg: [55, 58, 62], hs: 2.5, rate: 1.25, mag: 6, reload: [3.2, 3.0, 2.8], auto: false, spread: 0.2, adsSpread: 0.05, bloom: 0, range: 350, pickupAmmo: 12, scope: 'ar', tracer: true, feed: 'lever action' },
    drumshotgun: { name: 'Drum Shotgun', kind: 'shotgun', model: 'drumshotgun', ammo: 'shells', rarities: ['rare', 'epic', 'legendary'], dmg: [58, 61, 64], hs: 2.0, rate: 2.4, mag: 12, reload: [5.6, 5.3, 5.0], auto: true, pellets: 10, spread: 4.6, adsSpread: 3.6, bloom: 0, range: 55, falloffStart: 7, falloffEnd: 26, minFrac: 0.25, pickupAmmo: 12, feed: 'shotgunned' },
    burstsmg: { name: 'Burst SMG', kind: 'smg', model: 'burstsmg', ammo: 'light', rarities: ['common', 'uncommon', 'rare'], dmg: [14, 15, 16], hs: 1.75, burst: 4, rate: 15, mag: 24, reload: [2.0, 1.9, 1.8], auto: false, spread: 2.4, adsSpread: 1.5, bloom: 0.35, range: 160, pickupAmmo: 24, tracer: true, feed: 'SMG' },
    combatsmg: { name: 'Combat SMG', kind: 'smg', model: 'combatsmg', ammo: 'light', rarities: ['uncommon', 'rare', 'epic'], dmg: [18, 19, 20], hs: 1.75, rate: 16, mag: 32, reload: [2.1, 2.0, 1.9], auto: true, spread: 1.8, adsSpread: 1.0, bloom: 0.25, range: 200, pickupAmmo: 32, tracer: true, feed: 'SMG' },
    heavyar: { name: 'Heavy Assault Rifle', kind: 'ar', model: 'heavyar', ammo: 'heavy', rarities: ['rare', 'epic', 'legendary'], dmg: [38, 40, 42], hs: 2.0, rate: 4.0, mag: 25, reload: [2.6, 2.5, 2.4], auto: true, spread: 1.8, adsSpread: 0.6, bloom: 0.55, range: 280, pickupAmmo: 25, tracer: true, feed: 'assault rifle' },
    flintknock: { name: 'Flint-Knock Pistol', kind: 'pistol', model: 'flintknock', ammo: 'medium', rarities: ['common', 'uncommon', 'rare'], dmg: [70, 75, 80], hs: 2.0, rate: 0.8, mag: 1, reload: [2.0, 1.9, 1.8], auto: false, spread: 1.0, adsSpread: 0.35, bloom: 0.2, range: 120, pickupAmmo: 12, tracer: true, feed: 'pistol' },
    suppressedpistol: { name: 'Suppressed Pistol', kind: 'pistol', model: 'suppressedpistol', ammo: 'light', rarities: ['uncommon', 'rare', 'epic'], dmg: [26, 28, 30], hs: 2.0, rate: 6.5, mag: 12, reload: [1.6, 1.5, 1.4], auto: false, spread: 1.2, adsSpread: 0.45, bloom: 0.3, range: 170, pickupAmmo: 18, suppressed: true, tracer: true, feed: 'pistol' },
    huntingrifle: { name: 'Hunting Rifle', kind: 'sniper', model: 'huntingrifle', ammo: 'heavy', rarities: ['common', 'uncommon', 'rare'], dmg: [86, 90, 94], hs: 2.5, rate: 0.9, mag: 1, reload: [2.0, 1.9, 1.8], auto: false, projectile: true, speed: 300, drop: 0.5, spread: 0, adsSpread: 0, bloom: 0, range: 500, pickupAmmo: 6, scope: 'sniper', feed: 'sniped' },
    autoshotgun: { name: 'Auto Shotgun', kind: 'shotgun', model: 'autoshotgun', ammo: 'shells', rarities: ['uncommon', 'rare', 'epic'], dmg: [62, 65, 68], hs: 2.0, rate: 2.8, mag: 8, reload: [4.8, 4.6, 4.4], auto: true, pellets: 10, spread: 4.2, adsSpread: 3.3, bloom: 0, range: 55, falloffStart: 7, falloffEnd: 25, minFrac: 0.25, pickupAmmo: 8, feed: 'shotgunned' },
    tacticalar: { name: 'Tactical Assault Rifle', kind: 'ar', model: 'tacticalar', ammo: 'medium', rarities: ['uncommon', 'rare', 'epic'], dmg: [29, 31, 33], hs: 2.0, rate: 7.0, mag: 30, reload: [2.3, 2.2, 2.1], auto: true, spread: 1.1, adsSpread: 0.3, bloom: 0.35, range: 280, pickupAmmo: 30, tracer: true, feed: 'assault rifle' },
    minigun: { name: 'Minigun', kind: 'ar', model: 'minigun', ammo: 'light', rarities: ['epic', 'legendary'], dmg: [18, 20], hs: 1.5, rate: 12, mag: 100, reload: [5.0, 4.5], auto: true, spread: 3.5, adsSpread: 2.2, bloom: 0.8, range: 180, pickupAmmo: 100, tracer: true, feed: 'minigun' },
    infernoar: { name: 'Inferno Assault Rifle', kind: 'ar', model: 'infernoar', ammo: 'energy', rarities: ['rare', 'epic', 'legendary'], dmg: [34, 36, 38], hs: 2.0, rate: 5.0, mag: 30, reload: [2.2, 2.1, 2.0], auto: true, spread: 1.3, adsSpread: 0.45, bloom: 0.45, range: 270, pickupAmmo: 30, tracer: true, feed: 'assault rifle' },
    plasmarifle: { name: 'Plasma Rifle', kind: 'ar', model: 'plasmarifle', ammo: 'energy', rarities: ['rare', 'epic'], dmg: [40, 43], hs: 2.0, rate: 2.8, mag: 15, reload: [2.4, 2.2], auto: false, spread: 0.4, adsSpread: 0.08, bloom: 0.15, range: 380, pickupAmmo: 15, scope: 'ar', tracer: true, feed: 'plasma rifle' },

    zapsmg: { name: 'Zap SMG', kind: 'smg', model: 'zapsmg', ammo: 'energy', rarities: ['uncommon', 'rare', 'epic'], dmg: [17, 18, 20], hs: 1.75, rate: 14, mag: 30, reload: [2.0, 1.9, 1.8], auto: true, spread: 1.9, adsSpread: 1.1, bloom: 0.28, range: 190, pickupAmmo: 30, tracer: true, feed: 'SMG' },
    heavysniper: { name: 'Heavy Sniper Rifle', kind: 'sniper', model: 'heavysniper', ammo: 'heavy', rarities: ['epic', 'legendary'], dmg: [150, 157], hs: 2.5, rate: 0.28, mag: 1, reload: [4.0, 3.8], auto: false, projectile: true, speed: 280, drop: 0.8, spread: 0.0, adsSpread: 0.0, bloom: 0, range: 700, pickupAmmo: 4, scope: 'sniper', feed: 'sniped' },
    suppressedar: { name: 'Suppressed Assault Rifle', kind: 'ar', model: 'suppressedar', ammo: 'medium', rarities: ['uncommon', 'rare', 'epic'], dmg: [28, 30, 32], hs: 2.0, rate: 5.0, mag: 30, reload: [2.3, 2.2, 2.1], auto: true, spread: 1.4, adsSpread: 0.5, bloom: 0.45, range: 250, pickupAmmo: 30, suppressed: true, tracer: true, feed: 'assault rifle' },
    trophygun: { name: 'Trophy Gun', kind: 'pistol', model: 'trophygun', ammo: 'heavy', rarities: ['epic', 'legendary'], dmg: [90, 95], hs: 2.0, rate: 1.4, mag: 8, reload: [2.2, 2.0], auto: false, spread: 0.6, adsSpread: 0.2, bloom: 0.3, range: 220, pickupAmmo: 8, tracer: true, feed: 'pistol' },
    quadlauncher: { name: 'Quad Launcher', kind: 'launcher', model: 'quadlauncher', ammo: 'rockets', rarities: ['epic', 'legendary'], dmg: [80, 85], hs: 1.0, rate: 1.2, mag: 4, reload: [4.2, 4.0], auto: false, projectile: true, speed: 36, drop: 0.2, splash: 4.5, structDmg: 350, spread: 0.4, adsSpread: 0.2, bloom: 0, range: 380, pickupAmmo: 4, feed: 'quad launcher' },
    infernoshotgun: { name: 'Inferno Shotgun', kind: 'shotgun', model: 'infernoshotgun', ammo: 'energy', rarities: ['rare', 'epic', 'legendary'], dmg: [75, 80, 85], hs: 2.0, rate: 1.2, mag: 6, reload: [5.0, 4.8, 4.6], auto: false, pellets: 10, spread: 3.4, adsSpread: 2.6, bloom: 0, range: 58, falloffStart: 9, falloffEnd: 30, minFrac: 0.28, pickupAmmo: 6, tracer: true, feed: 'shotgunned' },
    burstpistol: { name: 'Burst Pistol', kind: 'pistol', model: 'burstpistol', ammo: 'light', rarities: ['common', 'uncommon', 'rare'], dmg: [20, 22, 24], hs: 2.0, burst: 3, rate: 10, mag: 24, reload: [1.4, 1.3, 1.2], auto: false, spread: 1.6, adsSpread: 0.8, bloom: 0.45, range: 150, pickupAmmo: 24, tracer: true, feed: 'pistol' },
    compactsmg: { name: 'Compact SMG', kind: 'smg', model: 'compactsmg', ammo: 'light', rarities: ['common', 'uncommon', 'rare'], dmg: [13, 14, 15], hs: 1.75, rate: 18, mag: 40, reload: [1.8, 1.7, 1.6], auto: true, spread: 2.8, adsSpread: 1.8, bloom: 0.4, range: 150, pickupAmmo: 40, tracer: true, feed: 'SMG' },

    thermalar: { name: 'Thermal Assault Rifle', kind: 'ar', model: 'thermalar', ammo: 'energy', rarities: ['epic', 'legendary'], dmg: [30, 32], hs: 2.0, rate: 4.0, mag: 20, reload: [2.8, 2.6], auto: true, spread: 0.8, adsSpread: 0.1, bloom: 0.3, range: 420, pickupAmmo: 20, scope: 'ar', tracer: true, feed: 'assault rifle' },
  },
  CONSUMABLES: {
    bandage: { name: 'Bandages', heal: 15, healCap: 75, time: 4.0, stack: 15, rarity: 'common', icon: 'bandage' },
    medkit: { name: 'Med Kit', heal: 100, healCap: 100, time: 10.0, stack: 3, rarity: 'uncommon', icon: 'medkit' },
    minishield: { name: 'Small Shield Potion', shield: 25, shieldCap: 50, time: 2.0, stack: 10, rarity: 'uncommon', icon: 'minishield' },
    shield: { name: 'Shield Potion', shield: 50, shieldCap: 100, time: 5.0, stack: 3, rarity: 'rare', icon: 'shield' },
    chugjug: { name: 'Chug Jug', heal: 100, healCap: 100, shield: 100, shieldCap: 100, time: 15.0, stack: 1, rarity: 'legendary', icon: 'chugjug' },
  },
  LOOT: {
    CHEST_SPAWN: 0.85, AMMO_SPAWN: 0.75, FLOOR_SPAWN: 0.6,
    CHEST_WEAPON_RARITY: { common: 0, uncommon: 45, rare: 34, epic: 15, legendary: 6 },
    FLOOR_WEAPON_RARITY: { common: 50, uncommon: 34, rare: 13, epic: 2.5, legendary: 0.5 },
    CHEST_MATS: 30,
    WEAPON_WEIGHTS: { ar: 24, scar: 7, tac: 20, sniper: 6, scoped: 5, pistol: 14, rpg: 2.5, pump: 20, burst: 12, smg: 15, tacsmg: 9, suppressedsmg: 6, semisniper: 4, revolver: 10, handcannon: 2.5, grenadelauncher: 2.5, doublebarrel: 7, leveraction: 6, drumshotgun: 7, burstsmg: 8, combatsmg: 8, heavyar: 5, flintknock: 5, suppressedpistol: 6, huntingrifle: 5, autoshotgun: 8, tacticalar: 7, minigun: 3, infernoar: 6, plasmarifle: 5, zapsmg: 7, heavysniper: 3, suppressedar: 7, trophygun: 3, quadlauncher: 2, infernoshotgun: 5, burstpistol: 9, compactsmg: 10, thermalar: 3 },
    FLOOR_KIND: { weapon: 58, consumable: 22, ammo: 20 },
    CONSUMABLE_WEIGHTS: { bandage: 38, medkit: 14, minishield: 26, shield: 16, chugjug: 2 },
  },
  BOTS: {
    TOTAL_PLAYERS: 40,         // reduced from 100 — each bot is ~2-5 ms of CPU per frame on Pentium G630
    NEAR_RADIUS: 450,          // full simulation + full skinned mesh (much larger so bot models render far away)
    MID_RADIUS: 500,           // instanced low-poly rendering (was 700)
    NEAR_TICK: 0,              // every frame
    FAR_TICK: 2.0,             // seconds between far updates (was 1.0)
    SEE_RANGE: 140, HEAR_RANGE: 110,
  },
  // Alive-count pacing curve (seconds -> alive) for far-fight resolution
  PACING: [[0, 100], [90, 94], [180, 72], [300, 55], [420, 42], [600, 28], [780, 18], [960, 10], [1140, 5], [1260, 2]],
  KEYS: {
    forward: 'KeyW', back: 'KeyS', left: 'KeyA', right: 'KeyD', jump: 'Space', sprint: 'ShiftLeft', crouch: 'ControlLeft',
    interact: 'KeyE', reload: 'KeyR', rotate: 'KeyR', map: 'KeyM', inventory: 'KeyI', buildToggle: 'KeyQ', edit: 'KeyG',
    slot1: 'Digit1', slot2: 'Digit2', slot3: 'Digit3', slot4: 'Digit4', slot5: 'Digit5', slot6: 'Digit6',
    wall: 'F1', floor: 'F2', stairs: 'F3', roof: 'F4', trap: 'F5', matWood: 'Digit7', matBrick: 'Digit8', matMetal: 'Digit9',
  },
};
