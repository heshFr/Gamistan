// util.js — math, easing, color, and small helpers used across the engine.
(function (global) {
  const TAU = Math.PI * 2;

  const Util = {
    TAU: TAU,
    clamp: (v, a, b) => (v < a ? a : v > b ? b : v),
    lerp: (a, b, t) => a + (b - a) * t,
    inv: (a, b, v) => (b === a ? 0 : (v - a) / (b - a)),
    map: (v, a, b, c, d) => c + (d - c) * ((v - a) / (b - a)),
    mod: (a, n) => ((a % n) + n) % n,
    sign: Math.sign,
    rad: (d) => (d * Math.PI) / 180,
    dist: (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1),
    approach: (cur, target, dt, rate) => cur + (target - cur) * (1 - Math.exp(-rate * dt)),
    rand: (a, b) => a + Math.random() * (b - a),
    randInt: (a, b) => Math.floor(a + Math.random() * (b - a + 1)),
    pick: (arr) => arr[(Math.random() * arr.length) | 0],
    chance: (p) => Math.random() < p,

    // easing
    easeOutCubic: (t) => 1 - Math.pow(1 - t, 3),
    easeInCubic: (t) => t * t * t,
    easeOutBack: (t) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
    easeOutElastic: (t) => { if (t === 0 || t === 1) return t; const c = (2 * Math.PI) / 3; return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c) + 1; },
    easeInOut: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),

    // color helpers (hex strings)
    hexToRgb: (h) => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; },
    rgbToHex: (r, g, b) => "#" + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1),
    lerpColor: (a, b, t) => {
      const ca = Util.hexToRgb(a), cb = Util.hexToRgb(b);
      return Util.rgbToHex(
        Math.round(Util.lerp(ca[0], cb[0], t)),
        Math.round(Util.lerp(ca[1], cb[1], t)),
        Math.round(Util.lerp(ca[2], cb[2], t))
      );
    },
    rgba: (h, a) => { const c = Util.hexToRgb(h); return `rgba(${c[0]},${c[1]},${c[2]},${a})`; },
    shade: (h, amt) => { // amt -1..1 darken/lighten
      const c = Util.hexToRgb(h);
      const f = (v) => Util.clamp(Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt), 0, 255);
      return Util.rgbToHex(f(c[0]), f(c[1]), f(c[2]));
    },

    // format
    commas: (n) => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","),
    pad: (n, w) => String(n).padStart(w, "0"),
    todayKey: () => new Date().toISOString().slice(0, 10),

    // deterministic daily seed from date string
    dateSeed: (key) => {
      let h = 2166136261;
      for (let i = 0; i < key.length; i++) { h ^= key.charCodeAt(i); h = Math.imul(h, 16777619); }
      return h >>> 0;
    },
  };

  // simple object pool to avoid GC churn in particle-heavy scenes
  function Pool(factory, reset) {
    this.free = []; this.factory = factory; this.reset = reset;
  }
  Pool.prototype.get = function () { return this.free.length ? this.free.pop() : this.factory(); };
  Pool.prototype.put = function (o) { if (this.reset) this.reset(o); this.free.push(o); };

  global.Util = Util;
  global.Pool = Pool;
})(window);
