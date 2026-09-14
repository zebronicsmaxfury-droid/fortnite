// Inventory: 5 slots + pickaxe, ammo pools, materials. Used by the player and bots.
window.FN = window.FN || {};
(function () {
  const C = FN.CONFIG, U = FN.U;
  const INV = {};
  INV.create = function () {
    const ammo = {};
    if (C && C.AMMO) { for (const a in C.AMMO) ammo[a] = 0; }
    else { ammo.light = 0; ammo.medium = 0; ammo.heavy = 0; ammo.shells = 0; ammo.rockets = 0; ammo.energy = 0; }
    return { slots: [null, null, null, null, null], ammo, mats: { wood: 0, brick: 0, metal: 0 }, selected: 0 };
  };
  INV.weaponDef = (it) => it && it.kind === 'weapon' ? C.WEAPONS[it.id] : null;
  INV.rarityIndex = (it) => { const def = INV.weaponDef(it); return def ? def.rarities.indexOf(it.rarity) : 0; };
  INV.dmg = (it) => { const def = INV.weaponDef(it); return def ? def.dmg[Math.max(0, INV.rarityIndex(it))] : 10; };
  INV.reloadTime = (it) => { const def = INV.weaponDef(it); return def ? def.reload[Math.max(0, INV.rarityIndex(it))] : 2.5; };
  INV.displayName = (it) => { if (!it) return ''; if (it.kind === 'weapon') return C.WEAPONS[it.id] ? C.WEAPONS[it.id].name : it.id; if (it.kind === 'consumable') return C.CONSUMABLES[it.id] ? C.CONSUMABLES[it.id].name : it.id; if (it.kind === 'ammo') return C.AMMO[it.id] ? C.AMMO[it.id].name : it.id; return it.id; };
  INV.rarityOf = (it) => it.kind === 'weapon' ? it.rarity : (it.kind === 'consumable' && C.CONSUMABLES[it.id] ? C.CONSUMABLES[it.id].rarity : 'common');
  INV.firstEmpty = (inv) => inv.slots.indexOf(null);
  INV.isFull = (inv) => inv.slots.indexOf(null) < 0;
  // Try to add an item. Returns {ok, swapped:item|null, auto:bool}
  INV.add = function (inv, it, preferSlot) {
    if (it.kind === 'ammo') { const max = C.AMMO[it.id] ? C.AMMO[it.id].max : 999; if (inv.ammo[it.id] === undefined) inv.ammo[it.id] = 0; const room = max - inv.ammo[it.id]; const take = Math.min(room, it.count); inv.ammo[it.id] += take; it.count -= take; return { ok: take > 0, auto: true, leftover: it.count > 0 }; }
    if (it.kind === 'material') { if (inv.mats[it.id] === undefined) inv.mats[it.id] = 0; const room = C.PLAYER.MAX_MATS - inv.mats[it.id]; const take = Math.min(room, it.count); inv.mats[it.id] += take; it.count -= take; return { ok: take > 0, auto: true, leftover: it.count > 0 }; }
    if (it.kind === 'consumable') {
      const def = C.CONSUMABLES[it.id];
      if (def) { for (const s of inv.slots) { if (s && s.kind === 'consumable' && s.id === it.id && s.count < def.stack) { const take = Math.min(def.stack - s.count, it.count); s.count += take; it.count -= take; if (it.count <= 0) return { ok: true, auto: true }; } } }
      if (it.count <= 0) return { ok: true, auto: true };
    }
    const e = INV.firstEmpty(inv);
    if (e >= 0) { inv.slots[e] = it; return { ok: true, slot: e }; }
    // swap with preferred (selected) slot
    if (preferSlot !== undefined && preferSlot >= 0 && preferSlot < 5 && inv.slots[preferSlot]) { const old = inv.slots[preferSlot]; inv.slots[preferSlot] = it; return { ok: true, slot: preferSlot, swapped: old }; }
    return { ok: false };
  };
  INV.remove = function (inv, slot) { const it = inv.slots[slot]; inv.slots[slot] = null; return it; };
  INV.bestWeaponSlot = function (inv, kindPref) {
    let best = -1, bs = -1;
    inv.slots.forEach((s, i) => { if (!s || s.kind !== 'weapon') return; const def = C.WEAPONS[s.id]; if (!def) return; let score = INV.dmg(s) * def.rate * (def.pellets || 1) * 0.1 + INV.rarityIndex(s) * 3 + (kindPref && def.kind === kindPref ? 20 : 0); if ((inv.ammo[def.ammo] || 0) + (s.ammo || 0) <= 0) score -= 100; if (score > bs) { bs = score; best = i; } });
    return best;
  };
  INV.hasAmmo = (inv, it) => { if (!it || it.kind !== 'weapon') return false; const def = C.WEAPONS[it.id]; return (it.ammo > 0 || (def && (inv.ammo[def.ammo] || 0) > 0)); };
  INV.consumableSlot = function (inv, wantShield, wantHealth) {
    let best = -1, bs = 0;
    inv.slots.forEach((s, i) => { if (!s || s.kind !== 'consumable') return; const d = C.CONSUMABLES[s.id]; let sc = 0; if (wantShield && d.shield) sc += d.shield; if (wantHealth && d.heal) sc += d.heal; if (sc > bs) { bs = sc; best = i; } });
    return best;
  };
  FN.Inventory = INV;
})();
