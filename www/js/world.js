// world.js — deterministic endless course generation.
// Given a seed, every query (walls, fish, speed) returns the SAME result,
// which is what makes ghost replays line up across all nine lives.
(function (global) {
  const ROW_SPACING = 260;   // world units between obstacle walls
  const WALL_THICK = 26;     // wall thickness in world units
  const START_SAFE = 600;    // no walls for the first stretch each life

  function World(seed) {
    this.seed = seed >>> 0;
  }

  // Vertical climb speed grows with height (deterministic → ghosts stay aligned).
  World.prototype.speedAt = function (height) {
    return 240 + Math.min(height * 0.045, 360); // px/s, capped
  };

  // Difficulty 0..1 based on height — shrinks gaps, adds movement.
  World.prototype.difficulty = function (height) {
    return Math.min(height / 8000, 1);
  };

  // Describe the wall at row index i. Returns null before START_SAFE.
  World.prototype.rowAt = function (i) {
    const y = i * ROW_SPACING + START_SAFE;
    const h = global.hash2;
    const diff = this.difficulty(y);
    const gapCenter = 0.2 + h(i, 1, this.seed) * 0.6;
    const gapWidth = 0.42 - diff * 0.22 + h(i, 2, this.seed) * 0.06; // normalized
    // Some rows have a sliding spike that oscillates across the gap.
    const moving = i > 6 && h(i, 3, this.seed) < (0.12 + diff * 0.25);
    const movePhase = h(i, 4, this.seed) * Math.PI * 2;
    const moveSpeed = 1.2 + h(i, 5, this.seed) * 1.4;
    return {
      i: i, y: y, thick: WALL_THICK,
      gapCenter: gapCenter, gapWidth: Math.max(0.16, gapWidth),
      moving: moving, movePhase: movePhase, moveSpeed: moveSpeed,
    };
  };

  // Where, horizontally, the moving spike sits at time t (deterministic).
  World.prototype.spikeX = function (row, t) {
    const span = row.gapWidth * 0.9;
    return row.gapCenter + Math.sin(t * row.moveSpeed + row.movePhase) * span * 0.5;
  };

  // Fish floats between walls. Returns {x, y} or null for a given row index.
  World.prototype.fishAt = function (i) {
    const h = global.hash2;
    if (h(i, 7, this.seed) > 0.55) return null;
    const y = i * ROW_SPACING + START_SAFE + ROW_SPACING * 0.5;
    const x = 0.18 + h(i, 8, this.seed) * 0.64;
    const golden = h(i, 9, this.seed) > 0.93; // rare golden fish = bonus
    return { x: x, y: y, golden: golden, i: i };
  };

  // Background parallax decorations (clouds / stars), purely cosmetic.
  World.prototype.decoAt = function (i) {
    const h = global.hash2;
    return {
      x: h(i, 11, this.seed),
      y: i * 180,
      kind: h(i, 12, this.seed) > 0.5 ? "cloud" : "star",
      scale: 0.5 + h(i, 13, this.seed),
    };
  };

  World.ROW_SPACING = ROW_SPACING;
  World.START_SAFE = START_SAFE;
  global.World = World;
})(window);
