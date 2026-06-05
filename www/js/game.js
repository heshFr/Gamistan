// game.js — the engine. Endless climb, deterministic course, and the
// signature mechanic: every life you lose replays as a deadly ghost-cat.
(function (global) {
  const STEP = 1 / 60;          // fixed sample step for ghost recording/replay
  const MAX_LIVES = 9;
  const CAT_PX = 46;            // cat draw radius-ish in px
  const METRE = 10;             // world units per displayed metre

  const G = {
    canvas: null, ctx: null, W: 0, H: 0, dpr: 1,
    running: false, last: 0, acc: 0, recAcc: 0,
    state: "idle",
    seed: 0, world: null, cat: null,
    catDef: null,
    input: { left: false, right: false, pointerX: null },
    lives: 0, lifeIndex: 0, lifeTime: 0,
    path: null,          // current life recording: {xs:[], ys:[]}
    ghosts: [],          // [{xs, ys, len, life}]
    fish: 0, collected: null,
    combo: 0, comboTimer: 0,
    maxHeight: 0, lifeHeight: 0,
    particles: [], shake: 0,
    stateTimer: 0,
    t: 0,
  };

  // ---------- setup ----------
  function init(canvas) {
    G.canvas = canvas;
    G.ctx = canvas.getContext("2d");
    resize();
    global.addEventListener("resize", resize);
  }

  function resize() {
    G.dpr = Math.min(global.devicePixelRatio || 1, 2);
    G.W = G.canvas.clientWidth;
    G.H = G.canvas.clientHeight;
    G.canvas.width = Math.floor(G.W * G.dpr);
    G.canvas.height = Math.floor(G.H * G.dpr);
    G.ctx.setTransform(G.dpr, 0, 0, G.dpr, 0, 0);
  }

  // playable column geometry
  function colGeom() {
    const margin = G.W * 0.08;
    return { x0: margin, w: G.W - margin * 2 };
  }
  function nx2px(nx) { const c = colGeom(); return c.x0 + nx * c.w; }
  function catRadiusNx() { const c = colGeom(); return (CAT_PX * 0.5) / c.w; }

  // world height → screen y (cat anchored at 70% down)
  function anchorY() { return G.H * 0.72; }
  function wy2sy(wy) { return anchorY() - (wy - G.cat.y); }

  // ---------- game flow ----------
  function start(catId) {
    G.catDef = Sprites.byId(catId);
    G.seed = randomSeed();
    G.world = new World(G.seed);
    G.lives = MAX_LIVES;
    G.lifeIndex = 0;
    G.ghosts = [];
    G.fish = 0;
    G.maxHeight = 0;
    beginLife();
    G.running = true;
    G.state = "playing";
    G.last = performance.now();
    Sfx.startMusic();
    requestAnimationFrame(loop);
  }

  function beginLife() {
    G.lifeIndex++;
    G.lifeTime = 0;
    G.recAcc = 0;
    G.lifeHeight = 0;
    G.collected = {};
    G.combo = 0; G.comboTimer = 0;
    G.path = { xs: [], ys: [] };
    G.cat = { x: 0.5, y: 0, vx: 0, sx: 1, sy: 1, tail: 0, blink: 0, blinkT: 0, mood: 0 };
    G.particles.length = 0;
    G.state = "playing";
    global.UI && UI.updateLives(G.lives, G.lifeIndex);
  }

  function loseLife() {
    Sfx.die();
    G.shake = 18;
    poof(nx2px(G.cat.x), wy2sy(G.cat.y), G.catDef.fur);
    // bank this life's reached height
    if (G.lifeHeight > G.maxHeight) G.maxHeight = G.lifeHeight;
    // store the run as a ghost for subsequent lives
    G.ghosts.push({ xs: G.path.xs, ys: G.path.ys, len: G.path.xs.length, life: G.lifeIndex });
    G.lives--;
    G.state = "dying";
    G.stateTimer = 0.7;
  }

  function afterDeath() {
    if (G.lives <= 0) {
      gameOver();
    } else {
      Sfx.lifeLost();
      global.UI && UI.lifeBanner(G.lives);
      beginLife();
    }
  }

  function gameOver() {
    G.running = false;
    G.state = "gameover";
    Sfx.stopMusic();
    const metres = Math.floor(G.maxHeight / METRE);
    Save.addFish(G.fish);
    Save.set("plays", (Save.get("plays") || 0) + 1);
    const isBest = Save.recordBest(metres);
    if (G.lifeIndex >= MAX_LIVES && isBest) Sfx.win();
    global.UI && UI.gameOver(metres, G.fish, Save.get("best"), isBest);
  }

  function quit() { G.running = false; G.state = "idle"; Sfx.stopMusic(); }

  // ---------- loop ----------
  function loop(now) {
    if (!G.running) return;
    let dt = (now - G.last) / 1000;
    G.last = now;
    if (dt > 0.05) dt = 0.05; // clamp after tab stalls
    G.t += dt;
    update(dt);
    render();
    requestAnimationFrame(loop);
  }

  function update(dt) {
    if (G.state === "dying") {
      G.stateTimer -= dt;
      stepParticles(dt);
      G.shake *= 0.85;
      if (G.stateTimer <= 0) afterDeath();
      return;
    }
    if (G.state !== "playing") return;

    G.lifeTime += dt;
    const cat = G.cat;

    // vertical climb (deterministic so ghosts align)
    const vy = G.world.speedAt(cat.y);
    cat.y += vy * dt;
    if (cat.y > G.lifeHeight) G.lifeHeight = cat.y;

    // horizontal steering with momentum
    let dir = 0;
    if (G.input.left) dir -= 1;
    if (G.input.right) dir += 1;
    if (G.input.pointerX != null) {
      const target = (G.input.pointerX - colGeom().x0) / colGeom().w;
      const d = target - cat.x;
      cat.vx += d * 14 * dt;
    } else {
      cat.vx += dir * 7.5 * dt;
    }
    cat.vx *= Math.pow(0.0008, dt); // friction
    cat.vx = Math.max(-2.6, Math.min(2.6, cat.vx));
    cat.x += cat.vx * dt;
    // soft walls
    if (cat.x < 0) { cat.x = 0; cat.vx *= -0.4; }
    if (cat.x > 1) { cat.x = 1; cat.vx *= -0.4; }

    // squash/stretch + tail + blink juice
    const targetSx = 1 - Math.abs(cat.vx) * 0.06;
    cat.sx += (targetSx - cat.sx) * 0.2;
    cat.sy += (1 / cat.sx - cat.sy) * 0.2;
    cat.tail = Math.sin(G.t * 8) * 0.25 + cat.vx * 0.15;
    cat.mood = G.comboTimer > 0 ? 1 : 0;
    cat.blinkT -= dt;
    if (cat.blinkT <= 0) { cat.blink = 1; cat.blinkT = 2 + Math.random() * 3; }
    cat.blink *= 0.6;

    // record path for future ghosts
    G.recAcc += dt;
    while (G.recAcc >= STEP) {
      G.recAcc -= STEP;
      G.path.xs.push(cat.x);
      G.path.ys.push(cat.y);
    }

    if (G.comboTimer > 0) { G.comboTimer -= dt; if (G.comboTimer <= 0) { G.combo = 0; UI && UI.combo(0); } }

    checkWalls();
    checkFish();
    checkGhosts();
    stepParticles(dt);
    if (G.shake > 0.2) G.shake *= 0.9; else G.shake = 0;

    global.UI && UI.hud(Math.floor(cat.y / METRE), G.fish);
  }

  // ---------- collisions ----------
  function nearestRows() {
    const i0 = Math.floor((G.cat.y - World.START_SAFE) / World.ROW_SPACING) - 1;
    return [i0, i0 + 1, i0 + 2, i0 + 3];
  }

  function checkWalls() {
    const cat = G.cat;
    const rcat = catRadiusNx();
    for (const i of nearestRows()) {
      if (i < 0) continue;
      const row = G.world.rowAt(i);
      // is the cat currently overlapping this wall's height band?
      if (Math.abs(cat.y - row.y) > row.thick / 2 + 18) continue;
      const half = row.gapWidth / 2;
      const inGap = cat.x > row.gapCenter - half + rcat && cat.x < row.gapCenter + half - rcat;
      if (!inGap) { loseLife(); return; }
      if (row.moving) {
        const sx = G.world.spikeX(row, G.lifeTime);
        if (Math.abs(cat.x - sx) < 0.05 + rcat) { loseLife(); return; }
      }
    }
  }

  function checkFish() {
    const cat = G.cat;
    const rcat = catRadiusNx() + 0.05;
    for (const i of nearestRows()) {
      if (i < 0 || G.collected[i]) continue;
      const f = G.world.fishAt(i);
      if (!f) continue;
      if (Math.abs(cat.y - f.y) < 60 && Math.abs(cat.x - f.x) < rcat) {
        G.collected[i] = true;
        const val = f.golden ? 10 : 1;
        G.combo++; G.comboTimer = 2.2;
        const gained = val * Math.max(1, Math.floor(G.combo / 3) + 1);
        G.fish += gained;
        Sfx.fish(); if (G.combo > 1 && G.combo % 3 === 0) Sfx.combo(G.combo);
        sparkle(nx2px(f.x), wy2sy(f.y), f.golden ? "#ffe066" : "#6ce0ff");
        UI && UI.combo(G.combo);
      }
    }
  }

  function checkGhosts() {
    const cat = G.cat;
    const idx = Math.floor(G.lifeTime / STEP);
    const c = colGeom();
    const rcat = CAT_PX * 0.42;
    for (const g of G.ghosts) {
      if (idx >= g.len) continue; // this past life already ended here
      const gx = nx2px(g.xs[idx]);
      const gyW = g.ys[idx];
      if (Math.abs(gyW - cat.y) > 70) continue;
      const dx = gx - nx2px(cat.x);
      const dy = (anchorY() - (gyW - cat.y)) - anchorY();
      if (Math.hypot(dx, dy) < rcat * 1.5) { loseLife(); return; }
    }
  }

  // ---------- particles ----------
  function sparkle(x, y, color) {
    for (let i = 0; i < 8; i++) {
      const a = Math.random() * 7, s = 60 + Math.random() * 120;
      G.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.5, max: 0.5, color, r: 3 + Math.random() * 3 });
    }
  }
  function poof(x, y, color) {
    for (let i = 0; i < 26; i++) {
      const a = Math.random() * 7, s = 80 + Math.random() * 220;
      G.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 60, life: 0.8, max: 0.8, color: Math.random() < 0.5 ? color : "#fff", r: 3 + Math.random() * 5 });
    }
  }
  function stepParticles(dt) {
    for (let i = G.particles.length - 1; i >= 0; i--) {
      const p = G.particles[i];
      p.life -= dt; if (p.life <= 0) { G.particles.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 400 * dt; p.vx *= 0.96;
    }
  }

  // ---------- render ----------
  function render() {
    const ctx = G.ctx;
    ctx.save();
    if (G.shake > 0.2) ctx.translate((Math.random() - 0.5) * G.shake, (Math.random() - 0.5) * G.shake);

    drawBackground(ctx);
    drawWalls(ctx);
    drawFish(ctx);
    drawGhosts(ctx);
    if (G.state !== "dying") drawCat(ctx);
    drawParticles(ctx);

    ctx.restore();
  }

  function drawBackground(ctx) {
    const grd = ctx.createLinearGradient(0, 0, 0, G.H);
    const t = Math.min(G.cat ? G.cat.y / 6000 : 0, 1);
    grd.addColorStop(0, lerpColor("#2a1a4a", "#0a0520", t));
    grd.addColorStop(1, lerpColor("#3a2a6a", "#1a1033", t));
    ctx.fillStyle = grd; ctx.fillRect(0, 0, G.W, G.H);

    // parallax stars/clouds
    const camY = G.cat ? G.cat.y : 0;
    for (let k = 0; k < 40; k++) {
      const d = G.world.decoAt(k + Math.floor(camY / 180 / 4) * 4);
      const par = d.kind === "star" ? 0.25 : 0.5;
      const sy = ((d.y - camY * par) % (G.H + 400) + G.H + 400) % (G.H + 400) - 200;
      const sx = d.x * G.W;
      if (d.kind === "star") {
        ctx.fillStyle = "rgba(255,255,255," + (0.3 + 0.5 * d.scale * 0.5) + ")";
        ctx.fillRect(sx, sy, 2.5 * d.scale, 2.5 * d.scale);
      } else {
        ctx.fillStyle = "rgba(255,255,255,0.07)";
        ctx.beginPath(); ctx.ellipse(sx, sy, 60 * d.scale, 26 * d.scale, 0, 0, 7); ctx.fill();
      }
    }
    // side rails of the climbing shaft
    const c = colGeom();
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.fillRect(0, 0, c.x0, G.H);
    ctx.fillRect(c.x0 + c.w, 0, c.x0, G.H);
  }

  function drawWalls(ctx) {
    const c = colGeom();
    const i0 = Math.floor((G.cat.y - World.START_SAFE) / World.ROW_SPACING) - 2;
    for (let i = i0; i < i0 + 8; i++) {
      if (i < 0) continue;
      const row = G.world.rowAt(i);
      const sy = wy2sy(row.y);
      if (sy < -40 || sy > G.H + 40) continue;
      const half = row.gapWidth / 2;
      const gl = nx2px(row.gapCenter - half);
      const gr = nx2px(row.gapCenter + half);
      ctx.fillStyle = "#ff77c8";
      roundRect(ctx, c.x0, sy - row.thick / 2, gl - c.x0, row.thick, 8); ctx.fill();
      roundRect(ctx, gr, sy - row.thick / 2, c.x0 + c.w - gr, row.thick, 8); ctx.fill();
      // spikes detailing on the inner edges
      ctx.fillStyle = "#d63a96";
      drawSpikes(ctx, c.x0, gl, sy + row.thick / 2, 1);
      drawSpikes(ctx, gr, c.x0 + c.w, sy + row.thick / 2, 1);
      if (row.moving) {
        const sx = nx2px(G.world.spikeX(row, G.lifeTime));
        ctx.fillStyle = "#ffe66d";
        star(ctx, sx, sy, 14, 7, 5);
      }
    }
  }

  function drawSpikes(ctx, x0, x1, baseY, dir) {
    const n = Math.max(1, Math.floor((x1 - x0) / 18));
    const w = (x1 - x0) / n;
    ctx.beginPath();
    for (let k = 0; k < n; k++) {
      ctx.moveTo(x0 + k * w, baseY);
      ctx.lineTo(x0 + k * w + w / 2, baseY + 10 * dir);
      ctx.lineTo(x0 + (k + 1) * w, baseY);
    }
    ctx.fill();
  }

  function drawFish(ctx) {
    const i0 = Math.floor((G.cat.y - World.START_SAFE) / World.ROW_SPACING) - 2;
    for (let i = i0; i < i0 + 8; i++) {
      if (i < 0 || G.collected[i]) continue;
      const f = G.world.fishAt(i);
      if (!f) continue;
      const sy = wy2sy(f.y) + Math.sin(G.t * 3 + i) * 5;
      if (sy < -30 || sy > G.H + 30) continue;
      const sx = nx2px(f.x);
      ctx.save(); ctx.translate(sx, sy);
      ctx.fillStyle = f.golden ? "#ffe066" : "#6ce0ff";
      ctx.beginPath(); ctx.ellipse(0, 0, 13, 9, 0, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.moveTo(11, 0); ctx.lineTo(20, -7); ctx.lineTo(20, 7); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#1a1033"; ctx.beginPath(); ctx.arc(-5, -2, 2, 0, 7); ctx.fill();
      if (f.golden) { ctx.strokeStyle = "rgba(255,230,109,0.6)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 18 + Math.sin(G.t * 6) * 2, 0, 7); ctx.stroke(); }
      ctx.restore();
    }
  }

  function drawGhosts(ctx) {
    const idx = Math.floor(G.lifeTime / STEP);
    for (const g of G.ghosts) {
      const gi = Math.min(idx, g.len - 1);
      if (idx >= g.len) continue;
      const gx = nx2px(g.xs[gi]);
      const gy = wy2sy(g.ys[gi]);
      if (gy < -60 || gy > G.H + 60) continue;
      ctx.save(); ctx.translate(gx, gy);
      Sprites.drawCat(ctx, G.catDef, CAT_PX, { ghost: true, alpha: 0.38, ghostIndex: g.life, tail: Math.sin(G.t * 6 + g.life) * 0.2 });
      ctx.restore();
    }
  }

  function drawCat(ctx) {
    const cat = G.cat;
    const sx = nx2px(cat.x), sy = anchorY();
    ctx.save(); ctx.translate(sx, sy);
    ctx.rotate(cat.vx * 0.12);
    Sprites.drawCat(ctx, G.catDef, CAT_PX, { sx: cat.sx, sy: cat.sy, tail: cat.tail, blink: cat.blink, mood: cat.mood });
    ctx.restore();
  }

  function drawParticles(ctx) {
    for (const p of G.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // ---------- helpers ----------
  function roundRect(ctx, x, y, w, h, r) {
    if (w < 0) { x += w; w = -w; }
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function star(ctx, cx, cy, outer, inner, points) {
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 ? inner : outer;
      const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
      ctx[i ? "lineTo" : "moveTo"](cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    ctx.closePath(); ctx.fill();
  }
  function lerpColor(a, b, t) {
    const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    const ar = pa >> 16, ag = (pa >> 8) & 255, ab = pa & 255;
    const br = pb >> 16, bg = (pb >> 8) & 255, bb = pb & 255;
    const r = Math.round(ar + (br - ar) * t), g = Math.round(ag + (bg - ag) * t), bl = Math.round(ab + (bb - ab) * t);
    return "rgb(" + r + "," + g + "," + bl + ")";
  }

  global.Game = {
    init: init, start: start, quit: quit,
    setLeft: function (v) { G.input.left = v; },
    setRight: function (v) { G.input.right = v; },
    setPointer: function (x) { G.input.pointerX = x; },
    isPlaying: function () { return G.running; },
  };
})(window);
