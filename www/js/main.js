// main.js — bootstrap everything once the DOM is ready.
(function () {
  function boot() {
    const canvas = document.getElementById("game");
    Save; // ensure loaded
    Sfx.init();
    Game.init(canvas);
    UI.init();

    // Resume audio on first interaction (mobile autoplay policy).
    const wake = () => { Sfx.unlock(); window.removeEventListener("pointerdown", wake); };
    window.addEventListener("pointerdown", wake);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
