// Generates princess character walk and idle spritesheets.
// Walk: 192×96 (6 cols × 3 rows of 32×32 frames)
// Idle: 128×96 (4 cols × 3 rows of 32×32 frames)
// Row order: 0=down, 1=right, 2=up (left uses flipX in game)
// Run: node scripts/generate-princess.js

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { deflateSync } from 'zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'public', 'assets', 'character');
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

// ─── PNG Encoder (from generate-icons.js) ──────────────────────────────────

function createPNG(width, height, pixels) {
  const rawData = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    const rowOffset = y * (width * 4 + 1);
    rawData[rowOffset] = 0; // filter: None
    for (let x = 0; x < width; x++) {
      const pi = (y * width + x) * 4;
      const ri = rowOffset + 1 + x * 4;
      rawData[ri] = pixels[pi];
      rawData[ri + 1] = pixels[pi + 1];
      rawData[ri + 2] = pixels[pi + 2];
      rawData[ri + 3] = pixels[pi + 3];
    }
  }
  const compressed = deflateSync(rawData);
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc32(td) >>> 0);
    return Buffer.concat([len, td, crcBuf]);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  return Buffer.concat([
    signature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0))
  ]);
}

const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) crc = crcTable[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// ─── Drawing Helpers ───────────────────────────────────────────────────────

const S = 32; // sprite frame size

function fill(buf, x, y, w, h, r, g, b, a = 255) {
  for (let py = y; py < y + h; py++) {
    for (let px = x; px < x + w; px++) {
      if (px >= 0 && px < S && py >= 0 && py < S) {
        const i = (py * S + px) * 4;
        buf[i] = r; buf[i + 1] = g; buf[i + 2] = b; buf[i + 3] = a;
      }
    }
  }
}

function dot(buf, x, y, r, g, b, a = 255) {
  fill(buf, x, y, 1, 1, r, g, b, a);
}

// ─── Color Palette ─────────────────────────────────────────────────────────
// Matches the bright spring aesthetic of the Farm RPG tileset

const C = {
  hair:    [139, 90, 43],
  hairHi:  [180, 120, 60],
  skin:    [255, 200, 160],
  skinSh:  [235, 170, 130],
  dress:   [180, 140, 220],
  dressHi: [210, 180, 240],
  dressDk: [140, 100, 180],
  crown:   [255, 210, 80],
  crownHi: [255, 235, 140],
  eye:     [80, 140, 220],
  eyeW:    [240, 240, 255],
  mouth:   [220, 120, 120],
  shoe:    [120, 70, 40],
  shoeDk:  [90, 50, 30],
};

// ─── Direction Renderers ───────────────────────────────────────────────────
// Character layout (32×32 frame):
//   Crown:  y ≈ 3-5     (gold, 3 points)
//   Hair:   y ≈ 6-13    (brown, frames face)
//   Face:   y ≈ 9-12    (skin, eyes, mouth)
//   Neck:   y ≈ 14      (skin)
//   Dress:  y ≈ 15-25   (lavender A-line)
//   Feet:   y ≈ 26-27   (brown shoes)
// Collision box: setSize(14,18) setOffset(9,12) → x:9-22, y:12-29

function drawDown(buf, f, walk) {
  // Animation offsets
  const b   = walk ? [0, -1, 0, 0, -1, 0][f] : [0, 0, -1, 0][f]; // body bob
  const aL  = walk ? [1, 0, -1, -1, 0, 1][f] : 0; // left arm swing
  const aR  = walk ? [-1, 0, 1, 1, 0, -1][f] : 0; // right arm swing
  const dL  = walk ? [0, 1, 0, 0, -1, 0][f] : 0;  // dress sway left
  const dR  = walk ? [0, -1, 0, 0, 1, 0][f] : 0;  // dress sway right
  const blk = !walk && f === 2; // blink on idle frame 2

  // Foot stride
  let lfx = 12, rfx = 18;
  if (walk) {
    lfx += [-1, 0, -1, 1, 0, 1][f];
    rfx += [1, 0, 1, -1, 0, -1][f];
  }

  // ── Feet ──
  fill(buf, lfx, 26 + b, 3, 2, ...C.shoe);
  fill(buf, rfx, 26 + b, 3, 2, ...C.shoe);

  // ── Dress (A-line, widening from waist to hem) ──
  fill(buf, 9 + dL, 24 + b, 14 + dR - dL, 2, ...C.dressDk); // hem
  fill(buf, 9, 22 + b, 14, 2, ...C.dress);                    // lower
  fill(buf, 10, 20 + b, 12, 2, ...C.dress);                   // mid-lower
  fill(buf, 10, 18 + b, 12, 2, ...C.dress);                   // middle
  fill(buf, 11, 16 + b, 10, 2, ...C.dress);                   // upper
  fill(buf, 12, 15 + b, 8, 1, ...C.dressDk);                  // belt/sash
  fill(buf, 14, 17 + b, 4, 4, ...C.dressHi);                  // front highlight

  // ── Arms ──
  fill(buf, 9, 15 + b + aL, 2, 5, ...C.skin);   // left arm
  fill(buf, 21, 15 + b + aR, 2, 5, ...C.skin);  // right arm
  fill(buf, 9, 20 + b + aL, 2, 1, ...C.skinSh); // left hand shadow
  fill(buf, 21, 20 + b + aR, 2, 1, ...C.skinSh);// right hand shadow

  // ── Neck ──
  fill(buf, 14, 14 + b, 4, 1, ...C.skin);

  // ── Head (hair forms the shape, face inset) ──
  fill(buf, 12, 6 + b, 8, 1, ...C.hair);    // hair top
  fill(buf, 11, 7 + b, 10, 7, ...C.hair);   // hair main
  fill(buf, 12, 7 + b, 3, 2, ...C.hairHi);  // hair highlight

  // Face (inside hair)
  fill(buf, 13, 9 + b, 6, 4, ...C.skin);
  dot(buf, 13, 12 + b, ...C.skinSh); // left cheek blush
  dot(buf, 18, 12 + b, ...C.skinSh); // right cheek blush

  // ── Eyes ──
  if (blk) {
    // Blink: eyes closed (horizontal lines)
    fill(buf, 13, 10 + b, 2, 1, ...C.eye);
    fill(buf, 17, 10 + b, 2, 1, ...C.eye);
  } else {
    // Eyes open (2×2 with white highlight)
    fill(buf, 13, 10 + b, 2, 2, ...C.eye);
    fill(buf, 17, 10 + b, 2, 2, ...C.eye);
    dot(buf, 14, 10 + b, ...C.eyeW); // left eye shine
    dot(buf, 18, 10 + b, ...C.eyeW); // right eye shine
  }

  // ── Mouth ──
  dot(buf, 15, 12 + b, ...C.mouth);
  dot(buf, 16, 12 + b, ...C.mouth);

  // ── Crown ──
  fill(buf, 13, 5 + b, 6, 1, ...C.crown);     // base band
  fill(buf, 15, 3 + b, 2, 2, ...C.crownHi);   // center point (tallest)
  dot(buf, 13, 4 + b, ...C.crown);             // left point
  dot(buf, 18, 4 + b, ...C.crown);             // right point
  dot(buf, 15, 5 + b, ...C.eye);               // blue jewel
}

function drawRight(buf, f, walk) {
  const b   = walk ? [0, -1, 0, 0, -1, 0][f] : [0, 0, -1, 0][f];
  const arm = walk ? [1, 0, -1, -1, 0, 1][f] : 0;
  const blk = !walk && f === 2;

  // Foot stride (side view: horizontal movement)
  let ffx = 16, bfx = 13; // front/back foot x
  if (walk) {
    ffx += [1, 0, 2, -1, 0, -2][f];
    bfx += [-1, 0, -2, 1, 0, 2][f];
  }

  // ── Feet ──
  fill(buf, bfx, 26 + b, 3, 2, ...C.shoeDk); // back foot (darker)
  fill(buf, ffx, 26 + b, 3, 2, ...C.shoe);    // front foot

  // ── Dress (side profile — narrower) ──
  fill(buf, 11, 24 + b, 10, 2, ...C.dressDk); // hem
  fill(buf, 11, 22 + b, 10, 2, ...C.dress);   // lower
  fill(buf, 12, 20 + b, 9, 2, ...C.dress);    // mid-lower
  fill(buf, 12, 18 + b, 9, 2, ...C.dress);    // middle
  fill(buf, 13, 16 + b, 7, 2, ...C.dress);    // upper
  fill(buf, 13, 15 + b, 6, 1, ...C.dressDk);  // belt
  fill(buf, 15, 17 + b, 3, 4, ...C.dressHi);  // side highlight

  // ── Arm (front arm visible) ──
  fill(buf, 19, 15 + b + arm, 2, 5, ...C.skin);
  fill(buf, 19, 20 + b + arm, 2, 1, ...C.skinSh);

  // ── Neck ──
  fill(buf, 15, 14 + b, 3, 1, ...C.skin);

  // ── Head (profile) ──
  // Hair (back/top of head)
  fill(buf, 13, 6 + b, 5, 1, ...C.hair);     // top
  fill(buf, 12, 7 + b, 7, 7, ...C.hair);     // main head
  fill(buf, 11, 9 + b, 1, 4, ...C.hair);     // back strand
  fill(buf, 11, 13 + b, 3, 2, ...C.hairHi);  // flowing hair tips
  fill(buf, 13, 7 + b, 2, 2, ...C.hairHi);   // top highlight

  // Face (right half visible)
  fill(buf, 16, 9 + b, 4, 4, ...C.skin);
  dot(buf, 20, 10 + b, ...C.skinSh); // nose

  // Eye
  if (blk) {
    fill(buf, 17, 10 + b, 2, 1, ...C.eye);
  } else {
    fill(buf, 17, 10 + b, 2, 2, ...C.eye);
    dot(buf, 18, 10 + b, ...C.eyeW);
  }

  // Mouth
  dot(buf, 19, 12 + b, ...C.mouth);

  // Cheek
  dot(buf, 19, 11 + b, ...C.skinSh);

  // ── Crown (side view) ──
  fill(buf, 14, 5 + b, 4, 1, ...C.crown);   // base
  dot(buf, 15, 4 + b, ...C.crownHi);         // front point
  dot(buf, 16, 3 + b, ...C.crownHi);         // top point
  dot(buf, 14, 4 + b, ...C.crown);           // back point
  dot(buf, 16, 5 + b, ...C.eye);             // jewel
}

function drawUp(buf, f, walk) {
  const b  = walk ? [0, -1, 0, 0, -1, 0][f] : [0, 0, -1, 0][f];
  const aL = walk ? [-1, 0, 1, 1, 0, -1][f] : 0;
  const aR = walk ? [1, 0, -1, -1, 0, 1][f] : 0;
  const dL = walk ? [0, -1, 0, 0, 1, 0][f] : 0;
  const dR = walk ? [0, 1, 0, 0, -1, 0][f] : 0;

  let lfx = 12, rfx = 18;
  if (walk) {
    lfx += [1, 0, 1, -1, 0, -1][f];
    rfx += [-1, 0, -1, 1, 0, 1][f];
  }

  // ── Feet ──
  fill(buf, lfx, 26 + b, 3, 2, ...C.shoe);
  fill(buf, rfx, 26 + b, 3, 2, ...C.shoe);

  // ── Dress (back view) ──
  fill(buf, 9 + dL, 24 + b, 14 + dR - dL, 2, ...C.dressDk);
  fill(buf, 9, 22 + b, 14, 2, ...C.dress);
  fill(buf, 10, 20 + b, 12, 2, ...C.dress);
  fill(buf, 10, 18 + b, 12, 2, ...C.dress);
  fill(buf, 11, 16 + b, 10, 2, ...C.dress);
  fill(buf, 12, 15 + b, 8, 1, ...C.dressDk);   // belt
  fill(buf, 14, 18 + b, 4, 4, ...C.dressDk);    // back shadow/fold

  // ── Arms ──
  fill(buf, 9, 15 + b + aL, 2, 5, ...C.skin);
  fill(buf, 21, 15 + b + aR, 2, 5, ...C.skin);
  fill(buf, 9, 20 + b + aL, 2, 1, ...C.skinSh);
  fill(buf, 21, 20 + b + aR, 2, 1, ...C.skinSh);

  // ── Neck ──
  fill(buf, 14, 14 + b, 4, 1, ...C.skin);

  // ── Head (back view — all hair) ──
  fill(buf, 12, 6 + b, 8, 1, ...C.hair);     // top
  fill(buf, 11, 7 + b, 10, 7, ...C.hair);    // main
  fill(buf, 12, 14 + b, 8, 2, ...C.hair);    // hair over shoulders
  fill(buf, 14, 7 + b, 4, 2, ...C.hairHi);   // highlight
  fill(buf, 16, 6 + b, 1, 4, ...C.hairHi);   // center part line

  // Ears peeking out
  dot(buf, 11, 10 + b, ...C.skinSh);
  dot(buf, 20, 10 + b, ...C.skinSh);

  // ── Crown (back view) ──
  fill(buf, 13, 5 + b, 6, 1, ...C.crown);
  fill(buf, 15, 3 + b, 2, 2, ...C.crownHi);
  dot(buf, 13, 4 + b, ...C.crown);
  dot(buf, 18, 4 + b, ...C.crown);
}

// ─── Frame Assembly ────────────────────────────────────────────────────────

function drawFrame(dir, frame, walk) {
  const buf = new Uint8Array(S * S * 4); // starts fully transparent
  if (dir === 'down') drawDown(buf, frame, walk);
  else if (dir === 'right') drawRight(buf, frame, walk);
  else drawUp(buf, frame, walk);
  return buf;
}

function blitFrame(sheet, sheetW, frame, fx, fy) {
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const si = (y * S + x) * 4;
      if (frame[si + 3] === 0) continue; // skip transparent pixels
      const di = ((fy + y) * sheetW + (fx + x)) * 4;
      sheet[di]     = frame[si];
      sheet[di + 1] = frame[si + 1];
      sheet[di + 2] = frame[si + 2];
      sheet[di + 3] = frame[si + 3];
    }
  }
}

// ─── Generate Spritesheets ─────────────────────────────────────────────────

const dirs = ['down', 'right', 'up'];

// Walk spritesheet: 6 cols × 3 rows = 192 × 96
const wW = 6 * S, wH = 3 * S;
const wPx = new Uint8Array(wW * wH * 4);
for (let r = 0; r < 3; r++) {
  for (let c = 0; c < 6; c++) {
    blitFrame(wPx, wW, drawFrame(dirs[r], c, true), c * S, r * S);
  }
}
writeFileSync(join(outDir, 'walk.png'), createPNG(wW, wH, wPx));

// Idle spritesheet: 4 cols × 3 rows = 128 × 96
const iW = 4 * S, iH = 3 * S;
const iPx = new Uint8Array(iW * iH * 4);
for (let r = 0; r < 3; r++) {
  for (let c = 0; c < 4; c++) {
    blitFrame(iPx, iW, drawFrame(dirs[r], c, false), c * S, r * S);
  }
}
writeFileSync(join(outDir, 'idle.png'), createPNG(iW, iH, iPx));

console.log('Princess sprites generated:');
console.log('  walk.png  192×96  (6×3 grid of 32×32)');
console.log('  idle.png  128×96  (4×3 grid of 32×32)');
