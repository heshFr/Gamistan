// storage.js — local save data (best score, fish bank, unlocked cats, settings).
(function (global) {
  const KEY = "ninelives.save.v1";

  const DEFAULTS = {
    best: 0,
    fish: 0,
    selectedCat: "tuxedo",
    unlocked: ["tuxedo"],
    soundOn: true,
    plays: 0,
  };

  let data = load();

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return Object.assign({}, DEFAULTS);
      const parsed = JSON.parse(raw);
      return Object.assign({}, DEFAULTS, parsed);
    } catch (e) {
      return Object.assign({}, DEFAULTS);
    }
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {}
  }

  global.Save = {
    get: function (k) { return data[k]; },
    set: function (k, v) { data[k] = v; save(); },
    addFish: function (n) { data.fish += n; save(); return data.fish; },
    spendFish: function (n) {
      if (data.fish < n) return false;
      data.fish -= n; save(); return true;
    },
    unlock: function (id) {
      if (!data.unlocked.includes(id)) { data.unlocked.push(id); save(); }
    },
    isUnlocked: function (id) { return data.unlocked.includes(id); },
    recordBest: function (m) {
      if (m > data.best) { data.best = m; save(); return true; }
      return false;
    },
    all: function () { return data; },
  };
})(window);
