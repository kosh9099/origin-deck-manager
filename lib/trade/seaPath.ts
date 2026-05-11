/**
 * Sea mask 위에서 A* 경로 탐색 + Theta* line-of-sight 스무딩.
 * 가로축 wrap-aware — 세계 지도가 동서로 연결되는 globe 라서 west↔east 통과 가능.
 */
import type { SeaMask } from './seaMask';
import { MAP_NATURAL_W } from './seaMask';

export type WorldPoint = { x: number; y: number };
export type RouteSegment = {
  // 1개 이상의 폴리라인. wrap 통과 시 2개로 분할되어 시각적으로 연속처럼 보이도록 양 끝을 가상 좌표로 확장.
  paths: WorldPoint[][];
  distance: number;        // 셀 단위 누적 거리
  ok: boolean;
};

const DIAG = Math.SQRT2;

/**
 * 가장 가까운 메인 sea 영역 셀로 스냅 — 고립된 포켓 회피.
 * BFS 반경 maxRadius 까지 확장하여 mask.mainRegion 에 속하는 첫 셀 반환.
 */
export function snapToSea(mask: SeaMask, x: number, y: number, maxRadius = 30): { cx: number; cy: number } | null {
  const W = mask.width;
  const { cx, cy } = mask.worldToCell(x, y);
  // 현재 셀이 mainRegion 이면 즉시 채택
  if (mask.isMain(cx, cy)) return { cx, cy };
  // BFS 반경 확장
  for (let r = 1; r <= maxRadius; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const nx = wrapX(cx + dx, W), ny = cy + dy;
        if (mask.isMain(nx, ny)) return { cx: nx, cy: ny };
      }
    }
  }
  // mainRegion 안에 없으면 가장 가까운 sea (어떤 region이든)
  for (let r = 0; r <= maxRadius; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const nx = wrapX(cx + dx, W), ny = cy + dy;
        if (mask.isSea(nx, ny)) return { cx: nx, cy: ny };
      }
    }
  }
  return null;
}

// 가로 wrap 보정 — cx 값을 [0, W) 범위로 가져옴.
function wrapX(cx: number, W: number): number {
  return ((cx % W) + W) % W;
}

// 두 셀 사이의 wrap-aware dx (절댓값). 가로축은 ±W 모두 시도해 짧은 쪽 선택.
function wrapDx(cx0: number, cx1: number, W: number): number {
  const direct = Math.abs(cx1 - cx0);
  const wrapped = W - direct;
  return Math.min(direct, wrapped);
}

/**
 * line-of-sight (Bresenham) — wrap 인지 (a, b 사이 가장 짧은 방향 사용).
 * 좁은 채널 (1셀 폭 강) 을 통해 직선 단축이 일어나면 시각적으로 육지를 가로지르는 것처럼 보이므로,
 * 라인뿐 아니라 라인의 양 옆 1셀 (수직 방향) 도 sea 인지 검사 — 즉 3셀 폭 회랑이 필요.
 * 시작/끝 셀은 제외 (도시는 종종 해안 단일 셀 곁에 위치).
 */
function lineOfSight(mask: SeaMask, x0: number, y0: number, x1: number, y1: number, W: number): boolean {
  let useX1 = x1;
  const direct = x1 - x0;
  if (Math.abs(direct) > W / 2) useX1 = x1 + (direct > 0 ? -W : W);
  const dx = Math.abs(useX1 - x0), dy = Math.abs(y1 - y0);
  const sx = x0 < useX1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  // 수직 방향 단위벡터 (라인에 직각)
  const len = Math.hypot(useX1 - x0, y1 - y0) || 1;
  const perpX = -(y1 - y0) / len;
  const perpY = (useX1 - x0) / len;
  let err = dx - dy;
  let x = x0, y = y0;
  let steps = 0;
  const maxSteps = dx + dy + 2;
  while (steps++ < maxSteps) {
    const wx = wrapX(x, W);
    if (!mask.isSea(wx, y)) return false;
    // 시작/끝이 아닐 때만 양 옆 검사
    const isEndpoint = (wx === x0 && y === y0) || (wx === x1 && y === y1);
    if (!isEndpoint) {
      const sxL = wrapX(Math.round(x + perpX), W), syL = Math.round(y + perpY);
      const sxR = wrapX(Math.round(x - perpX), W), syR = Math.round(y - perpY);
      if (!mask.isSea(sxL, syL) || !mask.isSea(sxR, syR)) return false;
    }
    if (wx === x1 && y === y1) return true;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x += sx; }
    if (e2 < dx) { err += dx; y += sy; }
  }
  return false;
}

/**
 * A* (closed set + wrap-aware).
 * closed set 덕분에 weight 1.0 (최적) 으로도 매우 빠름. 가중치는 비최적 경로를 만들 수 있어 1.0 유지.
 */
const HEURISTIC_WEIGHT = 1.0;
function aStar(
  mask: SeaMask,
  start: { cx: number; cy: number },
  goal: { cx: number; cy: number },
  maxIter = 2000000,
): Array<{ cx: number; cy: number }> | null {
  const W = mask.width, H = mask.height;
  const idx = (cx: number, cy: number) => cy * W + cx;
  const heur = (cx: number, cy: number) => {
    const dx = wrapDx(cx, goal.cx, W);
    const dy = Math.abs(cy - goal.cy);
    return (Math.max(dx, dy) + (DIAG - 1) * Math.min(dx, dy)) * HEURISTIC_WEIGHT;
  };

  type Node = { i: number; cx: number; cy: number; f: number };
  const heap: Node[] = [];
  const push = (n: Node) => {
    heap.push(n);
    let k = heap.length - 1;
    while (k > 0) {
      const p = (k - 1) >> 1;
      if (heap[p].f <= heap[k].f) break;
      [heap[p], heap[k]] = [heap[k], heap[p]];
      k = p;
    }
  };
  const pop = (): Node | undefined => {
    if (heap.length === 0) return undefined;
    const top = heap[0];
    const last = heap.pop()!;
    if (heap.length > 0) {
      heap[0] = last;
      let k = 0;
      const n = heap.length;
      while (true) {
        const l = 2 * k + 1, r = 2 * k + 2;
        let best = k;
        if (l < n && heap[l].f < heap[best].f) best = l;
        if (r < n && heap[r].f < heap[best].f) best = r;
        if (best === k) break;
        [heap[best], heap[k]] = [heap[k], heap[best]];
        k = best;
      }
    }
    return top;
  };

  const gScore = new Float32Array(W * H);
  gScore.fill(Infinity);
  const cameFrom = new Int32Array(W * H);
  cameFrom.fill(-1);
  const closed = new Uint8Array(W * H);
  const startIdx = idx(start.cx, start.cy);
  gScore[startIdx] = 0;
  push({ i: startIdx, cx: start.cx, cy: start.cy, f: heur(start.cx, start.cy) });

  const goalIdx = idx(goal.cx, goal.cy);
  const dirs: Array<[number, number, number]> = [
    [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
    [1, 1, DIAG], [1, -1, DIAG], [-1, 1, DIAG], [-1, -1, DIAG],
  ];

  let iter = 0;
  while (heap.length > 0) {
    if (++iter > maxIter) {
      console.warn('[seaPath] A* maxIter reached');
      return null;
    }
    const cur = pop()!;
    if (closed[cur.i]) continue;
    closed[cur.i] = 1;
    if (cur.i === goalIdx) {
      const path: Array<{ cx: number; cy: number }> = [];
      let i = cur.i;
      while (i !== -1) {
        path.push({ cx: i % W, cy: Math.floor(i / W) });
        i = cameFrom[i];
      }
      path.reverse();
      return path;
    }

    for (const [dx, dy, c] of dirs) {
      const ny = cur.cy + dy;
      if (ny < 0 || ny >= H) continue;
      const nx = wrapX(cur.cx + dx, W);   // ← wrap 적용
      if (!mask.isSea(nx, ny)) continue;
      if (c === DIAG) {
        // 대각선 코너 검사 (양쪽 직선 셀도 sea)
        const sideX = wrapX(cur.cx + dx, W);
        if (!mask.isSea(sideX, cur.cy) || !mask.isSea(cur.cx, ny)) continue;
      }
      const ni = idx(nx, ny);
      if (closed[ni]) continue;
      const tg = gScore[cur.i] + c;
      if (tg < gScore[ni]) {
        gScore[ni] = tg;
        cameFrom[ni] = cur.i;
        push({ i: ni, cx: nx, cy: ny, f: tg + heur(nx, ny) });
      }
    }
  }
  return null;
}

/**
 * Theta* 스무딩 — wrap-aware. line-of-sight 가능한 셀끼리만 직접 연결.
 * 다중 패스로 수렴할 때까지 스무딩 (보통 2~3회면 안정).
 */
function smoothOnce(mask: SeaMask, path: Array<{ cx: number; cy: number }>): Array<{ cx: number; cy: number }> {
  if (path.length < 3) return path;
  const W = mask.width;
  const out: Array<{ cx: number; cy: number }> = [path[0]];
  let anchor = 0;
  for (let i = 2; i < path.length; i++) {
    if (!lineOfSight(mask, path[anchor].cx, path[anchor].cy, path[i].cx, path[i].cy, W)) {
      out.push(path[i - 1]);
      anchor = i - 1;
    }
  }
  out.push(path[path.length - 1]);
  return out;
}
function smooth(mask: SeaMask, path: Array<{ cx: number; cy: number }>): Array<{ cx: number; cy: number }> {
  let prev = path;
  for (let pass = 0; pass < 5; pass++) {
    const next = smoothOnce(mask, prev);
    if (next.length === prev.length) return next;
    prev = next;
  }
  return prev;
}

/**
 * 두 월드 좌표 사이 항로 — wrap 시 경로를 2개 폴리라인으로 분할.
 */
export function findRoute(mask: SeaMask, from: WorldPoint, to: WorldPoint): RouteSegment {
  const sStart = snapToSea(mask, from.x, from.y);
  const sGoal = snapToSea(mask, to.x, to.y);
  if (!sStart || !sGoal) {
    return { paths: [[from, to]], distance: 0, ok: false };
  }
  const cells = aStar(mask, sStart, sGoal);
  if (!cells) {
    return { paths: [[from, to]], distance: 0, ok: false };
  }
  const smoothed = smooth(mask, cells);
  // 거리 — wrap 방향 보정
  let dist = 0;
  for (let i = 1; i < smoothed.length; i++) {
    const a = smoothed[i - 1], b = smoothed[i];
    const dx = wrapDx(a.cx, b.cx, mask.width);
    const dy = Math.abs(b.cy - a.cy);
    dist += Math.hypot(dx, dy);
  }

  // 월드 좌표 변환 + wrap 분할 — from / to 사용 (실제 마커 위치 보존)
  const worldPts: WorldPoint[] = [];
  worldPts.push(from);
  for (let i = 1; i < smoothed.length - 1; i++) {
    worldPts.push(mask.cellToWorld(smoothed[i].cx, smoothed[i].cy));
  }
  worldPts.push(to);

  // wrap 검출: 연속 두 점의 x 차이가 MAP_W/2 보다 크면 wrap.
  // 그 위치에서 분할 + 가상 좌표로 양 끝 자연스럽게 끊김 없이 보이게.
  const paths: WorldPoint[][] = [];
  let current: WorldPoint[] = [worldPts[0]];
  const HALF = MAP_NATURAL_W / 2;
  for (let i = 1; i < worldPts.length; i++) {
    const a = worldPts[i - 1];
    const b = worldPts[i];
    const dx = b.x - a.x;
    if (Math.abs(dx) > HALF) {
      // wrap 발생. 이동 방향: dx > 0 이면 east→west wrap (왼쪽으로 점프),
      // 즉 실제로는 a 가 west edge, b 가 east edge 였는데 가까운 방향은 a 가 west 로 빠지고 b 가 east 로 들어옴.
      // 시각적으로: a 에서 서쪽으로 나가 → 동쪽 (다른 카피) 에서 들어와 b 에 도착.
      // 두 폴리라인을 만들기 위해 각각 가상 연장 점을 사용.
      let aVirtualEnd: WorldPoint, bVirtualStart: WorldPoint;
      if (dx > 0) {
        // a→b 직선이 오른쪽으로 너무 큼 → 실제 짧은 길은 a 가 왼쪽(west)로 나감
        aVirtualEnd = { x: b.x - MAP_NATURAL_W, y: b.y };
        bVirtualStart = { x: a.x + MAP_NATURAL_W, y: a.y };
      } else {
        // a→b 직선이 왼쪽으로 너무 큼 → a 가 오른쪽(east)로 나감
        aVirtualEnd = { x: b.x + MAP_NATURAL_W, y: b.y };
        bVirtualStart = { x: a.x - MAP_NATURAL_W, y: a.y };
      }
      current.push(aVirtualEnd);
      paths.push(current);
      current = [bVirtualStart, b];
    } else {
      current.push(b);
    }
  }
  if (current.length > 0) paths.push(current);

  return { paths, distance: dist, ok: true };
}
