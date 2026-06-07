// hud.js — in-game overlays: height/fish/lives, power-up timers, combo,
// banners (life lost, biome, boss, revive) and toasts (awards, missions).
(function (global) {
  const $ = (id) => document.getElementById(id);
  const totals = {}; // power-up id -> total duration (for timer bars)
  let bannerTimer = null;

  const EFFECT_ICONS = { shield: "🛡️", magnet: "🧲", slow: "⏳", boost: "🚀", frenzy: "⭐", double: "✨", freeze: "❄️" };

  function show() { $("hud").classList.remove("hidden"); }
  function hide() { $("hud").classList.add("hidden"); $("touch-hint").classList.add("hidden"); }

  function banner(text, cls) {
    const b = $("banner");
    b.textContent = text;
    b.className = "banner" + (cls ? " " + cls : "");
    b.classList.remove("hidden");
    b.style.animation = "none"; void b.offsetWidth; b.style.animation = "";
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => b.classList.add("hidden"), 1400);
  }

  function toast(icon, title, sub, cls) {
    const t = document.createElement("div");
    t.className = "toast" + (cls ? " " + cls : "");
    t.innerHTML = `<div class="ti">${icon}</div><div><div class="tt">${title}</div>${sub ? `<div class="ts">${sub}</div>` : ""}</div>`;
    $("toasts").appendChild(t);
    setTimeout(() => t.remove(), 3000);
  }

  function lives(n, life) {
    const el = $("hud-lives"); el.innerHTML = "";
    for (let i = 0; i < 9; i++) {
      const s = document.createElement("span");
      s.className = "life" + (i >= n ? " lost" : "");
      s.textContent = "🐱";
      el.appendChild(s);
    }
  }

  function effects(e) {
    const el = $("hud-effects"); el.innerHTML = "";
    if (e.shield) addEff("shield", 1);
    for (const k of ["boost", "frenzy", "magnet", "double", "slow", "freeze"]) {
      if (e[k] > 0) {
        const total = totals[k] || (Data.powerup(k) ? Data.powerup(k).dur : 1);
        addEff(k, Util.clamp(e[k] / total, 0, 1));
      }
    }
  }
  function addEff(k, frac) {
    const d = document.createElement("div");
    d.className = "eff";
    d.innerHTML = `${EFFECT_ICONS[k]}<div class="ebar" style="width:${frac * 100}%"></div>`;
    $("hud-effects").appendChild(d);
  }

  function combo(n) {
    const el = $("hud-combo");
    if (n < 2) { el.classList.add("hidden"); return; }
    el.textContent = "COMBO ×" + n + "!";
    el.classList.remove("hidden");
    el.style.transition = "none"; el.style.transform = "translateX(-50%) scale(1.3)";
    requestAnimationFrame(() => { el.style.transition = "transform .15s"; el.style.transform = "translateX(-50%) scale(1)"; });
    clearTimeout(el._t); el._t = setTimeout(() => el.classList.add("hidden"), 1600);
  }

  function init() {
    Bus.on("game:start", () => { show(); $("touch-hint").classList.remove("hidden"); $("hud-combo").classList.add("hidden"); });
    Bus.on("game:over", hide);
    Bus.on("game:pause", () => $("hud").classList.add("hidden"));
    Bus.on("game:resume", show);

    Bus.on("hud:update", (s) => {
      $("hud-height").textContent = s.metres + " m";
      $("hud-fish").textContent = "🐟 " + Util.commas(s.fish);
      $("hud-biome").textContent = s.biome;
      effects(s.effects);
    });
    Bus.on("lives:update", (s) => lives(s.lives, s.life));
    Bus.on("combo", combo);
    Bus.on("biome:enter", (s) => banner(s.name + (s.loop ? " ×" + (s.loop + 1) : ""), "biome"));
    Bus.on("boss:start", (s) => banner("⚠ " + s.name.toUpperCase(), "boss"));
    Bus.on("boss:win", () => banner("GUARDIAN DOWN!", "win"));
    Bus.on("life:lost", (s) => banner(s.lives === 1 ? "LAST LIFE!" : s.lives + " LIVES LEFT"));
    Bus.on("revive", () => banner("REVIVED! 💫"));
    Bus.on("powerup:get", (def) => { if (def.dur) totals[def.id] = def.dur * (1 + Save.upgradeLevel("duration") * 0.12); });
    Bus.on("achievement:unlocked", (a) => { Sfx.achievement(); toast(a.icon, a.name, "+" + a.reward + " 🐟"); });
    Bus.on("mission:done", (m) => { toast("🎯", "Mission complete!", m.text + " · +" + m.reward + " 🐟", "mission"); });
  }

  global.HUD = { init, banner, toast };
})(window);
