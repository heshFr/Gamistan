// rng.js — deterministic, seedable pseudo-random number generator.
// The whole point of Nine Lives is that every life replays the SAME course,
// so all world generation MUST be deterministic from a single seed.
(function (global) {
  // mulberry32: tiny, fast, good-enough 32-bit PRNG.
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function RNG(seed) {
    this.seed = seed >>> 0;
    this._next = mulberry32(this.seed);
  }
  RNG.prototype.next = function () { return this._next(); };
  RNG.prototype.range = function (min, max) { return min + this.next() * (max - min); };
  RNG.prototype.int = function (min, max) { return Math.floor(this.range(min, max + 1)); };
  RNG.prototype.pick = function (arr) { return arr[Math.floor(this.next() * arr.length)]; };
  RNG.prototype.chance = function (p) { return this.next() < p; };

  // A stateless hash → used for "what is at height H" lookups so we never have
  // to store the whole course; we can query any point deterministically.
  function hash2(x, y, seed) {
    let h = (x * 374761393 + y * 668265263 + seed * 2246822519) >>> 0;
    h = (h ^ (h >>> 13)) >>> 0;
    h = Math.imul(h, 1274126177) >>> 0;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }

  global.RNG = RNG;
  global.hash2 = hash2;
  global.randomSeed = function () { return (Math.random() * 0xffffffff) >>> 0; };
})(window);
