// storage.js — persistent save: economy, collections, settings, stats,
// achievements, upgrades, daily missions & challenge. Emits events on change.
(function (global) {
  const KEY = "ninelives.save.v2";
  const OLDKEY = "ninelives.save.v1";

  function defaults() {
    return {
      v: 2,
      best: 0,
      fish: 0,
      selectedCat: "tuxedo",
      selectedHat: "none",
      selectedTrail: "none",
      cats: ["tuxedo"],
      hats: ["none"],
      trails: ["none"],
      settings: {
        sound: true, music: true, haptics: true,
        control: "drag", contrast: false, reducedMotion: false, leftHanded: false,
      },
      stats: {
        games: 0, totalFish: 0, totalDistance: 0, bestLife: 0, bestCombo: 0,
        ghostsDodged: 0, powerups: 0, bosses: 0, fullRuns: 0, dailiesDone: 0,
        goldenFish: 0, revives: 0, deaths: 0, playSeconds: 0,
      },
      seenBiomes: {},
      achievements: {},
      upgrades: {},
      missions: { date: "", list: [] },
      daily: { date: "", best: 0, done: false, streak: 0 },
    };
  }

  let data = load();

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return migrate(JSON.parse(raw));
      const old = localStorage.getItem(OLDKEY);
      if (old) {
        const o = JSON.parse(old);
        const d = defaults();
        d.best = o.best || 0; d.fish = o.fish || 0;
        d.cats = o.unlocked || ["tuxedo"];
        d.selectedCat = o.selectedCat || "tuxedo";
        d.settings.sound = o.soundOn !== false;
        return d;
      }
    } catch (e) {}
    return defaults();
  }

  function migrate(d) {
    const base = defaults();
    // deep-ish merge so new fields appear for old saves
    const out = Object.assign({}, base, d);
    out.settings = Object.assign({}, base.settings, d.settings || {});
    out.stats = Object.assign({}, base.stats, d.stats || {});
    out.seenBiomes = d.seenBiomes || {};
    out.achievements = d.achievements || {};
    out.upgrades = d.upgrades || {};
    out.missions = d.missions || base.missions;
    out.daily = Object.assign({}, base.daily, d.daily || {});
    return out;
  }

  let saveTimer = null;
  function save() {
    if (saveTimer) return;
    saveTimer = setTimeout(() => {
      saveTimer = null;
      try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {}
    }, 120);
  }
  function saveNow() { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {} }

  const Save = {
    raw: () => data,
    get: (k) => data[k],
    set: (k, v) => { data[k] = v; save(); },

    // ---- economy ----
    addFish(n) { data.fish += n; data.stats.totalFish += Math.max(0, n); save(); Bus.emit("fish:changed", data.fish); return data.fish; },
    spend(n) { if (data.fish < n) return false; data.fish -= n; save(); Bus.emit("fish:changed", data.fish); return true; },
    fish: () => data.fish,

    // ---- settings ----
    setting: (k) => data.settings[k],
    setSetting(k, v) { data.settings[k] = v; saveNow(); Bus.emit("settings:changed", { k, v }); },

    // ---- collections ----
    own(kind, id) {
      const list = data[kind];
      if (list && !list.includes(id)) { list.push(id); save(); }
    },
    owns: (kind, id) => (data[kind] || []).includes(id),
    select(kind, id) {
      const key = kind === "cats" ? "selectedCat" : kind === "hats" ? "selectedHat" : "selectedTrail";
      data[key] = id; save(); Bus.emit("loadout:changed");
    },
    loadout: () => ({ cat: data.selectedCat, hat: data.selectedHat, trail: data.selectedTrail }),

    // ---- upgrades ----
    upgradeLevel: (id) => data.upgrades[id] || 0,
    buyUpgrade(id) { data.upgrades[id] = (data.upgrades[id] || 0) + 1; save(); Bus.emit("upgrades:changed"); },

    // ---- stats (and achievement checks) ----
    bumpStat(k, n) { data.stats[k] = (data.stats[k] || 0) + (n == null ? 1 : n); save(); checkAch(); },
    maxStat(k, v) { if (v > (data.stats[k] || 0)) { data.stats[k] = v; save(); checkAch(); } },
    stat: (k) => data.stats[k] || 0,
    stats: () => data.stats,
    seeBiome(id) { if (!data.seenBiomes[id]) { data.seenBiomes[id] = true; save(); checkAch(); } },
    biomesSeen: () => Object.keys(data.seenBiomes).length,

    recordBest(m) { if (m > data.best) { data.best = m; save(); return true; } return false; },
    best: () => data.best,

    // ---- achievements ----
    hasAch: (id) => !!data.achievements[id],
    achievementsUnlocked: () => Object.keys(data.achievements).length,

    // ---- daily challenge ----
    daily: () => data.daily,
    recordDaily(m) {
      const today = Util.todayKey();
      if (data.daily.date !== today) {
        const wasYesterday = data.daily.date === yesterdayKey();
        data.daily = { date: today, best: 0, done: false, streak: wasYesterday ? (data.daily.streak || 0) : 0 };
      }
      let isBest = false;
      if (m > data.daily.best) { data.daily.best = m; isBest = true; }
      if (!data.daily.done) { data.daily.done = true; data.daily.streak = (data.daily.streak || 0) + 1; Save.bumpStat("dailiesDone"); }
      saveNow();
      return isBest;
    },

    // ---- missions ----
    missions() { ensureMissions(); return data.missions.list; },
    missionProgress(metric, value, mode) {
      ensureMissions();
      let changed = false;
      for (const m of data.missions.list) {
        if (m.done || m.metric !== metric) continue;
        const nv = mode === "max" ? Math.max(m.progress, value) : m.progress + value;
        m.progress = nv;
        if (m.progress >= m.target) {
          m.done = true; m.claimed = false;
          Bus.emit("mission:done", m);
        }
        changed = true;
      }
      if (changed) save();
    },
    claimMission(idx) {
      const m = data.missions.list[idx];
      if (m && m.done && !m.claimed) { m.claimed = true; Save.addFish(m.reward); saveNow(); return m.reward; }
      return 0;
    },

    exportSave: () => JSON.stringify(data),
    importSave(json) { try { data = migrate(JSON.parse(json)); saveNow(); return true; } catch (e) { return false; } },
    wipe() { data = defaults(); saveNow(); Bus.emit("fish:changed", 0); },
  };

  function yesterdayKey() {
    const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10);
  }

  function ensureMissions() {
    const today = Util.todayKey();
    if (data.missions.date === today && data.missions.list.length) return;
    // pick 3 distinct missions deterministically from today's seed
    const seed = Util.dateSeed("missions-" + today);
    const rng = new RNG(seed);
    const pool = Data.MISSION_POOL.slice();
    const list = [];
    for (let i = 0; i < 3 && pool.length; i++) {
      const pick = pool.splice(rng.int(0, pool.length - 1), 1)[0];
      const tier = rng.int(0, pick.tiers.length - 1);
      const target = pick.tiers[tier];
      list.push({
        poolId: pick.id, text: pick.text(target), metric: pick.metric,
        target, progress: 0, done: false, claimed: false,
        reward: pick.reward + tier * 15,
      });
    }
    data.missions = { date: today, list };
    saveNow();
  }

  function checkAch() {
    for (const a of Data.ACHIEVEMENTS) {
      if (data.achievements[a.id]) continue;
      let cur = 0;
      if (a.stat === "catsOwned") cur = data.cats.length;
      else if (a.stat === "biomesSeen") cur = Object.keys(data.seenBiomes).length;
      else cur = data.stats[a.stat] || 0;
      if (cur >= a.value) {
        data.achievements[a.id] = true;
        data.fish += a.reward;
        data.stats.totalFish += a.reward;
        saveNow();
        Bus.emit("achievement:unlocked", a);
        Bus.emit("fish:changed", data.fish);
      }
    }
  }

  Save._checkAch = checkAch;
  global.Save = Save;
})(window);
