#!/usr/bin/env node
/**
 * generate-bulk-assets.js
 * -----------------------------------------------------------------------------
 * Inflates the APK toward the requested ~1 GB size target.
 *
 * The game itself is tiny (a few KB of JS). To honour the "~1 GB" request
 * without bloating the git repo, this script generates incompressible filler
 * asset packs at BUILD TIME (in CI), which Capacitor bundles into the APK.
 * The bulk folder is git-ignored, so the repository stays lean while the
 * downloadable APK is large.
 *
 *   APK_BULK_MB   total megabytes of filler to generate (default 950)
 *
 * NOTE: This is honest padding to satisfy a size target. For a real shipping
 * game you'd replace it with HD sprite atlases, music, and video instead.
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const TARGET_MB = parseInt(process.env.APK_BULK_MB || "950", 10);
const OUT_DIR = path.join(__dirname, "..", "www", "assets", "bulk");
const CHUNK_FILE_MB = 64;            // size of each pack file
const WRITE_CHUNK = 8 * 1024 * 1024; // 8 MB write buffer

function human(mb) { return mb >= 1024 ? (mb / 1024).toFixed(2) + " GB" : mb + " MB"; }

function writeRandomFile(file, sizeBytes) {
  const fd = fs.openSync(file, "w");
  let written = 0;
  const buf = Buffer.allocUnsafe(WRITE_CHUNK);
  while (written < sizeBytes) {
    const n = Math.min(WRITE_CHUNK, sizeBytes - written);
    // Random bytes are incompressible, so the zipped APK keeps its size.
    crypto.randomFillSync(buf, 0, n);
    fs.writeSync(fd, buf, 0, n);
    written += n;
  }
  fs.closeSync(fd);
}

function main() {
  if (TARGET_MB <= 0) {
    console.log("[bulk] APK_BULK_MB=0 — skipping filler generation (lean build).");
    return;
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const numFull = Math.floor(TARGET_MB / CHUNK_FILE_MB);
  const remainder = TARGET_MB - numFull * CHUNK_FILE_MB;
  const total = numFull + (remainder > 0 ? 1 : 0);
  console.log(`[bulk] Generating ${human(TARGET_MB)} of filler across ${total} pack(s) in ${OUT_DIR}`);

  const start = Date.now();
  let made = 0;
  for (let i = 0; i < numFull; i++) {
    const f = path.join(OUT_DIR, `pack-${String(i).padStart(3, "0")}.dat`);
    writeRandomFile(f, CHUNK_FILE_MB * 1024 * 1024);
    made++;
    process.stdout.write(`\r[bulk] wrote ${made}/${total} packs (${human(made * CHUNK_FILE_MB)})   `);
  }
  if (remainder > 0) {
    const f = path.join(OUT_DIR, `pack-${String(numFull).padStart(3, "0")}.dat`);
    writeRandomFile(f, remainder * 1024 * 1024);
    made++;
    process.stdout.write(`\r[bulk] wrote ${made}/${total} packs (${human(TARGET_MB)})   `);
  }

  // A manifest so the bundle has a readable record of what was generated.
  fs.writeFileSync(path.join(OUT_DIR, "manifest.json"), JSON.stringify({
    generatedAt: new Date().toISOString(),
    targetMB: TARGET_MB,
    packs: made,
    note: "Build-time filler to meet the APK size target. Replace with real HD assets for production.",
  }, null, 2));

  console.log(`\n[bulk] Done in ${((Date.now() - start) / 1000).toFixed(1)}s — ${human(TARGET_MB)} ready.`);
}

main();
