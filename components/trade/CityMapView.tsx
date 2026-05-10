'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Globe, Search, Anchor, Castle, Layers, Check, ChevronDown, Package, X } from 'lucide-react';
import { ALL_CITIES, REGION_TO_CITIES, CITY_MAP } from '@/lib/trade/cityMap';
import { getInGameTimeInfo } from '@/lib/trade/time';
import seasonCalendarData from '@/constants/seasonCalendar.json';
import CityDetailPanel from './CityDetailPanel';

type SeasonCal = {
  cities: Record<string, { region: string; months: string[] }>;
  items: Record<string, { category: string; cities: string[] }>;
  itemClasses: Record<string, string>;
  portSeason: Record<string, string[]>;
};
const seasonCal = seasonCalendarData as SeasonCal;
const ALL_ITEMS = Object.keys(seasonCal.items).sort((a, b) => a.localeCompare(b));

export type MapFocus = {
  city?: string;
  region?: string;
  epoch: number;
};

type Props = {
  focus?: MapFocus | null;
};

const MAP_NATURAL_WIDTH = 9972;
const MAP_NATURAL_HEIGHT = 5886;
const DOT_OFFSET_X = 30;
const DOT_OFFSET_Y = 20;
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.05;
const INITIAL_ZOOM = 0.6;
const REGION_JUMP_MAX_ZOOM = 0.6;

// zoom 값을 5% (0.05) 단위로 스냅.
function snapZoom(z: number): number {
  return Math.round(z / ZOOM_STEP) * ZOOM_STEP;
}

// 한글 초성 추출 — 자동완성 검색 보조용.
const CHOSEONG = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
function toChoseong(s: string): string {
  let out = '';
  for (const c of s) {
    const code = c.charCodeAt(0);
    if (code >= 0xAC00 && code <= 0xD7A3) {
      out += CHOSEONG[Math.floor((code - 0xAC00) / (21 * 28))];
    } else {
      out += c;
    }
  }
  return out;
}
function matchesQuery(q: string, target: string): boolean {
  if (!q) return false;
  if (target.includes(q)) return true;
  return toChoseong(target).includes(q);
}
// 줌이 이 임계값 이상일 때만 도시 라벨 텍스트 노출 (낮은 줌에서는 글자 너무 빽빽)
const LABEL_VISIBLE_ZOOM = 0.6;

// 본거지 8개 — 시각적으로 일반 도시와 명확히 구분.
const HOME_BASES = new Set<string>([
  '런던', '암스테르담', '리스본', '세비야',
  '이스탄불', '한양', '북경', '에도',
]);

const REGION_DOT_COLORS: Record<string, string> = {
  '북해': 'bg-sky-500',
  '동지중해': 'bg-cyan-500',
  '서지중해 대서양': 'bg-teal-500',
  '아프리카 서부': 'bg-amber-500',
  '아프리카 남부': 'bg-orange-500',
  '아프리카 동부': 'bg-yellow-500',
  '아라비아 서인도': 'bg-rose-500',
  '동인도 인도차이나': 'bg-pink-500',
  '남아시아': 'bg-fuchsia-500',
  '동아시아': 'bg-violet-500',
  '극동아시아': 'bg-indigo-500',
  '오세아니아': 'bg-emerald-500',
  '오세아니아 동부': 'bg-lime-500',
  '북극해': 'bg-slate-400',
  '남아메리카': 'bg-red-500',
  '아메리카 동부': 'bg-purple-500',
  '북아메리카 서부': 'bg-blue-500',
  '태평양': 'bg-green-500',
};

// SVG fill/stroke 용 hex 색상 (Tailwind 500 톤 매칭)
const REGION_HEX_COLORS: Record<string, string> = {
  '북해': '#0ea5e9',
  '동지중해': '#06b6d4',
  '서지중해 대서양': '#14b8a6',
  '아프리카 서부': '#f59e0b',
  '아프리카 남부': '#f97316',
  '아프리카 동부': '#eab308',
  '아라비아 서인도': '#f43f5e',
  '동인도 인도차이나': '#ec4899',
  '남아시아': '#d946ef',
  '동아시아': '#8b5cf6',
  '극동아시아': '#6366f1',
  '오세아니아': '#10b981',
  '오세아니아 동부': '#84cc16',
  '북극해': '#94a3b8',
  '남아메리카': '#ef4444',
  '아메리카 동부': '#a855f7',
  '북아메리카 서부': '#3b82f6',
  '태평양': '#22c55e',
};

// Andrew's monotone chain — convex hull
type Pt = { x: number; y: number };
function convexHull(points: Pt[]): Pt[] {
  if (points.length < 3) return points.slice();
  const sorted = [...points].sort((a, b) => (a.x - b.x) || (a.y - b.y));
  const cross = (O: Pt, A: Pt, B: Pt) => (A.x - O.x) * (B.y - O.y) - (A.y - O.y) * (B.x - O.x);
  const lower: Pt[] = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: Pt[] = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  upper.pop();
  lower.pop();
  return [...lower, ...upper];
}

// 폴리곤을 중심으로부터 바깥쪽으로 padding 만큼 확장 (도시 점이 가장자리에 안 걸리도록).
function expandHull(hull: Pt[], padding: number): Pt[] {
  if (hull.length === 0) return hull;
  const cx = hull.reduce((s, p) => s + p.x, 0) / hull.length;
  const cy = hull.reduce((s, p) => s + p.y, 0) / hull.length;
  return hull.map((p) => {
    const dx = p.x - cx;
    const dy = p.y - cy;
    const len = Math.hypot(dx, dy);
    if (len === 0) return p;
    return { x: p.x + (dx / len) * padding, y: p.y + (dy / len) * padding };
  });
}

export default function CityMapView({ focus = null }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(INITIAL_ZOOM);
  const [viewport, setViewport] = useState({ w: 0, h: 0 });
  const [hoveredCity, setHoveredCity] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  // 기본은 해역 영역 모두 OFF. 사용자가 드롭다운에서 골라서 표시.
  const [visibleRegions, setVisibleRegions] = useState<Set<string>>(() => new Set());
  const [regionMenuOpen, setRegionMenuOpen] = useState(false);
  const regionMenuRef = useRef<HTMLDivElement | null>(null);

  // 교역품 검색 — 선택 시 해당 품목 생산 도시만 시즌 색으로 표시.
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [itemMenuOpen, setItemMenuOpen] = useState(false);
  const [itemQuery, setItemQuery] = useState('');
  const itemMenuRef = useRef<HTMLDivElement | null>(null);
  const itemInputRef = useRef<HTMLInputElement | null>(null);
  const inGameMonth = useMemo(() => getInGameTimeInfo(Date.now()).month, []);

  useEffect(() => {
    if (!itemMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (!itemMenuRef.current?.contains(e.target as Node)) {
        setItemMenuOpen(false);
      }
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [itemMenuOpen]);

  // 선택된 품목의 도시별 시즌 (현재 월) — Map<도시명, '성'|'평'|'비'>
  const itemSeasonByCity = useMemo(() => {
    if (!selectedItem) return null;
    const m = new Map<string, string>();
    const itemMeta = seasonCal.items[selectedItem];
    if (!itemMeta) return m;
    for (const city of itemMeta.cities) {
      const months = seasonCal.portSeason[`${city}|${selectedItem}`];
      if (months && months[inGameMonth - 1]) {
        m.set(city, months[inGameMonth - 1]);
      }
    }
    return m;
  }, [selectedItem, inGameMonth]);

  const itemSuggestions = useMemo(() => {
    const q = itemQuery.trim();
    if (!q) return ALL_ITEMS.slice(0, 100);
    return ALL_ITEMS.filter((n) => n.includes(q)).slice(0, 100);
  }, [itemQuery]);

  // 메뉴 외부 클릭 시 닫기
  useEffect(() => {
    if (!regionMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (!regionMenuRef.current?.contains(e.target as Node)) {
        setRegionMenuOpen(false);
      }
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [regionMenuOpen]);

  const allRegionNames = useMemo(() => Object.keys(REGION_HEX_COLORS), []);
  const allOn = visibleRegions.size === allRegionNames.length;
  const noneOn = visibleRegions.size === 0;

  // 해역별 convex hull 미리 계산 (도시 좌표 + DOT_OFFSET 적용 + 패딩 확장).
  const regionHulls = useMemo(() => {
    const result: Array<{ region: string; hull: Pt[]; color: string }> = [];
    for (const [region, cities] of REGION_TO_CITIES) {
      const pts = cities.map((c) => ({ x: c.x + DOT_OFFSET_X, y: c.y + DOT_OFFSET_Y }));
      const hull = expandHull(convexHull(pts), 80);
      if (hull.length > 0) {
        result.push({ region, hull, color: REGION_HEX_COLORS[region] ?? '#64748b' });
      }
    }
    return result;
  }, []);

  // 컨테이너 크기 측정 + 초기 fit-to-width
  useEffect(() => {
    const c = containerRef.current;
    if (!c) return;
    const measure = () => {
      const rect = c.getBoundingClientRect();
      setViewport({ w: rect.width, h: rect.height });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(c);
    return () => ro.disconnect();
  }, []);

  // pan.y 를 지도 프레임 안으로 클램프 — 위/아래 빈 영역 노출 방지.
  // 가로(pan.x) 는 wrap 되므로 클램프하지 않음.
  const clampPanY = useCallback((y: number, z: number, vh: number) => {
    const mapH = MAP_NATURAL_HEIGHT * z;
    if (mapH >= vh) {
      return Math.min(0, Math.max(vh - mapH, y));
    }
    return (vh - mapH) / 2;
  }, []);

  const initRef = useRef(false);
  useEffect(() => {
    if (initRef.current || viewport.w === 0) return;
    initRef.current = true;
    // 초기: 줌 40% + 세비야 화면 중앙. 세비야 좌표 못 찾으면 fallback 으로 지도 중앙.
    const seville = CITY_MAP.get('세비야');
    const z = INITIAL_ZOOM;
    setZoom(z);
    if (seville) {
      const cx = seville.x + DOT_OFFSET_X;
      const cy = seville.y + DOT_OFFSET_Y;
      setPan({
        x: viewport.w / 2 - cx * z,
        y: clampPanY(viewport.h / 2 - cy * z, z, viewport.h),
      });
    } else {
      setPan({ x: 0, y: clampPanY((viewport.h - MAP_NATURAL_HEIGHT * z) / 2, z, viewport.h) });
    }
  }, [viewport.w, viewport.h, clampPanY]);

  // viewport 크기 변경 시에도 클램프 재적용 (창 리사이즈 등).
  useEffect(() => {
    if (viewport.h === 0) return;
    setPan((p) => ({ x: p.x, y: clampPanY(p.y, zoom, viewport.h) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewport.h]);

  // 드래그 패닝 + 핀치 줌
  const dragStateRef = useRef({ active: false, startX: 0, startY: 0, panX: 0, panY: 0 });
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchRef = useRef<{
    initialDistance: number;
    initialZoom: number;
    midX: number;       // container-relative midpoint at pinch start
    midY: number;
    worldMidX: number;  // world coords under midpoint at pinch start
    worldMidY: number;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // 글로벌 listener 로 pointermove / pointerup 잡기 (pointer capture 의존성 제거 — 다중 포인터 안정).
  // pan/zoom 최신 값을 ref 로 동기화해 stale closure 회피.
  const panRef = useRef(pan);
  const zoomRef = useRef(zoom);
  const viewportHRef = useRef(viewport.h);
  useEffect(() => { panRef.current = pan; }, [pan]);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { viewportHRef.current = viewport.h; }, [viewport.h]);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const c = containerRef.current;
    if (!c) return;
    const rect = c.getBoundingClientRect();

    if (pointersRef.current.size === 1) {
      dragStateRef.current = {
        active: true,
        startX: e.clientX,
        startY: e.clientY,
        panX: panRef.current.x,
        panY: panRef.current.y,
      };
      setIsDragging(true);
    } else if (pointersRef.current.size === 2) {
      dragStateRef.current.active = false;
      setIsDragging(false);
      const pts = [...pointersRef.current.values()];
      const dx = pts[1].x - pts[0].x;
      const dy = pts[1].y - pts[0].y;
      const distance = Math.hypot(dx, dy);
      const midX = (pts[0].x + pts[1].x) / 2 - rect.left;
      const midY = (pts[0].y + pts[1].y) / 2 - rect.top;
      pinchRef.current = {
        initialDistance: distance,
        initialZoom: zoomRef.current,
        midX,
        midY,
        worldMidX: (midX - panRef.current.x) / zoomRef.current,
        worldMidY: (midY - panRef.current.y) / zoomRef.current,
      };
    }
  }, []);

  // 글로벌 pointermove / pointerup — 포인터가 컨테이너 밖으로 나가도 추적, 다중 포인터 안전.
  useEffect(() => {
    const handleMove = (e: PointerEvent) => {
      if (!pointersRef.current.has(e.pointerId)) return;
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (pinchRef.current && pointersRef.current.size >= 2) {
        const pts = [...pointersRef.current.values()].slice(0, 2);
        const dx = pts[1].x - pts[0].x;
        const dy = pts[1].y - pts[0].y;
        const distance = Math.hypot(dx, dy);
        if (distance < 1) return;
        const scale = distance / pinchRef.current.initialDistance;
        const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, snapZoom(pinchRef.current.initialZoom * scale)));
        const targetPanX = pinchRef.current.midX - pinchRef.current.worldMidX * newZoom;
        const targetPanY = pinchRef.current.midY - pinchRef.current.worldMidY * newZoom;
        setZoom(newZoom);
        setPan({ x: targetPanX, y: clampPanY(targetPanY, newZoom, viewportHRef.current) });
        return;
      }

      const s = dragStateRef.current;
      if (!s.active) return;
      const newY = clampPanY(s.panY + (e.clientY - s.startY), zoomRef.current, viewportHRef.current);
      setPan({ x: s.panX + (e.clientX - s.startX), y: newY });
    };

    const handleUp = (e: PointerEvent) => {
      if (!pointersRef.current.has(e.pointerId)) return;
      pointersRef.current.delete(e.pointerId);

      if (pointersRef.current.size === 0) {
        pinchRef.current = null;
        if (dragStateRef.current.active) {
          dragStateRef.current.active = false;
          setIsDragging(false);
        }
      } else if (pointersRef.current.size === 1 && pinchRef.current) {
        pinchRef.current = null;
        const remaining = [...pointersRef.current.values()][0];
        dragStateRef.current = {
          active: true,
          startX: remaining.x,
          startY: remaining.y,
          panX: panRef.current.x,
          panY: panRef.current.y,
        };
        setIsDragging(true);
      }
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
    };
  }, [clampPanY]);

  const onWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const c = containerRef.current;
    if (!c) return;
    const rect = c.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    // 5% 단위 증감 — 휠 한 노치마다 ZOOM_STEP 만큼.
    const delta = e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
    const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, snapZoom(zoom + delta)));
    if (newZoom === zoom) return;
    const worldX = (mx - pan.x) / zoom;
    const worldY = (my - pan.y) / zoom;
    const targetX = mx - worldX * newZoom;
    const targetY = my - worldY * newZoom;
    setPan({ x: targetX, y: clampPanY(targetY, newZoom, viewport.h) });
    setZoom(newZoom);
  }, [zoom, pan.x, pan.y, viewport.h, clampPanY]);

  // 검색 매칭 — 우선순위: 도시명 직접 일치 → 도시 초성 일치 → 해역 일치
  const searchTrim = search.trim();
  const searchSuggestions = useMemo(() => {
    if (!searchTrim) return [] as typeof ALL_CITIES;
    type Ranked = { entry: typeof ALL_CITIES[number]; rank: number };
    const ranked: Ranked[] = [];
    for (const c of ALL_CITIES) {
      let rank = -1;
      if (c.city.includes(searchTrim)) rank = 0;
      else if (toChoseong(c.city).includes(searchTrim)) rank = 1;
      else if (c.region.includes(searchTrim) || toChoseong(c.region).includes(searchTrim)) rank = 2;
      if (rank >= 0) ranked.push({ entry: c, rank });
    }
    ranked.sort((a, b) => a.rank - b.rank || a.entry.city.localeCompare(b.entry.city));
    return ranked.slice(0, 20).map((r) => r.entry);
  }, [searchTrim]);
  const matchedCities = useMemo(() => new Set(searchSuggestions.map((c) => c.city)), [searchSuggestions]);

  const [searchOpen, setSearchOpen] = useState(false);
  const searchBoxRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!searchOpen) return;
    const h = (e: MouseEvent) => {
      if (!searchBoxRef.current?.contains(e.target as Node)) setSearchOpen(false);
    };
    window.addEventListener('mousedown', h);
    return () => window.removeEventListener('mousedown', h);
  }, [searchOpen]);

  // 검색 결과 도시를 선택 — 패널 열고 화면 중앙으로.
  const pickSearchedCity = useCallback((city: string) => {
    const entry = CITY_MAP.get(city);
    if (!entry) return;
    setSelectedCity(city);
    setSearchOpen(false);
    setSearch('');
    if (viewport.w > 0 && viewport.h > 0) {
      setPan({
        x: viewport.w / 2 - (entry.x + DOT_OFFSET_X) * zoom,
        y: clampPanY(viewport.h / 2 - (entry.y + DOT_OFFSET_Y) * zoom, zoom, viewport.h),
      });
    }
  }, [zoom, viewport.w, viewport.h, clampPanY]);

  // 외부에서 전달된 focus (교역 스케줄의 지도 버튼 등) — epoch 변경 시 적용.
  useEffect(() => {
    if (!focus) return;
    if (focus.region) {
      // 해역 단독 보기 — 다른 모든 해역은 숨김.
      setVisibleRegions(new Set([focus.region]));
      // 해역 hull 의 중심으로 pan + 적당한 줌으로 fit.
      const cities = REGION_TO_CITIES.get(focus.region) ?? [];
      if (cities.length > 0 && viewport.w > 0 && viewport.h > 0) {
        const xs = cities.map((c) => c.x + DOT_OFFSET_X);
        const ys = cities.map((c) => c.y + DOT_OFFSET_Y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        const w = Math.max(maxX - minX, 1);
        const h = Math.max(maxY - minY, 1);
        const padFrac = 0.4;
        const fitZoom = snapZoom(Math.min(
          REGION_JUMP_MAX_ZOOM,
          Math.max(MIN_ZOOM, Math.min(viewport.w / (w * (1 + padFrac)), viewport.h / (h * (1 + padFrac))))
        ));
        const cx = (minX + maxX) / 2;
        const cy = (minY + maxY) / 2;
        setZoom(fitZoom);
        setPan({
          x: viewport.w / 2 - cx * fitZoom,
          y: clampPanY(viewport.h / 2 - cy * fitZoom, fitZoom, viewport.h),
        });
      }
      // region 점프 시 도시 패널은 닫음.
      setSelectedCity(null);
    }
    if (focus.city) {
      const entry = CITY_MAP.get(focus.city);
      if (entry) {
        // 도시가 속한 해역도 보이게 보장.
        setVisibleRegions((prev) => {
          if (prev.has(entry.region)) return prev;
          const next = new Set(prev);
          next.add(entry.region);
          return next;
        });
        // 도시 자동 선택 + 화면 중앙으로 (현재 줌 유지).
        setSelectedCity(focus.city);
        if (viewport.w > 0 && viewport.h > 0) {
          setPan({
            x: viewport.w / 2 - (entry.x + DOT_OFFSET_X) * zoom,
            y: clampPanY(viewport.h / 2 - (entry.y + DOT_OFFSET_Y) * zoom, zoom, viewport.h),
          });
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus?.epoch, viewport.w, viewport.h]);

  // (검색 시 자동 pan 은 제거 — 자동완성 드롭다운에서 Enter/클릭으로 명시적 선택)

  return (
    <div className="w-full h-full flex flex-col">
      {/* 상단 툴바 */}
      <div className="shrink-0 px-3 md:px-5 py-2 border-b border-slate-200 bg-white flex flex-wrap md:flex-nowrap items-center gap-2 md:gap-3">
        <h2 className="hidden md:flex text-[14px] font-black text-slate-800 items-center gap-1.5 shrink-0">
          <Globe size={16} className="text-indigo-500" />
          세계 지도
        </h2>
        <span className="hidden md:inline text-[11px] font-bold text-slate-500 shrink-0">
          224개 항구 · 18개 해역
        </span>
        <div className="relative ml-auto flex items-center gap-1.5 md:gap-2 order-1 md:order-none">
          {/* 교역품 검색 드롭다운 */}
          <div className="static md:relative" ref={itemMenuRef}>
            <button
              onClick={() => {
                setItemMenuOpen((v) => !v);
                if (!itemMenuOpen) setTimeout(() => itemInputRef.current?.focus(), 50);
              }}
              title="교역품 검색 — 선택 시 생산 도시만 시즌 색으로 표시"
              className={`inline-flex items-center gap-1 px-2 md:px-2.5 py-1.5 rounded-lg border text-[12px] font-bold transition-colors whitespace-nowrap shrink-0
                ${selectedItem
                  ? 'bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
            >
              <Package size={13} />
              {selectedItem ? selectedItem : '교역품'}
              {selectedItem && (
                <span
                  role="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedItem(null);
                    setItemQuery('');
                  }}
                  className="ml-1 inline-flex items-center justify-center w-3.5 h-3.5 rounded-full hover:bg-white/20"
                  title="선택 해제"
                >
                  <X size={10} />
                </span>
              )}
              <ChevronDown size={12} className={`transition-transform ${itemMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            {itemMenuOpen && (
              <div className="absolute right-3 md:right-0 top-full mt-1 z-30 w-[min(18rem,calc(100vw-1.5rem))] md:w-72 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
                <div className="px-2 py-2 border-b border-slate-100 bg-slate-50">
                  <div className="relative">
                    <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      ref={itemInputRef}
                      value={itemQuery}
                      onChange={(e) => setItemQuery(e.target.value)}
                      placeholder="교역품 검색..."
                      className="w-full pl-7 pr-2 py-1.5 text-[12px] border border-slate-200 rounded-md bg-white focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                    />
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 px-1">
                    {itemSuggestions.length === 100 ? '상위 100개 표시 (검색으로 좁히세요)' : `${itemSuggestions.length}개 일치`}
                  </div>
                </div>
                <ul className="max-h-80 overflow-y-auto py-1">
                  {itemSuggestions.length === 0 ? (
                    <li className="px-3 py-2 text-[12px] text-slate-400 italic">일치 항목 없음</li>
                  ) : (
                    itemSuggestions.map((name) => {
                      const meta = seasonCal.items[name];
                      const cls = seasonCal.itemClasses[name];
                      const cityCount = meta?.cities.length ?? 0;
                      return (
                        <li key={name}>
                          <button
                            onClick={() => {
                              setSelectedItem(name);
                              setItemMenuOpen(false);
                              setItemQuery('');
                            }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] hover:bg-emerald-50 transition-colors text-left"
                          >
                            <span className="flex-1 truncate">
                              {cls === '명산품' && <span className="text-amber-500 mr-0.5">★</span>}
                              <span className="font-bold text-slate-800">{name}</span>
                              {meta && <span className="text-[10px] text-slate-400 ml-1">({meta.category})</span>}
                            </span>
                            <span className="text-[10px] text-slate-400 tabular-nums shrink-0">{cityCount}곳</span>
                          </button>
                        </li>
                      );
                    })
                  )}
                </ul>
              </div>
            )}
          </div>

          <div className="static md:relative" ref={regionMenuRef}>
            <button
              onClick={() => setRegionMenuOpen((v) => !v)}
              title="해역 영역 표시 선택"
              className={`inline-flex items-center gap-1 px-2 md:px-2.5 py-1.5 rounded-lg border text-[12px] font-bold transition-colors whitespace-nowrap shrink-0
                ${noneOn
                  ? 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                  : allOn
                    ? 'bg-indigo-600 text-white border-indigo-700 hover:bg-indigo-700'
                    : 'bg-indigo-50 text-indigo-700 border-indigo-300 hover:bg-indigo-100'}`}
            >
              <Layers size={13} />
              <span className="hidden sm:inline">해역 영역</span>
              <span className="sm:hidden">해역</span>
              <span className="text-[10px] tabular-nums opacity-80">
                ({visibleRegions.size}/{allRegionNames.length})
              </span>
              <ChevronDown size={12} className={`transition-transform ${regionMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            {regionMenuOpen && (
              <div className="absolute right-3 md:right-0 top-full mt-1 z-30 w-[min(16rem,calc(100vw-1.5rem))] md:w-64 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
                <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between gap-2 bg-slate-50">
                  <span className="text-[11px] font-black text-slate-700">해역 선택</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setVisibleRegions(new Set(allRegionNames))}
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                    >
                      전체
                    </button>
                    <button
                      onClick={() => setVisibleRegions(new Set())}
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                    >
                      해제
                    </button>
                  </div>
                </div>
                <ul className="max-h-80 overflow-y-auto py-1">
                  {allRegionNames.map((region) => {
                    const checked = visibleRegions.has(region);
                    const color = REGION_HEX_COLORS[region];
                    return (
                      <li key={region}>
                        <button
                          onClick={() => {
                            setVisibleRegions((prev) => {
                              const next = new Set(prev);
                              if (next.has(region)) next.delete(region);
                              else next.add(region);
                              return next;
                            });
                          }}
                          className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] hover:bg-slate-50 transition-colors text-left"
                        >
                          <span
                            className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors
                              ${checked ? 'border-transparent' : 'bg-white border-slate-300'}`}
                            style={checked ? { backgroundColor: color } : undefined}
                          >
                            {checked && <Check size={10} className="text-white" strokeWidth={3} />}
                          </span>
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: color }}
                          />
                          <span className={`flex-1 truncate ${checked ? 'text-slate-800 font-bold' : 'text-slate-500'}`}>
                            {region}
                          </span>
                          <span className="text-[10px] text-slate-400 tabular-nums shrink-0">
                            {REGION_TO_CITIES.get(region)?.length ?? 0}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        </div>
        <div className="relative w-full md:w-auto order-2 md:order-none" ref={searchBoxRef}>
          <Search size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setSearchOpen(true); }}
            onFocus={() => setSearchOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && searchSuggestions.length > 0) {
                e.preventDefault();
                pickSearchedCity(searchSuggestions[0].city);
              } else if (e.key === 'Escape') {
                setSearchOpen(false);
              }
            }}
            placeholder="도시 검색 (초성 가능)"
            className="pl-7 pr-2 py-1.5 text-[12px] border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 w-full md:w-56 min-w-0"
          />
            {searchOpen && searchTrim && (
              <div className="absolute right-0 top-full mt-1 z-30 w-64 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
                {searchSuggestions.length === 0 ? (
                  <div className="px-3 py-2 text-[12px] text-slate-400 italic">일치 없음</div>
                ) : (
                  <ul className="max-h-72 overflow-y-auto py-1">
                    {searchSuggestions.map((c, idx) => (
                      <li key={c.city}>
                        <button
                          onClick={() => pickSearchedCity(c.city)}
                          className={`w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-left transition-colors
                            ${idx === 0 ? 'bg-indigo-50/50' : ''} hover:bg-indigo-50`}
                        >
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: REGION_HEX_COLORS[c.region] ?? '#64748b' }}
                          />
                          <span className="font-bold text-slate-800 truncate">{c.city}</span>
                          <span className="text-[10px] text-slate-400 ml-auto shrink-0">{c.region}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
        </div>
      </div>

      {/* 본문 — 지도 캔버스 */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden bg-slate-200 select-none"
        style={{
          cursor: isDragging ? 'grabbing' : 'grab',
          touchAction: 'none',
        }}
        onPointerDown={onPointerDown}
        onWheel={onWheel}
      >
        {(() => {
          const W = MAP_NATURAL_WIDTH * zoom;
          const nMin = Math.floor(-pan.x / W) - 1;
          const nMax = Math.ceil((viewport.w - pan.x) / W) + 1;
          const copies: number[] = [];
          for (let n = nMin; n <= nMax; n++) copies.push(n);
          const dotInvScale = 1 / zoom;
          const showLabels = zoom >= LABEL_VISIBLE_ZOOM;

          return (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: '0 0',
                willChange: 'transform',
              }}
            >
              {/* 지도 카피들 (가로 wrap) */}
              {copies.map((n) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={`map-${n}`}
                  src="/maps/world-map.webp"
                  alt="World map"
                  draggable={false}
                  style={{
                    position: 'absolute',
                    left: n * MAP_NATURAL_WIDTH,
                    top: 0,
                    width: MAP_NATURAL_WIDTH,
                    height: MAP_NATURAL_HEIGHT,
                    maxWidth: 'none',
                    userSelect: 'none',
                    pointerEvents: 'none',
                    display: 'block',
                  }}
                />
              ))}

              {/* 해역 영역 폴리곤 — 카피별 wrap, 도시 배지 아래에 위치, visibleRegions 필터 적용 */}
              {visibleRegions.size > 0 && copies.map((n) => (
                <svg
                  key={`regions-${n}`}
                  width={MAP_NATURAL_WIDTH}
                  height={MAP_NATURAL_HEIGHT}
                  style={{
                    position: 'absolute',
                    left: n * MAP_NATURAL_WIDTH,
                    top: 0,
                    pointerEvents: 'none',
                    overflow: 'visible',
                  }}
                >
                  {regionHulls
                    .filter(({ region }) => visibleRegions.has(region))
                    .map(({ region, hull, color }) => (
                      <polygon
                        key={region}
                        points={hull.map((p) => `${p.x},${p.y}`).join(' ')}
                        fill={color}
                        fillOpacity={0.13}
                        stroke={color}
                        strokeOpacity={0.55}
                        strokeWidth={6 / zoom}
                        strokeLinejoin="round"
                      />
                    ))}
                </svg>
              ))}

              {/* 도시 배지 + 라벨 — 본거지는 골드 성 모양, 일반은 해역색 닻 모양 */}
              {ALL_CITIES.map((entry) =>
                copies.map((n) => {
                  const wx = entry.x + DOT_OFFSET_X + n * MAP_NATURAL_WIDTH;
                  const wy = entry.y + DOT_OFFSET_Y;
                  const screenX = pan.x + wx * zoom;
                  const screenY = pan.y + wy * zoom;
                  if (
                    screenX < -80 ||
                    screenX > viewport.w + 80 ||
                    screenY < -48 ||
                    screenY > viewport.h + 48
                  ) {
                    return null;
                  }
                  const isHomeBase = HOME_BASES.has(entry.city);
                  const isHovered = hoveredCity === entry.city;
                  const isMatched = matchedCities.has(entry.city);
                  const regionColor = REGION_DOT_COLORS[entry.region] ?? 'bg-slate-500';

                  // 교역품 모드: 시즌 색상 / dim 처리
                  const seasonStatus = itemSeasonByCity?.get(entry.city) ?? null;
                  const isProducer = !!seasonStatus;
                  const itemMode = !!selectedItem;
                  const dimmed = itemMode && !isProducer;

                  // 배지 사이즈 — 본거지가 일반 도시보다 살짝 크게. itemMode 생산도시는 +4 키움.
                  const badgeSize = isHomeBase
                    ? (isProducer ? 22 : 18)
                    : (isProducer ? 18 : 14);
                  const iconSize = isHomeBase ? 11 : 9;

                  // itemMode 에선 시즌 색이 모든 시각요소를 지배.
                  let badgeBg = isHomeBase
                    ? 'bg-gradient-to-br from-amber-400 to-amber-600'
                    : regionColor;
                  if (itemMode && isProducer) {
                    badgeBg = seasonStatus === '성'
                      ? 'bg-emerald-500'
                      : seasonStatus === '비'
                        ? 'bg-rose-500'
                        : 'bg-slate-400';
                  }
                  const ringClass = isMatched
                    ? 'ring-2 ring-amber-400 ring-offset-1 ring-offset-white/70'
                    : isProducer
                      ? 'ring-2 ring-white shadow-lg'
                      : isHovered
                        ? 'ring-2 ring-white/90'
                        : '';
                  const shapeClass = isHomeBase ? 'rounded-md' : 'rounded-full';
                  const Icon = isHomeBase ? Castle : Anchor;
                  const seasonSym = seasonStatus === '성' ? '▲' : seasonStatus === '비' ? '▼' : seasonStatus === '평' ? '―' : null;

                  return (
                    <React.Fragment key={`${entry.city}-${n}`}>
                      <button
                        type="button"
                        onMouseEnter={() => setHoveredCity(entry.city)}
                        onMouseLeave={() => setHoveredCity((c) => (c === entry.city ? null : c))}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCity(entry.city);
                        }}
                        title={`${entry.city} (${entry.region})${isHomeBase ? ' · 본거지' : ''}${seasonStatus ? ` · ${selectedItem} ${seasonSym}` : ''}`}
                        className="absolute p-0 bg-transparent border-0 cursor-pointer"
                        style={{
                          left: wx,
                          top: wy,
                          transform: `translate(-50%, -50%) scale(${dotInvScale})`,
                          transformOrigin: 'center',
                          zIndex: isProducer ? 8 : isHomeBase ? 6 : isHovered || isMatched ? 10 : 2,
                          opacity: dimmed ? 0.25 : 1,
                          transition: 'opacity 0.15s',
                        }}
                      >
                        <div
                          className={`${shapeClass} ${badgeBg} ${ringClass}
                            flex items-center justify-center
                            border border-white/90 shadow-md hover:brightness-110 transition-all`}
                          style={{ width: badgeSize, height: badgeSize }}
                        >
                          {itemMode && isProducer && seasonSym ? (
                            <span className="text-white font-black drop-shadow" style={{ fontSize: isHomeBase ? 13 : 11 }}>
                              {seasonSym}
                            </span>
                          ) : (
                            <Icon size={iconSize} strokeWidth={2.5} className="text-white drop-shadow" />
                          )}
                        </div>
                      </button>
                      {(showLabels || isHovered || isMatched || (itemMode && isProducer)) && (
                        <div
                          style={{
                            position: 'absolute',
                            left: wx,
                            top: wy,
                            transform: `translate(-50%, calc(-100% - ${isHomeBase ? 10 : 8}px)) scale(${dotInvScale})`,
                            transformOrigin: 'center bottom',
                            pointerEvents: 'none',
                            zIndex: isHovered || isMatched ? 11 : isHomeBase ? 7 : 3,
                          }}
                          className="whitespace-nowrap"
                        >
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-black shadow-sm
                              ${isHovered || isMatched
                                ? 'bg-slate-900 text-white'
                                : isHomeBase
                                  ? 'bg-amber-500 text-white border border-amber-700'
                                  : 'bg-white/85 text-slate-800 border border-slate-300/60'}`}
                          >
                            {isHomeBase && '👑 '}{entry.city}
                          </span>
                        </div>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </div>
          );
        })()}

        {/* 줌 레벨 표시 */}
        <div className="absolute bottom-3 right-3 bg-white/90 border border-slate-300 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-700 shadow-sm pointer-events-none">
          {Math.round(zoom * 100)}%
        </div>
      </div>

      {/* 도시 상세 패널 */}
      <CityDetailPanel city={selectedCity} onClose={() => setSelectedCity(null)} />
    </div>
  );
}
