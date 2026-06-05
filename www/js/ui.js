// ui.js — screens, HUD, cat shop, and input wiring.
(function (global) {
  const $ = (id) => document.getElementById(id);
  let comboTimer = null;

  function show(id) { $(id).classList.remove("hidden"); }
  function hide(id) { $(id).classList.add("hidden"); }

  function screen(name) {
    ["menu", "howto", "cats", "gameover"].forEach(s => hide(s));
    if (name) show(name);
  }

  // ---------- HUD ----------
  function hud(metres, fish) {
    $("hud-height").textContent = metres + " m";
    $("hud-fish").textContent = "🐟 " + fish;
  }

  function updateLives(total, current) {
    const el = $("hud-lives");
    el.innerHTML = "";
    for (let i = 0; i < 9; i++) {
      const s = document.createElement("span");
      s.className = "life" + (i >= total ? " lost" : "");
      s.textContent = "🐱";
      el.appendChild(s);
    }
  }

  function lifeBanner(left) {
    const b = $("life-banner");
    b.textContent = left === 1 ? "LAST LIFE!" : left + " LIVES LEFT";
    b.classList.remove("hidden");
    void b.offsetWidth; // restart animation
    b.style.animation = "none"; void b.offsetWidth; b.style.animation = "";
    setTimeout(() => b.classList.add("hidden"), 1100);
  }

  function combo(n) {
    const el = $("hud-combo");
    if (n < 2) { el.classList.add("hidden"); return; }
    el.textContent = "COMBO ×" + n + "!";
    el.classList.remove("hidden");
    el.style.transform = "translateX(-50%) scale(1.3)";
    clearTimeout(comboTimer);
    requestAnimationFrame(() => { el.style.transition = "transform .15s"; el.style.transform = "translateX(-50%) scale(1)"; });
    comboTimer = setTimeout(() => el.classList.add("hidden"), 1500);
  }

  // ---------- game over ----------
  function gameOver(metres, fish, best, isBest) {
    hide("hud"); hide("touch-hint");
    $("go-height").textContent = metres;
    $("go-fish").textContent = fish;
    $("go-best").textContent = best;
    $("go-newbest").classList.toggle("hidden", !isBest);
    $("go-title").textContent = isBest ? "NEW RECORD!" : "OUT OF LIVES";
    screen("gameover");
    refreshMenuStats();
  }

  // ---------- menu / shop ----------
  function refreshMenuStats() {
    $("menu-best").textContent = "Best: " + Save.get("best") + " m";
    $("menu-coins").textContent = "🐟 " + Save.get("fish");
    $("btn-sound").textContent = Sfx.isEnabled() ? "🔊" : "🔇";
    drawPreview();
  }

  function drawPreview() {
    const cv = $("preview-canvas");
    const ctx = cv.getContext("2d");
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.save(); ctx.translate(cv.width / 2, cv.height / 2 + 6);
    const wob = Math.sin(Date.now() / 400) * 0.05;
    Sprites.drawCat(ctx, Sprites.byId(Save.get("selectedCat")), 150, { mood: 1, tail: Math.sin(Date.now() / 300) * 0.3, sx: 1 + wob, sy: 1 - wob });
    ctx.restore();
  }

  function buildCatGrid() {
    const grid = $("cat-grid");
    grid.innerHTML = "";
    Sprites.CATS.forEach(cat => {
      const owned = Save.isUnlocked(cat.id);
      const selected = Save.get("selectedCat") === cat.id;
      const card = document.createElement("div");
      card.className = "cat-card" + (selected ? " selected" : "") + (owned ? "" : " locked");
      const cv = document.createElement("canvas"); cv.width = 120; cv.height = 120;
      const cx = cv.getContext("2d");
      cx.translate(60, 64);
      Sprites.drawCat(cx, cat, 96, { mood: 1, tail: 0.2 });
      card.appendChild(cv);
      const name = document.createElement("div"); name.className = "name"; name.textContent = cat.name;
      card.appendChild(name);
      const tag = document.createElement("div");
      if (owned) { tag.className = "owned"; tag.textContent = selected ? "SELECTED" : "TAP"; }
      else { tag.className = "cost"; tag.textContent = "🐟 " + cat.cost; }
      card.appendChild(tag);
      card.addEventListener("click", () => onCatTap(cat));
      grid.appendChild(card);
    });
  }

  function onCatTap(cat) {
    Sfx.click();
    if (Save.isUnlocked(cat.id)) {
      Save.set("selectedCat", cat.id);
    } else if (Save.spendFish(cat.cost)) {
      Save.unlock(cat.id);
      Save.set("selectedCat", cat.id);
      Sfx.win();
    } else {
      // not enough fish — shake the card
      buildCatGrid();
      const cards = document.querySelectorAll(".cat-card");
      const idx = Sprites.CATS.indexOf(cat);
      if (cards[idx]) { cards[idx].animate([{transform:"translateX(-6px)"},{transform:"translateX(6px)"},{transform:"translateX(0)"}], {duration:200}); }
      return;
    }
    buildCatGrid();
    refreshMenuStats();
  }

  // ---------- input ----------
  function wireInput() {
    // keyboard
    global.addEventListener("keydown", e => {
      if (e.repeat) return;
      if (e.key === "ArrowLeft" || e.key === "a") Game.setLeft(true);
      if (e.key === "ArrowRight" || e.key === "d") Game.setRight(true);
    });
    global.addEventListener("keyup", e => {
      if (e.key === "ArrowLeft" || e.key === "a") Game.setLeft(false);
      if (e.key === "ArrowRight" || e.key === "d") Game.setRight(false);
    });

    // touch / pointer: drag to position, or tap a side to steer
    const cv = $("game");
    let active = false;
    function setFromEvent(clientX) { Game.setPointer(clientX); }
    cv.addEventListener("pointerdown", e => {
      if (!Game.isPlaying()) return;
      active = true; hide("touch-hint"); setFromEvent(e.clientX); cv.setPointerCapture(e.pointerId);
    });
    cv.addEventListener("pointermove", e => { if (active) setFromEvent(e.clientX); });
    const release = () => { active = false; Game.setPointer(null); };
    cv.addEventListener("pointerup", release);
    cv.addEventListener("pointercancel", release);
  }

  // ---------- buttons ----------
  function startGame() {
    Sfx.unlock(); Sfx.click();
    screen(null);
    show("hud"); show("touch-hint");
    updateLives(9, 1);
    Game.start(Save.get("selectedCat"));
  }

  function wireButtons() {
    $("btn-play").addEventListener("click", startGame);
    $("btn-retry").addEventListener("click", () => { Sfx.click(); screen(null); show("hud"); show("touch-hint"); Game.start(Save.get("selectedCat")); });
    $("btn-home").addEventListener("click", () => { Sfx.click(); Game.quit(); screen("menu"); refreshMenuStats(); });
    $("btn-howto").addEventListener("click", () => { Sfx.click(); screen("howto"); });
    $("btn-howto-back").addEventListener("click", () => { Sfx.click(); screen("menu"); });
    $("btn-cats").addEventListener("click", () => { Sfx.click(); buildCatGrid(); screen("cats"); });
    $("btn-cats-back").addEventListener("click", () => { Sfx.click(); screen("menu"); refreshMenuStats(); });
    $("btn-sound").addEventListener("click", () => {
      Sfx.unlock(); Sfx.setEnabled(!Sfx.isEnabled()); refreshMenuStats(); Sfx.click();
    });
  }

  global.UI = {
    hud: hud, updateLives: updateLives, lifeBanner: lifeBanner, combo: combo, gameOver: gameOver,
    init: function () {
      wireButtons(); wireInput(); refreshMenuStats(); screen("menu");
      // animate menu preview
      setInterval(() => { if (!Game.isPlaying() && !$("menu").classList.contains("hidden")) drawPreview(); }, 60);
    },
  };
})(window);
