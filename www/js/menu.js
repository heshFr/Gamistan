// menu.js — all out-of-game screens: main menu, shop, missions, upgrades,
// achievements, stats, settings, pause, game over, and how-to.
(function (global) {
  const $ = (id) => document.getElementById(id);
  let lastMode = {};
  let panelKind = null, shopTab = "cats";

  function hideAll() { ["menu", "panel", "howto", "pause", "gameover"].forEach((s) => $(s).classList.add("hidden")); }
  function showMenu() { hideAll(); $("menu").classList.remove("hidden"); refreshMenu(); }
  function click() { Sfx.unlock(); Sfx.click(); }

  // ----------------------------------------------------------- main menu ----
  function refreshMenu() {
    $("menu-fish").textContent = "🐟 " + Util.commas(Save.fish());
    $("menu-best").textContent = "Best " + Save.best() + " m";
  }

  let previewT = 0;
  function drawPreview() {
    const cv = $("preview-canvas"); if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.save(); ctx.translate(cv.width / 2, cv.height / 2 + 10);
    const lo = Save.loadout();
    const t = previewT;
    const wob = Math.sin(t * 2) * 0.05;
    // a couple of trail sparkles for flavour
    const tr = Data.trail(lo.trail);
    if (tr.style !== "none") {
      for (let i = 0; i < 5; i++) {
        const yy = 50 + ((t * 60 + i * 24) % 90);
        ctx.globalAlpha = 1 - yy / 140;
        ctx.fillStyle = (tr.colors || ["#fff"])[i % (tr.colors || ["#fff"]).length];
        ctx.beginPath(); ctx.arc(Math.sin(t * 3 + i) * 14, yy, 4, 0, 6.28); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    Sprites.drawCat(ctx, Data.cat(lo.cat), 168, { mood: 1, tail: Math.sin(t * 3) * 0.3, sx: 1 + wob, sy: 1 - wob, hat: Data.hat(lo.hat), t });
    ctx.restore();
  }
  function tickPreview(dt) { previewT += dt; if (!$("menu").classList.contains("hidden")) drawPreview(); }

  // --------------------------------------------------------------- play ----
  function startGame(daily) {
    click(); hideAll();
    lastMode = { daily: !!daily };
    if (daily) Game.startDaily(); else Game.start();
  }

  // -------------------------------------------------------------- panel ----
  function openPanel(kind) {
    click(); panelKind = kind;
    hideAll(); $("panel").classList.remove("hidden");
    $("panel-fish").textContent = "🐟 " + Util.commas(Save.fish());
    const tabs = $("panel-tabs");
    const titles = { shop: "Shop", missions: "Missions", upgrades: "Upgrades", achievements: "Awards", stats: "Statistics", settings: "Settings" };
    $("panel-title").textContent = titles[kind] || "Panel";
    if (kind === "shop") {
      tabs.classList.remove("hidden");
      tabs.innerHTML = "";
      [["cats", "Cats"], ["hats", "Hats"], ["trails", "Trails"]].forEach(([id, label]) => {
        const b = document.createElement("button");
        b.textContent = label; b.className = id === shopTab ? "active" : "";
        b.onclick = () => { Sfx.click(); shopTab = id; openPanel("shop"); };
        tabs.appendChild(b);
      });
    } else tabs.classList.add("hidden");
    render();
  }

  function render() {
    const body = $("panel-body");
    body.innerHTML = "";
    if (panelKind === "shop") renderShop(body);
    else if (panelKind === "missions") renderMissions(body);
    else if (panelKind === "upgrades") renderUpgrades(body);
    else if (panelKind === "achievements") renderAchievements(body);
    else if (panelKind === "stats") renderStats(body);
    else if (panelKind === "settings") renderSettings(body);
  }

  // ---- shop ----
  function renderShop(body) {
    const list = shopTab === "cats" ? Data.CATS : shopTab === "hats" ? Data.HATS : Data.TRAILS;
    const grid = document.createElement("div"); grid.className = "grid3";
    const lo = Save.loadout();
    const selId = shopTab === "cats" ? lo.cat : shopTab === "hats" ? lo.hat : lo.trail;
    list.forEach((item) => {
      const owned = Save.owns(shopTab, item.id);
      const selected = selId === item.id;
      const card = document.createElement("div");
      card.className = "item-card" + (selected ? " selected" : "") + (owned ? "" : " locked");
      const cv = document.createElement("canvas"); cv.width = 120; cv.height = 120;
      drawItem(cv.getContext("2d"), shopTab, item, lo);
      card.appendChild(cv);
      const nm = document.createElement("div"); nm.className = "name"; nm.textContent = item.name; card.appendChild(nm);
      const tag = document.createElement("div");
      if (owned) { tag.className = "tag " + (selected ? "sel" : "owned"); tag.textContent = selected ? "EQUIPPED" : "TAP"; }
      else { tag.className = "tag cost"; tag.textContent = "🐟 " + Util.commas(item.cost); }
      card.appendChild(tag);
      card.onclick = () => onItemTap(item, owned, card);
      grid.appendChild(card);
    });
    body.appendChild(grid);
  }

  function onItemTap(item, owned, card) {
    if (owned) { Sfx.click(); Save.select(shopTab, item.id); render(); refreshMenu(); return; }
    if (Save.spend(item.cost)) {
      Sfx.buy(); Save.own(shopTab, item.id); Save._checkAch(); Save.select(shopTab, item.id);
      $("panel-fish").textContent = "🐟 " + Util.commas(Save.fish());
      render();
    } else {
      Sfx.deny();
      card.animate([{ transform: "translateX(-6px)" }, { transform: "translateX(6px)" }, { transform: "translateX(0)" }], { duration: 200 });
    }
  }

  function drawItem(ctx, kind, item, lo) {
    ctx.save(); ctx.translate(60, 66);
    if (kind === "cats") Sprites.drawCat(ctx, item, 92, { mood: 1, tail: 0.2, hat: Data.hat(lo.hat) });
    else if (kind === "hats") Sprites.drawCat(ctx, Data.cat(lo.cat), 92, { mood: 1, tail: 0.2, hat: item });
    else {
      Sprites.drawCat(ctx, Data.cat(lo.cat), 78, { mood: 1, tail: 0.2 });
      const cols = item.colors || ["#888"];
      if (item.style !== "none") for (let i = 0; i < 6; i++) { ctx.fillStyle = cols[i % cols.length]; ctx.globalAlpha = 1 - i / 7; ctx.beginPath(); ctx.arc(-4 + Math.sin(i) * 8, 30 + i * 7, 4, 0, 6.28); ctx.fill(); }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  // ---- missions ----
  function renderMissions(body) {
    const d = Save.daily();
    const db = document.createElement("div"); db.className = "daily-banner";
    db.innerHTML = `<b>🗓 Daily Challenge</b><br>Today's best: <b>${d.date === Util.todayKey() ? d.best : 0} m</b> · Streak: <b>${d.streak || 0} 🔥</b><br><span style="font-size:12px;opacity:.8">Everyone gets the same course today.</span>`;
    body.appendChild(db);

    const head = document.createElement("div"); head.className = "stat-head"; head.textContent = "Daily Missions"; body.appendChild(head);
    const missions = Save.missions();
    missions.forEach((m, i) => {
      const el = document.createElement("div"); el.className = "mission" + (m.done ? " done" : "");
      const frac = Util.clamp(m.progress / m.target, 0, 1);
      el.innerHTML = `<div class="top"><span>${m.done ? "✅ " : ""}${m.text}</span><span class="reward">+${m.reward}🐟</span></div>
        <div class="mbar"><div style="width:${frac * 100}%"></div></div>
        <div style="font-size:12px;opacity:.8;margin-top:4px">${Math.min(m.progress, m.target)} / ${m.target}</div>`;
      if (m.done && !m.claimed) {
        const b = document.createElement("button"); b.className = "btn btn-primary claim"; b.textContent = "CLAIM +" + m.reward + " 🐟";
        b.onclick = () => { const r = Save.claimMission(i); if (r) { Sfx.buy(); $("panel-fish").textContent = "🐟 " + Util.commas(Save.fish()); render(); } };
        el.appendChild(b);
      } else if (m.claimed) {
        const c = document.createElement("div"); c.style.cssText = "color:var(--green);font-weight:800;margin-top:6px"; c.textContent = "Claimed ✓"; el.appendChild(c);
      }
      body.appendChild(el);
    });
  }

  // ---- upgrades ----
  function renderUpgrades(body) {
    Data.UPGRADES.forEach((u) => {
      const lvl = Save.upgradeLevel(u.id);
      const maxed = lvl >= u.max;
      const cost = Data.upgradeCost(u, lvl);
      const el = document.createElement("div"); el.className = "upgrade";
      let dots = "";
      for (let i = 0; i < u.max; i++) dots += `<i class="${i < lvl ? "on" : ""}"></i>`;
      el.innerHTML = `<div class="ic">${u.icon}</div><div class="info"><div class="nm">${u.name} <span style="font-size:12px;opacity:.7">${u.per}</span></div><div class="ds">${u.desc}</div><div class="dots">${dots}</div></div>`;
      const b = document.createElement("button"); b.className = "btn buy";
      if (maxed) { b.textContent = "MAX"; b.disabled = true; b.style.opacity = .6; }
      else { b.textContent = "🐟 " + Util.commas(cost); b.onclick = () => { if (Save.spend(cost)) { Sfx.buy(); Save.buyUpgrade(u.id); $("panel-fish").textContent = "🐟 " + Util.commas(Save.fish()); render(); } else { Sfx.deny(); b.animate([{ transform: "translateX(-5px)" }, { transform: "translateX(5px)" }, { transform: "none" }], { duration: 180 }); } }; }
      el.appendChild(b); body.appendChild(el);
    });
  }

  // ---- achievements ----
  function renderAchievements(body) {
    const head = document.createElement("div"); head.className = "stat-head";
    head.textContent = `Unlocked ${Save.achievementsUnlocked()} / ${Data.ACHIEVEMENTS.length}`; body.appendChild(head);
    const grid = document.createElement("div"); grid.className = "ach-grid";
    Data.ACHIEVEMENTS.forEach((a) => {
      const got = Save.hasAch(a.id);
      const el = document.createElement("div"); el.className = "ach" + (got ? "" : " locked");
      el.innerHTML = `<div class="ic">${got ? a.icon : "🔒"}</div><div><div class="nm">${a.name}</div><div class="ds">${a.desc}</div><div class="rw">+${a.reward}🐟</div></div>`;
      grid.appendChild(el);
    });
    body.appendChild(grid);
  }

  // ---- stats ----
  function renderStats(body) {
    const s = Save.stats();
    const rows = [
      ["Best height", Save.best() + " m"],
      ["Best single life", s.bestLife + " m"],
      ["Best combo", "×" + s.bestCombo],
      ["Total distance", Util.commas(s.totalDistance) + " m"],
      ["Games played", Util.commas(s.games)],
      ["Total fish earned", Util.commas(s.totalFish)],
      ["Golden fish", Util.commas(s.goldenFish)],
      ["Power-ups grabbed", Util.commas(s.powerups)],
      ["Guardians defeated", Util.commas(s.bosses)],
      ["Ghosts outlived", Util.commas(s.ghostsDodged)],
      ["Full nine-life runs", Util.commas(s.fullRuns)],
      ["Revives", Util.commas(s.revives)],
      ["Deaths", Util.commas(s.deaths)],
      ["Biomes discovered", Save.biomesSeen() + " / " + Data.BIOMES.length],
      ["Cats owned", Save.raw().cats.length + " / " + Data.CATS.length],
      ["Dailies completed", Util.commas(s.dailiesDone)],
    ];
    rows.forEach(([k, v]) => { const r = document.createElement("div"); r.className = "stat-row"; r.innerHTML = `<span>${k}</span><span class="v">${v}</span>`; body.appendChild(r); });
  }

  // ---- settings ----
  function renderSettings(body) {
    const toggles = [
      ["sound", "Sound effects"], ["music", "Music"], ["haptics", "Vibration"],
      ["contrast", "High contrast"], ["reducedMotion", "Reduced motion"], ["leftHanded", "Left-handed UI"],
    ];
    toggles.forEach(([k, label]) => {
      const row = document.createElement("div"); row.className = "setting";
      const t = document.createElement("div"); t.className = "toggle" + (Save.setting(k) ? " on" : "");
      t.onclick = () => { const nv = !Save.setting(k); Save.setSetting(k, nv); t.classList.toggle("on", nv); Sfx.click(); applyBodyFlags(); };
      row.innerHTML = `<span class="lbl">${label}</span>`; row.appendChild(t); body.appendChild(row);
    });
    // control scheme
    const cs = document.createElement("div"); cs.className = "setting";
    cs.innerHTML = `<span class="lbl">Controls</span>`;
    const seg = document.createElement("div"); seg.className = "seg";
    [["drag", "Drag"], ["buttons", "Buttons"], ["tilt", "Tilt"]].forEach(([id, label]) => {
      const b = document.createElement("button"); b.textContent = label; b.className = Save.setting("control") === id ? "active" : "";
      b.onclick = () => { Save.setSetting("control", id); Sfx.click(); render(); if (id === "tilt") Input.applyScheme(); };
      seg.appendChild(b);
    });
    cs.appendChild(seg); body.appendChild(cs);

    const wipe = document.createElement("button"); wipe.className = "btn danger"; wipe.style.marginTop = "18px"; wipe.textContent = "RESET ALL DATA";
    wipe.onclick = () => { if (confirm("Erase ALL progress, cats and stats? This cannot be undone.")) { Save.wipe(); Sfx.deny(); applyBodyFlags(); showMenu(); } };
    body.appendChild(wipe);
    const ver = document.createElement("div"); ver.style.cssText = "text-align:center;opacity:.5;font-size:12px;margin-top:14px"; ver.textContent = "Nine Lives · a Gamistan game";
    body.appendChild(ver);
  }

  function applyBodyFlags() {
    document.body.classList.toggle("contrast", !!Save.setting("contrast"));
    document.body.classList.toggle("lefthand", !!Save.setting("leftHanded"));
  }

  // ----------------------------------------------------------- game over ----
  function gameOver(s) {
    hideAll();
    $("go-title").textContent = s.isBest ? "NEW RECORD!" : (s.fullRun ? "ALL NINE SPENT" : "OUT OF LIVES");
    $("go-height").textContent = s.metres; $("go-fish").textContent = s.fish; $("go-best").textContent = s.best;
    $("go-newbest").classList.toggle("hidden", !s.isBest);
    const chips = [];
    if (s.run.bestCombo > 1) chips.push("×" + s.run.bestCombo + " combo");
    if (s.run.golden) chips.push(s.run.golden + " golden 🐟");
    if (s.run.bosses) chips.push(s.run.bosses + " guardian" + (s.run.bosses > 1 ? "s" : ""));
    if (s.run.powerups) chips.push(s.run.powerups + " power-ups");
    if (s.daily) chips.unshift(s.dailyBest ? "🗓 daily best!" : "🗓 daily");
    $("go-run").innerHTML = chips.map((c) => `<span class="chip">${c}</span>`).join("");
    $("gameover").classList.remove("hidden");
  }

  // -------------------------------------------------------------- wire ----
  function wire() {
    $("btn-play").onclick = () => startGame(false);
    $("btn-daily").onclick = () => startGame(true);
    document.querySelectorAll(".nav-btn").forEach((b) => b.onclick = () => openPanel(b.dataset.panel));
    $("panel-back").onclick = () => { Sfx.click(); showMenu(); };
    $("btn-howto").onclick = () => { click(); hideAll(); $("howto").classList.remove("hidden"); };
    $("btn-howto-back").onclick = () => { click(); showMenu(); };

    $("btn-pause").onclick = () => { Sfx.click(); Game.pause(); };
    $("btn-resume").onclick = () => { Sfx.click(); $("pause").classList.add("hidden"); Game.resume(); };
    $("btn-pause-restart").onclick = () => { Sfx.click(); $("pause").classList.add("hidden"); Game.quit(); startGame(lastMode.daily); };
    $("btn-pause-home").onclick = () => { Sfx.click(); $("pause").classList.add("hidden"); Game.quit(); showMenu(); };

    $("btn-retry").onclick = () => startGame(lastMode.daily);
    $("btn-go-shop").onclick = () => { shopTab = "cats"; openPanel("shop"); };
    $("btn-go-home").onclick = () => { Sfx.click(); showMenu(); };

    Bus.on("game:pause", () => $("pause").classList.remove("hidden"));
    Bus.on("game:over", gameOver);
    Bus.on("fish:changed", () => { refreshMenu(); if (!$("panel").classList.contains("hidden")) $("panel-fish").textContent = "🐟 " + Util.commas(Save.fish()); });
  }

  function init() { applyBodyFlags(); wire(); showMenu(); }

  global.Menu = { init, showMenu, tickPreview, open: openPanel };
})(window);
