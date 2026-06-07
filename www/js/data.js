// data.js — all game content: cats, hats, trails, biomes, power-ups,
// achievements, daily missions, and permanent upgrades. Pure data.
(function (global) {
  // ---------------------------------------------------------------- CATS ----
  const CATS = [
    { id: "tuxedo",    name: "Tuxedo",    cost: 0,    fur: "#2b2b3a", belly: "#fff7fb", ear: "#ff9ad6", eye: "#7cf29c", pattern: "tuxedo" },
    { id: "ginger",    name: "Ginger",    cost: 50,   fur: "#ff944d", belly: "#ffe2c2", ear: "#ffb37a", eye: "#5ad1ff", pattern: "tabby" },
    { id: "calico",    name: "Calico",    cost: 110,  fur: "#fff2e0", belly: "#fff7fb", ear: "#ff9ad6", eye: "#ffd95a", pattern: "calico" },
    { id: "siamese",   name: "Siamese",   cost: 180,  fur: "#e9dcc6", belly: "#fff7fb", ear: "#6b4f3a", eye: "#5ad1ff", pattern: "points" },
    { id: "gray",      name: "Smokey",    cost: 260,  fur: "#8a93a8", belly: "#d7deea", ear: "#ff9ad6", eye: "#a6ff5a", pattern: "tabby" },
    { id: "shadow",    name: "Shadow",    cost: 360,  fur: "#3a2a5a", belly: "#5a4488", ear: "#b97cff", eye: "#c8ff5a", pattern: "solid" },
    { id: "bubblegum", name: "Bubblegum", cost: 480,  fur: "#ff77c8", belly: "#ffd6ef", ear: "#ff4fb0", eye: "#ffffff", pattern: "solid" },
    { id: "mint",      name: "Mint",      cost: 620,  fur: "#7cf2c4", belly: "#d9fff0", ear: "#4fe0a8", eye: "#ff77c8", pattern: "solid" },
    { id: "ocean",     name: "Ocean",     cost: 780,  fur: "#4fb8ff", belly: "#cdeeff", ear: "#2a86e0", eye: "#ffe066", pattern: "tabby" },
    { id: "lava",      name: "Ember",     cost: 950,  fur: "#ff5a3c", belly: "#ffb27a", ear: "#ffd23c", eye: "#fff2c2", pattern: "ember" },
    { id: "panda",     name: "Pandacat",  cost: 1150, fur: "#f4f4f8", belly: "#ffffff", ear: "#2b2b3a", eye: "#2b2b3a", pattern: "panda" },
    { id: "robo",      name: "Robocat",   cost: 1500, fur: "#9fb3c8", belly: "#cfe0f0", ear: "#5ad1ff", eye: "#ff3c6e", pattern: "robo" },
    { id: "cosmic",    name: "Cosmic",    cost: 2000, fur: "#2a1a55", belly: "#4a2f8c", ear: "#ff77c8", eye: "#ffe66d", pattern: "cosmic" },
    { id: "ghostcat",  name: "Spook",     cost: 2600, fur: "#cdbcff", belly: "#efe8ff", ear: "#a98cff", eye: "#3a2a5a", pattern: "ghosty" },
    { id: "golden",    name: "Golden",    cost: 4000, fur: "#ffe066", belly: "#fff6c2", ear: "#ffb300", eye: "#222222", pattern: "golden" },
    { id: "rainbow",   name: "Prism",     cost: 6500, fur: "#ff77c8", belly: "#fff7fb", ear: "#7cf29c", eye: "#ffffff", pattern: "rainbow" },
    { id: "void",      name: "Voidwalker",cost: 9999, fur: "#0d0820", belly: "#1a1240", ear: "#b97cff", eye: "#ff3c6e", pattern: "void" },
  ];

  // ---------------------------------------------------------------- HATS ----
  // Drawn above the cat's head. style drives Sprites.drawHat.
  const HATS = [
    { id: "none",       name: "No Hat",      cost: 0,    style: "none" },
    { id: "bow",        name: "Pink Bow",    cost: 40,   style: "bow",        color: "#ff4fb0" },
    { id: "beanie",     name: "Beanie",      cost: 90,   style: "beanie",     color: "#5ad1ff" },
    { id: "cap",        name: "Backwards Cap",cost: 140, style: "cap",        color: "#ff944d" },
    { id: "flower",     name: "Daisy",       cost: 200,  style: "flower",     color: "#ffe066" },
    { id: "party",      name: "Party Hat",   cost: 280,  style: "party",      color: "#7cf29c" },
    { id: "headphones", name: "Headphones",  cost: 380,  style: "headphones", color: "#b97cff" },
    { id: "crown",      name: "Crown",       cost: 700,  style: "crown",      color: "#ffe066" },
    { id: "halo",       name: "Halo",        cost: 1200, style: "halo",       color: "#fff6a0" },
    { id: "tophat",     name: "Top Hat",     cost: 1600, style: "tophat",     color: "#2b2b3a" },
    { id: "horns",      name: "Lil Horns",   cost: 2200, style: "horns",      color: "#ff3c6e" },
  ];

  // -------------------------------------------------------------- TRAILS ----
  const TRAILS = [
    { id: "none",     name: "No Trail",   cost: 0,    style: "none" },
    { id: "sparkle",  name: "Sparkles",   cost: 60,   style: "sparkle",  colors: ["#ffffff", "#ffe066"] },
    { id: "bubbles",  name: "Bubbles",    cost: 120,  style: "bubbles",  colors: ["#6ce0ff", "#cdeeff"] },
    { id: "hearts",   name: "Hearts",     cost: 220,  style: "hearts",   colors: ["#ff77c8", "#ff4fb0"] },
    { id: "fire",     name: "Flames",     cost: 360,  style: "fire",     colors: ["#ffd23c", "#ff5a3c"] },
    { id: "stars",    name: "Stardust",   cost: 520,  style: "stars",    colors: ["#ffe066", "#b97cff"] },
    { id: "rainbow",  name: "Rainbow",    cost: 900,  style: "rainbow",  colors: ["#ff5a3c", "#ffd23c", "#7cf29c", "#5ad1ff", "#b97cff"] },
    { id: "ghost",    name: "Wisps",      cost: 1400, style: "ghost",    colors: ["#cdbcff", "#efe8ff"] },
  ];

  // -------------------------------------------------------------- BIOMES ----
  // Climb passes through these in order, looping with rising difficulty.
  // span = metres tall. Palettes drive the whole render mood.
  const BIOMES = [
    { id: "dawn",   name: "Dawn Spire",     span: 350, bgTop: "#3a2a6a", bgBottom: "#ff9ad6", wall: "#ff77c8", spike: "#d63a96", accent: "#ffe066", fog: "#ffd6ef", deco: "cloud",  music: "pent",   hazard: ["spike", "mover"] },
    { id: "sky",    name: "Cloud Kingdom",  span: 400, bgTop: "#1f6fd6", bgBottom: "#bfe6ff", wall: "#ffffff", spike: "#7fb0e0", accent: "#ffe066", fog: "#eaf6ff", deco: "cloud",  music: "major",  hazard: ["spike", "mover", "bird"] },
    { id: "space",  name: "Starfall",       span: 450, bgTop: "#05030f", bgBottom: "#241a4a", wall: "#6a5acd", spike: "#b97cff", accent: "#ffe066", fog: "#1a1140", deco: "star",   music: "minor",  hazard: ["spike", "mover", "comet"] },
    { id: "ocean",  name: "Deep Current",   span: 450, bgTop: "#02263a", bgBottom: "#0a6e8c", wall: "#16c0d6", spike: "#0a93a8", accent: "#ffe066", fog: "#0a4a5a", deco: "bubble", music: "dorian", hazard: ["spike", "mover", "jelly"] },
    { id: "candy",  name: "Sugar Rush",     span: 450, bgTop: "#ff77c8", bgBottom: "#ffd6ef", wall: "#ff4fb0", spike: "#d63a96", accent: "#7cf29c", fog: "#ffe0f2", deco: "candy",  music: "lydian", hazard: ["spike", "mover", "gum"] },
    { id: "volcano",name: "Ashfall Peak",   span: 500, bgTop: "#1a0a06", bgBottom: "#7a1f0a", wall: "#ff5a3c", spike: "#ffd23c", accent: "#ffe066", fog: "#4a1206", deco: "ember",  music: "phryg",  hazard: ["spike", "mover", "fireball"] },
    { id: "cyber",  name: "Neon Grid",      span: 500, bgTop: "#06001a", bgBottom: "#1a0040", wall: "#ff3c6e", spike: "#5ad1ff", accent: "#7cf29c", fog: "#10002a", deco: "grid",   music: "chip",   hazard: ["spike", "mover", "laser"] },
    { id: "void",   name: "The Nine Void",  span: 600, bgTop: "#000000", bgBottom: "#0d0820", wall: "#b97cff", spike: "#ff3c6e", accent: "#ffe066", fog: "#05030f", deco: "void",   music: "void",   hazard: ["spike", "mover", "comet", "laser"] },
  ];

  // ------------------------------------------------------------ POWER-UPS ----
  const POWERUPS = [
    { id: "shield",  name: "Bubble Shield", color: "#6ce0ff", icon: "🛡️", dur: 0,   rarity: 0.30, desc: "Absorbs one hit." },
    { id: "magnet",  name: "Fish Magnet",   color: "#ff77c8", icon: "🧲", dur: 7,   rarity: 0.22, desc: "Pulls in nearby fish." },
    { id: "slow",    name: "Time Warp",     color: "#b97cff", icon: "⏳", dur: 5,   rarity: 0.16, desc: "Slows the climb." },
    { id: "boost",   name: "Rocket Dash",   color: "#ffd23c", icon: "🚀", dur: 2.2, rarity: 0.12, desc: "Invincible speed burst." },
    { id: "frenzy",  name: "Catnip Frenzy", color: "#7cf29c", icon: "⭐", dur: 6,   rarity: 0.08, desc: "Invincible + double fish." },
    { id: "double",  name: "Double Fish",   color: "#ffe066", icon: "✨", dur: 9,   rarity: 0.18, desc: "Fish are worth 2x." },
    { id: "freeze",  name: "Ghost Freeze",  color: "#cdbcff", icon: "❄️", dur: 5,   rarity: 0.12, desc: "Freezes your ghosts." },
    { id: "heart",   name: "Extra Life",    color: "#ff4f7e", icon: "❤️", dur: 0,   rarity: 0.03, desc: "Restores one life!" },
  ];

  // ---------------------------------------------------------- ACHIEVEMENTS ----
  // type: stat key compared to value, or special events.
  const ACHIEVEMENTS = [
    { id: "first",      name: "First Steps",     icon: "🐾", desc: "Play your first game.",            stat: "games",        value: 1,     reward: 20 },
    { id: "climb100",   name: "Getting High",    icon: "⛰️", desc: "Reach 100m in one life.",          stat: "bestLife",     value: 100,   reward: 40 },
    { id: "climb500",   name: "Sky's the Limit", icon: "☁️", desc: "Reach 500m.",                      stat: "bestLife",     value: 500,   reward: 80 },
    { id: "climb1000",  name: "Stratospurr",     icon: "🚀", desc: "Reach 1000m.",                     stat: "bestLife",     value: 1000,  reward: 160 },
    { id: "climb2500",  name: "To The Moon",     icon: "🌙", desc: "Reach 2500m.",                     stat: "bestLife",     value: 2500,  reward: 400 },
    { id: "fish100",    name: "Fishmonger",      icon: "🐟", desc: "Bank 100 total fish.",             stat: "totalFish",    value: 100,   reward: 30 },
    { id: "fish1000",   name: "Trawler",         icon: "🎣", desc: "Bank 1,000 total fish.",           stat: "totalFish",    value: 1000,  reward: 120 },
    { id: "fish10000",  name: "Fish Tycoon",     icon: "👑", desc: "Bank 10,000 total fish.",          stat: "totalFish",    value: 10000, reward: 500 },
    { id: "combo10",    name: "On Fire",         icon: "🔥", desc: "Hit a x10 fish combo.",            stat: "bestCombo",    value: 10,    reward: 60 },
    { id: "combo25",    name: "Unstoppable",     icon: "💥", desc: "Hit a x25 combo.",                 stat: "bestCombo",    value: 25,    reward: 200 },
    { id: "games10",    name: "Hooked",          icon: "🎮", desc: "Play 10 games.",                   stat: "games",        value: 10,    reward: 50 },
    { id: "games50",    name: "Addicted",        icon: "🌀", desc: "Play 50 games.",                   stat: "games",        value: 50,    reward: 150 },
    { id: "ghosts100",  name: "Ghostbuster",     icon: "👻", desc: "Survive past 100 ghost-cats.",     stat: "ghostsDodged", value: 100,   reward: 90 },
    { id: "powerups50", name: "Power Hungry",    icon: "⚡", desc: "Grab 50 power-ups.",               stat: "powerups",     value: 50,    reward: 80 },
    { id: "boss1",      name: "Tail Whipper",    icon: "🐉", desc: "Defeat your first guardian.",      stat: "bosses",       value: 1,     reward: 100 },
    { id: "boss10",     name: "Guardian Slayer", icon: "⚔️", desc: "Defeat 10 guardians.",             stat: "bosses",       value: 10,    reward: 350 },
    { id: "ninelives",  name: "Nine Lives",      icon: "😼", desc: "Use all nine lives in one game.",  stat: "fullRuns",     value: 1,     reward: 90 },
    { id: "biome3",     name: "Globetrotter",    icon: "🗺️", desc: "Visit 3 different biomes.",         stat: "biomesSeen",   value: 3,     reward: 70 },
    { id: "biomeall",   name: "Nine Worlds",     icon: "🌌", desc: "Visit all 8 biomes.",              stat: "biomesSeen",   value: 8,     reward: 600 },
    { id: "cats5",      name: "Cat Collector",   icon: "🐱", desc: "Own 5 cats.",                      stat: "catsOwned",    value: 5,     reward: 100 },
    { id: "catsall",    name: "Crazy Cat Person",icon: "🏆", desc: "Own every cat.",                   stat: "catsOwned",    value: CATS.length, reward: 1000 },
    { id: "daily",      name: "Daily Grind",     icon: "📅", desc: "Finish a daily challenge.",        stat: "dailiesDone",  value: 1,     reward: 60 },
    { id: "golden",     name: "Touch of Gold",   icon: "🥇", desc: "Collect 25 golden fish.",          stat: "goldenFish",   value: 25,    reward: 150 },
    { id: "revive",     name: "Cheating Death",  icon: "💫", desc: "Revive after losing all lives.",   stat: "revives",      value: 1,     reward: 80 },
  ];

  // ------------------------------------------------------------- MISSIONS ----
  // Daily pool. Each picks a target tier. metric is a per-game tally.
  const MISSION_POOL = [
    { id: "m_fish",   text: (n) => `Collect ${n} fish`,        metric: "fish",      tiers: [40, 80, 150],  reward: 40 },
    { id: "m_height", text: (n) => `Reach ${n}m`,              metric: "height",    tiers: [300, 600, 1000], reward: 50 },
    { id: "m_combo",  text: (n) => `Hit a x${n} combo`,        metric: "combo",     tiers: [6, 12, 20],    reward: 45 },
    { id: "m_power",  text: (n) => `Grab ${n} power-ups`,      metric: "powerups",  tiers: [3, 6, 10],     reward: 40 },
    { id: "m_boss",   text: (n) => `Defeat ${n} guardian(s)`,  metric: "bosses",    tiers: [1, 2, 3],      reward: 60 },
    { id: "m_golden", text: (n) => `Catch ${n} golden fish`,   metric: "golden",    tiers: [2, 4, 6],      reward: 55 },
    { id: "m_games",  text: (n) => `Play ${n} games`,          metric: "games",     tiers: [2, 4, 6],      reward: 35, persistent: true },
    { id: "m_ghost",  text: (n) => `Dodge ${n} ghosts`,        metric: "ghosts",    tiers: [20, 40, 70],   reward: 45 },
  ];

  // ------------------------------------------------------------- UPGRADES ----
  // Permanent, fish-bought, leveled bonuses applied at game start.
  const UPGRADES = [
    { id: "headstart", name: "Head Start",     icon: "🪜", desc: "Begin each run higher up.",       max: 5, baseCost: 120, growth: 1.8, per: "+60m start" },
    { id: "magnetism", name: "Magnetism",      icon: "🧲", desc: "Bigger fish-magnet radius.",      max: 5, baseCost: 100, growth: 1.7, per: "+20% radius" },
    { id: "duration",  name: "Lasting Power",  icon: "⏱️", desc: "Power-ups last longer.",          max: 5, baseCost: 140, growth: 1.8, per: "+12% duration" },
    { id: "luck",      name: "Lucky Paws",     icon: "🍀", desc: "More power-ups & golden fish.",   max: 5, baseCost: 160, growth: 1.9, per: "+10% luck" },
    { id: "revive",    name: "Spare Life",     icon: "💖", desc: "Carry a one-time revive token.",  max: 1, baseCost: 800, growth: 1,   per: "1 revive" },
    { id: "shieldstart",name:"Lucky Charm",    icon: "🛡️", desc: "Small chance to start shielded.", max: 5, baseCost: 200, growth: 1.9, per: "+8% chance" },
  ];

  function byId(list, id) { return list.find((x) => x.id === id); }

  global.Data = {
    CATS, HATS, TRAILS, BIOMES, POWERUPS, ACHIEVEMENTS, MISSION_POOL, UPGRADES,
    cat: (id) => byId(CATS, id) || CATS[0],
    hat: (id) => byId(HATS, id) || HATS[0],
    trail: (id) => byId(TRAILS, id) || TRAILS[0],
    powerup: (id) => byId(POWERUPS, id),
    upgrade: (id) => byId(UPGRADES, id),
    achievement: (id) => byId(ACHIEVEMENTS, id),
    // biome at a given metre height (loops, difficulty rises each loop)
    biomeAt: (metres) => {
      let m = metres, i = 0, loop = 0;
      while (true) {
        const span = BIOMES[i].span;
        if (m < span) return { def: BIOMES[i], index: i, loop, localM: m, totalIndex: loop * BIOMES.length + i };
        m -= span; i++;
        if (i >= BIOMES.length) { i = 0; loop++; }
      }
    },
    // total metres of one full biome cycle
    cycleHeight: () => BIOMES.reduce((a, b) => a + b.span, 0),
    upgradeCost: (u, level) => Math.round(u.baseCost * Math.pow(u.growth, level)),
  };
})(window);
