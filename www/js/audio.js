// audio.js — fully procedural sound via WebAudio. No asset files needed,
// so the game makes noise even fully offline inside the APK.
(function (global) {
  let ctx = null;
  let master = null;
  let musicGain = null;
  let enabled = true;
  let musicTimer = null;

  function ensure() {
    if (ctx) return;
    const AC = global.AudioContext || global.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.35;
    master.connect(ctx.destination);
    musicGain = ctx.createGain();
    musicGain.gain.value = 0.14;
    musicGain.connect(master);
  }

  // Wake the audio context after a user gesture (mobile autoplay policy).
  function unlock() {
    ensure();
    if (ctx && ctx.state === "suspended") ctx.resume();
  }

  function blip(freq, dur, type, when, gain) {
    if (!ctx || !enabled) return;
    when = when || ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type || "square";
    o.frequency.setValueAtTime(freq, when);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(gain || 0.5, when + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    o.connect(g); g.connect(master);
    o.start(when); o.stop(when + dur + 0.02);
  }

  function slide(f1, f2, dur, type, gain) {
    if (!ctx || !enabled) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type || "sine";
    o.frequency.setValueAtTime(f1, t);
    o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(gain || 0.4, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.02);
  }

  function noise(dur, gain) {
    if (!ctx || !enabled) return;
    const t = ctx.currentTime;
    const n = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = ctx.createBufferSource();
    const g = ctx.createGain();
    g.gain.value = gain || 0.4;
    src.buffer = buf; src.connect(g); g.connect(master);
    src.start(t);
  }

  // ---- Background music: simple looping arpeggio in A minor pentatonic ----
  const SCALE = [220, 261.63, 293.66, 329.63, 392, 440, 523.25];
  let step = 0;
  function tick() {
    if (!ctx || !enabled) return;
    const t = ctx.currentTime;
    const root = SCALE[step % SCALE.length];
    // bass
    const b = ctx.createOscillator(); const bg = ctx.createGain();
    b.type = "triangle"; b.frequency.value = root / 2;
    bg.gain.setValueAtTime(0.0001, t);
    bg.gain.exponentialRampToValueAtTime(0.12, t + 0.02);
    bg.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
    b.connect(bg); bg.connect(musicGain); b.start(t); b.stop(t + 0.3);
    // melody
    const mFreq = SCALE[(step * 3 + 2) % SCALE.length] * 2;
    const m = ctx.createOscillator(); const mg = ctx.createGain();
    m.type = "square"; m.frequency.value = mFreq;
    mg.gain.setValueAtTime(0.0001, t);
    mg.gain.exponentialRampToValueAtTime(0.06, t + 0.01);
    mg.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    m.connect(mg); mg.connect(musicGain); m.start(t); m.stop(t + 0.2);
    step++;
  }

  global.Sfx = {
    init: function () { ensure(); enabled = Save.get("soundOn"); },
    unlock: unlock,
    setEnabled: function (on) {
      enabled = on; Save.set("soundOn", on);
      if (!on) this.stopMusic(); else this.startMusic();
    },
    isEnabled: function () { return enabled; },

    meow: function () { slide(520, 700, 0.12, "sawtooth", 0.3); slide(700, 480, 0.18, "sawtooth", 0.25); },
    jump: function () { slide(300, 620, 0.12, "square", 0.3); },
    fish: function () {
      if (!ctx) return; const t = ctx.currentTime;
      blip(660, 0.08, "square", t, 0.4); blip(880, 0.1, "square", t + 0.06, 0.4);
    },
    combo: function (n) { blip(523 + n * 40, 0.1, "square", 0, 0.4); blip(784 + n * 50, 0.12, "square", (ctx ? ctx.currentTime : 0) + 0.07, 0.4); },
    die: function () { slide(400, 80, 0.4, "sawtooth", 0.4); noise(0.3, 0.3); },
    lifeLost: function () { slide(220, 110, 0.5, "triangle", 0.35); },
    ghost: function () { slide(180, 90, 0.25, "sine", 0.15); },
    click: function () { blip(440, 0.05, "square", 0, 0.3); },
    win: function () {
      if (!ctx) return; const t = ctx.currentTime;
      [523, 659, 784, 1046].forEach((f, i) => blip(f, 0.18, "square", t + i * 0.1, 0.4));
    },

    startMusic: function () {
      ensure();
      if (!enabled || musicTimer) return;
      step = 0; tick();
      musicTimer = setInterval(tick, 300);
    },
    stopMusic: function () {
      if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
    },
  };
})(window);
