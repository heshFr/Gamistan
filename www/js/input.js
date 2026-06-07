// input.js — steering input across schemes: drag, on-screen buttons, tilt,
// plus keyboard. Reconfigures live when the control setting changes.
(function (global) {
  const $ = (id) => document.getElementById(id);
  let dragActive = false;
  let tiltBound = false;

  function scheme() { return Save.setting("control"); }

  function applyScheme() {
    const s = scheme();
    const playing = Game.isPlaying() && !Game.isPaused();
    $("touch-buttons").classList.toggle("hidden", !(s === "buttons" && playing));
    if (s === "tilt") ensureTilt();
  }

  function ensureTilt() {
    if (tiltBound) return;
    const handler = (e) => {
      if (scheme() !== "tilt") return;
      const g = e.gamma || 0; // left/right tilt in degrees
      Game.setTilt(Util.clamp(g / 25, -1, 1));
    };
    // iOS 13+ needs explicit permission (must be triggered by a gesture)
    const DOE = global.DeviceOrientationEvent;
    if (DOE && typeof DOE.requestPermission === "function") {
      DOE.requestPermission().then((res) => { if (res === "granted") { global.addEventListener("deviceorientation", handler); tiltBound = true; } }).catch(() => {});
    } else if (DOE) {
      global.addEventListener("deviceorientation", handler); tiltBound = true;
    }
  }

  function init() {
    // keyboard (desktop) always on
    global.addEventListener("keydown", (e) => {
      if (e.repeat) return;
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") Game.setLeft(true);
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") Game.setRight(true);
      if (e.key === "Escape" || e.key === "p") { if (Game.isPlaying() && !Game.isPaused()) Game.pause(); else if (Game.isPaused()) Game.resume(); }
    });
    global.addEventListener("keyup", (e) => {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") Game.setLeft(false);
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") Game.setRight(false);
    });

    // pointer drag on the canvas
    const cv = $("game");
    cv.addEventListener("pointerdown", (e) => {
      if (!Game.isPlaying() || Game.isPaused()) return;
      if (scheme() === "buttons") return;
      dragActive = true; $("touch-hint").classList.add("hidden");
      Game.setPointer(e.clientX);
      try { cv.setPointerCapture(e.pointerId); } catch (x) {}
    });
    cv.addEventListener("pointermove", (e) => { if (dragActive) Game.setPointer(e.clientX); });
    const rel = () => { dragActive = false; Game.setPointer(null); };
    cv.addEventListener("pointerup", rel);
    cv.addEventListener("pointercancel", rel);

    // on-screen buttons
    bindPad($("pad-left"), () => Game.setLeft(true), () => Game.setLeft(false));
    bindPad($("pad-right"), () => Game.setRight(true), () => Game.setRight(false));

    Bus.on("settings:changed", ({ k }) => { if (k === "control") applyScheme(); });
    Bus.on("game:start", () => { applyScheme(); });
    Bus.on("game:pause", () => $("touch-buttons").classList.add("hidden"));
    Bus.on("game:resume", () => applyScheme());
    Bus.on("game:over", () => $("touch-buttons").classList.add("hidden"));
  }

  function bindPad(el, on, off) {
    el.addEventListener("pointerdown", (e) => { e.preventDefault(); $("touch-hint").classList.add("hidden"); on(); try { el.setPointerCapture(e.pointerId); } catch (x) {} });
    el.addEventListener("pointerup", off);
    el.addEventListener("pointercancel", off);
    el.addEventListener("pointerleave", off);
  }

  global.Input = { init, applyScheme };
})(window);
