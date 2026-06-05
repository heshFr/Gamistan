# 🐱 Nine Lives

> An endless arcade climber where you **race the ghosts of your past nine lives.**
> A **Gamistan** game.

Cats have nine lives — so this game gives you exactly nine. Every game seeds a
single, deterministic, endless course. You climb as high as you can... and the
moment you die, your entire run **replays as a translucent ghost-cat** racing
the exact same track. By your ninth life the screen is crowded with the echoes
of your former selves, and **touching any of them costs a life.** You're not
just dodging spikes — you're dodging your own history.

It's a simple one-thumb game with a hook you haven't played before.

---

## 🎮 How to play

- Your cat **climbs automatically.** Steer **left / right** to thread the gaps.
- **Drag** anywhere (or use **← →** keys) to steer.
- Grab **🐟 fish** for points and build **combos**. Rare **golden fish** are worth 10×.
- When you die, you respawn at the bottom of the **same course** — but your last
  run is now a numbered **ghost** you must avoid.
- Survive all **nine lives** and climb for the highest score.
- Spend fish in the **CATS** shop to unlock 9 collectible kitties.

The course is fully deterministic from a seed, so ghosts line up perfectly with
the track every life. That's the whole trick.

---

## ▶️ Play in a browser (instant)

No build step — it's dependency-free HTML5 Canvas.

```bash
npm run serve
# open http://localhost:5173
```

Or just open `www/index.html` directly in a browser.

---

## 📦 Get the Android APK

The APK is built automatically by **GitHub Actions** (`.github/workflows/build-apk.yml`):

- **Every push** builds a fast, lean debug APK and uploads it as a workflow
  **artifact** (download from the Actions run page).
- **Manual runs** (Actions → *Build APK* → *Run workflow*) build the large,
  size-target APK and publish it as a **GitHub Release** you can download
  directly on your phone.

To make the big release build:

1. Go to the repo's **Actions** tab → **Build APK** → **Run workflow**.
2. Set **`apk_bulk_mb`** (default `950`) to your desired filler size.
3. When it finishes, grab `NineLives-<n>.apk` from the new **Release**.

Install on Android by enabling *"Install from unknown sources"*.

### About the ~1 GB size

The game logic is only a few KB. To meet the requested **~1 GB** download size,
CI generates incompressible **filler asset packs** at build time
(`scripts/generate-bulk-assets.js`) which get bundled into the APK. This keeps
the **git repo lean** while making the **download large**. Control it with the
`apk_bulk_mb` input (set to `0` for a tiny APK). For a real production game
you'd swap the filler for genuine HD art, music, and video.

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
www/                  the game (open in any browser)
  index.html
  css/style.css
  js/
    rng.js            seedable deterministic RNG (so ghosts align)
    storage.js        local save: best score, fish bank, unlocked cats
    audio.js          procedural WebAudio chiptune SFX + music (no files)
    sprites.js        vector cat art + the 9 unlockable skins
    world.js          deterministic endless course generation
    game.js           engine: climb, collisions, ghost record/replay
    ui.js             menus, HUD, cat shop, input
    main.js           bootstrap
scripts/
  generate-bulk-assets.js   build-time APK size filler
  dev-server.js             zero-dep static server
capacitor.config.json
.github/workflows/build-apk.yml
```

---

Made with 🐾 for Gamistan.
