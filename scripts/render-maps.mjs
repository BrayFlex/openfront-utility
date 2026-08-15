/**
 * render-maps.mjs — pre-render OpenFront map images for the "simulate map"
 * preview, with zero external dependencies (only Node built-ins).
 *
 * Reads an OpenFrontIO checkout's `resources/maps/<slug>/manifest.json` and
 * `map.bin` (one byte per tile) and writes, per map:
 *
 *   src/maps/<slug>.png      — opaque RGB map at full manifest resolution
 *   src/maps/<slug>-land.png — grayscale land mask (255 = land, 0 = water)
 *
 * plus `src/data/maps.json`, a registry consumed by the app's map picker.
 *
 * The terrain colours and the tile byte layout replicate OpenFront's own
 * renderer (src/client/render/gl/utils/ColorUtils.ts and render-settings.json)
 * so the preview matches the in-game map as closely as possible:
 *
 *   bit 7  isLand
 *   bit 6  isShoreline
 *   bit 5  isOcean (not used for colouring)
 *   bits 0-4 magnitude (0-31)
 *
 * Water is drawn in the game's ocean palette (visible in the RGB map); the
 * separate land mask lets the preview apply patterns only over land, exactly
 * like in-game territory.
 *
 * Usage:
 *   node scripts/render-maps.mjs <OpenFrontIO path> [map-slug ...]
 *   npm run render:maps -- <OpenFrontIO path> [map-slug ...]
 *
 * With no slug list it renders the default set used by the app:
 * world alps twolakes arctic marenostrum gulfofstlawrence baikal
 * australia southamerica
 * (Baikal and South America are rendered from map4x.bin — the game's
 * "compact" resolution — because their full map.bin files are very large;
 * pass `baikal:map` to override).
 *
 * To add more maps, just append their slug (or `slug:map4x`/`slug:map`) to
 * the list and run the script again.
 */

import { deflateSync } from "node:zlib";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ── Configuration ──────────────────────────────────────────────────────────
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(rootDir, "src", "maps");
const dataOutPath = path.join(rootDir, "src", "data", "maps.json");

// The set of maps exposed in the app. `bin` chooses which terrain file to
// read: "map" (full resolution map.bin) or "map4x" (half-resolution map4x.bin,
// the game's "compact" map size).
const DEFAULT_MAPS = [
  { slug: "world", bin: "map" },
  { slug: "alps", bin: "map" },
  { slug: "twolakes", bin: "map" },
  { slug: "arctic", bin: "map" },
  { slug: "marenostrum", bin: "map" },
  { slug: "gulfofstlawrence", bin: "map" },
  { slug: "baikal", bin: "map4x" },
  { slug: "australia", bin: "map" },
  { slug: "southamerica", bin: "map4x" },
];

// In-game default terrain palette (render-settings.json > terrain).
const COLORS = {
  background: [0x3c, 0x3c, 0x3c], // impassable / outside map
  ocean: [0x47, 0x85, 0xb5],      // #4785b5
  sand: [0xcc, 0xcb, 0x9e],       // #CCCB9E
  plains: [0xbe, 0xdc, 0x8a],     // #BEDC8A
  highland: [0xdc, 0xcb, 0x9e],   // #DCCB9E
  mountain: [0xe6, 0xe6, 0xe6],   // #e6e6e6
};

// ── Terrain byte → RGB + land flag (mirrors ColorUtils.encodeTerrainTile) ──
function decodeTile(tb) {
  const isLand = (tb & 0x80) !== 0;
  const isShoreline = (tb & 0x40) !== 0;
  const magnitude = tb & 0x1f;

  if (!isLand) {
    return { rgb: waterColor(isShoreline, magnitude), land: false };
  }
  if (magnitude === 31) {
    // Impassable terrain → map background colour, treated as non-land
    return { rgb: COLORS.background, land: false };
  }

  let r, g, b;
  if (isShoreline) {
    [r, g, b] = COLORS.sand;
  } else if (magnitude < 10) {
    // Plains
    const base = COLORS.plains;
    r = base[0];
    g = base[1] - 2 * magnitude;
    b = base[2];
  } else if (magnitude < 20) {
    // Highland
    const base = COLORS.highland;
    const m = magnitude - 10;
    r = Math.min(255, base[0] + 2 * m);
    g = Math.min(255, base[1] + 2 * m);
    b = Math.min(255, base[2] + 2 * m);
  } else {
    // Mountain
    const base = COLORS.mountain;
    const m = Math.floor(magnitude / 2);
    r = Math.min(255, base[0] + m);
    g = Math.min(255, base[1] + m);
    b = Math.min(255, base[2] + m);
  }
  return { rgb: [r, g, b], land: true };
}

function waterColor(isShoreline, magnitude) {
  let r, g, b;
  if (isShoreline) {
    // Shoreline water: 70% ocean + 30% white
    const base = COLORS.ocean;
    r = Math.round(0.7 * base[0] + 76.5);
    g = Math.round(0.7 * base[1] + 76.5);
    b = Math.round(0.7 * base[2] + 76.5);
  } else {
    // Deep water — darkens with depth
    const m = Math.min(magnitude, 10);
    const base = COLORS.ocean;
    r = Math.max(0, base[0] - m);
    g = Math.max(0, base[1] - m);
    b = Math.max(0, base[2] - m);
  }
  return [r, g, b];
}

// ── Minimal PNG encoder (8-bit RGB or grayscale, per-row adaptive filter) ──
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

// bytesPerPixel = 3 (RGB) or 1 (grayscale)
function encodePng(width, height, pixels, bytesPerPixel) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = bytesPerPixel === 3 ? 2 : 0; // colour type 2 = RGB, 0 = grayscale
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const bpp = bytesPerPixel;
  const stride = width * bpp;
  const raw = Buffer.alloc((stride + 1) * height);
  let srcOffset = 0;
  let outOffset = 0;
  for (let y = 0; y < height; y++) {
    // Filter 0 (None) — zlib's deflate compresses these flat-colour maps well
    // on its own, and keeping raw bytes avoids filter overhead.
    raw[outOffset++] = 0;
    pixels.subarray(srcOffset, srcOffset + stride).forEach((v, i) => {
      raw[outOffset + i] = v;
    });
    outOffset += stride;
    srcOffset += stride;
  }
  const idat = deflateSync(raw, { level: 9 });

  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ── Rendering ───────────────────────────────────────────────────────────────
async function renderMap(repoPath, slug, binName) {
  const mapDir = path.join(repoPath, "resources", "maps", slug);
  const manifestPath = path.join(mapDir, "manifest.json");
  const binPath = path.join(mapDir, `${binName}.bin`);

  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const dims = manifest[binName];
  const width = dims.width;
  const height = dims.height;

  const mapBuffer = await readFile(binPath);
  if (mapBuffer.length !== width * height) {
    throw new Error(
      `${slug}: ${binName}.bin length ${mapBuffer.length} !== ${width} * ${height}`,
    );
  }

  const count = width * height;
  const rgb = new Uint8Array(count * 3);
  const land = new Uint8Array(count);
  for (let i = 0; i < count; i++) {
    const { rgb: c, land: isLand } = decodeTile(mapBuffer[i]);
    rgb[i * 3] = c[0];
    rgb[i * 3 + 1] = c[1];
    rgb[i * 3 + 2] = c[2];
    land[i] = isLand ? 255 : 0;
  }

  await mkdir(outDir, { recursive: true });
  const mapPng = encodePng(width, height, rgb, 3);
  const landPng = encodePng(width, height, land, 1);
  await writeFile(path.join(outDir, `${slug}.png`), mapPng);
  await writeFile(path.join(outDir, `${slug}-land.png`), landPng);
  return { slug, width, height, bytes: mapPng.length, landBytes: landPng.length };
}

// ── Entry ───────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const repoPath = args[0];
if (!repoPath) {
  console.error("Usage: node scripts/render-maps.mjs <OpenFrontIO path> [map-slug ...]");
  process.exit(1);
}

let requested;
if (args.length > 1) {
  requested = args.slice(1).map((arg) => {
    const [slug, bin = "map"] = arg.split(":");
    return { slug, bin };
  });
} else {
  requested = DEFAULT_MAPS;
}

const results = [];
for (const { slug, bin } of requested) {
  try {
    const result = await renderMap(repoPath, slug, bin);
    results.push(result);
    console.log(
      `✔ ${result.slug.padEnd(20)} ${String(result.width).padStart(5)}×${String(result.height).padEnd(5)} ${(result.bytes / 1024).toFixed(0).padStart(6)} KB map  ${(result.landBytes / 1024).toFixed(0).padStart(5)} KB mask  (${bin}.bin)`,
    );
  } catch (err) {
    console.error(`✖ ${slug}: ${err.message}`);
  }
}

// Display names shown in the app's map picker.
const MAP_NAMES = {
  world: "World",
  alps: "Alps",
  twolakes: "Two Lakes",
  arctic: "Arctic",
  marenostrum: "Mare Nostrum",
  gulfofstlawrence: "Gulf of St. Lawrence",
  baikal: "Baikal (compact)",
  australia: "Australia",
  southamerica: "South America (compact)",
};

// Registry consumed by the app's map picker.
await mkdir(path.dirname(dataOutPath), { recursive: true });
const registry = results.map((r) => ({
  slug: r.slug,
  name: MAP_NAMES[r.slug] ?? r.slug,
  width: r.width,
  height: r.height,
  file: `maps/${r.slug}.png`,
  landFile: `maps/${r.slug}-land.png`,
}));
await writeFile(dataOutPath, JSON.stringify(registry, null, 2) + "\n");
console.log(`Registry written to ${dataOutPath}`);