// world.js — deterministic, biome-aware endless course generation.
// Everything is a pure function of (seed, index) so all nine lives — and
// every replayed ghost — see the exact same course.
(function (global) {
  const ROW_SPACING = 250;
  const WALL_THICK = 26;
  const START_SAFE = 520;
  const PU_STRIDE = 3;        // power-ups considered every N rows
  const BOSS_BAND_M = 110;    // metres of boss gauntlet at each biome top

  function World(seed, opts) {
    this.seed = seed >>> 0;
    opts = opts || {};
    this.luck = opts.luck || 0;        // 0..1 extra spawn luck
    this.startBoost = opts.startBoost || 0; // metres head start
  }

  World.prototype.mToWy = (m) => m * 10;
  World.prototype.wyToM = (wy) => wy / 10;

  World.prototype.speedAt = function (wy) {
    return 235 + Math.min(wy * 0.04, 380);
  };
  World.prototype.difficulty = function (wy) {
    const m = wy / 10;
    const b = Data.biomeAt(m);
    // difficulty climbs within and across biome loops
    return Util.clamp((b.totalIndex * 0.12) + (b.localM / b.def.span) * 0.25, 0, 1);
  };
  World.prototype.biomeAtWy = function (wy) { return Data.biomeAt(wy / 10); };

  // boss band: the top BOSS_BAND_M metres of each biome
  World.prototype.bossBand = function (wy) {
    const m = wy / 10;
    const b = Data.biomeAt(m);
    const topLocal = b.def.span;
    if (b.localM >= topLocal - BOSS_BAND_M) {
      const p = (b.localM - (topLocal - BOSS_BAND_M)) / BOSS_BAND_M;
      return { active: true, def: b.def, biomeIndex: b.totalIndex, progress: Util.clamp(p, 0, 1) };
    }
    return { active: false };
  };

  World.prototype.rowAt = function (i) {
    const y = i * ROW_SPACING + START_SAFE;
    const h = global.hash2, s = this.seed;
    const diff = this.difficulty(y);
    const biome = this.biomeAtWy(y);
    const band = this.bossBand(y);
    const gapCenter = 0.2 + h(i, 1, s) * 0.6;
    let gapWidth = 0.44 - diff * 0.24 + h(i, 2, s) * 0.05;
    if (band.active) gapWidth = Math.max(0.2, gapWidth * 0.9);
    const moving = !band.active && i > 5 && h(i, 3, s) < (0.1 + diff * 0.28);
    const hazardKinds = biome.def.hazard;
    const kind = moving ? hazardKinds[1 + (h(i, 6, s) * (hazardKinds.length - 1) | 0)] : "spike";
    return {
      i, y, thick: WALL_THICK, biome: biome.def, band,
      gapCenter, gapWidth: Math.max(0.17, gapWidth),
      moving, kind,
      movePhase: h(i, 4, s) * Util.TAU,
      moveSpeed: 1.1 + h(i, 5, s) * 1.5,
    };
  };

  World.prototype.spikeX = function (row, t) {
    const span = row.gapWidth * 0.9;
    return row.gapCenter + Math.sin(t * row.moveSpeed + row.movePhase) * span * 0.5;
  };

  World.prototype.fishAt = function (i) {
    const h = global.hash2, s = this.seed;
    if (h(i, 7, s) > 0.52) return null;
    const y = i * ROW_SPACING + START_SAFE + ROW_SPACING * 0.5;
    const x = 0.18 + h(i, 8, s) * 0.64;
    const golden = h(i, 9, s) > (0.93 - this.luck * 0.06);
    return { x, y, golden, i };
  };

  // deterministic power-up on a coarse grid
  World.prototype.powerupAt = function (i) {
    if (i % PU_STRIDE !== 0 || i < 4) return null;
    const h = global.hash2, s = this.seed;
    const present = h(i, 21, s) < (0.16 + this.luck * 0.12);
    if (!present) return null;
    // weighted pick among power-ups (rarer ones boosted slightly by luck)
    const list = Data.POWERUPS;
    let total = 0;
    const weights = list.map((p) => {
      const w = p.rarity * (p.rarity < 0.1 ? 1 + this.luck : 1);
      total += w; return w;
    });
    let r = h(i, 22, s) * total, pick = list[0];
    for (let k = 0; k < list.length; k++) { r -= weights[k]; if (r <= 0) { pick = list[k]; break; } }
    const y = i * ROW_SPACING + START_SAFE + ROW_SPACING * 0.5;
    const x = 0.2 + h(i, 23, s) * 0.6;
    return { x, y, id: pick.id, def: pick, i };
  };

  World.prototype.decoAt = function (i) {
    const h = global.hash2, s = this.seed;
    return { x: h(i, 11, s), y: i * 170, kind: h(i, 12, s), scale: 0.5 + h(i, 13, s) };
  };

  World.ROW_SPACING = ROW_SPACING;
  World.START_SAFE = START_SAFE;
  World.BOSS_BAND_M = BOSS_BAND_M;
  global.World = World;
})(window);
