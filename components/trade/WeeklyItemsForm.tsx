'use client';

import React, { useEffect, useState } from 'react';
import { X, Loader2, MapPin, RefreshCw } from 'lucide-react';
import {
  TRACKED_ITEMS,
  getWeeklySightings,
  WeeklySighting,
} from '@/lib/supabaseClient';
import { onBoostChanged } from '@/lib/trade/boostEvents';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function WeeklyItemsForm({ open, onClose }: Props) {
  const [sightings, setSightings] = useState<WeeklySighting[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    const list = await getWeeklySightings();
    setSightings(list);
    setLoading(false);
  };

  useEffect(() => {
    if (!open) return;
    refresh();
    const unsub = onBoostChanged(refresh);
    return unsub;
  }, [open]);

  const citiesFor = (category: string) => {
    const cities = sightings.filter(s => s.category === category).map(s => s.city);
    return [...new Set(cities)];
  };

  const boostItems = TRACKED_ITEMS.filter(t => t.event_type === '부양');
  const flashItems = TRACKED_ITEMS.filter(t => t.event_type === '급매');

  const totalCities = new Set(sightings.map(s => `${s.category}|${s.city}`)).size;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[8vh] px-4 bg-black/40 backdrop-blur-sm">
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="px-5 py-3 border-b border-slate-200 bg-gradient-to-r from-teal-50 to-cyan-50 flex items-center gap-2">
          <MapPin size={18} className="text-teal-600" />
          <h3 className="font-black text-slate-800 text-base flex-1">주요 물교 주간 기록</h3>
          <button
            onClick={refresh}
            disabled={loading}
            className="p-1.5 -m-1 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors disabled:opacity-50"
            aria-label="새로고침"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 -m-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            aria-label="닫기"
          >
            <X size={18} />
          </button>
        </div>

        {/* 본문 */}
        <div className="p-4 space-y-3 max-h-[65vh] overflow-y-auto">
          <p className="text-[12px] text-slate-500">
            등록된 부양/급매 데이터에서 자동 집계됩니다. 월~일 주간 단위, 일요일 자정(KST) 이후 초기화.
          </p>

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-slate-400 py-4">
              <Loader2 size={14} className="animate-spin" />
              데이터 로딩 중...
            </div>
          ) : (
            <div className="space-y-4 pt-1">
              {/* 부양 섹션 */}
              <div>
                <div className="text-[11px] font-black text-violet-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-violet-500 inline-block" />
                  부양
                </div>
                <div className="space-y-1.5">
                  {boostItems.map(t => {
                    const cities = citiesFor(t.category);
                    return (
                      <div key={t.category} className="flex items-start gap-2 text-[13px]">
                        <span className="font-bold text-slate-700 whitespace-nowrap min-w-[130px]">
                          {t.category}
                        </span>
                        <div className="flex flex-wrap gap-1 flex-1">
                          {cities.length === 0 ? (
                            <span className="text-slate-400 italic text-[12px]">—</span>
                          ) : (
                            cities.map(city => (
                              <span
                                key={city}
                                className="inline-flex items-center px-1.5 py-0.5 bg-violet-50 border border-violet-200 text-violet-800 text-[12px] font-semibold rounded"
                              >
                                {city}
                              </span>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 급매 섹션 */}
              <div>
                <div className="text-[11px] font-black text-orange-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-orange-500 inline-block" />
                  급매
                </div>
                <div className="space-y-1.5">
                  {flashItems.map(t => {
                    const cities = citiesFor(t.category);
                    return (
                      <div key={t.category} className="flex items-start gap-2 text-[13px]">
                        <span className="font-bold text-slate-700 whitespace-nowrap min-w-[130px]">
                          {t.items[0]}
                        </span>
                        <div className="flex flex-wrap gap-1 flex-1">
                          {cities.length === 0 ? (
                            <span className="text-slate-400 italic text-[12px]">—</span>
                          ) : (
                            cities.map(city => (
                              <span
                                key={city}
                                className="inline-flex items-center px-1.5 py-0.5 bg-orange-50 border border-orange-200 text-orange-800 text-[12px] font-semibold rounded"
                              >
                                {city}
                              </span>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
          <span className="text-[11px] text-slate-400">
            {totalCities}건 집계됨
          </span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-[12px] font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
