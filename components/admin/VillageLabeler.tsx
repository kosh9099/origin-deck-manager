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
  Package,
  X,
  Plus,
} from 'lucide-react';
import villageCoordsRaw from '@/constants/villageCoords.json';
import villageBartersInitial from '@/constants/villageBarters.json';
import { loadRecipes } from '@/lib/barter/recipes';

type Village = {
  id: string;
  x: number;
  y: number;
  r: string;
  discovery: string;
  barterCount: number;
};
type Labels = Record<string, string>;
type Barters = Record<string, string[]>;
type FilterMode = 'all' | 'unlabeled' | 'labeled-hidden';

const STORAGE_KEY = 'villageLabels.v1';
const BARTER_STORAGE_KEY = 'villageBarters.v1';
const EXTRA_STORAGE_KEY = 'villageCoordsExtra.v1';
const MAP_NATURAL_WIDTH = 9972;
const MAP_NATURAL_HEIGHT = 5886;
const DOT_SIZE = 10;
const MIN_ZOOM = 0.08;
const MAX_ZOOM = 4;
const WHEEL_ZOOM_FACTOR = 1.15;
// 마을 마커는 도시 (+30,+20) 와 다른 hotspot — 메인 지도와 동일하게 (-30,+20).
const VILLAGE_OFFSET_X = -30;
const VILLAGE_OFFSET_Y = 20;

const coordsVillages: Village[] =
  (villageCoordsRaw as { villages?: Village[] } | null)?.villages ?? [];

export default function VillageLabeler() {
  const [labels, setLabels] = useState<Labels>({});
  const [barters, setBarters] = useState<Barters>(() => villageBartersInitial as Barters);
  const [hydrated, setHydrated] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const [filter, setFilter] = useState<FilterMode>('all');
  const [showOnlyWithBarter, setShowOnlyWithBarter] = useState(false);
  const [search, setSearch] = useState('');
  const [importMsg, setImportMsg] = useState<string | null>(null);

  // 물교 품목 마스터 (CSV에서 로드)
  const [allBarterItems, setAllBarterItems] = useState<string[]>([]);
  const [barterQuery, setBarterQuery] = useState('');
  const [barterMenuOpen, setBarterMenuOpen] = useState(false);
  const [barterHi, setBarterHi] = useState(-1);
  const barterInputRef = useRef<HTMLInputElement | null>(null);

  // 마을 추가 모드 — 지도 클릭으로 새 좌표 캡처
  const [addMode, setAddMode] = useState(false);
  const [extraVillages, setExtraVillages] = useState<Village[]>([]);
  // 캡처된 좌표(폼 작성 중)
  const [pendingPos, setPendingPos] = useState<{ x: number; y: number } | null>(null);
  const [pendingName, setPendingName] = useState('');

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(0.2);
  const [viewport, setViewport] = useState({ w: 0, h: 0 });

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

  const initRef = useRef(false);
  useEffect(() => {
    if (initRef.current || viewport.w === 0) return;
    initRef.current = true;
    const fitZoom = Math.max(MIN_ZOOM, viewport.w / MAP_NATURAL_WIDTH);
    setZoom(fitZoom);
    setPan({ x: 0, y: (viewport.h - MAP_NATURAL_HEIGHT * fitZoom) / 2 });
  }, [viewport.w, viewport.h]);

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
    const s = dragStateRef.current;
    if (!s.active) return;
    s.active = false;
    setIsDragging(false);
    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    // 마을 추가 모드 + 드래그 안 했으면 → 좌표 캡처
    if (addMode && !s.moved && !(e.target as HTMLElement).closest('button')) {
      const c = scrollRef.current;
      if (!c) return;
      const rect = c.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      // 화면 좌표 → 월드 좌표
      const worldX = (mx - pan.x) / zoom;
      const worldY = (my - pan.y) / zoom;
      // 마커 hotspot 보정 역적용 (출처 좌표는 보정 전 값)
      const sourceX = Math.round(worldX - VILLAGE_OFFSET_X);
      const sourceY = Math.round(worldY - VILLAGE_OFFSET_Y);
      // wrap: 음수/2배 이상이면 한 카피 안으로 정규화
      const nx = ((sourceX % MAP_NATURAL_WIDTH) + MAP_NATURAL_WIDTH) % MAP_NATURAL_WIDTH;
      setPendingPos({ x: nx, y: sourceY });
      setPendingName('');
    }
  }, [addMode, pan.x, pan.y, zoom]);

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
    const worldX = (mx - pan.x) / zoom;
    const worldY = (my - pan.y) / zoom;
    setPan({
      x: mx - worldX * newZoom,
      y: my - worldY * newZoom,
    });
    setZoom(newZoom);
  }, [zoom, pan.x, pan.y]);

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
      /* ignore */
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(labels));
    } catch {
      /* ignore */
    }
  }, [labels, hydrated]);

  // Load barters from localStorage (override the initial JSON if user has local edits)
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(BARTER_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        const cleaned: Barters = {};
        for (const [k, v] of Object.entries(parsed)) {
          if (Array.isArray(v)) cleaned[k] = v.filter((x): x is string => typeof x === 'string' && x.trim().length > 0);
        }
        if (Object.keys(cleaned).length > 0) setBarters(cleaned);
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Persist barters
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(BARTER_STORAGE_KEY, JSON.stringify(barters));
    } catch {
      /* ignore */
    }
  }, [barters, hydrated]);

  // Load barter master list (Korean items from CSV)
  useEffect(() => {
    let cancelled = false;
    loadRecipes().then((loaded) => {
      if (cancelled) return;
      setAllBarterItems(Array.from(loaded.recipes.keys()).sort((a, b) => a.localeCompare(b)));
    }).catch(() => { /* ignore */ });
    return () => { cancelled = true; };
  }, []);

  // Load extra (user-added) villages from localStorage
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(EXTRA_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) {
          const cleaned: Village[] = parsed
            .filter((v): v is Village => !!v && typeof v === 'object' && typeof (v as Village).id === 'string'
              && typeof (v as Village).x === 'number' && typeof (v as Village).y === 'number');
          setExtraVillages(cleaned);
        }
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(EXTRA_STORAGE_KEY, JSON.stringify(extraVillages));
    } catch { /* ignore */ }
  }, [extraVillages, hydrated]);

  const allVillages = useMemo(() => {
    const arr = [...coordsVillages, ...extraVillages];
    arr.sort((a, b) => a.id.localeCompare(b.id));
    return arr;
  }, [extraVillages]);

  const visibleVillages = useMemo(() => {
    return allVillages.filter((v) => {
      if (showOnlyWithBarter && v.barterCount === 0) return false;
      const labeled = !!labels[v.id];
      if (filter === 'unlabeled' && labeled) return false;
      if (filter === 'labeled-hidden' && labeled) return false;
      return true;
    });
  }, [allVillages, labels, filter, showOnlyWithBarter]);

  const labeledCount = useMemo(
    () => allVillages.filter((v) => !!labels[v.id]).length,
    [allVillages, labels],
  );
  const total = allVillages.length;
  const unlabeledCount = total - labeledCount;
  const barterCount = allVillages.filter((v) => v.barterCount > 0).length;

  const searchTrim = search.trim();
  const matchedIds = useMemo(() => {
    if (!searchTrim) return new Set<string>();
    const ids = new Set<string>();
    for (const v of allVillages) {
      const name = labels[v.id] ?? '';
      if (v.id.includes(searchTrim) || (name && name.includes(searchTrim))) {
        ids.add(v.id);
      }
    }
    return ids;
  }, [searchTrim, allVillages, labels]);

  const selectedVillage = useMemo(
    () => (selectedId ? allVillages.find((v) => v.id === selectedId) ?? null : null),
    [selectedId, allVillages],
  );

  useEffect(() => {
    if (!selectedId) {
      setDraftName('');
      return;
    }
    setDraftName(labels[selectedId] ?? '');
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [selectedId, labels]);

  const scrollDotIntoView = useCallback((v: Village) => {
    const container = scrollRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    setPan({
      x: rect.width / 2 - v.x * zoom,
      y: rect.height / 2 - v.y * zoom,
    });
  }, [zoom]);

  const selectVillage = useCallback(
    (id: string, opts?: { scroll?: boolean }) => {
      setSelectedId(id);
      if (opts?.scroll) {
        const v = allVillages.find((x) => x.id === id);
        if (v) scrollDotIntoView(v);
      }
    },
    [allVillages, scrollDotIntoView],
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
      if (allVillages.length === 0) return;
      const startIdx = selectedId
        ? allVillages.findIndex((v) => v.id === selectedId)
        : direction === 1
          ? -1
          : allVillages.length;
      const len = allVillages.length;
      for (let step = 1; step <= len; step += 1) {
        const idx = (startIdx + direction * step + len * len) % len;
        const cand = allVillages[idx];
        if (!labels[cand.id]) {
          if (showOnlyWithBarter && cand.barterCount === 0) continue;
          selectVillage(cand.id, { scroll: true });
          return;
        }
      }
    },
    [allVillages, selectedId, labels, selectVillage, showOnlyWithBarter],
  );

  const handleExport = useCallback(() => {
    const blob = new Blob([JSON.stringify(labels, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'villageLabels.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [labels]);

  const handleExportBarters = useCallback(() => {
    const sorted: Barters = {};
    for (const k of Object.keys(barters).sort()) sorted[k] = [...barters[k]].sort((a, b) => a.localeCompare(b));
    const blob = new Blob([JSON.stringify(sorted, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'villageBarters.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [barters]);

  // villageCoords.json 형태로 원본 + 추가 마을 합쳐서 export
  const handleExportCoords = useCallback(() => {
    const merged = [...coordsVillages, ...extraVillages].sort((a, b) => a.id.localeCompare(b.id));
    const blob = new Blob([JSON.stringify({ villages: merged }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'villageCoords.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [extraVillages]);

  // 새 마을 확정 — pendingPos + pendingName + 현재 선택된 barter 항목으로 저장
  const confirmNewVillage = useCallback(() => {
    if (!pendingPos || !pendingName.trim()) return;
    // 다음 사용 가능한 custom ID
    const existing = new Set([...coordsVillages, ...extraVillages].map((v) => v.id));
    let n = 1;
    while (existing.has(`custom_${n}`)) n += 1;
    const newId = `custom_${n}`;
    const newVillage: Village = {
      id: newId,
      x: pendingPos.x,
      y: pendingPos.y,
      r: '1',
      discovery: '',
      barterCount: 0,
    };
    setExtraVillages((prev) => [...prev, newVillage]);
    setLabels((prev) => ({ ...prev, [newId]: pendingName.trim() }));
    setPendingPos(null);
    setPendingName('');
    setSelectedId(newId);
  }, [pendingPos, pendingName, extraVillages]);

  const cancelNewVillage = useCallback(() => {
    setPendingPos(null);
    setPendingName('');
  }, []);

  // 추가된 마을 삭제
  const deleteExtraVillage = useCallback((id: string) => {
    setExtraVillages((prev) => prev.filter((v) => v.id !== id));
    setLabels((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setBarters((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    if (selectedId === id) setSelectedId(null);
  }, [selectedId]);

  const addBarter = useCallback((item: string) => {
    if (!selectedId) return;
    setBarters((prev) => {
      const cur = prev[selectedId] ?? [];
      if (cur.includes(item)) return prev;
      return { ...prev, [selectedId]: [...cur, item] };
    });
    setBarterQuery('');
    setBarterHi(-1);
    requestAnimationFrame(() => barterInputRef.current?.focus());
  }, [selectedId]);

  const removeBarter = useCallback((item: string) => {
    if (!selectedId) return;
    setBarters((prev) => {
      const cur = prev[selectedId] ?? [];
      const next = cur.filter((x) => x !== item);
      const out = { ...prev };
      if (next.length === 0) delete out[selectedId];
      else out[selectedId] = next;
      return out;
    });
  }, [selectedId]);

  const barterSuggestions = useMemo(() => {
    const q = barterQuery.trim();
    if (!q) return allBarterItems.slice(0, 50);
    return allBarterItems.filter((n) => n.includes(q)).slice(0, 50);
  }, [allBarterItems, barterQuery]);

  const selectedBarters = selectedId ? (barters[selectedId] ?? []) : [];
  const villagesWithBarterAssigned = Object.keys(barters).length;

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

  useEffect(() => {
    if (!searchTrim) return;
    const first = allVillages.find((v) => matchedIds.has(v.id));
    if (first) scrollDotIntoView(first);
  }, [searchTrim, matchedIds, allVillages, scrollDotIntoView]);

  if (allVillages.length === 0) {
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
            <h1 className="text-xl font-black text-slate-800">마을 라벨링 도구</h1>
            <p className="text-[13px] text-slate-600 mt-2">
              <code className="px-1 py-0.5 bg-slate-100 rounded">constants/villageCoords.json</code> 이 비어있습니다.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0ece4]">
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm">
        <div className="px-3 md:px-5 py-2 flex flex-wrap items-center gap-2">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-[12px] font-bold rounded-lg shadow-sm"
          >
            <ArrowLeft size={13} /> 관리자
          </Link>
          <h1 className="text-[14px] font-black text-slate-800 mr-2">마을 라벨링 도구</h1>

          <div className="text-[12px] text-slate-600 font-bold flex items-center gap-3 mr-2">
            <span>전체 <span className="text-slate-900">{total}</span></span>
            <span className="text-emerald-600">라벨 {labeledCount}</span>
            <span className="text-red-600">미라벨 {unlabeledCount}</span>
            <span className="text-amber-600">물교 매핑 {villagesWithBarterAssigned}/{barterCount}</span>
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

          <label className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 ml-1">
            <input type="checkbox" checked={showOnlyWithBarter} onChange={(e) => setShowOnlyWithBarter(e.target.checked)} />
            물물교환 가능만
          </label>

          <button
            onClick={() => setAddMode((v) => !v)}
            title="지도를 클릭하면 그 위치에 새 마을을 추가합니다"
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-[12px] font-bold rounded-lg shadow-sm border transition-colors
              ${addMode
                ? 'bg-rose-600 hover:bg-rose-700 text-white border-rose-700'
                : 'bg-white hover:bg-rose-50 text-rose-700 border-rose-300'}`}
          >
            <Plus size={13} />
            {addMode ? '추가 모드 종료' : '마을 추가'}
            {extraVillages.length > 0 && (
              <span className="text-[10px] tabular-nums opacity-80">+{extraVillages.length}</span>
            )}
          </button>

          <div className="flex items-center gap-1 ml-auto">
            <div className="relative">
              <Search size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ID 또는 한글명 검색"
                className="pl-7 pr-2 py-1.5 text-[12px] border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 w-56"
              />
            </div>
            <button
              onClick={handleExport}
              title="villageLabels.json 내보내기"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[12px] font-bold rounded-lg shadow-sm"
            >
              <Download size={13} /> 라벨
            </button>
            <button
              onClick={handleExportBarters}
              title="villageBarters.json 내보내기"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-[12px] font-bold rounded-lg shadow-sm"
            >
              <Download size={13} /> 물교
            </button>
            <button
              onClick={handleExportCoords}
              title="villageCoords.json (원본 + 추가 마을 병합) 내보내기"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-[12px] font-bold rounded-lg shadow-sm"
            >
              <Download size={13} /> 좌표
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

      <div className="flex" style={{ height: 'calc(100vh - 50px)' }}>
        <div
          ref={scrollRef}
          className="flex-1 relative overflow-hidden bg-slate-200 select-none"
          style={{ cursor: addMode ? (isDragging ? 'grabbing' : 'crosshair') : (isDragging ? 'grabbing' : 'grab'), touchAction: 'none' }}
          onPointerDown={onMapPointerDown}
          onPointerMove={onMapPointerMove}
          onPointerUp={onMapPointerUp}
          onPointerCancel={onMapPointerUp}
          onWheel={onMapWheel}
        >
          {(() => {
            const W = MAP_NATURAL_WIDTH * zoom;
            const nMin = Math.floor(-pan.x / W) - 1;
            const nMax = Math.ceil((viewport.w - pan.x) / W) + 1;
            const copies: number[] = [];
            for (let n = nMin; n <= nMax; n++) copies.push(n);
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
                {visibleVillages.map((v) =>
                  copies.map((n) => {
                    const wx = v.x + VILLAGE_OFFSET_X + n * MAP_NATURAL_WIDTH;
                    const wy = v.y + VILLAGE_OFFSET_Y;
                    const screenX = pan.x + wx * zoom;
                    const screenY = pan.y + wy * zoom;
                    if (
                      screenX < -32 ||
                      screenX > viewport.w + 32 ||
                      screenY < -32 ||
                      screenY > viewport.h + 32
                    ) return null;
                    const labeled = !!labels[v.id];
                    const isSelected = v.id === selectedId;
                    const isMatched = matchedIds.has(v.id);
                    const hasBarter = v.barterCount > 0;
                    const baseSize = DOT_SIZE + (hasBarter ? 2 : 0);
                    const finalSize = isSelected ? baseSize + 6 : isMatched ? baseSize + 4 : baseSize;
                    const baseClass = labeled
                      ? hasBarter ? 'bg-amber-500/90' : 'bg-emerald-500/80'
                      : hasBarter ? 'bg-orange-500/80' : 'bg-red-500/80';
                    const ringClass = isSelected
                      ? 'ring-2 ring-blue-500 ring-offset-1 ring-offset-white/70'
                      : isMatched
                        ? 'ring-2 ring-amber-400'
                        : '';
                    return (
                      <button
                        key={`${v.id}-${n}`}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          selectVillage(v.id);
                        }}
                        title={`${v.id}${labels[v.id] ? ` — ${labels[v.id]}` : ''}${hasBarter ? ` (물교 ${v.barterCount})` : ''}`}
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
          <div className="absolute bottom-3 right-3 bg-white/90 border border-slate-300 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-700 shadow-sm pointer-events-none">
            {Math.round(zoom * 100)}%
          </div>
        </div>

        <aside className="w-[300px] shrink-0 border-l border-slate-200 bg-white overflow-y-auto">
          <div className="p-4 space-y-4">
            <div>
              <h2 className="text-[13px] font-black text-slate-800 flex items-center gap-1.5">
                <MapPin size={14} className="text-red-500" /> 선택된 마을
              </h2>
              {selectedVillage ? (
                <div className="mt-2 space-y-1 text-[12px] text-slate-700">
                  <div>
                    <span className="text-slate-500">ID:</span>{' '}
                    <span className="font-mono font-bold">{selectedVillage.id}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">좌표:</span>{' '}
                    <span className="font-mono">x={selectedVillage.x}, y={selectedVillage.y}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">등급:</span>{' '}
                    <span className="font-bold">r={selectedVillage.r}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">발견물:</span>{' '}
                    <span className="font-mono text-[11px]">{selectedVillage.discovery}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">물물교환:</span>{' '}
                    <span className={selectedVillage.barterCount > 0 ? 'text-amber-600 font-bold' : 'text-slate-400'}>
                      {selectedVillage.barterCount > 0 ? `${selectedVillage.barterCount}개 가능` : '없음'}
                    </span>
                  </div>
                  {selectedVillage.id.startsWith('custom_') && (
                    <button
                      onClick={() => deleteExtraVillage(selectedVillage.id)}
                      className="mt-2 inline-flex items-center gap-1 px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-bold rounded border border-rose-200"
                    >
                      <Trash2 size={11} /> 추가한 마을 삭제
                    </button>
                  )}
                </div>
              ) : (
                <p className="text-[12px] text-slate-500 mt-1">지도에서 점을 클릭하세요.</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider">
                마을 한글명
              </label>
              <input
                ref={inputRef}
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSave();
                    goToUnlabeled(1);
                  }
                }}
                disabled={!selectedVillage}
                placeholder={selectedVillage ? '예: 산타크루즈 마을' : '마을 미선택'}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:bg-slate-50 disabled:text-slate-400"
              />
              <p className="text-[11px] text-slate-500">엔터로 저장 후 다음 미라벨로 이동.</p>
            </div>

            {/* 물물교환 품목 매핑 — 마을마다 1~9개 */}
            <div className="space-y-1.5 border-t border-slate-100 pt-3">
              <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                <Package size={12} className="text-amber-600" />
                물교 품목 ({selectedBarters.length}개) — 전체 {allBarterItems.length}개 중
              </label>

              {/* 선택된 물교 품목 칩 */}
              {selectedBarters.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedBarters.map((item) => (
                    <span
                      key={item}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold rounded-full"
                    >
                      {item}
                      <button
                        type="button"
                        onClick={() => removeBarter(item)}
                        className="hover:bg-amber-200 rounded-full"
                        title="제거"
                      >
                        <X size={11} />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* 검색/추가 인풋 */}
              <div className="relative">
                <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  ref={barterInputRef}
                  value={barterQuery}
                  onChange={(e) => { setBarterQuery(e.target.value); setBarterMenuOpen(true); setBarterHi(-1); }}
                  onFocus={() => setBarterMenuOpen(true)}
                  onBlur={() => setTimeout(() => setBarterMenuOpen(false), 150)}
                  onKeyDown={(e) => {
                    if (!barterMenuOpen || barterSuggestions.length === 0) {
                      if (e.key === 'Enter' && barterQuery.trim()) {
                        // 정확히 일치하는 항목이면 직접 추가
                        const exact = allBarterItems.find((n) => n === barterQuery.trim());
                        if (exact) { e.preventDefault(); addBarter(exact); }
                      }
                      return;
                    }
                    if (e.key === 'ArrowDown') { e.preventDefault(); setBarterHi((i) => Math.min(i + 1, barterSuggestions.length - 1)); }
                    else if (e.key === 'ArrowUp') { e.preventDefault(); setBarterHi((i) => Math.max(i - 1, 0)); }
                    else if (e.key === 'Enter') {
                      e.preventDefault();
                      const idx = barterHi >= 0 ? barterHi : 0;
                      const pick = barterSuggestions[idx];
                      if (pick) addBarter(pick);
                    }
                    else if (e.key === 'Escape') setBarterMenuOpen(false);
                  }}
                  disabled={!selectedVillage}
                  placeholder={selectedVillage ? '품목 검색 후 ↑↓ + Enter로 추가' : '마을 미선택'}
                  className="pl-7 pr-2 py-1.5 w-full text-[12px] border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 disabled:bg-slate-50"
                />
                {barterMenuOpen && selectedVillage && barterSuggestions.length > 0 && (
                  <ul className="absolute z-30 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-lg max-h-72 overflow-y-auto">
                    {barterSuggestions.map((name, idx) => {
                      const already = selectedBarters.includes(name);
                      const isHi = idx === barterHi;
                      return (
                        <li
                          key={name}
                          onMouseDown={(e) => { e.preventDefault(); if (!already) addBarter(name); }}
                          onMouseEnter={() => setBarterHi(idx)}
                          className={`px-3 py-1.5 text-[12px] cursor-pointer border-b border-slate-100 last:border-0 flex items-center justify-between gap-2
                            ${isHi ? 'bg-amber-50 text-amber-800' : 'text-slate-700 hover:bg-slate-50'}
                            ${already ? 'opacity-40' : ''}`}
                          title={already ? '이미 추가됨' : ''}
                        >
                          <span className="font-bold truncate">{name}</span>
                          {already && <span className="text-[10px] text-slate-400 shrink-0">추가됨</span>}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
              <p className="text-[11px] text-slate-500">
                {selectedVillage?.barterCount && selectedVillage.barterCount > 0
                  ? `원본 데이터에 ${selectedVillage.barterCount}개 레시피가 있어요. 한글 품목명으로 매핑하세요.`
                  : '이 마을은 물물교환이 없습니다.'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleSave}
                disabled={!selectedVillage}
                className="inline-flex items-center justify-center gap-1 px-2.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-[12px] font-black rounded-lg shadow-sm"
              >
                <Save size={13} /> 저장
              </button>
              <button
                onClick={handleClear}
                disabled={!selectedVillage || !labels[selectedVillage.id]}
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
                  {allVillages
                    .filter((v) => matchedIds.has(v.id))
                    .slice(0, 100)
                    .map((v) => (
                      <button
                        key={v.id}
                        onClick={() => selectVillage(v.id, { scroll: true })}
                        className={`w-full text-left px-2 py-1.5 hover:bg-slate-50 text-[12px] flex items-center justify-between ${
                          v.id === selectedId ? 'bg-blue-50' : ''
                        }`}
                      >
                        <span className="font-mono">{v.id}</span>
                        <span className={labels[v.id] ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                          {labels[v.id] ?? '미라벨'}
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
              <p>색상: <span className="text-red-500 font-bold">빨강</span> = 미라벨, <span className="text-orange-500 font-bold">주황</span> = 미라벨 + 물교, <span className="text-emerald-600 font-bold">초록</span> = 라벨됨, <span className="text-amber-600 font-bold">호박</span> = 라벨됨 + 물교.</p>
              <p className="mt-1">localStorage 자동 저장. 다른 기기 옮길 때 내보내기/불러오기 사용.</p>
            </div>
          </div>
        </aside>
      </div>

      {/* 새 마을 추가 폼 — pendingPos 있을 때만 모달 표시 */}
      {pendingPos && (
        <div className="fixed inset-0 z-[200] bg-black/40 flex items-center justify-center p-4" onClick={cancelNewVillage}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm border border-slate-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-slate-200 bg-rose-50 flex items-center justify-between">
              <h3 className="text-[14px] font-black text-slate-800 flex items-center gap-2">
                <Plus size={14} className="text-rose-600" />
                새 마을 추가
              </h3>
              <button
                onClick={cancelNewVillage}
                className="p-1 text-slate-500 hover:text-slate-800 hover:bg-white rounded"
                aria-label="취소"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div className="text-[11px] text-slate-500">
                캡처한 좌표:{' '}
                <span className="font-mono font-bold text-slate-700">x={pendingPos.x}, y={pendingPos.y}</span>
              </div>
              <div>
                <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider">마을 한글명</label>
                <input
                  autoFocus
                  value={pendingName}
                  onChange={(e) => setPendingName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && pendingName.trim()) confirmNewVillage();
                    if (e.key === 'Escape') cancelNewVillage();
                  }}
                  placeholder="예: 루시타니아인의 마을"
                  className="mt-1 w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                />
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  onClick={cancelNewVillage}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[12px] font-black rounded-lg"
                >
                  취소
                </button>
                <button
                  onClick={confirmNewVillage}
                  disabled={!pendingName.trim()}
                  className="px-3 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 text-white text-[12px] font-black rounded-lg"
                >
                  추가
                </button>
              </div>
              <p className="text-[10px] text-slate-400 italic">
                추가 후 우측 패널에서 물교 품목을 매핑하고 “좌표/물교/라벨” 버튼으로 JSON 내보내기 하세요.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
