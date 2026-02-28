// Generates minimal PWA icons for Lumina without external dependencies.
// Creates simple PNG files using raw PNG encoding.
// Run: node scripts/generate-icons.js

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { deflateSync } from 'zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');
if (!existsSync(publicDir)) mkdirSync(publicDir, { recursive: true });

// Minimal PNG encoder (no dependencies)
function createPNG(width, height, pixels) {
  // pixels is a flat array of [r,g,b,a, r,g,b,a, ...] per row
  // Add filter byte (0 = None) before each row
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

  // Build PNG file
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const typeAndData = Buffer.concat([Buffer.from(type), data]);
    const crc = crc32(typeAndData);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc >>> 0);
    return Buffer.concat([len, typeAndData, crcBuf]);
  }

  // IHDR
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

// CRC32 lookup table
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function drawIcon(size) {
  const pixels = new Uint8Array(size * size * 4);
  const s = size / 64;

  function fillRect(x, y, w, h, r, g, b, a = 255) {
    x = Math.round(x * s);
    y = Math.round(y * s);
    w = Math.round(w * s);
    h = Math.round(h * s);
    for (let py = y; py < y + h && py < size; py++) {
      for (let px = x; px < x + w && px < size; px++) {
        const i = (py * size + px) * 4;
        pixels[i] = r;
        pixels[i + 1] = g;
        pixels[i + 2] = b;
        pixels[i + 3] = a;
      }
    }
  }

  function fillCircle(cx, cy, radius, r, g, b, a = 255) {
    cx = Math.round(cx * s);
    cy = Math.round(cy * s);
    radius = Math.round(radius * s);
    for (let py = cy - radius; py <= cy + radius; py++) {
      for (let px = cx - radius; px <= cx + radius; px++) {
        if (px >= 0 && px < size && py >= 0 && py < size) {
          const dx = px - cx, dy = py - cy;
          if (dx * dx + dy * dy <= radius * radius) {
            const i = (py * size + px) * 4;
            pixels[i] = r;
            pixels[i + 1] = g;
            pixels[i + 2] = b;
            pixels[i + 3] = a;
          }
        }
      }
    }
  }

  // Dark background
  fillRect(0, 0, 64, 64, 10, 10, 26);

  // Subtle circle background
  fillCircle(32, 30, 22, 18, 18, 42);

  // Crown base band
  fillRect(18, 32, 28, 4, 221, 170, 68);

  // Crown points
  fillRect(20, 24, 5, 8, 238, 204, 102);  // left
  fillRect(30, 20, 5, 12, 238, 204, 102); // center (tallest)
  fillRect(39, 24, 5, 8, 238, 204, 102);  // right

  // Crown point bright tips
  fillRect(21, 24, 3, 2, 255, 221, 136);
  fillRect(31, 20, 3, 2, 255, 221, 136);
  fillRect(40, 24, 3, 2, 255, 221, 136);

  // Center jewel (blue)
  fillRect(31, 28, 3, 3, 102, 170, 238);

  // Side jewels (pink)
  fillRect(22, 30, 3, 2, 238, 102, 170);
  fillRect(39, 30, 3, 2, 238, 102, 170);

  // Sparkles
  fillRect(13, 20, 2, 2, 255, 255, 170);
  fillRect(49, 22, 2, 2, 255, 255, 170);
  fillRect(16, 42, 2, 2, 255, 255, 170, 180);
  fillRect(46, 40, 2, 2, 255, 255, 170, 180);

  // "L" letter below crown (simpler than full text)
  fillRect(26, 40, 3, 12, 153, 136, 204);
  fillRect(26, 49, 12, 3, 153, 136, 204);

  return createPNG(size, size, pixels);
}

writeFileSync(join(publicDir, 'icon-192.png'), drawIcon(192));
writeFileSync(join(publicDir, 'icon-512.png'), drawIcon(512));
console.log('Icons generated: public/icon-192.png, public/icon-512.png');
