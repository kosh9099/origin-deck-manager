/**
 * 교역 동선(Trade Route) 상태 + localStorage 저장.
 */

export type RouteStopKind = 'city' | 'village';
export type RouteStop = {
  kind: RouteStopKind;
  id: string;           // 도시 한글명 또는 마을 ID (discov...)
  items: string[];      // 도시: 교역품 / 마을: 물교 품목
};
export type Route = {
  id: string;
  name: string;
  stops: RouteStop[];
  createdAt: number;
};
export type RouteState = {
  routes: Route[];
  activeId: string | null;
};

const STORAGE_KEY = 'tradeRoutes.v1';

export function emptyState(): RouteState {
  return { routes: [], activeId: null };
}

export function loadRoutes(): RouteState {
  if (typeof window === 'undefined') return emptyState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.routes)) return emptyState();
    return parsed as RouteState;
  } catch {
    return emptyState();
  }
}

export function saveRoutes(state: RouteState) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

function uid(): string {
  return `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

export function createRoute(name: string = '새 동선'): Route {
  return { id: uid(), name, stops: [], createdAt: Date.now() };
}

export function addStop(route: Route, stop: RouteStop): Route {
  return { ...route, stops: [...route.stops, stop] };
}

export function removeStop(route: Route, index: number): Route {
  return { ...route, stops: route.stops.filter((_, i) => i !== index) };
}

export function moveStop(route: Route, from: number, to: number): Route {
  if (from === to) return route;
  const next = route.stops.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return { ...route, stops: next };
}

export function updateStopItems(route: Route, index: number, items: string[]): Route {
  return {
    ...route,
    stops: route.stops.map((s, i) => (i === index ? { ...s, items } : s)),
  };
}

export function renameRoute(route: Route, name: string): Route {
  return { ...route, name };
}

// ─── 내보내기 / 가져오기 ───
// 공유용 JSON 포맷. id / createdAt 은 제외 — 가져올 때 새로 부여.
export type RouteExport = {
  format: 'originDeckRoute.v1';
  name: string;
  stops: RouteStop[];
};

export function exportRouteJSON(route: Route): string {
  const data: RouteExport = {
    format: 'originDeckRoute.v1',
    name: route.name,
    stops: route.stops,
  };
  return JSON.stringify(data, null, 2);
}

function isValidStop(x: unknown): x is RouteStop {
  if (!x || typeof x !== 'object') return false;
  const s = x as Record<string, unknown>;
  if (s.kind !== 'city' && s.kind !== 'village') return false;
  if (typeof s.id !== 'string' || !s.id) return false;
  if (!Array.isArray(s.items)) return false;
  return s.items.every((it) => typeof it === 'string');
}

/** JSON 문자열 → Route. 실패 시 throw. */
export function importRouteFromJSON(text: string): Route {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('JSON 파싱 실패');
  }
  if (!parsed || typeof parsed !== 'object') throw new Error('잘못된 형식');
  const obj = parsed as Record<string, unknown>;
  if (obj.format !== 'originDeckRoute.v1') throw new Error('지원하지 않는 포맷');
  if (typeof obj.name !== 'string' || !obj.name.trim()) throw new Error('이름 누락');
  if (!Array.isArray(obj.stops) || !obj.stops.every(isValidStop)) throw new Error('정류 데이터 오류');
  return {
    id: uid(),
    name: obj.name.trim(),
    stops: obj.stops as RouteStop[],
    createdAt: Date.now(),
  };
}
