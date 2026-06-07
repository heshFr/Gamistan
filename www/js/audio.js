// audio.js — procedural WebAudio: layered chiptune that shifts musical mode
// per biome, plus a full SFX set. No asset files; works fully offline.
(function (global) {
  let ctx = null, master = null, musicBus = null, sfxBus = null;
  let musicOn = true, sfxOn = true;
  let stepTimer = null, step = 0;
  let currentScale = "pent", tempo = 132;
  let queuedMode = "pent";

  // semitone sets (one octave) for each musical mode
  const SCALES = {
    pent:  [0, 3, 5, 7, 10],
    major: [0, 2, 4, 5, 7, 9, 11],
    minor: [0, 2, 3, 5, 7, 8, 10],
    dorian:[0, 2, 3, 5, 7, 9, 10],
    lydian:[0, 2, 4, 6, 7, 9, 11],
    phryg: [0, 1, 3, 5, 7, 8, 10],
    chip:  [0, 2, 4, 7, 9],
    void:  [0, 1, 4, 6, 8, 11],
  };
  const ROOT = 110; // A2
  const semi = (n) => ROOT * Math.pow(2, n / 12);

  function ensure() {
    if (ctx) return;
    const AC = global.AudioContext || global.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination);
    musicBus = ctx.createGain(); musicBus.gain.value = 0.16; musicBus.connect(master);
    sfxBus = ctx.createGain(); sfxBus.gain.value = 0.6; sfxBus.connect(master);
  }
  function unlock() { ensure(); if (ctx && ctx.state === "suspended") ctx.resume(); }

  function tone(freq, dur, type, gain, when, bus, glideTo) {
    if (!ctx) return;
    when = when || ctx.currentTime;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || "square"; o.frequency.setValueAtTime(freq, when);
    if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, when + dur);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(gain, when + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    o.connect(g); g.connect(bus || sfxBus);
    o.start(when); o.stop(when + dur + 0.02);
  }
  function noise(dur, gain, hp) {
    if (!ctx) return;
    const t = ctx.currentTime, n = (ctx.sampleRate * dur) | 0;
    const buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const g = ctx.createGain(); g.gain.value = gain;
    let node = src;
    if (hp) { const f = ctx.createBiquadFilter(); f.type = "highpass"; f.frequency.value = hp; src.connect(f); node = f; }
    node.connect(g); g.connect(sfxBus); src.start(t);
  }

  // --------- music scheduler: 16-step bass + arpeggio + sparse lead ----------
  function musicStep() {
    if (!ctx || !musicOn) return;
    if (step % 16 === 0) currentScale = queuedMode; // change mode on the bar
    const scale = SCALES[currentScale] || SCALES.pent;
    const t = ctx.currentTime;
    const beat = step % 16;

    // bass on quarter notes
    if (beat % 4 === 0) {
      const deg = (Math.floor(step / 16) + (beat ? 2 : 0)) % scale.length;
      const f = semi(scale[deg]) / 2;
      tone(f, 0.34, "triangle", 0.16, t, musicBus);
    }
    // arpeggio every eighth
    if (beat % 2 === 0) {
      const idx = (beat / 2 + Math.floor(step / 8)) % scale.length;
      const f = semi(scale[idx] + 12);
      tone(f, 0.16, "square", 0.05, t, musicBus);
    }
    // sparse lead
    if (beat === 6 || beat === 14) {
      const idx = (step * 3) % scale.length;
      const f = semi(scale[idx] + 24);
      tone(f, 0.22, "sawtooth", 0.035, t, musicBus);
    }
    step++;
  }

  const Sfx = {
    init() {
      ensure();
      sfxOn = Save.setting("sound"); musicOn = Save.setting("music");
      Bus.on("settings:changed", ({ k, v }) => {
        if (k === "sound") sfxOn = v;
        if (k === "music") { musicOn = v; if (v) Sfx.startMusic(); else Sfx.stopMusic(); }
      });
    },
    unlock,
    setBiomeMode(mode) { if (SCALES[mode]) queuedMode = mode; },
    setTempo(t) { tempo = t; },

    // ---- SFX ----
    meow() { tone(520, 0.12, "sawtooth", 0.28, 0, sfxBus, 720); tone(700, 0.16, "sawtooth", 0.2, ctx ? ctx.currentTime + 0.1 : 0, sfxBus, 480); },
    jump() { tone(300, 0.12, "square", 0.3, 0, sfxBus, 640); },
    fish() { if (!ctx) return; const t = ctx.currentTime; tone(660, 0.08, "square", 0.32, t); tone(990, 0.1, "square", 0.32, t + 0.05); },
    golden() { if (!ctx) return; const t = ctx.currentTime; [660, 880, 1320].forEach((f, i) => tone(f, 0.12, "square", 0.3, t + i * 0.05)); },
    combo(n) { if (!ctx) return; const t = ctx.currentTime; tone(523 + n * 22, 0.1, "square", 0.3, t); tone(784 + n * 30, 0.12, "square", 0.3, t + 0.06); },
    power(color) { if (!ctx) return; const t = ctx.currentTime; tone(440, 0.1, "square", 0.3, t, sfxBus, 880); tone(880, 0.14, "sawtooth", 0.2, t + 0.08, sfxBus, 1320); },
    shield() { tone(300, 0.25, "sine", 0.3, 0, sfxBus, 900); },
    hit() { noise(0.18, 0.3, 800); tone(200, 0.18, "square", 0.25, 0, sfxBus, 80); },
    die() { tone(420, 0.45, "sawtooth", 0.35, 0, sfxBus, 70); noise(0.3, 0.25); },
    lifeLost() { tone(240, 0.5, "triangle", 0.32, 0, sfxBus, 110); },
    ghost() { tone(180, 0.25, "sine", 0.12, 0, sfxBus, 90); },
    boss() { if (!ctx) return; const t = ctx.currentTime; tone(110, 0.6, "sawtooth", 0.3, t, sfxBus, 70); noise(0.5, 0.2, 200); },
    bossWin() { if (!ctx) return; const t = ctx.currentTime; [392, 523, 659, 784, 1046].forEach((f, i) => tone(f, 0.16, "square", 0.3, t + i * 0.08)); },
    click() { tone(440, 0.05, "square", 0.25, 0, sfxBus); },
    buy() { if (!ctx) return; const t = ctx.currentTime; tone(523, 0.1, "square", 0.3, t); tone(784, 0.12, "square", 0.3, t + 0.07); tone(1046, 0.14, "square", 0.3, t + 0.14); },
    deny() { tone(200, 0.12, "square", 0.25, 0, sfxBus, 140); },
    achievement() { if (!ctx) return; const t = ctx.currentTime; [659, 880, 1175].forEach((f, i) => tone(f, 0.18, "triangle", 0.28, t + i * 0.09)); },
    win() { if (!ctx) return; const t = ctx.currentTime; [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 0.2, "square", 0.3, t + i * 0.1)); },
    revive() { if (!ctx) return; const t = ctx.currentTime; [261, 392, 523, 784].forEach((f, i) => tone(f, 0.2, "triangle", 0.3, t + i * 0.09)); },

    isSound: () => sfxOn,
    isMusic: () => musicOn,
    startMusic() { ensure(); if (!musicOn || stepTimer) return; step = 0; musicStep(); stepTimer = setInterval(musicStep, (60 / tempo / 4) * 1000); },
    stopMusic() { if (stepTimer) { clearInterval(stepTimer); stepTimer = null; } },
  };

  global.Sfx = Sfx;
})(window);
