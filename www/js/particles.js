// particles.js — particles, trails, and floating score text.
(function (global) {
  let parts = [];
  let texts = [];
  let trailAcc = 0;

  function reset() { parts.length = 0; texts.length = 0; trailAcc = 0; }

  function burst(x, y, n, opts) {
    opts = opts || {};
    for (let i = 0; i < n; i++) {
      const a = opts.angle != null ? opts.angle + (Math.random() - 0.5) * (opts.spread || 6.28) : Math.random() * 6.28;
      const sp = Util.rand(opts.speedMin || 50, opts.speedMax || 200);
      parts.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (opts.lift || 0),
        life: opts.life || 0.6, max: opts.life || 0.6,
        r: Util.rand(opts.rMin || 2, opts.rMax || 5),
        color: Array.isArray(opts.colors) ? Util.pick(opts.colors) : (opts.color || "#fff"),
        grav: opts.grav == null ? 380 : opts.grav,
        drag: opts.drag == null ? 0.96 : opts.drag,
        shape: opts.shape || "circle",
        spin: Math.random() * 6.28, vspin: Util.rand(-8, 8),
      });
    }
  }

  function spark(x, y, color) { burst(x, y, 8, { color, colors: ["#fff", color], speedMin: 60, speedMax: 160, life: 0.5, rMin: 2, rMax: 4 }); }
  function poof(x, y, color) { burst(x, y, 26, { colors: [color, "#fff"], speedMin: 70, speedMax: 240, life: 0.8, lift: 60, rMin: 3, rMax: 6 }); }
  function confetti(x, y) { burst(x, y, 40, { colors: ["#ff5a3c", "#ffd23c", "#7cf29c", "#5ad1ff", "#b97cff", "#ff77c8"], speedMin: 120, speedMax: 360, life: 1.2, lift: 120, shape: "rect", rMin: 3, rMax: 6 }); }
  function ring(x, y, color) { for (let i = 0; i < 18; i++) { const a = (i / 18) * 6.28; parts.push({ x, y, vx: Math.cos(a) * 220, vy: Math.sin(a) * 220, life: 0.4, max: 0.4, r: 3, color, grav: 0, drag: 0.9, shape: "circle", spin: 0, vspin: 0 }); } }

  // emit trail particles based on equipped trail style
  function trail(x, y, def, dt, t) {
    if (!def || def.style === "none") return;
    trailAcc += dt;
    const rate = def.style === "rainbow" ? 0.02 : 0.045;
    if (trailAcc < rate) return;
    trailAcc = 0;
    const c = def.colors || ["#fff"];
    const col = def.style === "rainbow" ? c[(t * 6 | 0) % c.length] : Util.pick(c);
    const base = { x: x + Util.rand(-6, 6), y: y + Util.rand(-2, 8), vx: Util.rand(-20, 20), vy: Util.rand(20, 70), life: 0.6, max: 0.6, color: col, grav: def.style === "fire" ? -120 : 60, drag: 0.95, spin: 0, vspin: Util.rand(-6, 6) };
    if (def.style === "hearts") parts.push(Object.assign(base, { shape: "heart", r: Util.rand(4, 7), life: 0.8, max: 0.8 }));
    else if (def.style === "stars") parts.push(Object.assign(base, { shape: "star", r: Util.rand(3, 6) }));
    else if (def.style === "bubbles") parts.push(Object.assign(base, { shape: "bubble", r: Util.rand(3, 7), grav: -40 }));
    else if (def.style === "fire") parts.push(Object.assign(base, { shape: "circle", r: Util.rand(4, 8), life: 0.4, max: 0.4 }));
    else if (def.style === "ghost") parts.push(Object.assign(base, { shape: "circle", r: Util.rand(5, 9), grav: -30, life: 0.9, max: 0.9 }));
    else parts.push(Object.assign(base, { shape: "circle", r: Util.rand(2, 4) }));
  }

  function floatText(x, y, str, color, opts) {
    opts = opts || {};
    texts.push({ x, y, str, color: color || "#fff", life: opts.life || 1, max: opts.life || 1, vy: opts.vy || -60, size: opts.size || 22, vx: opts.vx || 0 });
  }

  function update(dt) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life -= dt; if (p.life <= 0) { parts.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.grav * dt; p.vx *= p.drag; p.vy *= p.drag; p.spin += p.vspin * dt;
    }
    for (let i = texts.length - 1; i >= 0; i--) {
      const tx = texts[i]; tx.life -= dt; if (tx.life <= 0) { texts.splice(i, 1); continue; }
      tx.x += tx.vx * dt; tx.y += tx.vy * dt; tx.vy *= 0.92;
    }
  }

  function draw(ctx) {
    for (const p of parts) {
      const a = Util.clamp(p.life / p.max, 0, 1);
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      if (p.shape === "rect") { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.spin); ctx.fillRect(-p.r, -p.r * 0.5, p.r * 2, p.r); ctx.restore(); }
      else if (p.shape === "star") { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.spin); Sprites.star(ctx, 0, 0, p.r, p.r * 0.45, 5); ctx.restore(); }
      else if (p.shape === "heart") { drawHeart(ctx, p.x, p.y, p.r); }
      else if (p.shape === "bubble") { ctx.globalAlpha = a * 0.6; ctx.strokeStyle = p.color; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.28); ctx.stroke(); }
      else { ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.28); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
    for (const tx of texts) {
      const a = Util.clamp(tx.life / tx.max, 0, 1);
      ctx.globalAlpha = a;
      ctx.font = "900 " + tx.size + "px Trebuchet MS"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.lineWidth = 4; ctx.strokeStyle = "rgba(26,16,51,0.8)"; ctx.strokeText(tx.str, tx.x, tx.y);
      ctx.fillStyle = tx.color; ctx.fillText(tx.str, tx.x, tx.y);
    }
    ctx.globalAlpha = 1;
  }

  function drawHeart(ctx, x, y, r) {
    ctx.beginPath();
    ctx.moveTo(x, y + r * 0.3);
    ctx.bezierCurveTo(x + r, y - r * 0.6, x + r * 1.4, y + r * 0.4, x, y + r);
    ctx.bezierCurveTo(x - r * 1.4, y + r * 0.4, x - r, y - r * 0.6, x, y + r * 0.3);
    ctx.fill();
  }

  global.Particles = { reset, burst, spark, poof, confetti, ring, trail, floatText, update, draw, count: () => parts.length };
})(window);
