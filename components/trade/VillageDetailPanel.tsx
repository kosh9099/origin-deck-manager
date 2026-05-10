'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { X, Tent, Package, ChevronDown, ChevronRight } from 'lucide-react';
import villageCoordsRaw from '@/constants/villageCoords.json';
import villageLabelsRaw from '@/constants/villageLabels.json';
import villageBartersRaw from '@/constants/villageBarters.json';
import seasonCalendarData from '@/constants/seasonCalendar.json';
import { loadRecipes } from '@/lib/barter/recipes';
import type { BarterRecipe } from '@/types/barter';
import { useDraggableSheetHeight } from '@/lib/hooks/useDraggableSheetHeight';

type Village = { id: string; x: number; y: number; r: string; discovery: string; barterCount: number };
const VILLAGES: Village[] = (villageCoordsRaw as { villages?: Village[] } | null)?.villages ?? [];
const VILLAGE_BY_ID = new Map(VILLAGES.map((v) => [v.id, v]));
const LABELS: Record<string, string> = villageLabelsRaw as Record<string, string>;
const BARTERS: Record<string, string[]> = villageBartersRaw as Record<string, string[]>;

type SeasonCal = {
  items: Record<string, { category: string; cities: string[] }>;
  itemClasses: Record<string, string>;
};
const seasonCal = seasonCalendarData as SeasonCal;

type Props = {
  villageId: string | null;
  onClose: () => void;
  onCityClick?: (city: string) => void;
};

export default function VillageDetailPanel({ villageId, onClose }: Props) {
  const village = villageId ? VILLAGE_BY_ID.get(villageId) ?? null : null;
  const label = villageId ? LABELS[villageId] : null;
  const items = villageId ? BARTERS[villageId] ?? [] : [];

  const [recipes, setRecipes] = useState<Map<string, BarterRecipe> | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const { heightVh, setHandleRef } = useDraggableSheetHeight();

  useEffect(() => {
    loadRecipes().then((loaded) => setRecipes(loaded.recipes)).catch(() => { /* ignore */ });
  }, []);

  // 마을이 바뀌면 펼침 상태 초기화
  useEffect(() => { setExpandedItems(new Set()); }, [villageId]);

  const itemSourcesMap = useMemo(() => {
    // 각 재료가 어느 항구도시에서 나오는지 — seasonCal.items[name].cities 활용
    const m = new Map<string, string[]>();
    for (const item of items) {
      const recipe = recipes?.get(item);
      if (!recipe) continue;
      for (const mat of recipe.materials) {
        if (!m.has(mat)) {
          const meta = seasonCal.items[mat];
          m.set(mat, meta?.cities ?? []);
        }
      }
    }
    return m;
  }, [items, recipes]);

  if (!village) return null;

  const toggleItem = (name: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[150] bg-black/20 md:bg-transparent md:pointer-events-none"
        onClick={onClose}
      />
      <aside
        style={{ height: `${heightVh}vh` }}
        className="fixed z-[160] bg-white shadow-2xl flex flex-col
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

        {/* 헤더 */}
        <div className="shrink-0 px-4 py-3 border-b border-slate-200 bg-gradient-to-r from-amber-50 to-amber-100">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center justify-center w-7 h-7 rounded bg-gradient-to-br from-amber-500 to-amber-700 text-white">
                  <Tent size={14} strokeWidth={2.5} />
                </span>
                <h3 className="text-[16px] font-black text-slate-900 truncate">
                  {label ?? village.id}
                </h3>
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-600 text-white">
                  🏘️ 마을
                </span>
              </div>
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
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
          <div>
            <div className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5 px-1">
              <Package size={12} className="text-amber-600" />
              물물교환 품목
              <span className="text-slate-400">·</span>
              <span className={items.length === 0 ? 'text-slate-400' : 'text-amber-600'}>
                {items.length === 0 ? '없음' : `${items.length}개`}
              </span>
              <span className="ml-auto text-[10px] font-bold text-slate-400 normal-case">
                클릭 → 재료
              </span>
            </div>
            {items.length === 0 ? (
              <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl px-3 py-4 text-center">
                <p className="text-[12px] text-slate-400 italic">이 마을에서 가능한 물교 정보 없음</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {items.map((name) => {
                  const meta = seasonCal.items[name];
                  const cls = seasonCal.itemClasses[name];
                  const recipe = recipes?.get(name);
                  const isOpen = expandedItems.has(name);
                  return (
                    <div key={name} className="bg-white border border-amber-200 rounded-lg overflow-hidden">
                      <button
                        type="button"
                        onClick={() => toggleItem(name)}
                        className="w-full px-3 py-2 flex items-center gap-2 hover:bg-amber-50 transition-colors text-left"
                      >
                        {isOpen ? (
                          <ChevronDown size={13} className="text-amber-500 shrink-0" />
                        ) : (
                          <ChevronRight size={13} className="text-amber-500 shrink-0" />
                        )}
                        <Package size={13} className="text-amber-500 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="text-[12px] font-black text-slate-800 flex items-center gap-1.5 flex-wrap">
                            {cls === '명산품' && <span className="text-amber-500">★</span>}
                            <span>{name}</span>
                            {meta?.category && (
                              <span className="text-[10px] font-bold text-slate-400">({meta.category})</span>
                            )}
                          </div>
                        </div>
                        {recipe && (
                          <span className="text-[10px] font-bold text-slate-500 shrink-0">
                            재료 {recipe.materials.length}
                          </span>
                        )}
                      </button>
                      {isOpen && (
                        <div className="border-t border-amber-100 bg-amber-50/40 px-3 py-2 space-y-1.5">
                          {!recipes ? (
                            <p className="text-[11px] text-slate-400 italic">레시피 로딩 중…</p>
                          ) : !recipe ? (
                            <p className="text-[11px] text-slate-400 italic">레시피 정보 없음</p>
                          ) : (
                            <>
                              <div className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                                필요 재료
                              </div>
                              {recipe.materials.map((mat) => {
                                const cities = itemSourcesMap.get(mat) ?? [];
                                return (
                                  <div
                                    key={mat}
                                    className="bg-white border border-slate-200 rounded px-2 py-1.5 flex items-start gap-2"
                                  >
                                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                                    <div className="min-w-0 flex-1">
                                      <div className="text-[12px] font-bold text-slate-800">{mat}</div>
                                      {cities.length > 0 && (
                                        <div className="text-[10px] text-slate-500 truncate">
                                          {cities.slice(0, 5).join(', ')}
                                          {cities.length > 5 && ` 외 ${cities.length - 5}`}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
