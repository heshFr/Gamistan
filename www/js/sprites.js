// sprites.js — all procedural vector art: cats, hats, fish, power-ups,
// hazards, and the guardian boss. No image files anywhere.
(function (global) {
  const TAU = Math.PI * 2;

  // ----------------------------------------------------------------- CAT ----
  // Draw a cat centered at (0,0). opts: sx, sy, mood(-1..1), blink(0..1),
  // tail, ghost(bool), alpha, ghostIndex, hat(def), glow(color), t(time).
  function drawCat(ctx, cat, size, opts) {
    opts = opts || {};
    const sx = opts.sx == null ? 1 : opts.sx;
    const sy = opts.sy == null ? 1 : opts.sy;
    const mood = opts.mood || 0;
    const blink = opts.blink || 0;
    const ghost = opts.ghost || false;
    const r = size / 2;
    const t = opts.t || 0;

    ctx.save();
    ctx.scale(sx, sy);
    if (ghost) ctx.globalAlpha = opts.alpha != null ? opts.alpha : 0.4;

    if (opts.glow && !ghost) {
      ctx.save(); ctx.shadowColor = opts.glow; ctx.shadowBlur = r * 0.8; ctx.fillStyle = opts.glow;
      ctx.beginPath(); ctx.ellipse(0, 0, r * 0.96, r * 0.92, 0, 0, TAU); ctx.fill(); ctx.restore();
    }

    const body = ghost ? "#9d86e8" : cat.fur;

    // tail
    const tw = opts.tail || 0;
    ctx.save();
    ctx.strokeStyle = ghost ? "#bba8ff" : cat.fur; ctx.lineWidth = r * 0.34; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(r * 0.55, r * 0.45);
    ctx.quadraticCurveTo(r * 1.15, r * 0.2 + tw * r, r * 0.95, -r * 0.4 + tw * r * 1.4);
    ctx.stroke(); ctx.restore();

    // body
    ctx.fillStyle = body;
    ctx.beginPath(); ctx.ellipse(0, 0, r * 0.95, r * 0.9, 0, 0, TAU); ctx.fill();

    const ear = ghost ? "#b79bff" : cat.ear;
    drawEar(ctx, -r * 0.55, -r * 0.62, -1, body, ear, r);
    drawEar(ctx, r * 0.55, -r * 0.62, 1, body, ear, r);

    if (!ghost) drawPattern(ctx, cat, r, t);

    // cheeks
    ctx.fillStyle = ghost ? "rgba(255,150,214,0.3)" : "rgba(255,120,180,0.45)";
    ctx.beginPath(); ctx.arc(-r * 0.5, r * 0.18, r * 0.16, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(r * 0.5, r * 0.18, r * 0.16, 0, TAU); ctx.fill();

    // eyes
    const ex = r * 0.34, ey = -r * 0.08, eyeOpen = 1 - blink;
    if (eyeOpen > 0.12) {
      ctx.fillStyle = "#fff";
      blob(ctx, -ex, ey, r * 0.2, r * 0.24 * eyeOpen);
      blob(ctx, ex, ey, r * 0.2, r * 0.24 * eyeOpen);
      ctx.fillStyle = ghost ? "#3a2a5a" : cat.eye;
      const pu = r * (mood < 0 ? 0.16 : 0.12);
      blob(ctx, -ex, ey + r * 0.02, pu, pu * (mood < 0 ? 1.3 : eyeOpen + 0.2));
      blob(ctx, ex, ey + r * 0.02, pu, pu * (mood < 0 ? 1.3 : eyeOpen + 0.2));
      ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.arc(-ex - pu * 0.3, ey - pu * 0.3, pu * 0.35, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(ex - pu * 0.3, ey - pu * 0.3, pu * 0.35, 0, TAU); ctx.fill();
    } else {
      ctx.strokeStyle = ghost ? "#3a2a5a" : "#1a1033"; ctx.lineWidth = r * 0.06; ctx.lineCap = "round";
      line(ctx, -ex - r * 0.12, ey, -ex + r * 0.12, ey);
      line(ctx, ex - r * 0.12, ey, ex + r * 0.12, ey);
    }

    // nose + mouth
    ctx.fillStyle = ghost ? "#d6a8ff" : "#ff6fae";
    ctx.beginPath(); ctx.moveTo(0, r * 0.12); ctx.lineTo(-r * 0.08, r * 0.05); ctx.lineTo(r * 0.08, r * 0.05); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = ghost ? "#7a5fb5" : "#7a2a4f"; ctx.lineWidth = r * 0.04; ctx.lineCap = "round";
    ctx.beginPath();
    if (mood > 0) { ctx.moveTo(0, r * 0.12); ctx.quadraticCurveTo(-r * 0.12, r * 0.26, -r * 0.2, r * 0.16); ctx.moveTo(0, r * 0.12); ctx.quadraticCurveTo(r * 0.12, r * 0.26, r * 0.2, r * 0.16); }
    else if (mood < 0) { ctx.moveTo(0, r * 0.12); ctx.lineTo(0, r * 0.2); ctx.arc(0, r * 0.26, r * 0.06, 0, TAU); }
    else { ctx.moveTo(0, r * 0.12); ctx.lineTo(0, r * 0.18); ctx.moveTo(-r * 0.1, r * 0.22); ctx.quadraticCurveTo(0, r * 0.28, r * 0.1, r * 0.22); }
    ctx.stroke();

    // whiskers
    ctx.strokeStyle = ghost ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.7)"; ctx.lineWidth = r * 0.025;
    for (let i = -1; i <= 1; i++) {
      line(ctx, -r * 0.22, r * 0.06 + i * r * 0.06, -r * 0.62, i * r * 0.1);
      line(ctx, r * 0.22, r * 0.06 + i * r * 0.06, r * 0.62, i * r * 0.1);
    }

    if (opts.hat && opts.hat.style !== "none") drawHat(ctx, opts.hat, r);

    if (ghost && opts.ghostIndex > 0) {
      ctx.globalAlpha = 0.9; ctx.fillStyle = "#fff";
      ctx.font = "bold " + (r * 0.5) + "px Trebuchet MS"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(opts.ghostIndex, 0, -r * 0.02);
    }
    ctx.restore();
  }

  function drawEar(ctx, x, y, dir, body, ear, r) {
    ctx.fillStyle = body;
    ctx.beginPath(); ctx.moveTo(x - dir * r * 0.18, y + r * 0.25); ctx.lineTo(x + dir * r * 0.28, y - r * 0.28); ctx.lineTo(x + dir * r * 0.32, y + r * 0.28); ctx.closePath(); ctx.fill();
    ctx.fillStyle = ear;
    ctx.beginPath(); ctx.moveTo(x - dir * r * 0.02, y + r * 0.14); ctx.lineTo(x + dir * r * 0.2, y - r * 0.14); ctx.lineTo(x + dir * r * 0.22, y + r * 0.16); ctx.closePath(); ctx.fill();
  }

  function drawPattern(ctx, cat, r, t) {
    ctx.save();
    ctx.beginPath(); ctx.ellipse(0, 0, r * 0.95, r * 0.9, 0, 0, TAU); ctx.clip();
    const p = cat.pattern;
    if (p === "tuxedo") { ctx.fillStyle = cat.belly; ctx.beginPath(); ctx.ellipse(0, r * 0.5, r * 0.5, r * 0.6, 0, 0, TAU); ctx.fill(); }
    else if (p === "tabby") {
      ctx.fillStyle = cat.belly; ctx.beginPath(); ctx.ellipse(0, r * 0.55, r * 0.45, r * 0.5, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.18)"; ctx.lineWidth = r * 0.08;
      for (let i = -2; i <= 2; i++) line(ctx, i * r * 0.3, -r * 0.7, i * r * 0.3, -r * 0.2);
    }
    else if (p === "calico") { ctx.fillStyle = "#ff944d"; circle(ctx, -r * 0.4, -r * 0.3, r * 0.4); ctx.fillStyle = "#2b2b3a"; circle(ctx, r * 0.45, r * 0.1, r * 0.35); }
    else if (p === "points") { ctx.fillStyle = "#6b4f3a"; ctx.beginPath(); ctx.ellipse(0, r * 0.7, r * 0.6, r * 0.4, 0, 0, TAU); ctx.fill(); }
    else if (p === "panda") { ctx.fillStyle = "#2b2b3a"; circle(ctx, -r * 0.34, -r * 0.08, r * 0.26); circle(ctx, r * 0.34, -r * 0.08, r * 0.26); }
    else if (p === "ember") {
      for (let i = 0; i < 5; i++) { ctx.fillStyle = i % 2 ? "#ffd23c" : "#ff8a3c"; const a = (i / 5) * TAU + t; circle(ctx, Math.cos(a) * r * 0.4, Math.sin(a) * r * 0.4, r * 0.1); }
    }
    else if (p === "robo") {
      ctx.strokeStyle = "rgba(90,209,255,0.6)"; ctx.lineWidth = r * 0.05;
      for (let i = -1; i <= 1; i++) line(ctx, -r, i * r * 0.4, r, i * r * 0.4);
      ctx.fillStyle = "#ff3c6e"; circle(ctx, 0, r * 0.45, r * 0.08);
    }
    else if (p === "ghosty") { ctx.fillStyle = "rgba(255,255,255,0.35)"; for (let i = 0; i < 6; i++) circle(ctx, Math.cos(i) * r * 0.5, Math.sin(i * 1.7) * r * 0.5, r * 0.08); }
    else if (p === "cosmic") { for (let i = 0; i < 18; i++) { ctx.fillStyle = i % 3 ? "#fff" : "#ffe66d"; const a = (i / 18) * TAU, rr = r * (0.3 + (i % 4) * 0.18); circle(ctx, Math.cos(a) * rr, Math.sin(a) * rr, r * 0.04); } }
    else if (p === "golden") { const g = ctx.createLinearGradient(-r, -r, r, r); g.addColorStop(0, "#fff6c2"); g.addColorStop(0.5, "#ffe066"); g.addColorStop(1, "#ffb300"); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, r, r, 0, 0, TAU); ctx.fill(); }
    else if (p === "rainbow") {
      const cols = ["#ff5a3c", "#ffd23c", "#7cf29c", "#5ad1ff", "#b97cff"];
      for (let i = 0; i < cols.length; i++) { ctx.fillStyle = cols[i]; ctx.fillRect(-r, -r + i * (2 * r / cols.length), 2 * r, 2 * r / cols.length + 1); }
      ctx.globalAlpha = 0.5; ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.ellipse(0, r * 0.4, r * 0.5, r * 0.5, 0, 0, TAU); ctx.fill();
    }
    else if (p === "void") {
      const g = ctx.createRadialGradient(0, 0, r * 0.1, 0, 0, r); g.addColorStop(0, "#3a1a6a"); g.addColorStop(1, "#000");
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, r, r, 0, 0, TAU); ctx.fill();
      for (let i = 0; i < 10; i++) { ctx.fillStyle = "#b97cff"; circle(ctx, Math.cos(i * 2 + t) * r * 0.6, Math.sin(i * 3) * r * 0.6, r * 0.03); }
    }
    ctx.restore();
  }

  // ----------------------------------------------------------------- HATS ----
  function drawHat(ctx, hat, r) {
    const c = hat.color || "#fff";
    const y = -r * 0.78;
    ctx.save();
    if (hat.style === "bow") {
      ctx.fillStyle = c; ctx.translate(r * 0.5, -r * 0.55);
      tri(ctx, 0, 0, -r * 0.3, -r * 0.2, -r * 0.3, r * 0.2);
      tri(ctx, 0, 0, r * 0.3, -r * 0.2, r * 0.3, r * 0.2);
      ctx.fillStyle = Util.shade(c, -0.2); circle(ctx, 0, 0, r * 0.08);
    } else if (hat.style === "beanie") {
      ctx.fillStyle = c; ctx.beginPath(); ctx.arc(0, y + r * 0.1, r * 0.78, Math.PI, TAU); ctx.fill();
      ctx.fillStyle = Util.shade(c, 0.3); ctx.fillRect(-r * 0.8, y + r * 0.08, r * 1.6, r * 0.18);
      ctx.fillStyle = "#fff"; circle(ctx, 0, y - r * 0.55, r * 0.16);
    } else if (hat.style === "cap") {
      ctx.fillStyle = c; ctx.beginPath(); ctx.arc(0, y + r * 0.15, r * 0.72, Math.PI, TAU); ctx.fill();
      ctx.fillRect(-r * 0.75, y + r * 0.1, r * 1.0, r * 0.16);
    } else if (hat.style === "flower") {
      ctx.translate(-r * 0.5, -r * 0.55); ctx.fillStyle = c;
      for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU; circle(ctx, Math.cos(a) * r * 0.18, Math.sin(a) * r * 0.18, r * 0.12); }
      ctx.fillStyle = "#ff944d"; circle(ctx, 0, 0, r * 0.1);
    } else if (hat.style === "party") {
      ctx.fillStyle = c; tri(ctx, 0, y - r * 0.5, -r * 0.34, y + r * 0.18, r * 0.34, y + r * 0.18);
      ctx.fillStyle = "#fff"; circle(ctx, 0, y - r * 0.5, r * 0.1);
      ctx.fillStyle = Util.shade(c, -0.3); for (let i = 0; i < 3; i++) circle(ctx, -r * 0.15 + i * r * 0.15, y - r * 0.1 + i * r * 0.05, r * 0.05);
    } else if (hat.style === "headphones") {
      ctx.strokeStyle = c; ctx.lineWidth = r * 0.12; ctx.beginPath(); ctx.arc(0, 0, r * 0.85, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
      ctx.fillStyle = Util.shade(c, -0.2); circle(ctx, -r * 0.78, -r * 0.1, r * 0.18); circle(ctx, r * 0.78, -r * 0.1, r * 0.18);
    } else if (hat.style === "crown") {
      ctx.fillStyle = c; ctx.beginPath();
      ctx.moveTo(-r * 0.5, y + r * 0.2); ctx.lineTo(-r * 0.5, y - r * 0.2); ctx.lineTo(-r * 0.25, y); ctx.lineTo(0, y - r * 0.3); ctx.lineTo(r * 0.25, y); ctx.lineTo(r * 0.5, y - r * 0.2); ctx.lineTo(r * 0.5, y + r * 0.2);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#ff3c6e"; circle(ctx, 0, y, r * 0.07);
    } else if (hat.style === "halo") {
      ctx.strokeStyle = c; ctx.lineWidth = r * 0.1; ctx.shadowColor = c; ctx.shadowBlur = r * 0.5;
      ctx.beginPath(); ctx.ellipse(0, y - r * 0.2, r * 0.5, r * 0.16, 0, 0, TAU); ctx.stroke();
    } else if (hat.style === "tophat") {
      ctx.fillStyle = c; ctx.fillRect(-r * 0.6, y + r * 0.05, r * 1.2, r * 0.12);
      ctx.fillRect(-r * 0.38, y - r * 0.45, r * 0.76, r * 0.5);
      ctx.fillStyle = "#ff3c6e"; ctx.fillRect(-r * 0.38, y - r * 0.05, r * 0.76, r * 0.08);
    } else if (hat.style === "horns") {
      ctx.fillStyle = c;
      tri(ctx, -r * 0.45, y + r * 0.2, -r * 0.62, y - r * 0.35, -r * 0.28, y);
      tri(ctx, r * 0.45, y + r * 0.2, r * 0.62, y - r * 0.35, r * 0.28, y);
    }
    ctx.restore();
  }

  // ----------------------------------------------------------------- FISH ----
  function drawFish(ctx, x, y, golden, t) {
    ctx.save(); ctx.translate(x, y);
    if (golden) { ctx.shadowColor = "#ffe066"; ctx.shadowBlur = 16; }
    ctx.fillStyle = golden ? "#ffe066" : "#6ce0ff";
    ctx.beginPath(); ctx.ellipse(0, 0, 13, 9, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(11, 0); ctx.lineTo(20, -7); ctx.lineTo(20, 7); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#1a1033"; circle(ctx, -5, -2, 2);
    ctx.restore();
  }

  // ------------------------------------------------------------- POWER-UPS ----
  function drawPowerup(ctx, x, y, def, t) {
    ctx.save(); ctx.translate(x, y);
    const pulse = 1 + Math.sin(t * 5) * 0.08;
    ctx.scale(pulse, pulse);
    ctx.shadowColor = def.color; ctx.shadowBlur = 18;
    ctx.fillStyle = Util.rgba(def.color, 0.25);
    circle(ctx, 0, 0, 22);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = def.color; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, 18, 0, TAU); ctx.stroke();
    ctx.font = "20px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(def.icon, 0, 1);
    ctx.restore();
  }

  // --------------------------------------------------------------- HAZARDS ----
  // small decorative themed hazard sprite drawn at the moving spike position
  function drawHazard(ctx, x, y, kind, color, t) {
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = color;
    if (kind === "bird") { ctx.rotate(Math.sin(t * 6) * 0.2); ctx.beginPath(); ctx.ellipse(0, 0, 12, 8, 0, 0, TAU); ctx.fill(); tri(ctx, 0, -6, -14, -2 + Math.sin(t * 10) * 4, -14, 2); tri(ctx, 0, -6, 14, -2 + Math.cos(t * 10) * 4, 14, 2); }
    else if (kind === "comet") { ctx.shadowColor = color; ctx.shadowBlur = 14; circle(ctx, 0, 0, 9); ctx.shadowBlur = 0; ctx.fillStyle = Util.rgba(color, 0.4); tri(ctx, 0, 0, -22, -6, -22, 6); }
    else if (kind === "jelly") { ctx.globalAlpha = 0.8; ctx.beginPath(); ctx.arc(0, 0, 12, Math.PI, TAU); ctx.fill(); for (let i = -2; i <= 2; i++) line2(ctx, i * 5, 0, i * 5 + Math.sin(t * 4 + i) * 3, 16, color); }
    else if (kind === "fireball") { ctx.shadowColor = "#ff5a3c"; ctx.shadowBlur = 16; ctx.fillStyle = "#ffd23c"; circle(ctx, 0, 0, 11); ctx.fillStyle = "#ff5a3c"; circle(ctx, 0, 0, 6); }
    else if (kind === "laser") { ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 12; star(ctx, 0, 0, 12, 5, 4); }
    else if (kind === "gum") { circle(ctx, 0, 0, 11); ctx.fillStyle = Util.shade(color, 0.4); circle(ctx, -3, -3, 4); }
    else { star(ctx, 0, 0, 13, 6, 5); }
    ctx.restore();
  }

  // ----------------------------------------------------------------- BOSS ----
  // A giant nine-tailed guardian cat looming at the top of the gauntlet.
  function drawBoss(ctx, x, y, size, color, t, hurt) {
    ctx.save(); ctx.translate(x, y);
    const r = size / 2;
    // nine swishing tails
    ctx.strokeStyle = Util.rgba(color, 0.8); ctx.lineWidth = r * 0.12; ctx.lineCap = "round";
    for (let i = 0; i < 9; i++) {
      const a = Math.PI + (i / 8) * Math.PI;
      const sw = Math.sin(t * 3 + i) * 0.4;
      ctx.beginPath(); ctx.moveTo(0, r * 0.2);
      ctx.quadraticCurveTo(Math.cos(a) * r * 1.2, Math.sin(a) * r * 1.2 + sw * r, Math.cos(a + sw) * r * 1.8, Math.sin(a + sw) * r * 1.6);
      ctx.stroke();
    }
    // head
    ctx.fillStyle = hurt ? "#fff" : color;
    ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.92, 0, 0, TAU); ctx.fill();
    drawEar(ctx, -r * 0.55, -r * 0.62, -1, hurt ? "#fff" : color, "#1a1033", r);
    drawEar(ctx, r * 0.55, -r * 0.62, 1, hurt ? "#fff" : color, "#1a1033", r);
    // glowing angry eyes
    ctx.fillStyle = "#ff3c6e"; ctx.shadowColor = "#ff3c6e"; ctx.shadowBlur = r * 0.4;
    tri(ctx, -r * 0.5, -r * 0.05, -r * 0.18, -r * 0.18, -r * 0.18, r * 0.05);
    tri(ctx, r * 0.5, -r * 0.05, r * 0.18, -r * 0.18, r * 0.18, r * 0.05);
    ctx.shadowBlur = 0;
    // grin
    ctx.strokeStyle = "#fff"; ctx.lineWidth = r * 0.05;
    ctx.beginPath(); ctx.moveTo(-r * 0.4, r * 0.35); ctx.quadraticCurveTo(0, r * 0.65, r * 0.4, r * 0.35); ctx.stroke();
    for (let i = -2; i <= 2; i++) line(ctx, i * r * 0.16, r * 0.4, i * r * 0.16, r * 0.5);
    ctx.restore();
  }

  // ---- helpers ----
  function blob(ctx, x, y, rx, ry) { ctx.beginPath(); ctx.ellipse(x, y, rx, Math.max(0.5, ry), 0, 0, TAU); ctx.fill(); }
  function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
  function line(ctx, x1, y1, x2, y2) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
  function line2(ctx, x1, y1, x2, y2, c) { ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
  function tri(ctx, x1, y1, x2, y2, x3, y3) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x3, y3); ctx.closePath(); ctx.fill(); }
  function star(ctx, cx, cy, outer, inner, points) {
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) { const rr = i % 2 ? inner : outer; const a = (i / (points * 2)) * TAU - Math.PI / 2; ctx[i ? "lineTo" : "moveTo"](cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
    ctx.closePath(); ctx.fill();
  }

  global.Sprites = {
    drawCat, drawHat, drawFish, drawPowerup, drawHazard, drawBoss,
    star: (ctx, x, y, o, i, p) => star(ctx, x, y, o, i, p),
  };
})(window);
