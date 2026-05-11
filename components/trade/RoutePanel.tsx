'use client';

import React, { useEffect, useRef, useState } from 'react';
import { X, Route as RouteIcon, Plus, Trash2, ChevronDown, ChevronRight, Anchor, Tent, ArrowUp, ArrowDown, Download, Upload } from 'lucide-react';
import type { Route, RouteState, RouteStop } from '@/lib/trade/routes';
import { createRoute, renameRoute as renameR, removeStop, moveStop, updateStopItems, exportRouteJSON, importRouteFromJSON } from '@/lib/trade/routes';
import villageLabelsRaw from '@/constants/villageLabels.json';
import villageBartersRaw from '@/constants/villageBarters.json';
import seasonCalendarData from '@/constants/seasonCalendar.json';
import { useDraggableSheetHeight } from '@/lib/hooks/useDraggableSheetHeight';

const LABELS: Record<string, string> = villageLabelsRaw as Record<string, string>;
const BARTERS: Record<string, string[]> = villageBartersRaw as Record<string, string[]>;

type SeasonCal = {
  items: Record<string, { category: string; cities: string[] }>;
};
const seasonCal = seasonCalendarData as SeasonCal;

// 도시별 거래 가능 교역품 인덱스 — { city: [item, ...] }
const CITY_TO_ITEMS = (() => {
  const m: Record<string, string[]> = {};
  for (const [item, meta] of Object.entries(seasonCal.items)) {
    for (const city of meta.cities) {
      if (!m[city]) m[city] = [];
      m[city].push(item);
    }
  }
  for (const k of Object.keys(m)) m[k].sort((a, b) => a.localeCompare(b));
  return m;
})();

type Props = {
  state: RouteState;
  onChange: (state: RouteState) => void;
  totalDistance?: number;
  onClose: () => void;
  onFocusStop?: (stop: RouteStop) => void;
};

// 구간 색상 팔레트 — CityMapView 의 SEGMENT_COLORS 와 동일
const SEGMENT_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
];
function stopColor(idx: number, total: number): string {
  // 마지막 정류는 들어오는 구간 색, 나머지는 나가는 구간 색
  const seg = idx >= total - 1 ? Math.max(0, total - 2) : idx;
  return SEGMENT_COLORS[seg % SEGMENT_COLORS.length];
}

export default function RoutePanel({ state, onChange, totalDistance, onClose, onFocusStop }: Props) {
  const { heightVh, setHandleRef } = useDraggableSheetHeight();
  const active = state.routes.find(r => r.id === state.activeId) ?? null;
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [nameDraft, setNameDraft] = useState(active?.name ?? '');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => { setNameDraft(active?.name ?? ''); }, [active?.id]);

  const updateActive = (mut: (r: Route) => Route) => {
    if (!active) return;
    const next = mut(active);
    onChange({
      ...state,
      routes: state.routes.map(r => r.id === active.id ? next : r),
    });
  };

  const handleNewRoute = () => {
    const r = createRoute(`항로 ${state.routes.length + 1}`);
    onChange({ routes: [...state.routes, r], activeId: r.id });
    setExpanded(new Set());
  };

  const handleSwitch = (id: string) => {
    onChange({ ...state, activeId: id });
    setExpanded(new Set());
  };

  const handleDeleteRoute = () => {
    if (!active) return;
    if (!window.confirm(`'${active.name}' 항로를 삭제할까요?`)) return;
    const remaining = state.routes.filter(r => r.id !== active.id);
    onChange({ routes: remaining, activeId: remaining[0]?.id ?? null });
  };

  const handleClearStops = () => {
    if (!active) return;
    if (!window.confirm('정류를 모두 비울까요?')) return;
    updateActive(r => ({ ...r, stops: [] }));
  };

  const handleNameCommit = () => {
    if (!active) return;
    const t = nameDraft.trim();
    if (t && t !== active.name) updateActive(r => renameR(r, t));
    else setNameDraft(active.name);
  };

  const handleExport = () => {
    if (!active) return;
    const json = exportRouteJSON(active);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    // 파일명: 항로 이름 + 날짜. 윈도우/맥 모두에서 안전한 글자만.
    const safeName = active.name.replace(/[\\/:*?"<>|]/g, '_');
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `${safeName}-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };
  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const imported = importRouteFromJSON(text);
      // 이름 충돌 시 (n) 붙임
      let name = imported.name, n = 2;
      const taken = new Set(state.routes.map(r => r.name));
      while (taken.has(name)) name = `${imported.name} (${n++})`;
      const route = { ...imported, name };
      onChange({ routes: [...state.routes, route], activeId: route.id });
      setExpanded(new Set());
    } catch (err) {
      const msg = err instanceof Error ? err.message : '알 수 없는 오류';
      window.alert(`항로 가져오기 실패: ${msg}`);
    }
  };

  const stopLabel = (s: RouteStop): string =>
    s.kind === 'city' ? s.id : (LABELS[s.id] ?? s.id);

  const stopOptions = (s: RouteStop): string[] =>
    s.kind === 'city' ? (CITY_TO_ITEMS[s.id] ?? []) : (BARTERS[s.id] ?? []);

  return (
    <>
      <div
        className="fixed inset-0 z-[150] bg-black/20 md:bg-transparent md:pointer-events-none"
        onClick={onClose}
      />
      <aside
        style={{ height: `${heightVh}vh` }}
        className="route-panel fixed z-[160] bg-white shadow-2xl flex flex-col
          inset-x-0 bottom-0 rounded-t-2xl border-t border-slate-200
          md:inset-x-auto md:right-0 md:top-0 md:bottom-0 md:!h-auto md:w-[380px] md:rounded-none md:border-t-0 md:border-l
          animate-in slide-in-from-bottom md:slide-in-from-right duration-200"
      >
        <div
          ref={setHandleRef}
          className="flex justify-center pt-2 pb-1 md:hidden shrink-0 cursor-grab active:cursor-grabbing touch-none select-none"
          aria-label="패널 높이 조절"
        >
          <div className="w-10 h-1 bg-slate-300 rounded-full" />
        </div>

        {/* 가져오기용 숨김 file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          onChange={handleImportFile}
          className="hidden"
        />

        {/* 헤더 */}
        <div className="shrink-0 px-4 py-3 border-b border-slate-200 bg-gradient-to-r from-indigo-50 to-violet-50">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center justify-center w-7 h-7 rounded bg-gradient-to-br from-indigo-500 to-violet-600 text-white">
                  <RouteIcon size={14} strokeWidth={2.5} />
                </span>
                {active ? (
                  <input
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    onBlur={handleNameCommit}
                    onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                    className="flex-1 min-w-0 text-[16px] font-black text-slate-900 bg-transparent border-b border-transparent focus:border-indigo-400 focus:outline-none px-1"
                  />
                ) : (
                  <h3 className="text-[16px] font-black text-slate-900">항로 없음</h3>
                )}
              </div>
              {state.routes.length > 0 && (
                <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                  <select
                    value={active?.id ?? ''}
                    onChange={(e) => handleSwitch(e.target.value)}
                    className="text-[11px] font-bold border border-slate-200 rounded px-1.5 py-0.5 bg-white"
                  >
                    {state.routes.map(r => (
                      <option key={r.id} value={r.id}>{r.name} ({r.stops.length})</option>
                    ))}
                  </select>
                  <button
                    onClick={handleNewRoute}
                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-black rounded"
                  >
                    <Plus size={11} /> 새 항로
                  </button>
                  <button
                    onClick={handleImportClick}
                    title="JSON 파일에서 항로 가져오기"
                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-bold border border-slate-200 rounded"
                  >
                    <Upload size={11} /> 가져오기
                  </button>
                  <button
                    onClick={handleExport}
                    disabled={!active}
                    title="현재 항로를 JSON 파일로 저장"
                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-700 text-[11px] font-bold border border-slate-200 rounded"
                  >
                    <Download size={11} /> 내보내기
                  </button>
                  {active && active.stops.length > 0 && (() => {
                    const allOpen = expanded.size === active.stops.length;
                    return (
                      <button
                        onClick={() => {
                          if (allOpen) setExpanded(new Set());
                          else setExpanded(new Set(active.stops.map((_, i) => i)));
                        }}
                        title={allOpen ? '모든 카드 접기' : '모든 카드 펼치기'}
                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-bold border border-slate-200 rounded"
                      >
                        {allOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                        {allOpen ? '모두 접기' : '모두 펼치기'}
                      </button>
                    );
                  })()}
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors active:scale-95"
              aria-label="닫기"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
          {!active ? (
            <div className="text-center py-6 space-y-3">
              <p className="text-[12px] text-slate-500">아직 항로가 없습니다.</p>
              <div className="flex items-center justify-center gap-1.5">
                <button
                  onClick={handleNewRoute}
                  className="inline-flex items-center gap-1 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[12px] font-black rounded-lg shadow-sm"
                >
                  <Plus size={13} /> 새 항로 만들기
                </button>
                <button
                  onClick={handleImportClick}
                  className="inline-flex items-center gap-1 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 text-[12px] font-bold border border-slate-200 rounded-lg"
                >
                  <Upload size={13} /> 가져오기
                </button>
              </div>
            </div>
          ) : active.stops.length === 0 ? (
            <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl px-3 py-6 text-center">
              <p className="text-[12px] text-slate-400 italic">맵에서 도시/마을을 클릭해서 정류를 추가하세요.</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {active.stops.map((s, idx) => {
                const isOpen = expanded.has(idx);
                const options = stopOptions(s);
                const badgeColor = stopColor(idx, active.stops.length);
                return (
                  <div key={`${s.id}-${idx}`} className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                    <div
                      onClick={() => setExpanded(prev => {
                        const next = new Set(prev);
                        if (next.has(idx)) next.delete(idx);
                        else next.add(idx);
                        return next;
                      })}
                      role="button"
                      tabIndex={0}
                      title="클릭으로 품목 펼치기/접기"
                      className="route-stop-row flex items-center gap-1 px-2 py-2 hover:bg-slate-50 cursor-pointer"
                    >
                      <span className="shrink-0 text-slate-500">
                        {isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                      </span>
                      <span
                        className="shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-black text-white"
                        style={{ backgroundColor: badgeColor }}
                      >
                        {idx + 1}
                      </span>
                      {s.kind === 'city'
                        ? <Anchor size={12} className="text-indigo-500 shrink-0" />
                        : <Tent size={12} className="text-amber-500 shrink-0" />}
                      <button
                        onClick={(e) => { e.stopPropagation(); onFocusStop?.(s); }}
                        className="shrink min-w-0 max-w-[160px] text-left text-[12px] font-black text-slate-800 truncate hover:text-indigo-600 hover:underline"
                        title="맵에서 위치 보기"
                      >
                        {stopLabel(s)}
                      </button>
                      {/* spacer — 행 클릭 영역 확보 */}
                      <div className="flex-1 self-stretch" aria-hidden="true" />
                      {s.items.length > 0 && (
                        <span className="text-[10px] font-bold text-slate-500 shrink-0">
                          {s.items.length}개
                        </span>
                      )}
                      <div className="flex shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={(e) => { e.stopPropagation(); updateActive(r => moveStop(r, idx, Math.max(0, idx - 1))); }}
                          disabled={idx === 0}
                          className="route-stop-arrow p-1 disabled:opacity-30"
                          title="위로"
                        >
                          <ArrowUp size={13} strokeWidth={2.5} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); updateActive(r => moveStop(r, idx, Math.min(r.stops.length - 1, idx + 1))); }}
                          disabled={idx === active.stops.length - 1}
                          className="route-stop-arrow p-1 disabled:opacity-30"
                          title="아래로"
                        >
                          <ArrowDown size={13} strokeWidth={2.5} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); updateActive(r => removeStop(r, idx)); }}
                          className="p-1 text-rose-400 hover:text-rose-600"
                          title="제거"
                        >
                          <X size={13} strokeWidth={2.5} />
                        </button>
                      </div>
                    </div>
                    {isOpen && (
                      <div className="border-t border-slate-100 px-3 py-2 bg-slate-50/40">
                        <div className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                          {s.kind === 'city' ? '구매할 교역품' : '교환할 물교 품목'}
                          {options.length > 0 && <span className="text-slate-400 normal-case ml-1">({s.items.length}/{options.length})</span>}
                        </div>
                        {options.length === 0 ? (
                          <p className="text-[11px] text-slate-400 italic">선택 가능한 품목이 없습니다.</p>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {options.map((name) => {
                              const checked = s.items.includes(name);
                              return (
                                <button
                                  key={name}
                                  onClick={() => {
                                    const next = checked
                                      ? s.items.filter((x) => x !== name)
                                      : [...s.items, name];
                                    updateActive(r => updateStopItems(r, idx, next));
                                  }}
                                  className={`route-stop-chip ${checked ? 'route-stop-chip-on' : 'route-stop-chip-off'} px-2 py-0.5 rounded-full text-[11px] font-bold border transition-colors
                                    ${checked
                                      ? (s.kind === 'city' ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-amber-600 text-white border-amber-700')
                                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                                >
                                  {name}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 푸터 */}
        {active && (
          <div className="shrink-0 px-3 py-2 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-2">
            <div className="text-[11px] font-bold text-slate-600">
              {active.stops.length}개 정류
              {typeof totalDistance === 'number' && totalDistance > 0 && (
                <span className="ml-2 text-slate-400">· 약 {Math.round(totalDistance)}</span>
              )}
            </div>
            <div className="flex gap-1">
              <button
                onClick={handleClearStops}
                disabled={active.stops.length === 0}
                className="inline-flex items-center gap-1 px-2 py-1 bg-white hover:bg-slate-100 disabled:opacity-40 text-slate-700 text-[11px] font-bold rounded border border-slate-200"
              >
                정류 비우기
              </button>
              <button
                onClick={handleDeleteRoute}
                className="inline-flex items-center gap-1 px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-bold rounded border border-rose-200"
              >
                <Trash2 size={11} /> 항로 삭제
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
