// sprites.js — procedurally draws cute cats (and their ghosts) on a canvas.
// No image files: every cat is vector art so skins stay tiny and crisp.
(function (global) {
  // The unlockable roster. cost is in fish. The "collect them all" hook.
  const CATS = [
    { id: "tuxedo",   name: "Tuxedo",    cost: 0,    fur: "#2b2b3a", belly: "#fff7fb", ear: "#ff9ad6", eye: "#7cf29c", pattern: "tuxedo" },
    { id: "ginger",   name: "Ginger",    cost: 60,   fur: "#ff944d", belly: "#ffe2c2", ear: "#ffb37a", eye: "#5ad1ff", pattern: "tabby" },
    { id: "calico",   name: "Calico",    cost: 120,  fur: "#fff2e0", belly: "#fff7fb", ear: "#ff9ad6", eye: "#ffd95a", pattern: "calico" },
    { id: "siamese",  name: "Siamese",   cost: 200,  fur: "#e9dcc6", belly: "#fff7fb", ear: "#6b4f3a", eye: "#5ad1ff", pattern: "points" },
    { id: "shadow",   name: "Shadow",    cost: 350,  fur: "#3a2a5a", belly: "#5a4488", ear: "#b97cff", eye: "#c8ff5a", pattern: "solid" },
    { id: "bubblegum",name: "Bubblegum", cost: 500,  fur: "#ff77c8", belly: "#ffd6ef", ear: "#ff4fb0", eye: "#fff", pattern: "solid" },
    { id: "mint",     name: "Mint",      cost: 700,  fur: "#7cf2c4", belly: "#d9fff0", ear: "#4fe0a8", eye: "#ff77c8", pattern: "solid" },
    { id: "cosmic",   name: "Cosmic",    cost: 1200, fur: "#2a1a55", belly: "#4a2f8c", ear: "#ff77c8", eye: "#ffe66d", pattern: "cosmic" },
    { id: "golden",   name: "Golden",    cost: 2500, fur: "#ffe066", belly: "#fff6c2", ear: "#ffb300", eye: "#222", pattern: "golden" },
  ];

  function byId(id) { return CATS.find(c => c.id === id) || CATS[0]; }

  // Draw a cat centered at (0,0) in a box of given size. Apply squash via sx/sy.
  // mood: 0 normal, 1 happy, -1 scared. blink: 0..1.
  function drawCat(ctx, cat, size, opts) {
    opts = opts || {};
    const sx = opts.sx == null ? 1 : opts.sx;
    const sy = opts.sy == null ? 1 : opts.sy;
    const mood = opts.mood || 0;
    const blink = opts.blink || 0;
    const ghost = opts.ghost || false;
    const ghostIndex = opts.ghostIndex || 0;
    const r = size / 2;

    ctx.save();
    ctx.scale(sx, sy);

    if (ghost) {
      ctx.globalAlpha = opts.alpha != null ? opts.alpha : 0.4;
    }

    // Tail (wiggles via opts.tail)
    const tw = opts.tail || 0;
    ctx.save();
    ctx.strokeStyle = ghost ? "#bba8ff" : cat.fur;
    ctx.lineWidth = r * 0.34; ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(r * 0.55, r * 0.45);
    ctx.quadraticCurveTo(r * 1.15, r * 0.2 + tw * r, r * 0.95, -r * 0.4 + tw * r * 1.4);
    ctx.stroke();
    ctx.restore();

    // Body / head as one chubby blob
    const body = ghost ? "#9d86e8" : cat.fur;
    ctx.fillStyle = body;
    roundBlob(ctx, 0, 0, r * 0.95, r * 0.9);
    ctx.fill();

    // Ears
    const ear = ghost ? "#b79bff" : cat.ear;
    drawEar(ctx, -r * 0.55, -r * 0.62, -1, body, ear, r);
    drawEar(ctx, r * 0.55, -r * 0.62, 1, body, ear, r);

    // Belly / pattern
    if (!ghost) drawPattern(ctx, cat, r);

    // Cheeks
    ctx.fillStyle = ghost ? "rgba(255,150,214,0.3)" : "rgba(255,120,180,0.45)";
    ctx.beginPath(); ctx.arc(-r * 0.5, r * 0.18, r * 0.16, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(r * 0.5, r * 0.18, r * 0.16, 0, 7); ctx.fill();

    // Eyes
    const ex = r * 0.34, ey = -r * 0.08;
    const eyeOpen = 1 - blink;
    ctx.fillStyle = "#fff";
    if (eyeOpen > 0.1) {
      eye(ctx, -ex, ey, r * 0.2, r * 0.24 * eyeOpen);
      eye(ctx, ex, ey, r * 0.2, r * 0.24 * eyeOpen);
      // pupils
      ctx.fillStyle = ghost ? "#3a2a5a" : cat.eye;
      const pupil = r * (mood < 0 ? 0.16 : 0.12);
      eye(ctx, -ex, ey + r * 0.02, pupil, pupil * (mood < 0 ? 1.3 : eyeOpen + 0.2));
      eye(ctx, ex, ey + r * 0.02, pupil, pupil * (mood < 0 ? 1.3 : eyeOpen + 0.2));
      // shine
      ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.arc(-ex - pupil * 0.3, ey - pupil * 0.3, pupil * 0.35, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(ex - pupil * 0.3, ey - pupil * 0.3, pupil * 0.35, 0, 7); ctx.fill();
    } else {
      ctx.strokeStyle = ghost ? "#3a2a5a" : "#1a1033"; ctx.lineWidth = r * 0.06; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(-ex - r * 0.12, ey); ctx.lineTo(-ex + r * 0.12, ey); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ex - r * 0.12, ey); ctx.lineTo(ex + r * 0.12, ey); ctx.stroke();
    }

    // Nose + mouth
    ctx.fillStyle = ghost ? "#d6a8ff" : "#ff6fae";
    ctx.beginPath();
    ctx.moveTo(0, r * 0.12); ctx.lineTo(-r * 0.08, r * 0.05); ctx.lineTo(r * 0.08, r * 0.05); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = ghost ? "#7a5fb5" : "#7a2a4f"; ctx.lineWidth = r * 0.04; ctx.lineCap = "round";
    ctx.beginPath();
    if (mood > 0) { // happy :3
      ctx.moveTo(0, r * 0.12); ctx.quadraticCurveTo(-r * 0.12, r * 0.26, -r * 0.2, r * 0.16);
      ctx.moveTo(0, r * 0.12); ctx.quadraticCurveTo(r * 0.12, r * 0.26, r * 0.2, r * 0.16);
    } else if (mood < 0) { // worried o
      ctx.moveTo(0, r * 0.12); ctx.lineTo(0, r * 0.2);
      ctx.arc(0, r * 0.26, r * 0.06, 0, 7);
    } else {
      ctx.moveTo(0, r * 0.12); ctx.lineTo(0, r * 0.18);
      ctx.moveTo(-r * 0.1, r * 0.22); ctx.quadraticCurveTo(0, r * 0.28, r * 0.1, r * 0.22);
    }
    ctx.stroke();

    // Whiskers
    ctx.strokeStyle = ghost ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.7)"; ctx.lineWidth = r * 0.025;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath(); ctx.moveTo(-r * 0.22, r * 0.06 + i * r * 0.06); ctx.lineTo(-r * 0.62, r * 0.0 + i * r * 0.1); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(r * 0.22, r * 0.06 + i * r * 0.06); ctx.lineTo(r * 0.62, r * 0.0 + i * r * 0.1); ctx.stroke();
    }

    // Ghost number badge so you can tell which past life is which
    if (ghost && ghostIndex > 0) {
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = "#fff";
      ctx.font = "bold " + (r * 0.5) + "px Trebuchet MS";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(ghostIndex, 0, -r * 0.05);
    }

    ctx.restore();
  }

  function roundBlob(ctx, x, y, rx, ry) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  }

  function drawEar(ctx, x, y, dir, body, ear, r) {
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(x - dir * r * 0.18, y + r * 0.25);
    ctx.lineTo(x + dir * r * 0.28, y - r * 0.28);
    ctx.lineTo(x + dir * r * 0.32, y + r * 0.28);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = ear;
    ctx.beginPath();
    ctx.moveTo(x - dir * r * 0.02, y + r * 0.14);
    ctx.lineTo(x + dir * r * 0.2, y - r * 0.14);
    ctx.lineTo(x + dir * r * 0.22, y + r * 0.16);
    ctx.closePath(); ctx.fill();
  }

  function drawPattern(ctx, cat, r) {
    ctx.save();
    // clip to body
    ctx.beginPath(); ctx.ellipse(0, 0, r * 0.95, r * 0.9, 0, 0, 7); ctx.clip();
    if (cat.pattern === "tuxedo") {
      ctx.fillStyle = cat.belly;
      ctx.beginPath(); ctx.ellipse(0, r * 0.5, r * 0.5, r * 0.6, 0, 0, 7); ctx.fill();
    } else if (cat.pattern === "tabby") {
      ctx.fillStyle = cat.belly;
      ctx.beginPath(); ctx.ellipse(0, r * 0.55, r * 0.45, r * 0.5, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = "rgba(120,60,20,0.4)"; ctx.lineWidth = r * 0.08;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath(); ctx.moveTo(i * r * 0.3, -r * 0.7); ctx.lineTo(i * r * 0.3, -r * 0.2); ctx.stroke();
      }
    } else if (cat.pattern === "calico") {
      ctx.fillStyle = "#ff944d";
      ctx.beginPath(); ctx.arc(-r * 0.4, -r * 0.3, r * 0.4, 0, 7); ctx.fill();
      ctx.fillStyle = "#2b2b3a";
      ctx.beginPath(); ctx.arc(r * 0.45, r * 0.1, r * 0.35, 0, 7); ctx.fill();
    } else if (cat.pattern === "points") {
      ctx.fillStyle = "#6b4f3a";
      ctx.beginPath(); ctx.ellipse(0, r * 0.7, r * 0.6, r * 0.4, 0, 0, 7); ctx.fill();
    } else if (cat.pattern === "cosmic") {
      for (let i = 0; i < 18; i++) {
        ctx.fillStyle = i % 3 ? "#ffffff" : "#ffe66d";
        const a = i / 18 * 7, rr = r * (0.3 + (i % 4) * 0.18);
        ctx.beginPath(); ctx.arc(Math.cos(a) * rr, Math.sin(a) * rr, r * 0.04, 0, 7); ctx.fill();
      }
    } else if (cat.pattern === "golden") {
      const g = ctx.createLinearGradient(-r, -r, r, r);
      g.addColorStop(0, "#fff6c2"); g.addColorStop(0.5, "#ffe066"); g.addColorStop(1, "#ffb300");
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, r, r, 0, 0, 7); ctx.fill();
    }
    ctx.restore();
  }

  function eye(ctx, x, y, rx, ry) {
    ctx.beginPath(); ctx.ellipse(x, y, rx, Math.max(0.5, ry), 0, 0, 7); ctx.fill();
  }

  global.Sprites = { CATS: CATS, byId: byId, drawCat: drawCat };
})(window);
