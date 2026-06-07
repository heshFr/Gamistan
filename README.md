# 🐱 Nine Lives

> An endless arcade climber where you **race the ghosts of your past nine lives.**
> A **Gamistan** game.

Cats have nine lives — so this game gives you exactly nine. Every game seeds a
single, deterministic, endless course. You climb as high as you can... and the
moment you die, your entire run **replays as a translucent, numbered ghost-cat**
racing the exact same track. By your ninth life the screen is crowded with the
echoes of your former selves, and **touching any of them costs a life.** You're
not just dodging spikes — you're dodging your own history.

Dependency-free HTML5 Canvas. Plays instantly in a browser, installs as a PWA,
and builds to a real Android **APK** via CI.

---

## ✨ Features

- **The nine-lives ghost mechanic** — deterministic seeded courses so every
  replayed ghost lines up perfectly with the track.
- **8 biomes** — Dawn Spire, Cloud Kingdom, Starfall, Deep Current, Sugar Rush,
  Ashfall Peak, Neon Grid and The Nine Void — each with its own palette, themed
  hazards, parallax décor and **musical mode** (the chiptune soundtrack changes
  key per biome). Biomes loop with rising difficulty.
- **Nine-tailed guardian bosses** — a gauntlet at the top of every biome with a
  looming boss and sweeping laser hazards. Survive to defeat it for bonus fish.
- **8 power-ups** — Bubble Shield, Fish Magnet, Time Warp, Rocket Dash, Catnip
  Frenzy, Double Fish, Ghost Freeze and the rare Extra Life ❤️.
- **17 collectible cats**, **11 hats** and **8 trails** — mix and match your look.
- **6 permanent upgrades** — head start, magnetism, power-up duration, luck,
  a one-time revive token, and lucky-charm shielding.
- **24 achievements**, **daily challenge** (everyone shares the same seed +
  streaks) and **3 rotating daily missions** with claimable rewards.
- **Combos**, golden fish, score popups, particle trails, screen shake, squash
  &amp; stretch — lots of juice.
- **Full stats** page, **settings** (sound / music / vibration / high-contrast /
  reduced-motion / left-handed) and **three control schemes**: drag, on-screen
  buttons, or tilt.
- **Procedural everything** — all art is vector, all audio is synthesized
  WebAudio. No image or sound files, so it works **100% offline**.

---

## 🎮 How to play

- Your cat **climbs automatically.** **Drag**, tap the **side buttons**, **tilt**,
  or use **← →** to steer through the gaps.
- Grab **🐟 fish** for points and build **combos** (golden fish = 10×).
- When you die, you respawn at the bottom of the **same course** — now haunted by
  a numbered **ghost** of your last run. Don't touch your past selves!
- Climb the **8 biomes**, beat the **guardians**, and survive all **nine lives**.
- Spend fish in the **Shop** and **Upgrades**; complete **missions** &amp;
  **achievements** for more.

---

## ▶️ Play in a browser (instant)

No build step — dependency-free.

```bash
npm run serve        # → http://localhost:5173
```

Or open `www/index.html` directly. It's also an installable **PWA** (offline-ready).

---

## 📦 Get the Android APK

Built automatically by **GitHub Actions** (`.github/workflows/build-apk.yml`):

- **Every push** builds a fast, lean debug APK and uploads it as a workflow
  **artifact** (download from the Actions run page).
- **Manual runs** (Actions → *Build APK* → *Run workflow*) build the large,
  size-target APK and publish it as a **GitHub Release** you can install on your
  phone. Set the **`apk_bulk_mb`** input (default `950`) for the size.

Install on Android by enabling *"Install from unknown sources"*.

### About the ~1 GB size

The game logic is only a few KB. To meet the requested **~1 GB** download size,
CI generates incompressible **filler asset packs** at build time
(`scripts/generate-bulk-assets.js`) that get bundled into the APK — keeping the
**git repo lean** while making the **download large**. Set `apk_bulk_mb=0` for a
tiny APK. For a real launch you'd swap the filler for genuine HD art and music.

---

## 🛠️ Build the APK yourself

Requires the Android SDK + JDK 17.

```bash
npm install
node scripts/generate-bulk-assets.js   # optional: APK_BULK_MB=950
npx cap add android
npx cap sync android
cd android && ./gradlew assembleDebug
# → android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 🗂️ Project layout

```
www/
  index.html
  manifest.webmanifest, icon.svg, sw.js   PWA: installable & offline
  css/style.css
  js/
    util.js        math / easing / color / pools
    events.js      global event bus
    rng.js         seedable deterministic RNG (ghosts align)
    storage.js     save: economy, collections, stats, achievements,
                   upgrades, daily missions & challenge
    data.js        all content: cats, hats, trails, biomes, power-ups,
                   achievements, missions, upgrades
    audio.js       procedural WebAudio: per-biome chiptune + SFX
    sprites.js     vector art: cats, hats, fish, power-ups, hazards, boss
    particles.js   particles, trails, floating score text
    world.js       deterministic biome-aware course generation
    game.js        engine: climb, collisions, power-ups, bosses, ghosts
    input.js       drag / buttons / tilt / keyboard
    hud.js         in-game HUD, banners, toasts
    menu.js        menu, shop, missions, upgrades, awards, stats, settings
    main.js        bootstrap
scripts/
  generate-bulk-assets.js   build-time APK size filler
  dev-server.js             zero-dependency static server
capacitor.config.json
.github/workflows/build-apk.yml
```

---

Made with 🐾 for Gamistan.
