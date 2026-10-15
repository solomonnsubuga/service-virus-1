const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function crc32(buf) {
  let table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c >>> 0;
  }
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type);
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  const typeAndData = Buffer.concat([typeBuf, data]);
  crcBuf.writeUInt32BE(crc32(typeAndData), 0);
  return Buffer.concat([lenBuf, typeAndData, crcBuf]);
}

function generatePng(width, height, pixelFn) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type 6: RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  const rawScanlines = Buffer.alloc(height * (1 + width * 4));
  let offset = 0;
  for (let y = 0; y < height; y++) {
    rawScanlines[offset++] = 0; // filter type 0
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = pixelFn(x, y, width, height);
      rawScanlines[offset++] = r;
      rawScanlines[offset++] = g;
      rawScanlines[offset++] = b;
      rawScanlines[offset++] = a;
    }
  }

  const compressed = zlib.deflateSync(rawScanlines);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Medical Cross & Health Shield Drawer
// nx, ny are normalized 0..1 coordinates
function getIconPixel(nx, ny, isMaskable = false) {
  // Background: Deep Slate #0F172A to Navy #1E293B gradient with rounded rect / full fill
  const bgR = Math.round(15 + 15 * ny);
  const bgG = Math.round(23 + 18 * ny);
  const bgB = Math.round(42 + 20 * ny);

  // If not maskable, round corners (radius ~ 22%)
  if (!isMaskable) {
    const rx = 0.22;
    const ry = 0.22;
    const dx = Math.max(0, Math.abs(nx - 0.5) - (0.5 - rx));
    const dy = Math.max(0, Math.abs(ny - 0.5) - (0.5 - ry));
    if (Math.hypot(dx, dy) > rx) {
      return [0, 0, 0, 0]; // Transparent outside rounded corner
    }
  }

  // Scaling factor: if maskable, shrink emblem to 70% to ensure 15% safe padding all around
  const scale = isMaskable ? 0.68 : 0.82;
  const cx = 0.5;
  const cy = 0.5;

  const ex = (nx - cx) / scale;
  const ey = (ny - cy) / scale;

  // Outer glowing circle/ring around medical emblem
  const dist = Math.hypot(ex, ey);
  const ringDist = Math.abs(dist - 0.44);
  if (ringDist < 0.02) {
    // Soft cyan accent ring
    const alpha = Math.max(0, 1 - ringDist / 0.02);
    return [14, 165, 233, Math.round(alpha * 180)];
  }

  // Medical Cross dimensions:
  // Center is (0, 0)
  // Horizontal arm: ex in [-0.34, 0.34], ey in [-0.11, 0.11]
  // Vertical arm:   ex in [-0.11, 0.11], ey in [-0.34, 0.34]
  const inHoriz = Math.abs(ex) <= 0.32 && Math.abs(ey) <= 0.11;
  const inVert  = Math.abs(ex) <= 0.11 && Math.abs(ey) <= 0.32;

  if (inHoriz || inVert) {
    // Gradient inside cross: Emerald #10B981 to Cyan #06B6D4
    const t = (ex + ey + 0.6) / 1.2;
    const r = Math.round(16 + (6 - 16) * Math.max(0, Math.min(1, t)));
    const g = Math.round(185 + (182 - 185) * Math.max(0, Math.min(1, t)));
    const b = Math.round(129 + (212 - 129) * Math.max(0, Math.min(1, t)));
    return [r, g, b, 255];
  }

  // Inner cross accent: Small central white heart/dot or highlight
  if (Math.abs(ex) <= 0.05 && Math.abs(ey) <= 0.05) {
    return [255, 255, 255, 255];
  }

  // Subtle hospital pulse line running horizontally across background
  if (Math.abs(ey) < 0.008 && (Math.abs(ex) > 0.34 && Math.abs(ex) < 0.46)) {
    return [56, 189, 248, 140]; // Light sky
  }

  return [bgR, bgG, bgB, 255];
}

const publicDir = path.resolve(__dirname, '../public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// 1. Generate SVG icon
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#1e293b"/>
    </linearGradient>
    <linearGradient id="crossGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#10b981"/>
      <stop offset="100%" stop-color="#06b6d4"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="8" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#bgGrad)"/>
  <circle cx="256" cy="256" r="210" fill="none" stroke="#0ea5e9" stroke-width="4" stroke-dasharray="8 6" opacity="0.4"/>
  <!-- Hospital Pulse Line -->
  <path d="M 60 256 L 150 256 L 175 220 L 200 290 L 225 240 L 240 256" fill="none" stroke="#38bdf8" stroke-width="5" stroke-linecap="round" opacity="0.3"/>
  <path d="M 272 256 L 285 256 L 300 220 L 325 290 L 350 240 L 365 256 L 452 256" fill="none" stroke="#38bdf8" stroke-width="5" stroke-linecap="round" opacity="0.3"/>
  <!-- Glowing Healthcare Cross -->
  <g filter="url(#glow)">
    <rect x="216" y="106" width="80" height="300" rx="20" fill="url(#crossGrad)"/>
    <rect x="106" y="216" width="300" height="80" rx="20" fill="url(#crossGrad)"/>
    <!-- Center white medical heart/cross detail -->
    <circle cx="256" cy="256" r="18" fill="#ffffff" />
  </g>
</svg>`;

fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgContent, 'utf-8');
console.log('Generated icon.svg');

// 2. Generate 192x192 PNG
const png192 = generatePng(192, 192, (x, y, w, h) => getIconPixel(x / w, y / h, false));
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), png192);
console.log('Generated pwa-192x192.png');

// 3. Generate 512x512 PNG
const png512 = generatePng(512, 512, (x, y, w, h) => getIconPixel(x / w, y / h, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), png512);
console.log('Generated pwa-512x512.png');

// 4. Generate maskable 512x512 PNG (with safe padding)
const pngMaskable512 = generatePng(512, 512, (x, y, w, h) => getIconPixel(x / w, y / h, true));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), pngMaskable512);
console.log('Generated pwa-maskable-512x512.png');

// 5. Generate apple-touch-icon.png (180x180)
const pngApple = generatePng(180, 180, (x, y, w, h) => getIconPixel(x / w, y / h, false));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), pngApple);
console.log('Generated apple-touch-icon.png');

// 6. Generate favicon.ico (can be a 32x32 PNG file named favicon.ico or standard format)
const pngFavicon = generatePng(32, 32, (x, y, w, h) => getIconPixel(x / w, y / h, false));
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), pngFavicon);
console.log('Generated favicon.ico');

console.log('All PWA icons generated successfully!');
