#!/usr/bin/env node
/**
 * Sea mask generator — world-map.webp 의 픽셀 색을 분석해 1bit sea/land 마스크 생성.
 *
 * 출력:
 *  - public/data/sea-mask.bin  (1200×708 / 8 = 106KB, 1bit packed)
 *  - public/data/sea-mask-debug.png (시각 검증용: 파랑=바다, 갈색=육지)
 *  - 콘솔: 도시/마을 인접 검증 결과
 *
 * 사용: node scripts/build-sea-mask.mjs
 */
import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const SRC = path.join(ROOT, 'public/maps/world-map.webp');
const OUT_BIN = path.join(ROOT, 'public/data/sea-mask.bin');
const OUT_DEBUG = path.join(ROOT, 'public/data/sea-mask-debug.png');
const TOWN_COORDS = path.join(ROOT, 'constants/townCoords.json');
const VILLAGE_COORDS = path.join(ROOT, 'constants/villageCoords.json');
const TOWN_LABELS = path.join(ROOT, 'constants/townLabels.json');
const VILLAGE_LABELS = path.join(ROOT, 'constants/villageLabels.json');

// 출력 그리드 크기 — 1200×708 ≈ 원본 7000×4131 의 1/5.83 다운샘플
const GRID_W = 1200;
const GRID_H = 708;
const MAP_NATURAL_W = 9972;
const MAP_NATURAL_H = 5886;

// 도시는 +30,+20, 마을은 -30,+20 의 hotspot 보정이 있음. 원본 픽셀 좌표는 보정 전.
// 검증은 보정된 hotspot 위치로 함.
const TOWN_OFFSET_X = 30, TOWN_OFFSET_Y = 20;
const VILLAGE_OFFSET_X = -30, VILLAGE_OFFSET_Y = 20;

// RGB → HSL (h 0-360, s 0-1, l 0-1)
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h *= 60;
  }
  return [h, s, l];
}

// 픽셀 1개를 sea 로 판정할지
function isSeaPixel(r, g, b) {
  const [h, s, l] = rgbToHsl(r, g, b);
  // 게임 맵의 바다 톤: 약간 청록 ~ 어두운 파랑. 채도 낮고 어두움
  // Hue 150~220° (청록~파랑), Saturation 0.10~0.55, Lightness 0.15~0.55
  return h >= 150 && h <= 220 && s >= 0.10 && s <= 0.60 && l >= 0.15 && l <= 0.55;
}

async function main() {
  console.log('[1/4] Reading source image…');
  const img = sharp(SRC);
  const meta = await img.metadata();
  console.log(`  source: ${meta.width}×${meta.height}`);

  console.log(`[2/4] Downsampling to ${GRID_W}×${GRID_H}…`);
  const { data, info } = await img
    .resize(GRID_W, GRID_H, { kernel: sharp.kernel.lanczos3 })
    .raw()
    .toBuffer({ resolveWithObject: true });
  console.log(`  raw buffer: ${data.length} bytes, channels=${info.channels}`);

  console.log('[3/4] Classifying pixels…');
  // 마스크: 1=sea, 0=land. Uint8Array 비트 패킹 (LSB 우선)
  const totalCells = GRID_W * GRID_H;
  const packedBytes = Math.ceil(totalCells / 8);
  const mask = new Uint8Array(packedBytes);
  let seaCount = 0;
  const ch = info.channels;
  for (let i = 0; i < totalCells; i++) {
    const p = i * ch;
    const r = data[p], g = data[p + 1], b = data[p + 2];
    if (isSeaPixel(r, g, b)) {
      mask[i >> 3] |= 1 << (i & 7);
      seaCount++;
    }
  }
  console.log(`  sea ratio: ${(seaCount / totalCells * 100).toFixed(1)}%`);

  // 운하 카빙 — 수에즈, 파나마는 픽셀로는 육지지만 실제로는 항해 가능한 운하.
  // Bresenham 으로 두 도시 셀 사이를 2-cell 두께의 sea 채널로 연결.
  const CANALS = [
    // [라벨, 시작 셀, 끝 셀]
    ['수에즈 운하', { x: 5565, y: 2026 }, { x: 5562, y: 2079 }],   // 포트사이드 ↔ 수에즈
    ['파나마 운하', { x: 2445, y: 2660 }, { x: 2457, y: 2713 }],   // 포르토벨로 ↔ 파나마
  ];
  const setSea = (cx, cy) => {
    if (cx < 0 || cy < 0 || cx >= GRID_W || cy >= GRID_H) return;
    const i = cy * GRID_W + cx;
    mask[i >> 3] |= 1 << (i & 7);
  };
  const wToCell = (x, y) => [Math.round(x / MAP_NATURAL_W * GRID_W), Math.round(y / MAP_NATURAL_H * GRID_H)];
  for (const [name, a, b] of CANALS) {
    const [x0, y0] = wToCell(a.x + TOWN_OFFSET_X, a.y + TOWN_OFFSET_Y);
    const [x1, y1] = wToCell(b.x + TOWN_OFFSET_X, b.y + TOWN_OFFSET_Y);
    let dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    let x = x0, y = y0;
    let carved = 0;
    while (true) {
      // 2-cell 두께
      for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          setSea(x + ox, y + oy);
        }
      }
      carved++;
      if (x === x1 && y === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) { err -= dy; x += sx; }
      if (e2 < dx) { err += dx; y += sy; }
    }
    console.log(`  ${name}: ${carved} cells carved (${x0},${y0}) → (${x1},${y1})`);
  }

  console.log('[4/4] Writing outputs…');
  await fs.mkdir(path.dirname(OUT_BIN), { recursive: true });
  await fs.writeFile(OUT_BIN, mask);
  console.log(`  ${OUT_BIN} (${mask.length} bytes)`);

  // 디버그 PNG: sea=#4a90e2, land=#8b6f47
  const debug = Buffer.alloc(GRID_W * GRID_H * 3);
  for (let i = 0; i < totalCells; i++) {
    const isSea = (mask[i >> 3] >> (i & 7)) & 1;
    const o = i * 3;
    if (isSea) {
      debug[o] = 0x4a; debug[o + 1] = 0x90; debug[o + 2] = 0xe2;
    } else {
      debug[o] = 0x8b; debug[o + 1] = 0x6f; debug[o + 2] = 0x47;
    }
  }
  await sharp(debug, { raw: { width: GRID_W, height: GRID_H, channels: 3 } })
    .png()
    .toFile(OUT_DEBUG);
  console.log(`  ${OUT_DEBUG}`);

  // ── 검증 ──
  console.log('\n[validation]');
  const isSeaAt = (cx, cy) => {
    if (cx < 0 || cy < 0 || cx >= GRID_W || cy >= GRID_H) return false;
    const i = cy * GRID_W + cx;
    return ((mask[i >> 3] >> (i & 7)) & 1) === 1;
  };
  const worldToCell = (x, y) => [
    Math.round(x / MAP_NATURAL_W * GRID_W),
    Math.round(y / MAP_NATURAL_H * GRID_H),
  ];

  const towns = JSON.parse(await fs.readFile(TOWN_COORDS, 'utf8')).towns;
  const villages = JSON.parse(await fs.readFile(VILLAGE_COORDS, 'utf8')).villages;
  const townLabels = JSON.parse(await fs.readFile(TOWN_LABELS, 'utf8'));
  const villageLabels = JSON.parse(await fs.readFile(VILLAGE_LABELS, 'utf8'));

  // 도시: hotspot 기준 좌표에서 3셀 반경 내 바다 셀이 1개 이상 있어야
  let townOk = 0, townBad = [];
  for (const t of towns) {
    const [cx, cy] = worldToCell(t.x + TOWN_OFFSET_X, t.y + TOWN_OFFSET_Y);
    let hasSeaNearby = false;
    for (let dy = -3; dy <= 3 && !hasSeaNearby; dy++) {
      for (let dx = -3; dx <= 3 && !hasSeaNearby; dx++) {
        if (isSeaAt(cx + dx, cy + dy)) hasSeaNearby = true;
      }
    }
    if (hasSeaNearby) townOk++;
    else townBad.push(townLabels[t.id] || t.id);
  }
  console.log(`  towns: ${townOk}/${towns.length} adjacent to sea`);
  if (townBad.length > 0) {
    console.log(`    no sea nearby (${townBad.length}): ${townBad.slice(0, 20).join(', ')}${townBad.length > 20 ? '…' : ''}`);
  }

  // 마을: 본인 셀 또는 인접 셀이 육지 (sea 가 아님)
  let villOk = 0, villBad = [];
  for (const v of villages) {
    const [cx, cy] = worldToCell(v.x + VILLAGE_OFFSET_X, v.y + VILLAGE_OFFSET_Y);
    let onLand = false;
    for (let dy = -1; dy <= 1 && !onLand; dy++) {
      for (let dx = -1; dx <= 1 && !onLand; dx++) {
        if (!isSeaAt(cx + dx, cy + dy)) onLand = true;
      }
    }
    if (onLand) villOk++;
    else villBad.push(villageLabels[v.id] || v.id);
  }
  console.log(`  villages: ${villOk}/${villages.length} on or near land`);
  if (villBad.length > 0) {
    console.log(`    fully in sea (${villBad.length}): ${villBad.slice(0, 20).join(', ')}${villBad.length > 20 ? '…' : ''}`);
  }

  console.log('\nDone.');
}

main().catch((e) => { console.error(e); process.exit(1); });
