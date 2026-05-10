'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Search,
  Save,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Download,
  Upload,
  MapPin,
  Wand2,
} from 'lucide-react';
import townCoordsRaw from '@/constants/townCoords.json';
import { REGION_PORTS } from '@/lib/trade/cities';

type Town = { id: string; x: number; y: number; s: number };
type Labels = Record<string, string>;
type FilterMode = 'all' | 'unlabeled' | 'labeled-hidden';

// 224개 한글 도시명 + 해역 리버스 매핑 — 한글명 자동완성용.
const ALL_CITY_NAMES: string[] = Object.values(REGION_PORTS).flat().sort((a, b) => a.localeCompare(b));
const CITY_REGION: Record<string, string> = (() => {
  const m: Record<string, string> = {};
  for (const [region, list] of Object.entries(REGION_PORTS)) {
    for (const city of list) m[city] = region;
  }
  return m;
})();

const STORAGE_KEY = 'townLabels.v1';
const MAP_NATURAL_WIDTH = 9972;
const MAP_NATURAL_HEIGHT = 5886;
const DOT_SIZE = 10;
const MIN_ZOOM = 0.08;
const MAX_ZOOM = 4;
const WHEEL_ZOOM_FACTOR = 1.15;
// 원본 map.html 의 좌표 보정 — DB 좌표가 마커 hotspot 기준으로 살짝 어긋나 있어 7시 방향으로 밀어줌.
const DOT_OFFSET_X = 30;
const DOT_OFFSET_Y = 20;

const coordsTowns: Town[] =
  (townCoordsRaw as { towns?: Town[] } | null)?.towns ?? [];

export default function TownLabeler() {
  const [labels, setLabels] = useState<Labels>({});
  const [hydrated, setHydrated] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const [showNameSuggestions, setShowNameSuggestions] = useState(false);
  const [highlightedNameIdx, setHighlightedNameIdx] = useState(-1);
  const [filter, setFilter] = useState<FilterMode>('all');
  const [tier1, setTier1] = useState(true);
  const [tier2, setTier2] = useState(true);
  const [tier3, setTier3] = useState(true);
  const [search, setSearch] = useState('');
  const [importMsg, setImportMsg] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // 변환 기반 pan/zoom 상태 — overflow-hidden 컨테이너 안에서 transform 으로 이동.
  // pan: 화면 좌표(px). 월드(0,0) 가 화면의 어디에 있는지.
  // zoom: 1 = 원본 크기. < 1 면 축소, > 1 이면 확대.
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(0.2);
  const [viewport, setViewport] = useState({ w: 0, h: 0 });

  // 컨테이너 크기 측정 → 초기 zoom 을 viewport 폭에 맞춰 자동 설정.
  useEffect(() => {
    const c = scrollRef.current;
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

  // 첫 측정 후 1회만 fit-to-width 로 기본 줌 + 중앙 정렬.
  const initRef = useRef(false);
  useEffect(() => {
    if (initRef.current || viewport.w === 0) return;
    initRef.current = true;
    const fitZoom = Math.max(MIN_ZOOM, viewport.w / MAP_NATURAL_WIDTH);
    setZoom(fitZoom);
    // 세로 중앙 정렬
    setPan({ x: 0, y: (viewport.h - MAP_NATURAL_HEIGHT * fitZoom) / 2 });
  }, [viewport.w, viewport.h]);

  // 드래그 패닝 상태.
  const dragStateRef = useRef<{
    active: boolean;
    moved: boolean;
    startX: number;
    startY: number;
    panX: number;
    panY: number;
  }>({ active: false, moved: false, startX: 0, startY: 0, panX: 0, panY: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const onMapPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    dragStateRef.current = {
      active: true,
      moved: false,
      startX: e.clientX,
      startY: e.clientY,
      panX: pan.x,
      panY: pan.y,
    };
    setIsDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  }, [pan.x, pan.y]);

  const onMapPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const s = dragStateRef.current;
    if (!s.active) return;
    const dx = e.clientX - s.startX;
    const dy = e.clientY - s.startY;
    if (!s.moved && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) s.moved = true;
    setPan({ x: s.panX + dx, y: s.panY + dy });
  }, []);

  const onMapPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStateRef.current.active) return;
    dragStateRef.current.active = false;
    setIsDragging(false);
    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
  }, []);

  // 휠 줌 — 마우스 커서 위치를 중심으로 확대/축소.
  const onMapWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const c = scrollRef.current;
    if (!c) return;
    const rect = c.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? WHEEL_ZOOM_FACTOR : 1 / WHEEL_ZOOM_FACTOR;
    const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom * factor));
    if (newZoom === zoom) return;
    // 마우스 위치의 월드 좌표를 줌 전후 동일하게 유지.
    const worldX = (mx - pan.x) / zoom;
    const worldY = (my - pan.y) / zoom;
    setPan({
      x: mx - worldX * newZoom,
      y: my - worldY * newZoom,
    });
    setZoom(newZoom);
  }, [zoom, pan.x, pan.y]);

  // Hydrate labels from localStorage once on mount.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (parsed && typeof parsed === 'object') {
          const cleaned: Labels = {};
          for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
            if (typeof v === 'string' && v.trim()) cleaned[k] = v;
          }
          setLabels(cleaned);
        }
      }
    } catch {
      /* ignore corrupt storage */
    } finally {
      setHydrated(true);
    }
  }, []);

  // Persist labels (after hydration to avoid clobbering on first render).
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(labels));
    } catch {
      /* quota or privacy mode — ignore */
    }
  }, [labels, hydrated]);

  // Sort by id for stable navigation order.
  const allTowns = useMemo(() => {
    const arr = coordsTowns.slice();
    arr.sort((a, b) => a.id.localeCompare(b.id));
    return arr;
  }, []);

  // 이미 다른 town 에 매핑된 한글명 set — 중복 방지 표시용.
  const usedNamesByOther = useMemo(() => {
    const m = new Map<string, string>(); // 한글명 → townId
    for (const [tid, name] of Object.entries(labels)) {
      if (tid !== selectedId && name) m.set(name, tid);
    }
    return m;
  }, [labels, selectedId]);

  // 한글명 자동완성 후보 — input 값으로 부분 매칭.
  const nameSuggestions = useMemo(() => {
    const q = draftName.trim();
    if (!q) return ALL_CITY_NAMES;
    return ALL_CITY_NAMES.filter((n) => n.includes(q));
  }, [draftName]);

  const tierAllowed = useCallback(
    (s: number) => {
      if (s === 1) return tier1;
      if (s === 2) return tier2;
      if (s === 3) return tier3;
      return true;
    },
    [tier1, tier2, tier3],
  );

  const visibleTowns = useMemo(() => {
    return allTowns.filter((t) => {
      if (!tierAllowed(t.s)) return false;
      const labeled = !!labels[t.id];
      if (filter === 'unlabeled' && labeled) return false;
      if (filter === 'labeled-hidden' && labeled) return false;
      return true;
    });
  }, [allTowns, tierAllowed, labels, filter]);

  const labeledCount = useMemo(
    () => allTowns.filter((t) => !!labels[t.id]).length,
    [allTowns, labels],
  );
  const total = allTowns.length;
  const unlabeledCount = total - labeledCount;

  // Search match — by townId (substring) or Korean name (substring) — drives highlight.
  const searchTrim = search.trim();
  const matchedIds = useMemo(() => {
    if (!searchTrim) return new Set<string>();
    const ids = new Set<string>();
    for (const t of allTowns) {
      const name = labels[t.id] ?? '';
      if (t.id.includes(searchTrim) || (name && name.includes(searchTrim))) {
        ids.add(t.id);
      }
    }
    return ids;
  }, [searchTrim, allTowns, labels]);

  const selectedTown = useMemo(
    () => (selectedId ? allTowns.find((t) => t.id === selectedId) ?? null : null),
    [selectedId, allTowns],
  );

  // When user picks a town, sync the input with its existing label.
  useEffect(() => {
    if (!selectedId) {
      setDraftName('');
      return;
    }
    setDraftName(labels[selectedId] ?? '');
    // Autofocus the input.
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [selectedId, labels]);

  // 선택 시 해당 점이 화면 중앙에 오도록 pan 을 직접 설정.
  const scrollDotIntoView = useCallback((t: Town) => {
    const container = scrollRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    setPan({
      x: rect.width / 2 - t.x * zoom,
      y: rect.height / 2 - t.y * zoom,
    });
  }, [zoom]);

  const selectTown = useCallback(
    (id: string, opts?: { scroll?: boolean }) => {
      setSelectedId(id);
      if (opts?.scroll) {
        const t = allTowns.find((x) => x.id === id);
        if (t) scrollDotIntoView(t);
      }
    },
    [allTowns, scrollDotIntoView],
  );

  const handleSave = useCallback(() => {
    if (!selectedId) return;
    const name = draftName.trim();
    setLabels((prev) => {
      const next = { ...prev };
      if (name) next[selectedId] = name;
      else delete next[selectedId];
      return next;
    });
  }, [selectedId, draftName]);

  const handleClear = useCallback(() => {
    if (!selectedId) return;
    setLabels((prev) => {
      const next = { ...prev };
      delete next[selectedId];
      return next;
    });
    setDraftName('');
  }, [selectedId]);

  const goToUnlabeled = useCallback(
    (direction: 1 | -1) => {
      if (allTowns.length === 0) return;
      const startIdx = selectedId
        ? allTowns.findIndex((t) => t.id === selectedId)
        : direction === 1
          ? -1
          : allTowns.length;
      const len = allTowns.length;
      for (let step = 1; step <= len; step += 1) {
        const idx = (startIdx + direction * step + len * len) % len;
        const cand = allTowns[idx];
        if (!labels[cand.id] && tierAllowed(cand.s)) {
          selectTown(cand.id, { scroll: true });
          return;
        }
      }
    },
    [allTowns, selectedId, labels, tierAllowed, selectTown],
  );

  const handleExport = useCallback(() => {
    const blob = new Blob([JSON.stringify(labels, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'townLabels.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [labels]);

  const handleImportFile = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(String(reader.result)) as unknown;
          if (!parsed || typeof parsed !== 'object') {
            setImportMsg('JSON 형식이 올바르지 않습니다.');
            return;
          }
          const incoming: Labels = {};
          for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
            if (typeof v === 'string' && v.trim()) incoming[k] = v;
          }
          let added = 0;
          let updated = 0;
          setLabels((prev) => {
            const next = { ...prev };
            for (const [k, v] of Object.entries(incoming)) {
              if (next[k] === undefined) added += 1;
              else if (next[k] !== v) updated += 1;
              next[k] = v;
            }
            return next;
          });
          setImportMsg(`불러오기 완료: 추가 ${added}, 변경 ${updated}`);
        } catch {
          setImportMsg('파일을 읽을 수 없습니다.');
        }
      };
      reader.onerror = () => setImportMsg('파일 읽기 오류.');
      reader.readAsText(file);
    },
    [],
  );

  // 잘린 라벨(부분 입력 후 Enter 로 저장된 케이스) 일괄 자동 수정.
  // 캐논 224개 중 정확히 1개로 prefix 매칭되는 것만 자동 적용.
  // 모호하거나 매칭 없으면 그대로 두고 카운트만 보고.
  const handleFixTruncated = useCallback(() => {
    const canonical = new Set(ALL_CITY_NAMES);
    const fixes: Array<{ tid: string; from: string; to: string }> = [];
    const ambiguous: Array<{ tid: string; from: string; candidates: string[] }> = [];
    const unmatched: Array<{ tid: string; from: string }> = [];
    for (const [tid, name] of Object.entries(labels)) {
      if (canonical.has(name)) continue; // 이미 캐논 — 건드리지 않음
      const candidates = ALL_CITY_NAMES.filter((c) => c.startsWith(name));
      if (candidates.length === 1) fixes.push({ tid, from: name, to: candidates[0] });
      else if (candidates.length === 0) unmatched.push({ tid, from: name });
      else ambiguous.push({ tid, from: name, candidates });
    }
    if (fixes.length === 0) {
      setImportMsg(`수정할 잘린 라벨 없음. (모호 ${ambiguous.length}, 매칭 없음 ${unmatched.length})`);
      return;
    }
    setLabels((prev) => {
      const next = { ...prev };
      for (const f of fixes) next[f.tid] = f.to;
      return next;
    });
    const parts = [`✅ ${fixes.length}건 수정 완료`];
    if (ambiguous.length > 0) parts.push(`⚠️ 모호 ${ambiguous.length}건 (수동 확인 필요)`);
    if (unmatched.length > 0) parts.push(`❌ 매칭 없음 ${unmatched.length}건`);
    setImportMsg(parts.join(' / '));
  }, [labels]);

  // Scroll matched search target into view (first match only).
  useEffect(() => {
    if (!searchTrim) return;
    const first = allTowns.find((t) => matchedIds.has(t.id));
    if (first) scrollDotIntoView(first);
  }, [searchTrim, matchedIds, allTowns, scrollDotIntoView]);

  // Empty-state when townCoords.json hasn't been generated yet.
  if (allTowns.length === 0) {
    return (
      <div className="min-h-screen bg-[#f0ece4] p-4 md:p-8">
        <div className="max-w-3xl mx-auto space-y-4">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-[12px] font-bold rounded-lg shadow-sm transition-all"
          >
            <ArrowLeft size={13} /> 관리자 대시보드
          </Link>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h1 className="text-xl font-black text-slate-800">도시 라벨링 도구</h1>
            <p className="text-[13px] text-slate-600 mt-2 leading-relaxed">
              <code className="px-1 py-0.5 bg-slate-100 rounded">constants/townCoords.json</code> 이 비어있습니다.
              아래 명령으로 좌표를 추출한 뒤 다시 열어주세요.
            </p>
            <pre className="mt-3 bg-slate-900 text-slate-100 text-[12px] rounded-xl p-3 overflow-x-auto">
              python scripts/extract_town_coords.py
            </pre>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0ece4]">
      {/* Top bar */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm">
        <div className="px-3 md:px-5 py-2 flex flex-wrap items-center gap-2">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-[12px] font-bold rounded-lg shadow-sm"
          >
            <ArrowLeft size={13} /> 관리자
          </Link>
          <h1 className="text-[14px] font-black text-slate-800 mr-2">도시 라벨링 도구</h1>

          <div className="text-[12px] text-slate-600 font-bold flex items-center gap-3 mr-2">
            <span>전체 <span className="text-slate-900">{total}</span></span>
            <span className="text-emerald-600">라벨 {labeledCount}</span>
            <span className="text-red-600">미라벨 {unlabeledCount}</span>
          </div>

          <div className="flex items-center gap-1 text-[11px]">
            {(['all', 'unlabeled', 'labeled-hidden'] as FilterMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setFilter(mode)}
                className={`px-2 py-1 rounded-md font-bold border transition-colors ${
                  filter === mode
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {mode === 'all' ? '전체' : mode === 'unlabeled' ? '라벨 안 된 것만' : '라벨된 것 숨기기'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-[11px] font-bold text-slate-700 ml-1">
            <label className="inline-flex items-center gap-1">
              <input type="checkbox" checked={tier1} onChange={(e) => setTier1(e.target.checked)} />
              T1
            </label>
            <label className="inline-flex items-center gap-1">
              <input type="checkbox" checked={tier2} onChange={(e) => setTier2(e.target.checked)} />
              T2
            </label>
            <label className="inline-flex items-center gap-1">
              <input type="checkbox" checked={tier3} onChange={(e) => setTier3(e.target.checked)} />
              T3
            </label>
          </div>

          <div className="flex items-center gap-1 ml-auto">
            <div className="relative">
              <Search
                size={13}
                className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="townID 또는 한글명 검색"
                className="pl-7 pr-2 py-1.5 text-[12px] border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 w-56"
              />
            </div>
            <button
              onClick={handleFixTruncated}
              title="부분 입력으로 저장된 잘린 라벨을 캐논 도시명으로 자동 보정 (정확히 1개 매칭되는 것만)"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-[12px] font-bold rounded-lg shadow-sm"
            >
              <Wand2 size={13} /> 잘린 라벨 수정
            </button>
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[12px] font-bold rounded-lg shadow-sm"
            >
              <Download size={13} /> 내보내기
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-700 hover:bg-slate-800 text-white text-[12px] font-bold rounded-lg shadow-sm"
            >
              <Upload size={13} /> 불러오기
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleImportFile(f);
                if (e.target) e.target.value = '';
              }}
            />
          </div>
        </div>
        {importMsg && (
          <div className="px-3 md:px-5 pb-2 text-[12px] text-slate-700 font-bold">{importMsg}</div>
        )}
      </div>

      {/* Body — pan/zoom map + side panel */}
      <div className="flex" style={{ height: 'calc(100vh - 50px)' }}>
        <div
          ref={scrollRef}
          className="flex-1 relative overflow-hidden bg-slate-200 select-none"
          style={{
            cursor: isDragging ? 'grabbing' : 'grab',
            touchAction: 'none',
          }}
          onPointerDown={onMapPointerDown}
          onPointerMove={onMapPointerMove}
          onPointerUp={onMapPointerUp}
          onPointerCancel={onMapPointerUp}
          onWheel={onMapWheel}
        >
          {(() => {
            const W = MAP_NATURAL_WIDTH * zoom;
            // 가로로 보이는 카피 인덱스 범위 (지구본 wrap).
            const nMin = Math.floor(-pan.x / W) - 1;
            const nMax = Math.ceil((viewport.w - pan.x) / W) + 1;
            const copies: number[] = [];
            for (let n = nMin; n <= nMax; n++) copies.push(n);
            // 점은 화면 픽셀 기준 항상 일정 크기로 보이도록 zoom 의 역수 적용.
            const dotInvScale = 1 / zoom;
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
                {/* 지도 카피들 — 월드 좌표(원본 픽셀) 그대로. 부모 transform 이 zoom 적용. */}
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
                      maxWidth: 'none', // Tailwind 기본 max-width:100% 무력화 (부모가 0x0 라 0이 되는 버그 회피)
                      userSelect: 'none',
                      pointerEvents: 'none',
                      display: 'block',
                    }}
                  />
                ))}
                {/* 점들 — 월드 좌표 기준 + 1/zoom 보정으로 화면 픽셀 크기는 일정 */}
                {visibleTowns.map((t) =>
                  copies.map((n) => {
                    const wx = t.x + DOT_OFFSET_X + n * MAP_NATURAL_WIDTH;
                    const wy = t.y + DOT_OFFSET_Y;
                    // 화면 viewport 컬링 (월드 → 스크린 변환 후 비교)
                    const screenX = pan.x + wx * zoom;
                    const screenY = pan.y + wy * zoom;
                    if (
                      screenX < -32 ||
                      screenX > viewport.w + 32 ||
                      screenY < -32 ||
                      screenY > viewport.h + 32
                    ) {
                      return null;
                    }
                    const labeled = !!labels[t.id];
                    const isSelected = t.id === selectedId;
                    const isMatched = matchedIds.has(t.id);
                    const sizeBoost = t.s === 3 ? 2 : t.s === 2 ? 1 : 0;
                    const baseSize = DOT_SIZE + sizeBoost;
                    const finalSize = isSelected ? baseSize + 6 : isMatched ? baseSize + 4 : baseSize;
                    const baseClass = labeled ? 'bg-emerald-500/80' : 'bg-red-500/80';
                    const ringClass = isSelected
                      ? 'ring-2 ring-blue-500 ring-offset-1 ring-offset-white/70'
                      : isMatched
                        ? 'ring-2 ring-amber-400'
                        : '';
                    // 점 자체에 1/zoom scale 을 적용해 화면상 크기 = finalSize 픽셀 일정.
                    return (
                      <button
                        key={`${t.id}-${n}`}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          selectTown(t.id);
                        }}
                        title={`${t.id}${labels[t.id] ? ` — ${labels[t.id]}` : ''} (s=${t.s})`}
                        className={`absolute rounded-full border border-white/70 shadow-sm hover:scale-150 transition-transform cursor-pointer ${baseClass} ${ringClass}`}
                        style={{
                          width: finalSize,
                          height: finalSize,
                          left: wx,
                          top: wy,
                          padding: 0,
                          transform: `translate(-50%, -50%) scale(${dotInvScale})`,
                          transformOrigin: 'center',
                        }}
                      />
                    );
                  })
                )}
              </div>
            );
          })()}
          {/* 줌 레벨 표시 — transform 영향 안 받게 컨테이너 직속 */}
          <div className="absolute bottom-3 right-3 bg-white/90 border border-slate-300 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-700 shadow-sm pointer-events-none">
            {Math.round(zoom * 100)}%
          </div>
        </div>

        {/* Right side panel */}
        <aside className="w-[300px] shrink-0 border-l border-slate-200 bg-white overflow-y-auto">
          <div className="p-4 space-y-4">
            <div>
              <h2 className="text-[13px] font-black text-slate-800 flex items-center gap-1.5">
                <MapPin size={14} className="text-red-500" /> 선택된 도시
              </h2>
              {selectedTown ? (
                <div className="mt-2 space-y-1 text-[12px] text-slate-700">
                  <div>
                    <span className="text-slate-500">ID:</span>{' '}
                    <span className="font-mono font-bold">{selectedTown.id}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">좌표:</span>{' '}
                    <span className="font-mono">x={selectedTown.x}, y={selectedTown.y}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">크기:</span>{' '}
                    <span className="font-bold">s={selectedTown.s}</span>
                  </div>
                </div>
              ) : (
                <p className="text-[12px] text-slate-500 mt-1">지도에서 점을 클릭하세요.</p>
              )}
            </div>

            <div className="space-y-1.5 relative">
              <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider">
                한글명 ({ALL_CITY_NAMES.length}개 도시)
              </label>
              <input
                ref={inputRef}
                value={draftName}
                onChange={(e) => {
                  setDraftName(e.target.value);
                  setShowNameSuggestions(true);
                  setHighlightedNameIdx(-1);
                }}
                onFocus={() => { setShowNameSuggestions(true); setHighlightedNameIdx(-1); }}
                onBlur={() => setTimeout(() => setShowNameSuggestions(false), 150)}
                onKeyDown={(e) => {
                  if (showNameSuggestions && nameSuggestions.length > 0) {
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      setHighlightedNameIdx((i) => Math.min(i + 1, nameSuggestions.length - 1));
                      return;
                    }
                    if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      setHighlightedNameIdx((i) => Math.max(i - 1, 0));
                      return;
                    }
                    if (e.key === 'Escape') {
                      setShowNameSuggestions(false);
                      return;
                    }
                  }
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    // 자동완성에서 항목 highlight 했으면 그 값으로 즉시 저장.
                    if (showNameSuggestions && highlightedNameIdx >= 0 && nameSuggestions[highlightedNameIdx] && selectedId) {
                      const pick = nameSuggestions[highlightedNameIdx];
                      setDraftName(pick);
                      setShowNameSuggestions(false);
                      // 클로저 우회 — 명시적 값으로 setLabels 호출
                      setLabels((prev) => ({ ...prev, [selectedId]: pick }));
                      goToUnlabeled(1);
                    } else {
                      handleSave();
                      goToUnlabeled(1);
                    }
                  }
                }}
                disabled={!selectedTown}
                placeholder={selectedTown ? '예: 런던' : '도시 미선택'}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:bg-slate-50 disabled:text-slate-400"
              />
              {showNameSuggestions && selectedTown && nameSuggestions.length > 0 && (
                <ul className="absolute z-30 top-full mt-1 w-full bg-white border border-slate-200 rounded-xl overflow-hidden shadow-lg max-h-72 overflow-y-auto">
                  {nameSuggestions.map((name, idx) => {
                    const usedBy = usedNamesByOther.get(name);
                    const region = CITY_REGION[name];
                    const isHi = idx === highlightedNameIdx;
                    return (
                      <li
                        key={name}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          if (!selectedId) return;
                          setDraftName(name);
                          setShowNameSuggestions(false);
                          // 클릭 즉시 저장 + 다음 미라벨로 이동 — 클로저 우회
                          setLabels((prev) => ({ ...prev, [selectedId]: name }));
                          goToUnlabeled(1);
                        }}
                        onMouseEnter={() => setHighlightedNameIdx(idx)}
                        className={`px-3 py-1.5 text-[12px] cursor-pointer transition-colors border-b border-slate-100 last:border-0 flex items-center justify-between gap-2
                          ${isHi ? 'bg-emerald-50 text-emerald-700' : 'text-slate-700 hover:bg-slate-50'}
                          ${usedBy ? 'opacity-50' : ''}`}
                        title={usedBy ? `이미 ${usedBy} 에 매핑됨` : region ?? ''}
                      >
                        <span className="font-bold truncate">{name}</span>
                        <span className="text-[10px] text-slate-400 shrink-0 flex items-center gap-1">
                          {usedBy && <span className="text-rose-500 font-bold">사용됨</span>}
                          {region && <span>{region}</span>}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
              <p className="text-[11px] text-slate-500">↑↓ 선택, 엔터 저장 후 다음 미라벨로 이동.</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleSave}
                disabled={!selectedTown}
                className="inline-flex items-center justify-center gap-1 px-2.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-[12px] font-black rounded-lg shadow-sm"
              >
                <Save size={13} /> 저장
              </button>
              <button
                onClick={handleClear}
                disabled={!selectedTown || !labels[selectedTown.id]}
                className="inline-flex items-center justify-center gap-1 px-2.5 py-2 bg-red-500 hover:bg-red-600 disabled:bg-slate-300 text-white text-[12px] font-black rounded-lg shadow-sm"
              >
                <Trash2 size={13} /> 삭제
              </button>
              <button
                onClick={() => goToUnlabeled(-1)}
                className="inline-flex items-center justify-center gap-1 px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[12px] font-black rounded-lg"
              >
                <ChevronLeft size={13} /> 이전
              </button>
              <button
                onClick={() => goToUnlabeled(1)}
                className="inline-flex items-center justify-center gap-1 px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[12px] font-black rounded-lg"
              >
                다음 <ChevronRight size={13} />
              </button>
            </div>

            {searchTrim && (
              <div>
                <h3 className="text-[11px] font-black text-slate-600 uppercase tracking-wider mb-1">
                  검색 결과 ({matchedIds.size})
                </h3>
                <div className="max-h-72 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                  {allTowns
                    .filter((t) => matchedIds.has(t.id))
                    .slice(0, 100)
                    .map((t) => (
                      <button
                        key={t.id}
                        onClick={() => selectTown(t.id, { scroll: true })}
                        className={`w-full text-left px-2 py-1.5 hover:bg-slate-50 text-[12px] flex items-center justify-between ${
                          t.id === selectedId ? 'bg-blue-50' : ''
                        }`}
                      >
                        <span className="font-mono">{t.id}</span>
                        <span className={labels[t.id] ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                          {labels[t.id] ?? '미라벨'}
                        </span>
                      </button>
                    ))}
                  {matchedIds.size === 0 && (
                    <p className="text-[12px] text-slate-500 px-2 py-2">결과 없음.</p>
                  )}
                </div>
              </div>
            )}

            <div className="text-[11px] text-slate-500 leading-relaxed border-t border-slate-100 pt-3">
              <p>색상: <span className="text-red-500 font-bold">빨강</span> = 미라벨, <span className="text-emerald-600 font-bold">초록</span> = 라벨됨, <span className="text-blue-600 font-bold">파랑 링</span> = 선택됨.</p>
              <p className="mt-1">자동 저장은 브라우저 localStorage에 저장됩니다. 다른 기기로 옮길 때는 내보내기/불러오기를 이용하세요.</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
