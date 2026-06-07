// game.js — the orchestrator: player, camera, collisions, power-ups,
// boss gauntlets, biome transitions, the nine-lives ghost mechanic,
// daily mode, and revive. Emits Bus events for the UI/HUD to render.
(function (global) {
  const STEP = 1 / 60;
  const MAX_LIVES = 9;
  const CAT_PX = 46;
  const METRE = 10;

  const G = {
    canvas: null, ctx: null, W: 0, H: 0, dpr: 1,
    running: false, paused: false, last: 0, t: 0,
    state: "idle", stateTimer: 0,
    seed: 0, daily: false, world: null,
    cat: null, load: null, catDef: null, hatDef: null, trailDef: null,
    up: {}, // upgrade levels resolved at start
    input: { left: false, right: false, pointerX: null, tilt: 0 },
    lives: 0, lifeIndex: 0, lifeTime: 0,
    path: null, ghosts: [],
    fish: 0, collected: null, puCollected: null,
    combo: 0, comboTimer: 0,
    maxHeight: 0, lifeHeight: 0,
    effects: null, shieldFlash: 0,
    biomeIndex: -1, beatenBosses: null, bossActive: false,
    run: null, shake: 0, revived: false, timeScale: 1,
    flash: 0, flashColor: "#fff",
  };

  // -------------------------------------------------------------- setup ----
  function init(canvas) {
    G.canvas = canvas; G.ctx = canvas.getContext("2d");
    resize(); global.addEventListener("resize", resize);
  }
  function resize() {
    G.dpr = Math.min(global.devicePixelRatio || 1, 2);
    G.W = G.canvas.clientWidth; G.H = G.canvas.clientHeight;
    G.canvas.width = Math.floor(G.W * G.dpr); G.canvas.height = Math.floor(G.H * G.dpr);
    G.ctx.setTransform(G.dpr, 0, 0, G.dpr, 0, 0);
  }

  function colGeom() { const m = G.W * 0.08; return { x0: m, w: G.W - m * 2 }; }
  function nx2px(nx) { const c = colGeom(); return c.x0 + nx * c.w; }
  function catRadiusNx() { return (CAT_PX * 0.5) / colGeom().w; }
  function anchorY() { return G.H * 0.72; }
  function wy2sy(wy) { return anchorY() - (wy - G.cat.y); }
  function reduced() { return Save.setting("reducedMotion"); }
  function haptic(ms) { if (Save.setting("haptics") && navigator.vibrate) try { navigator.vibrate(ms); } catch (e) {} }

  // ------------------------------------------------------------- start ----
  function resolveUpgrades() {
    G.up = {};
    for (const u of Data.UPGRADES) G.up[u.id] = Save.upgradeLevel(u.id);
  }

  function start(opts) {
    opts = opts || {};
    G.daily = !!opts.daily;
    G.load = Save.loadout();
    G.catDef = Data.cat(G.load.cat);
    G.hatDef = Data.hat(G.load.hat);
    G.trailDef = Data.trail(G.load.trail);
    resolveUpgrades();
    G.seed = G.daily ? Util.dateSeed("daily-" + Util.todayKey()) : randomSeed();
    G.world = new World(G.seed, { luck: G.up.luck * 0.1, startBoost: G.up.headstart * 60 });
    G.lives = MAX_LIVES; G.lifeIndex = 0; G.ghosts = [];
    G.fish = 0; G.maxHeight = 0; G.revived = false;
    G.beatenBosses = {}; G.biomeIndex = -1;
    G.run = { fish: 0, golden: 0, powerups: 0, bosses: 0, ghostsDodged: 0, bestCombo: 0, biomes: {} };
    Particles.reset();
    beginLife(true);
    G.running = true; G.paused = false; G.state = "playing"; G.last = performance.now();
    Sfx.startMusic();
    Bus.emit("game:start", { daily: G.daily });
    requestAnimationFrame(loop);
  }
  function startDaily() { start({ daily: true }); }

  function beginLife(first) {
    G.lifeIndex++; G.lifeTime = 0; G.lifeHeight = 0;
    G.collected = {}; G.puCollected = {};
    G.combo = 0; G.comboTimer = 0; G.timeScale = 1;
    G.path = { xs: [], ys: [] };
    const startWy = G.world.mToWy(G.up.headstart * 60);
    G.cat = { x: 0.5, y: startWy, vx: 0, sx: 1, sy: 1, tail: 0, blink: 0, blinkT: 0, mood: 0, baseY: startWy };
    G.effects = { shield: false, magnet: 0, slow: 0, boost: 0, frenzy: 0, double: 0, freeze: 0 };
    // lucky charm: chance to start shielded
    if (Math.random() < G.up.shieldstart * 0.08) { G.effects.shield = true; }
    G.recAcc = 0;
    G.state = "playing";
    Bus.emit("lives:update", { lives: G.lives, life: G.lifeIndex });
    if (!first) Bus.emit("life:begin", { lives: G.lives });
  }

  function loseLife() {
    Sfx.die(); haptic([0, 40, 30, 60]);
    if (!reduced()) G.shake = 18;
    Particles.poof(nx2px(G.cat.x), wy2sy(G.cat.y), G.catDef.fur);
    if (G.lifeHeight > G.maxHeight) G.maxHeight = G.lifeHeight;
    Save.bumpStat("deaths");
    G.ghosts.push({ xs: G.path.xs, ys: G.path.ys, len: G.path.xs.length, life: G.lifeIndex, _passed: false });
    G.lives--;
    G.state = "dying"; G.stateTimer = 0.7;
  }

  function afterDeath() {
    if (G.lives <= 0) {
      if (G.up.revive >= 1 && !G.revived) {
        G.revived = true; G.lives = 3;
        Save.bumpStat("revives");
        Sfx.revive(); Bus.emit("revive", {});
        beginLife();
      } else {
        gameOver();
      }
    } else {
      Sfx.lifeLost();
      Bus.emit("life:lost", { lives: G.lives });
      beginLife();
    }
  }

  function gameOver() {
    G.running = false; G.state = "gameover"; Sfx.stopMusic();
    const metres = Math.floor(G.maxHeight / METRE);
    // commit economy + stats + missions
    Save.addFish(G.fish);
    Save.bumpStat("games");
    Save.bumpStat("totalDistance", metres);
    Save.maxStat("bestLife", metres);
    Save.maxStat("bestCombo", G.run.bestCombo);
    Save.bumpStat("bosses", G.run.bosses);
    Save.bumpStat("powerups", G.run.powerups);
    Save.bumpStat("ghostsDodged", G.run.ghostsDodged);
    Save.bumpStat("goldenFish", G.run.golden);
    if (G.lifeIndex >= MAX_LIVES) Save.bumpStat("fullRuns");
    // missions
    Save.missionProgress("fish", G.run.fish);
    Save.missionProgress("height", metres, "max");
    Save.missionProgress("combo", G.run.bestCombo, "max");
    Save.missionProgress("powerups", G.run.powerups);
    Save.missionProgress("bosses", G.run.bosses);
    Save.missionProgress("golden", G.run.golden);
    Save.missionProgress("ghosts", G.run.ghostsDodged);
    Save.missionProgress("games", 1);

    let isBest = Save.recordBest(metres);
    let dailyBest = false;
    if (G.daily) dailyBest = Save.recordDaily(metres);
    if (G.lifeIndex >= MAX_LIVES && isBest) Sfx.win();
    Bus.emit("game:over", { metres, fish: G.fish, best: Save.best(), isBest, daily: G.daily, dailyBest, run: G.run, fullRun: G.lifeIndex >= MAX_LIVES });
  }

  function pause() { if (G.state === "playing") { G.paused = true; Sfx.stopMusic(); Bus.emit("game:pause"); } }
  function resume() { if (G.paused) { G.paused = false; G.last = performance.now(); Sfx.startMusic(); Bus.emit("game:resume"); requestAnimationFrame(loop); } }
  function quit() { G.running = false; G.paused = false; G.state = "idle"; Sfx.stopMusic(); }

  // -------------------------------------------------------------- loop ----
  function loop(now) {
    if (!G.running || G.paused) return;
    let dt = (now - G.last) / 1000; G.last = now;
    if (dt > 0.05) dt = 0.05;
    G.t += dt;
    update(dt);
    render();
    requestAnimationFrame(loop);
  }

  function update(dt) {
    if (G.state === "dying") {
      G.stateTimer -= dt; Particles.update(dt);
      G.shake *= 0.85; if (G.stateTimer <= 0) afterDeath();
      return;
    }
    if (G.state !== "playing") return;

    const cat = G.cat;
    updateEffects(dt);
    const sdt = dt * G.timeScale;
    G.lifeTime += sdt;

    // climb
    let vy = G.world.speedAt(cat.y);
    if (G.effects.slow > 0) vy *= 0.5;
    if (G.effects.boost > 0) vy *= 2.0;
    cat.y += vy * sdt;
    if (cat.y > G.lifeHeight) G.lifeHeight = cat.y;

    steer(cat, dt);
    juice(cat, dt);

    // record path (real time so ghosts replay at consistent cadence)
    G.recAcc += sdt;
    while (G.recAcc >= STEP) { G.recAcc -= STEP; G.path.xs.push(cat.x); G.path.ys.push(cat.y); }

    if (G.comboTimer > 0) { G.comboTimer -= dt; if (G.comboTimer <= 0) { G.combo = 0; Bus.emit("combo", 0); } }

    updateBiome();
    updateBoss();
    checkWalls();
    checkFish();
    checkPowerups();
    checkGhosts();

    Particles.trail(nx2px(cat.x), wy2sy(cat.y) + CAT_PX * 0.3, G.trailDef, dt, G.t);
    Particles.update(dt);
    if (G.shake > 0.2) G.shake *= 0.9; else G.shake = 0;
    if (G.flash > 0) G.flash -= dt * 2;

    Bus.emit("hud:update", {
      metres: Math.floor(cat.y / METRE), fish: G.fish, lives: G.lives,
      effects: G.effects, biome: G.world.biomeAtWy(cat.y).def.name,
    });
  }

  function steer(cat, dt) {
    const scheme = Save.setting("control");
    let dir = 0;
    if (G.input.left) dir -= 1;
    if (G.input.right) dir += 1;
    if (scheme === "tilt" && Math.abs(G.input.tilt) > 0.05) {
      cat.vx += G.input.tilt * 9 * dt;
    } else if (G.input.pointerX != null && scheme !== "buttons") {
      const target = (G.input.pointerX - colGeom().x0) / colGeom().w;
      cat.vx += (target - cat.x) * 14 * dt;
    } else {
      cat.vx += dir * 8 * dt;
    }
    cat.vx *= Math.pow(0.0008, dt);
    cat.vx = Util.clamp(cat.vx, -2.8, 2.8);
    cat.x += cat.vx * dt;
    if (cat.x < 0) { cat.x = 0; cat.vx *= -0.4; }
    if (cat.x > 1) { cat.x = 1; cat.vx *= -0.4; }
  }

  function juice(cat, dt) {
    const targetSx = 1 - Math.abs(cat.vx) * 0.06;
    cat.sx += (targetSx - cat.sx) * 0.2;
    cat.sy += (1 / cat.sx - cat.sy) * 0.2;
    cat.tail = Math.sin(G.t * 8) * 0.25 + cat.vx * 0.15;
    cat.mood = (G.comboTimer > 0 || G.effects.frenzy > 0) ? 1 : 0;
    cat.blinkT -= dt; if (cat.blinkT <= 0) { cat.blink = 1; cat.blinkT = 2 + Math.random() * 3; }
    cat.blink *= 0.6;
  }

  // -------------------------------------------------------- power-ups ----
  function updateEffects(dt) {
    const e = G.effects;
    for (const k of ["magnet", "slow", "boost", "frenzy", "double", "freeze"]) {
      if (e[k] > 0) { e[k] -= dt; if (e[k] <= 0) { e[k] = 0; Bus.emit("powerup:end", k); } }
    }
    G.timeScale = 1; // slow is applied to climb speed; ghost cadence stays real-time
    if (G.shieldFlash > 0) G.shieldFlash -= dt;
  }
  function invincible() { return G.effects.boost > 0 || G.effects.frenzy > 0; }
  function durScale() { return 1 + G.up.duration * 0.12; }

  function applyPowerup(def) {
    const e = G.effects;
    G.run.powerups++; haptic(20);
    Sfx.power(def.color);
    Bus.emit("powerup:get", def);
    const d = (def.dur || 0) * durScale();
    if (def.id === "shield") { e.shield = true; G.shieldFlash = 0.4; Sfx.shield(); }
    else if (def.id === "heart") { if (G.lives < MAX_LIVES) { G.lives++; Bus.emit("lives:update", { lives: G.lives, life: G.lifeIndex }); } Particles.confetti(nx2px(G.cat.x), wy2sy(G.cat.y)); }
    else e[def.id] = Math.max(e[def.id] || 0, d);
    Particles.ring(nx2px(G.cat.x), wy2sy(G.cat.y), def.color);
  }

  // ------------------------------------------------------------ biome ----
  function updateBiome() {
    const b = G.world.biomeAtWy(G.cat.y);
    if (b.totalIndex !== G.biomeIndex) {
      G.biomeIndex = b.totalIndex;
      Sfx.setBiomeMode(b.def.music);
      Save.seeBiome(b.def.id);
      if (!G.run.biomes[b.def.id]) { G.run.biomes[b.def.id] = true; }
      Bus.emit("biome:enter", { name: b.def.name, loop: b.loop });
    }
  }

  // ------------------------------------------------------------- boss ----
  function updateBoss() {
    const band = G.world.bossBand(G.cat.y);
    if (band.active && !G.bossActive) { G.bossActive = true; Sfx.boss(); Bus.emit("boss:start", { name: band.def.name }); }
    if (!band.active && G.bossActive) {
      // we climbed out the top → boss defeated (once per biome top)
      G.bossActive = false;
      const idx = G.biomeIndex; // already advanced
      const key = idx - 1;
      if (!G.beatenBosses[key]) {
        G.beatenBosses[key] = true; G.run.bosses++;
        Sfx.bossWin(); if (!reduced()) Particles.confetti(nx2px(G.cat.x), wy2sy(G.cat.y));
        const bonus = 25 + G.biomeIndex * 5;
        G.fish += bonus; G.run.fish += bonus;
        Particles.floatText(nx2px(G.cat.x), wy2sy(G.cat.y) - 30, "GUARDIAN DOWN +" + bonus, "#ffe066", { size: 24, life: 1.4 });
        Bus.emit("boss:win", { bonus });
      }
    }
  }
  // extra sweeping beam during boss band (mirrored second hazard)
  function bossBeamX(row) { return 1 - G.world.spikeX(row, G.lifeTime); }

  // -------------------------------------------------------- collisions ----
  function nearestRows() {
    const i0 = Math.floor((G.cat.y - World.START_SAFE) / World.ROW_SPACING) - 1;
    return [i0, i0 + 1, i0 + 2, i0 + 3];
  }

  function checkWalls() {
    if (invincible()) return;
    const cat = G.cat, rcat = catRadiusNx();
    for (const i of nearestRows()) {
      if (i < 0) continue;
      const row = G.world.rowAt(i);
      if (Math.abs(cat.y - row.y) > row.thick / 2 + 18) continue;
      const half = row.gapWidth / 2;
      const inGap = cat.x > row.gapCenter - half + rcat && cat.x < row.gapCenter + half - rcat;
      if (!inGap) return hazardHit();
      if (row.moving) { const sx = G.world.spikeX(row, G.lifeTime); if (Math.abs(cat.x - sx) < 0.05 + rcat) return hazardHit(); }
      if (row.band.active) { const bx = bossBeamX(row); if (Math.abs(cat.x - bx) < 0.05 + rcat) return hazardHit(); }
    }
  }

  function hazardHit() {
    if (G.effects.shield) {
      G.effects.shield = false; G.shieldFlash = 0.5; Sfx.hit(); haptic(30);
      Particles.ring(nx2px(G.cat.x), wy2sy(G.cat.y), "#6ce0ff");
      // brief mercy invuln via boost-free flag: nudge away from wall
      G.cat.vx *= -0.5; G.flash = 0.4; G.flashColor = "#6ce0ff";
      return;
    }
    loseLife();
  }

  function checkFish() {
    const cat = G.cat;
    let rcat = catRadiusNx() + 0.05;
    if (G.effects.magnet > 0) rcat += 0.18 * (1 + G.up.magnetism * 0.2);
    for (const i of nearestRows().concat([nearestRows()[0] - 1, nearestRows()[3] + 1])) {
      if (i < 0 || G.collected[i]) continue;
      const f = G.world.fishAt(i); if (!f) continue;
      const ry = G.effects.magnet > 0 ? 110 : 60;
      if (Math.abs(cat.y - f.y) < ry && Math.abs(cat.x - f.x) < rcat) {
        G.collected[i] = true;
        let val = f.golden ? 10 : 1;
        if (G.effects.double > 0 || G.effects.frenzy > 0) val *= 2;
        G.combo++; G.comboTimer = 2.2;
        if (G.combo > G.run.bestCombo) G.run.bestCombo = G.combo;
        const mult = Math.max(1, Math.floor(G.combo / 3) + 1);
        const gained = val * mult;
        G.fish += gained; G.run.fish += gained;
        if (f.golden) { G.run.golden++; Sfx.golden(); } else Sfx.fish();
        if (G.combo > 1 && G.combo % 3 === 0) Sfx.combo(G.combo);
        const sx = nx2px(f.x), sy = wy2sy(f.y);
        Particles.spark(sx, sy, f.golden ? "#ffe066" : "#6ce0ff");
        Particles.floatText(sx, sy - 16, "+" + gained, f.golden ? "#ffe066" : "#6ce0ff", { size: 16 + Math.min(gained, 18) });
        Bus.emit("combo", G.combo);
      }
    }
  }

  function checkPowerups() {
    const cat = G.cat, rcat = catRadiusNx() + 0.07;
    for (const i of nearestRows()) {
      if (i < 0 || G.puCollected[i]) continue;
      const p = G.world.powerupAt(i); if (!p) continue;
      if (Math.abs(cat.y - p.y) < 70 && Math.abs(cat.x - p.x) < rcat) {
        G.puCollected[i] = true; applyPowerup(p.def);
        Particles.floatText(nx2px(p.x), wy2sy(p.y) - 24, p.def.name, p.def.color, { size: 18, life: 1.2 });
      }
    }
  }

  // index into a ghost's recorded path right now (frozen ghosts hold still)
  function ghostIndexNow() {
    const idx = Math.floor(G.lifeTime / STEP);
    const frozen = G.effects.freeze > 0;
    if (frozen && G._freezeIdx == null) G._freezeIdx = idx;
    if (!frozen) G._freezeIdx = null;
    return { idx, frozen, fidx: G._freezeIdx };
  }

  function checkGhosts() {
    const cat = G.cat;
    const { idx, frozen, fidx } = ghostIndexNow();
    const rcat = CAT_PX * 0.42;
    for (const g of G.ghosts) {
      if (!frozen && idx >= g.len) { if (!g._passed) { g._passed = true; G.run.ghostsDodged++; } continue; }
      const gi = Math.min(frozen ? fidx : idx, g.len - 1);
      const gyW = g.ys[gi];
      if (Math.abs(gyW - cat.y) > 70) continue;
      if (frozen || invincible()) continue;
      const dx = nx2px(g.xs[gi]) - nx2px(cat.x), dy = cat.y - gyW;
      if (Math.hypot(dx, dy) < rcat * 1.5) {
        if (G.effects.shield) { G.effects.shield = false; G.shieldFlash = 0.5; Sfx.hit(); G.cat.vx *= -0.6; return; }
        return loseLife();
      }
    }
  }

  // ------------------------------------------------------------ render ----
  function render() {
    const ctx = G.ctx;
    ctx.save();
    if (G.shake > 0.2) ctx.translate((Math.random() - 0.5) * G.shake, (Math.random() - 0.5) * G.shake);
    drawBackground(ctx);
    drawWalls(ctx);
    drawFishLayer(ctx);
    drawPowerupLayer(ctx);
    drawBoss(ctx);
    drawGhosts(ctx);
    if (G.state !== "dying") drawCat(ctx);
    Particles.draw(ctx);
    drawFog(ctx);
    ctx.restore();
    drawFlash(ctx);
  }

  function drawBackground(ctx) {
    const b = G.world.biomeAtWy(G.cat.y).def;
    const grd = ctx.createLinearGradient(0, 0, 0, G.H);
    grd.addColorStop(0, b.bgTop); grd.addColorStop(1, b.bgBottom);
    ctx.fillStyle = grd; ctx.fillRect(0, 0, G.W, G.H);

    const camY = G.cat.y;
    for (let k = 0; k < 46; k++) {
      const d = G.world.decoAt(k + Math.floor(camY / 170 / 4) * 4);
      const par = d.kind > 0.5 ? 0.25 : 0.5;
      const sy = Util.mod(d.y - camY * par, G.H + 400) - 200;
      const sx = d.x * G.W;
      drawDeco(ctx, b.deco, sx, sy, d.scale);
    }
    const c = colGeom();
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.fillRect(0, 0, c.x0, G.H); ctx.fillRect(c.x0 + c.w, 0, c.x0, G.H);
  }

  function drawDeco(ctx, kind, x, y, s) {
    if (kind === "star" || kind === "void") { ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.fillRect(x, y, 2.4 * s, 2.4 * s); }
    else if (kind === "cloud") { ctx.fillStyle = "rgba(255,255,255,0.10)"; ctx.beginPath(); ctx.ellipse(x, y, 60 * s, 24 * s, 0, 0, 6.28); ctx.fill(); }
    else if (kind === "bubble") { ctx.strokeStyle = "rgba(255,255,255,0.12)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 10 * s, 0, 6.28); ctx.stroke(); }
    else if (kind === "candy") { ctx.fillStyle = "rgba(255,255,255,0.12)"; ctx.beginPath(); ctx.arc(x, y, 8 * s, 0, 6.28); ctx.fill(); }
    else if (kind === "ember") { ctx.fillStyle = "rgba(255,140,60,0.25)"; ctx.beginPath(); ctx.arc(x, y, 3 * s, 0, 6.28); ctx.fill(); }
    else if (kind === "grid") { ctx.strokeStyle = "rgba(90,209,255,0.08)"; ctx.lineWidth = 1; ctx.strokeRect(x, y, 40 * s, 40 * s); }
    else { ctx.fillStyle = "rgba(255,255,255,0.08)"; ctx.fillRect(x, y, 3 * s, 3 * s); }
  }

  function drawWalls(ctx) {
    const c = colGeom();
    const i0 = Math.floor((G.cat.y - World.START_SAFE) / World.ROW_SPACING) - 2;
    for (let i = i0; i < i0 + 9; i++) {
      if (i < 0) continue;
      const row = G.world.rowAt(i);
      const sy = wy2sy(row.y);
      if (sy < -40 || sy > G.H + 40) continue;
      const half = row.gapWidth / 2;
      const gl = nx2px(row.gapCenter - half), gr = nx2px(row.gapCenter + half);
      ctx.fillStyle = row.biome.wall;
      rr(ctx, c.x0, sy - row.thick / 2, gl - c.x0, row.thick, 8);
      rr(ctx, gr, sy - row.thick / 2, c.x0 + c.w - gr, row.thick, 8);
      ctx.fillStyle = row.biome.spike;
      spikes(ctx, c.x0, gl, sy + row.thick / 2);
      spikes(ctx, gr, c.x0 + c.w, sy + row.thick / 2);
      if (row.moving) Sprites.drawHazard(ctx, nx2px(G.world.spikeX(row, G.lifeTime)), sy, row.kind, row.biome.accent, G.t);
      if (row.band.active) Sprites.drawHazard(ctx, nx2px(bossBeamX(row)), sy, "laser", "#ff3c6e", G.t);
    }
  }

  function drawFishLayer(ctx) {
    const i0 = Math.floor((G.cat.y - World.START_SAFE) / World.ROW_SPACING) - 2;
    for (let i = i0; i < i0 + 9; i++) {
      if (i < 0 || G.collected[i]) continue;
      const f = G.world.fishAt(i); if (!f) continue;
      const sy = wy2sy(f.y) + Math.sin(G.t * 3 + i) * 5;
      if (sy < -30 || sy > G.H + 30) continue;
      Sprites.drawFish(ctx, nx2px(f.x), sy, f.golden, G.t);
    }
  }

  function drawPowerupLayer(ctx) {
    const i0 = Math.floor((G.cat.y - World.START_SAFE) / World.ROW_SPACING) - 2;
    for (let i = i0; i < i0 + 9; i++) {
      if (i < 0 || G.puCollected[i]) continue;
      const p = G.world.powerupAt(i); if (!p) continue;
      const sy = wy2sy(p.y) + Math.sin(G.t * 2 + i) * 4;
      if (sy < -30 || sy > G.H + 30) continue;
      Sprites.drawPowerup(ctx, nx2px(p.x), sy, p.def, G.t);
    }
  }

  function drawBoss(ctx) {
    const band = G.world.bossBand(G.cat.y);
    if (!band.active) return;
    const b = band.def;
    const x = G.W / 2 + Math.sin(G.t * 1.5) * G.W * 0.12;
    const y = wy2sy(G.cat.y) - G.H * 0.55;
    Sprites.drawBoss(ctx, x, y, Math.min(G.W * 0.5, 220), b.spike, G.t, false);
    // band progress bar
    ctx.fillStyle = "rgba(0,0,0,0.4)"; ctx.fillRect(G.W * 0.2, 92, G.W * 0.6, 8);
    ctx.fillStyle = "#ff3c6e"; ctx.fillRect(G.W * 0.2, 92, G.W * 0.6 * band.progress, 8);
  }

  function drawGhosts(ctx) {
    const idx = Math.floor(G.lifeTime / STEP);
    const frozen = G.effects.freeze > 0;
    for (const g of G.ghosts) {
      if (!frozen && idx >= g.len) continue;
      const gi = Math.min(frozen && G._freezeIdx != null ? G._freezeIdx : idx, g.len - 1);
      const gx = nx2px(g.xs[gi]), gy = wy2sy(g.ys[gi]);
      if (gy < -60 || gy > G.H + 60) continue;
      ctx.save(); ctx.translate(gx, gy);
      Sprites.drawCat(ctx, G.catDef, CAT_PX, { ghost: true, alpha: frozen ? 0.6 : 0.36, ghostIndex: g.life, tail: Math.sin(G.t * 6 + g.life) * 0.2, t: G.t });
      if (frozen) { ctx.fillStyle = "rgba(160,210,255,0.4)"; ctx.beginPath(); ctx.arc(0, 0, CAT_PX * 0.6, 0, 6.28); ctx.fill(); }
      ctx.restore();
    }
  }

  function drawCat(ctx) {
    const cat = G.cat;
    const sx = nx2px(cat.x), sy = anchorY();
    ctx.save(); ctx.translate(sx, sy); ctx.rotate(cat.vx * 0.12);
    let glow = null;
    if (G.effects.frenzy > 0) glow = "#7cf29c";
    else if (G.effects.boost > 0) glow = "#ffd23c";
    Sprites.drawCat(ctx, G.catDef, CAT_PX, { sx: cat.sx, sy: cat.sy, tail: cat.tail, blink: cat.blink, mood: cat.mood, hat: G.hatDef, glow, t: G.t });
    ctx.restore();
    // shield ring
    if (G.effects.shield || G.shieldFlash > 0) {
      ctx.save(); ctx.translate(sx, sy);
      ctx.strokeStyle = Util.rgba("#6ce0ff", G.effects.shield ? 0.7 : Math.max(0, G.shieldFlash));
      ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, CAT_PX * 0.75 + Math.sin(G.t * 6) * 2, 0, 6.28); ctx.stroke();
      ctx.restore();
    }
    // magnet aura
    if (G.effects.magnet > 0) { ctx.save(); ctx.translate(sx, sy); ctx.strokeStyle = Util.rgba("#ff77c8", 0.25); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, CAT_PX * 1.6, 0, 6.28); ctx.stroke(); ctx.restore(); }
  }

  function drawFog(ctx) {
    const b = G.world.biomeAtWy(G.cat.y).def;
    const g = ctx.createRadialGradient(G.W / 2, G.H / 2, G.H * 0.3, G.W / 2, G.H / 2, G.H * 0.75);
    g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, Util.rgba(b.fog, 0.5));
    ctx.fillStyle = g; ctx.fillRect(0, 0, G.W, G.H);
  }

  function drawFlash(ctx) {
    if (G.flash <= 0) return;
    ctx.fillStyle = Util.rgba(G.flashColor, G.flash * 0.4);
    ctx.fillRect(0, 0, G.W, G.H);
  }

  // helpers
  function rr(ctx, x, y, w, h, r) {
    if (w < 0) { x += w; w = -w; } if (w < 0.5) return;
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath(); ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); ctx.fill();
  }
  function spikes(ctx, x0, x1, baseY) {
    const n = Math.max(1, Math.floor((x1 - x0) / 18)), w = (x1 - x0) / n;
    ctx.beginPath();
    for (let k = 0; k < n; k++) { ctx.moveTo(x0 + k * w, baseY); ctx.lineTo(x0 + k * w + w / 2, baseY + 10); ctx.lineTo(x0 + (k + 1) * w, baseY); }
    ctx.fill();
  }

  global.Game = {
    init, start, startDaily, pause, resume, quit,
    setLeft: (v) => { G.input.left = v; }, setRight: (v) => { G.input.right = v; },
    setPointer: (x) => { G.input.pointerX = x; }, setTilt: (v) => { G.input.tilt = v; },
    isPlaying: () => G.running, isPaused: () => G.paused, getState: () => G.state,
  };
})(window);
