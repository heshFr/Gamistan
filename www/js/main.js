// main.js — boot the whole game once the DOM is ready.
(function () {
  function boot() {
    const canvas = document.getElementById("game");
    Sfx.init();
    Game.init(canvas);
    Input.init();
    HUD.init();
    Menu.init();

    // resume audio on first gesture (mobile autoplay policy)
    const wake = () => { Sfx.unlock(); window.removeEventListener("pointerdown", wake); };
    window.addEventListener("pointerdown", wake);

    // auto-pause when the app is backgrounded mid-run
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && Game.isPlaying() && !Game.isPaused()) Game.pause();
    });

    // gentle menu preview animation loop
    let last = performance.now();
    (function tick(now) {
      const dt = Math.min((now - last) / 1000, 0.05); last = now;
      Menu.tickPreview(dt);
      requestAnimationFrame(tick);
    })(last);

    // PWA offline support
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
