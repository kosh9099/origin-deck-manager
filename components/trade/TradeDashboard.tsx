'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { TradeEvent } from '@/types/trade';
import { generateEpidemicSchedules } from '@/lib/trade/epidemic';
import ScheduleTable from './ScheduleTable';
import { Flame, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import {
  fetchZoneSheet,
  fetchCitySheet,
  SheetItemMap,
  normalizeZoneName,
} from '@/lib/trade/sheetSync';
import { getBoostType } from '@/constants/tradeData';
import { APPLIED_PANDEMIC_ITEMS } from '@/lib/trade/cities';
import { getInGameTimeInfo } from '@/lib/trade/time';

// ── 핫타임 설정 ──────────────────────────────────────────────────
export const HOTTIME_CONFIG = {
  startDate: new Date('2026-03-11'),
  endDate: new Date('2026-04-07'),
  startHour: 17,
  endHour: 22,
};

export function isNowHottime(): boolean {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const hour = now.getHours();
  return (
    today >= HOTTIME_CONFIG.startDate &&
    today <= HOTTIME_CONFIG.endDate &&
    hour >= HOTTIME_CONFIG.startHour &&
    hour < HOTTIME_CONFIG.endHour
  );
}

export function isEventInHottime(timestampMs: number): boolean {
  const d = new Date(timestampMs);
  const dateOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const hour = d.getHours();
  return (
    dateOnly >= HOTTIME_CONFIG.startDate &&
    dateOnly <= HOTTIME_CONFIG.endDate &&
    hour >= HOTTIME_CONFIG.startHour &&
    hour < HOTTIME_CONFIG.endHour
  );
}

export const BONUS_ITEMS: Record<string, { label: string; color: string }> = {
  '공예품': { label: '+판매할증 10%', color: 'text-amber-700 bg-amber-50 border-amber-300' },
  '귀금속': { label: '+판매할증 30%', color: 'text-yellow-700 bg-yellow-50 border-yellow-400' },
};

export function getGoldBonuses(
  event: TradeEvent,
  cityMap?: Record<string, string[]>
): string[] {
  if (!isEventInHottime(event.startTime)) return [];

  const bonusKeys = Object.keys(BONUS_ITEMS);

  if (event.isBoost) {
    const direct = bonusKeys.filter(k => event.type === k);
    if (direct.length > 0) return direct;

    if (cityMap) {
      const cityKey = event.city || event.zone || '';
      return bonusKeys.filter(k => {
        const items = cityMap[`${cityKey}|${k}`] || [];
        return items.includes(event.type);
      });
    }
    return [];
  } else {
    const items = APPLIED_PANDEMIC_ITEMS[event.type] || [];
    return bonusKeys.filter(k => items.includes(k));
  }
}

export function isCurrentlyActive(event: TradeEvent): boolean {
  const now = Date.now();
  const start = event.startTime;
  const end = start + 3600 * 1000;
  return now >= start && now < end;
}

type SheetLoadStatus = 'loading' | 'ok' | 'error' | 'idle';

function mergeSheetItems(
  events: TradeEvent[],
  zoneMap: SheetItemMap,
  cityMap: SheetItemMap
): TradeEvent[] {
  return events.map(ev => {
    const existingNames = new Set(ev.items.map(it => it.name));
    let recommended: string[] = [];

    if (ev.isBoost) {
      const cityKey = ev.city || ev.zone || '';
      const isFlash = getBoostType(ev.type) === '급매';
      const lookupKey = isFlash ? `${cityKey}|급매` : `${cityKey}|${ev.type}`;
      recommended = cityMap[lookupKey] || [];
    } else {
      const fullZone = normalizeZoneName(ev.zone || '');
      recommended = zoneMap[`${fullZone}|${ev.type}`] || [];
    }

    const newItems = recommended
      .filter(name => !existingNames.has(name))
      .map((name, i) => ({
        id: `sheet-${ev.id}-${i}`,
        name,
        upvotes: 0,
        downvotes: 0,
        isUserVoted: null as null,
      }));

    if (newItems.length === 0) return ev;
    return { ...ev, items: [...ev.items, ...newItems] };
  });
}

export default function TradeDashboard() {
  const [events, setEvents] = useState<TradeEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [now, setNow] = useState(Date.now());

  const [zoneMap, setZoneMap] = useState<SheetItemMap>({});
  const [cityMap, setCityMap] = useState<SheetItemMap>({});
  const [sheetStatus, setSheetStatus] = useState<{
    zone: SheetLoadStatus; city: SheetLoadStatus;
  }>({ zone: 'idle', city: 'idle' });

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const loadSheets = useCallback(async () => {
    setSheetStatus({ zone: 'loading', city: 'loading' });
    const [zoneResult, cityResult] = await Promise.allSettled([
      fetchZoneSheet(),
      fetchCitySheet(),
    ]);
    let newZone: SheetItemMap = zoneMap;
    let newCity: SheetItemMap = cityMap;
    if (zoneResult.status === 'fulfilled') { newZone = zoneResult.value; setZoneMap(newZone); setSheetStatus(s => ({ ...s, zone: 'ok' })); }
    else { setSheetStatus(s => ({ ...s, zone: 'error' })); }
    if (cityResult.status === 'fulfilled') { newCity = cityResult.value; setCityMap(newCity); setSheetStatus(s => ({ ...s, city: 'ok' })); }
    else { setSheetStatus(s => ({ ...s, city: 'error' })); }
    return { newZone, newCity };
  }, []);

  const fetchData = useCallback(async (overrideZone?: SheetItemMap, overrideCity?: SheetItemMap) => {
    setIsLoading(true);
    const autoGenEvents = generateEpidemicSchedules(12);
    const useZone = overrideZone ?? zoneMap;
    const useCity = overrideCity ?? cityMap;
    try {
      const { getActiveBoosts, getTradeItems } = await import('@/lib/supabaseClient');
      const [dbBoosts, dbItems] = await Promise.all([
        getActiveBoosts().catch(() => []),
        getTradeItems().catch(() => []),
      ]);
      const boostEvents: TradeEvent[] = dbBoosts.map((b: any) => ({
        id: b.id, zone: b.city || b.zone || '미상', city: b.city || undefined,
        type: b.type, isBoost: true, startTime: new Date(b.start_time).getTime(), items: [],
      }));
      const allEvents = [...autoGenEvents, ...boostEvents];
      dbItems.forEach((dbItem: any) => {
        const target = allEvents.find(e => e.id === dbItem.schedule_id);
        if (target) target.items.push({ id: dbItem.id, name: dbItem.item_name, upvotes: dbItem.upvotes, downvotes: dbItem.downvotes, isUserVoted: null });
      });
      const merged = mergeSheetItems(allEvents, useZone, useCity);
      merged.sort((a, b) => a.startTime - b.startTime);
      merged.forEach(e => e.items.sort((x, y) => y.upvotes - x.upvotes));
      setEvents(merged);
    } catch (e) {
      console.error('DB load failed:', e);
      setEvents(mergeSheetItems(autoGenEvents, useZone, useCity));
    } finally {
      setIsLoading(false);
    }
  }, [zoneMap, cityMap]);

  useEffect(() => {
    (async () => {
      const { newZone, newCity } = await loadSheets();
      await fetchData(newZone, newCity);
    })();
  }, []);

  const handleRefresh = async () => {
    const { newZone, newCity } = await loadSheets();
    await fetchData(newZone, newCity);
  };

  const handleVoteOptimistic = (eventId: string, itemId: string, isUp: boolean) => {
    setEvents(prev => prev.map(ev => {
      if (ev.id !== eventId) return ev;
      return { ...ev, items: ev.items.map(it => { if (it.id !== itemId) return it; return { ...it, upvotes: isUp ? it.upvotes + 1 : it.upvotes, downvotes: !isUp ? it.downvotes + 1 : it.downvotes, isUserVoted: (isUp ? 'up' : 'down') as 'up' | 'down' }; }).sort((a, b) => b.upvotes - a.upvotes) };
    }));
  };
  const handleAddOptimistic = (eventId: string, newItem: typeof events[0]['items'][0]) => {
    setEvents(prev => prev.map(ev => { if (ev.id !== eventId) return ev; return { ...ev, items: [...ev.items, newItem].sort((a, b) => b.upvotes - a.upvotes) }; }));
  };
  const handleDeleteBoost = async (eventId: string) => {
    if (!window.confirm('이 일정을 삭제하시겠습니까?')) return;
    setEvents(prev => prev.filter(ev => ev.id !== eventId));
    try { const { deleteBoost } = await import('@/lib/supabaseClient'); await deleteBoost(eventId); }
    catch (e) { console.error('Delete failed:', e); alert('삭제 중 오류가 발생했습니다.'); }
  };
  const handleDeleteItem = (eventId: string, itemId: string) => {
    setEvents(prev => prev.map(ev => { if (ev.id !== eventId) return ev; return { ...ev, items: ev.items.filter(it => it.id !== itemId) }; }));
  };

  const StatusBadge = ({ label, status }: { label: string; status: SheetLoadStatus }) => {
    if (status === 'loading') return <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded"><div className="w-2 h-2 border border-amber-400 border-t-transparent rounded-full animate-spin" />{label}</span>;
    if (status === 'ok') return <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded"><CheckCircle size={10} /> {label} ✓</span>;
    if (status === 'error') return <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded"><XCircle size={10} /> {label} 실패</span>;
    return null;
  };

  const inGameTime = getInGameTimeInfo(now);

  return (
    <div className="w-full flex-1 flex flex-col h-full relative" id="trade-dashboard-capture-area">

      {/* 헤더 */}
      <div className="bg-emerald-600 px-4 py-3 rounded-xl border border-emerald-500 mb-3 shadow-sm flex items-center justify-between shrink-0 flex-wrap gap-2">
        <div>
          <h3 className="text-[15px] font-black text-white flex items-center gap-2">
            <Flame size={18} className="text-amber-300 animate-pulse" />
            교역 스케줄 현황
            {/* 💡 월과 계절을 분리하고 글자를 키운 뒤 시인성을 높였습니다! */}
            <div className="ml-1.5 flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded-md bg-white border border-emerald-200 text-[12px] font-black text-emerald-700 shadow-sm leading-tight">
                {inGameTime.month}월
              </span>
              <span className="px-2 py-0.5 rounded-md bg-emerald-700 border border-emerald-500 text-[12px] font-black text-white shadow-sm leading-tight">
                {inGameTime.seasonName}
              </span>
            </div>
          </h3>
          <p className="text-[11px] text-emerald-100 mt-0.5">대유행 예측 및 유저 공유 부양 일정</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge label="해역별" status={sheetStatus.zone} />
          <StatusBadge label="도시별" status={sheetStatus.city} />
          <button onClick={handleRefresh} disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-black bg-white/20 text-white border border-white/30 hover:bg-white/30 transition-all disabled:opacity-50">
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} /> 새로고침
          </button>
          <span className="text-[11px] font-bold text-emerald-100 bg-emerald-700/50 px-2 py-1 rounded hidden sm:block">
            {new Date(now).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>

      {/* 핫타임 이벤트 일정 공지 */}
      {(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const inPeriod = today >= HOTTIME_CONFIG.startDate && today <= HOTTIME_CONFIG.endDate;
        if (!inPeriod) return null;
        return (
          <div className="mb-3 shrink-0 rounded-xl border border-yellow-300 bg-gradient-to-r from-yellow-50 to-amber-50 px-4 py-2.5 shadow-sm">
            <div className="flex items-start gap-2.5">
              <span className="text-base shrink-0">✦</span>
              <div className="flex-1 min-w-0 space-y-1">
                <p className="text-[12px] font-black text-amber-800">핫타임 버프 이벤트</p>
                <div className="flex items-center gap-1.5 flex-wrap text-[11px] font-bold text-amber-700">
                  <span className="bg-white border border-yellow-300 rounded-lg px-2 py-0.5 whitespace-nowrap">
                    2026.03.11 ~ 2026.04.07
                  </span>
                  <span className="text-amber-400">·</span>
                  <span className="bg-white border border-yellow-300 rounded-lg px-2 py-0.5 whitespace-nowrap">
                    매일 17:00 ~ 22:00
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[11px] font-black px-2 py-0.5 rounded-lg border whitespace-nowrap ${BONUS_ITEMS['공예품'].color}`}>
                    공예품 판매 가격 +10%
                  </span>
                  <span className={`text-[11px] font-black px-2 py-0.5 rounded-lg border whitespace-nowrap ${BONUS_ITEMS['귀금속'].color}`}>
                    귀금속 판매 가격 +30%
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 스케줄 테이블 */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 pb-10">
        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-500 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="animate-in fade-in duration-500">
            <ScheduleTable
              events={events}
              now={now}
              cityMap={cityMap}
              onVoteOptimistic={handleVoteOptimistic}
              onAddOptimistic={handleAddOptimistic}
              onDeleteBoost={handleDeleteBoost}
              onDeleteItem={handleDeleteItem}
            />
          </div>
        )}
      </div>

      <style>{`
        @keyframes goldShimmer {
          0%, 100% { box-shadow: 0 0 6px 1px rgba(234,179,8,0.5), 0 0 0 2px rgba(234,179,8,0.4); }
          50%       { box-shadow: 0 0 16px 4px rgba(234,179,8,0.8), 0 0 0 2px rgba(234,179,8,0.8); }
        }
        .gold-shimmer {
          animation: goldShimmer 1.8s ease-in-out infinite;
          border-color: rgb(234,179,8) !important;
        }
      `}</style>
    </div>
  );
}