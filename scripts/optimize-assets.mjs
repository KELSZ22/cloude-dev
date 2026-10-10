/**
 * Re-encodes the bundled artwork to WebP at roughly 3x its on-screen size.
 *
 * React Native decodes a bundled asset at its full pixel size no matter what the
 * style says, so a 1448x1086 PNG shown 220px wide still costs ~6 MB of RGBA and the
 * CPU to unpack it. `target` below is the widest place each asset is drawn, taken
 * from the stylesheets; keep the two in sync when a layout changes.
 *
 * Usage: bun scripts/optimize-assets.mjs [--dry]
 */
import { mkdir, readdir, rename, stat } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import sharp from "sharp";

const ROOT = join(import.meta.dirname, "..");
const ORIGINALS = join(ROOT, "assets", "_originals");
const DRY = process.argv.includes("--dry");

/** `width` is the widest rendered size in dp; the encoder scales it by 3 for xxhdpi. */
const assets = [
  // Header wordmark: 220x56 on the welcome screen, 120x40 in the dashboard header.
  { file: "logo/Seekora-textlogo-light.png", width: 220 },
  { file: "logo/Seekora-textlogo-dark.png", width: 220 },
  // Round brand mark: 72x72 on welcome, 56x56 in the profile row.
  { file: "logo/logo-greenbg.png", width: 72 },
  // Dashboard action cards draw these at 48x48.
  { file: "dashboard/read-and-learn.png", width: 48 },
  { file: "dashboard/library.png", width: 48 },
  // Hero still sits behind the mascot video, full width of the 600dp content column.
  { file: "dashboard/dashboard.jpg", width: 600 },
  // Challenge invite mascot, 132x148.
  { file: "avatars/Thumbs-Up.png", width: 132 },
  { file: "avatars/Salute.png", width: 132 },
  { file: "avatars/Sleepy.png", width: 132 },
  { file: "avatars/Surprised.png", width: 132 },
  // Result and empty-state art, 220-260 wide.
  { file: "results/celebration.png", width: 260 },
  { file: "results/noresult.png", width: 260 },
  { file: "results/error.png", width: 260 },
  // Assistant avatar, 36x36.
  { file: "seekora-assistant.png", width: 36 },
  // Corner leaves, up to 140 wide.
  { file: "elements/left-leaves.png", width: 140 },
  { file: "elements/right-leaves.png", width: 140 },
  // Full-bleed onboarding and welcome artwork.
  { file: "onboarding/onboarding1.png", width: 420 },
  { file: "onboarding/onboarding2.png", width: 420 },
  { file: "splash/splash.jpg", width: 420 },
];

const DENSITY = 3;

async function sizeOf(path) {
  try {
    return (await stat(path)).size;
  } catch {
    return 0;
  }
}

function kb(bytes) {
  return `${Math.round(bytes / 1024).toLocaleString()} KB`;
}

async function run() {
  await mkdir(ORIGINALS, { recursive: true });
  let before = 0;
  let after = 0;

  for (const { file, width } of assets) {
    const source = join(ROOT, "assets", file);
    const sourceBytes = await sizeOf(source);
    if (!sourceBytes) {
      console.log(`skip   ${file} (not found)`);
      continue;
    }

    const image = sharp(source);
    const meta = await image.metadata();
    const target = Math.min(width * DENSITY, meta.width ?? Infinity);
    const output = source.replace(/\.(png|jpe?g)$/i, ".webp");

    if (DRY) {
      console.log(`would  ${file}  ${meta.width}px -> ${target}px`);
      continue;
    }

    await image
      .resize({ width: target, withoutEnlargement: true })
      .webp({ quality: 88, effort: 6 })
      .toFile(output);

    const outputBytes = await sizeOf(output);
    before += sourceBytes;
    after += outputBytes;

    const kept = join(ORIGINALS, file);
    await mkdir(dirname(kept), { recursive: true });
    await rename(source, kept);

    console.log(
      `ok     ${relative(ROOT, output).replace(/\\/g, "/")}  ` +
        `${meta.width}px/${kb(sourceBytes)} -> ${target}px/${kb(outputBytes)}`,
    );
  }

  if (!DRY) {
    const saved = before - after;
    console.log(
      `\n${kb(before)} -> ${kb(after)} (saved ${kb(saved)}, ` +
        `${Math.round((saved / before) * 100)}%)`,
    );
    console.log(`originals moved to ${relative(ROOT, ORIGINALS)}`);
  }
}

await run();
