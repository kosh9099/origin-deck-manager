/**
 * Sea mask 로더 — public/data/sea-mask.bin (1bit packed) 페치 + 디코드.
 * 한 번 로드 후 모듈 캐시.
 */

export type SeaMask = {
  width: number;
  height: number;
  bits: Uint8Array;
  // 가장 큰 연결된 sea 영역 (메인 대양). pathfinding 은 이 region 안으로만 snap.
  mainRegion: Uint8Array;
  isSea(cx: number, cy: number): boolean;
  // mainRegion 에 속하는지
  isMain(cx: number, cy: number): boolean;
  worldToCell(x: number, y: number): { cx: number; cy: number };
  cellToWorld(cx: number, cy: number): { x: number; y: number };
};

const SEA_MASK_URL = '/data/sea-mask.bin';
export const SEA_MASK_W = 1200;
export const SEA_MASK_H = 708;
export const MAP_NATURAL_W = 9972;
export const MAP_NATURAL_H = 5886;
export const CELL_W = MAP_NATURAL_W / SEA_MASK_W; // ≈8.31 픽셀
export const CELL_H = MAP_NATURAL_H / SEA_MASK_H; // ≈8.31 픽셀

let cache: SeaMask | null = null;
let inflight: Promise<SeaMask> | null = null;

// 가장 큰 연결 영역을 찾는 flood fill (8-dir + 코너 검사, 가로 wrap-aware)
function computeMainRegion(bits: Uint8Array, w: number, h: number): Uint8Array {
  const isSea = (cx: number, cy: number): boolean => {
    if (cy < 0 || cy >= h) return false;
    const x = ((cx % w) + w) % w;
    const i = cy * w + x;
    return ((bits[i >> 3] >> (i & 7)) & 1) === 1;
  };
  const wrapX = (cx: number) => ((cx % w) + w) % w;
  const labels = new Int32Array(w * h); // 0 = unvisited, n = region id
  const regionSizes: number[] = [0]; // index 0 unused
  let nextLabel = 1;
  const stack: number[] = []; // pack (cx<<16) | cy
  for (let cy0 = 0; cy0 < h; cy0++) {
    for (let cx0 = 0; cx0 < w; cx0++) {
      const i0 = cy0 * w + cx0;
      if (labels[i0] !== 0) continue;
      if (!isSea(cx0, cy0)) continue;
      const label = nextLabel++;
      let size = 0;
      stack.push((cx0 << 16) | cy0);
      while (stack.length > 0) {
        const packed = stack.pop()!;
        const cx = packed >> 16;
        const cy = packed & 0xffff;
        if (!isSea(cx, cy)) continue;
        const i = cy * w + cx;
        if (labels[i] !== 0) continue;
        labels[i] = label;
        size++;
        // 4-방향
        stack.push((wrapX(cx + 1) << 16) | cy);
        stack.push((wrapX(cx - 1) << 16) | cy);
        if (cy + 1 < h) stack.push((cx << 16) | (cy + 1));
        if (cy - 1 >= 0) stack.push((cx << 16) | (cy - 1));
        // 대각선 (코너 검사 포함)
        const cxR = wrapX(cx + 1), cxL = wrapX(cx - 1);
        if (cy + 1 < h && isSea(cxR, cy) && isSea(cx, cy + 1)) stack.push((cxR << 16) | (cy + 1));
        if (cy + 1 < h && isSea(cxL, cy) && isSea(cx, cy + 1)) stack.push((cxL << 16) | (cy + 1));
        if (cy - 1 >= 0 && isSea(cxR, cy) && isSea(cx, cy - 1)) stack.push((cxR << 16) | (cy - 1));
        if (cy - 1 >= 0 && isSea(cxL, cy) && isSea(cx, cy - 1)) stack.push((cxL << 16) | (cy - 1));
      }
      regionSizes.push(size);
    }
  }
  // 가장 큰 region 찾기
  let bestLabel = 1;
  let bestSize = 0;
  for (let i = 1; i < regionSizes.length; i++) {
    if (regionSizes[i] > bestSize) { bestSize = regionSizes[i]; bestLabel = i; }
  }
  // mainRegion 비트맵 — 가장 큰 region 셀만 1
  const main = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    if (labels[i] === bestLabel) main[i] = 1;
  }
  console.log(`[seaMask] main region: ${bestSize} cells (region ${bestLabel} of ${nextLabel - 1})`);
  return main;
}

function createMaskApi(bits: Uint8Array): SeaMask {
  const w = SEA_MASK_W, h = SEA_MASK_H;
  const mainRegion = computeMainRegion(bits, w, h);
  return {
    width: w,
    height: h,
    bits,
    mainRegion,
    isSea(cx, cy) {
      if (cx < 0 || cy < 0 || cx >= w || cy >= h) return false;
      const i = cy * w + cx;
      return ((bits[i >> 3] >> (i & 7)) & 1) === 1;
    },
    isMain(cx, cy) {
      if (cx < 0 || cy < 0 || cx >= w || cy >= h) return false;
      return mainRegion[cy * w + cx] === 1;
    },
    worldToCell(x, y) {
      return {
        cx: Math.max(0, Math.min(w - 1, Math.floor(x / CELL_W))),
        cy: Math.max(0, Math.min(h - 1, Math.floor(y / CELL_H))),
      };
    },
    cellToWorld(cx, cy) {
      return {
        x: (cx + 0.5) * CELL_W,
        y: (cy + 0.5) * CELL_H,
      };
    },
  };
}

export async function loadSeaMask(): Promise<SeaMask> {
  if (cache) return cache;
  if (inflight) return inflight;
  inflight = (async () => {
    const res = await fetch(SEA_MASK_URL);
    if (!res.ok) throw new Error(`Failed to load sea mask: ${res.status}`);
    const buf = await res.arrayBuffer();
    const bits = new Uint8Array(buf);
    cache = createMaskApi(bits);
    return cache;
  })();
  return inflight;
}

/** 테스트/관리자용 — 새 마스크 비트로 캐시 교체 */
export function setSeaMask(bits: Uint8Array) {
  cache = createMaskApi(bits);
}
