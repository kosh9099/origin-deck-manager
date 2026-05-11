'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { TradeEvent, TradeItem } from '@/types/trade';
import { generateEpidemicSchedules } from '@/lib/trade/epidemic';
import ScheduleTable from './ScheduleTable';
import ScheduleCards from './ScheduleCards';
import { Flame, RefreshCw, CheckCircle, XCircle, Filter } from 'lucide-react';
import {
  fetchZoneSheet,
  fetchCitySheet,
  SheetItemMap,
  normalizeZoneName,
} from '@/lib/trade/sheetSync';
import { getBoostType } from '@/constants/tradeData';
import { APPLIED_PANDEMIC_ITEMS } from '@/lib/trade/cities';
import { getInGameTimeInfo } from '@/lib/trade/time';
import { getBoostRecommendations, getEpidemicRecommendations } from '@/lib/trade/seasonPrices';
import { onBoostChanged, onSpecialChanged } from '@/lib/trade/boostEvents';
import { loadFavorites, saveFavorites } from '@/lib/trade/favorites';
import {
  loadCityMinuteMaps,
  eventDurationMs,
  EMPTY_CITY_MINUTE_MAPS,
  type CityMinuteMaps,
} from '@/lib/trade/cityMinutes';

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
  const end = event.endTime ?? start + 3600 * 1000;
  return now >= start && now < end;
}

// localStorage 필터 저장 키
const FILTER_STORAGE_KEY = 'trade_filters_v1';

type SheetLoadStatus = 'loading' | 'ok' | 'error' | 'idle';

type DbBoostRow = {
  id: string;
  city?: string | null;
  zone?: string | null;
  type: string;
  start_time: string;
};

type DbTradeItemRow = {
  id: string;
  schedule_id: string;
  item_name: string;
  upvotes: number;
  downvotes: number;
};

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

    // 시즌5 단가표 기반 추천 (최대 3개)
    let seasonRecs = ev.seasonRecs;
    if (ev.isBoost && ev.city) {
      // 부양/급매: 도시 + type(카테고리 또는 품목명) → 부양↑/↓
      const recs = getBoostRecommendations(ev.city, ev.type);
      if (recs.length > 0) seasonRecs = recs;
    } else if (!ev.isBoost && ev.zone) {
      // 대유행: 해역 + 대유행 종류 → 대유행↑/↓
      const recs = getEpidemicRecommendations(ev.zone, ev.type);
      if (recs.length > 0) seasonRecs = recs;
    }

    if (newItems.length === 0 && seasonRecs === ev.seasonRecs) return ev;
    return { ...ev, items: [...ev.items, ...newItems], seasonRecs };
  });
}

type MapJumpTarget = { city?: string; region?: string };

export default function TradeDashboard({
  captureMode = false,
  onMapJump,
}: {
  captureMode?: boolean;
  onMapJump?: (target: MapJumpTarget) => void;
}) {
  const [events, setEvents] = useState<TradeEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  // localStorage는 hydration 후에만 읽어서 SSR/CSR mismatch 방지
  const [filters, setFilters] = useState({ boost: true, flash: true, epidemic: true, favorite: false, tierFx: true });
  const [favorites, setFavorites] = useState<Set<string>>(() => new Set());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(FILTER_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<{ boost: boolean; flash: boolean; epidemic: boolean; favorite: boolean; tierFx: boolean }>;
        setFilters(prev => ({ ...prev, ...parsed }));
      }
    } catch {}
    setFavorites(loadFavorites());
    setHydrated(true);
  }, []);

  const toggleFavorite = useCallback((eventId: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(eventId)) next.delete(eventId);
      else next.add(eventId);
      saveFavorites(next);
      return next;
    });
  }, []);

  const [zoneMap, setZoneMap] = useState<SheetItemMap>({});
  const [cityMap, setCityMap] = useState<SheetItemMap>({});
  const [specialItems, setSpecialItems] = useState<Map<string, string>>(new Map());
  const [cityMinuteMaps, setCityMinuteMaps] = useState<CityMinuteMaps>(EMPTY_CITY_MINUTE_MAPS);
  const [sheetStatus, setSheetStatus] = useState<{
    zone: SheetLoadStatus; city: SheetLoadStatus;
  }>({ zone: 'idle', city: 'idle' });

  // 도시별 분 데이터 로드 (해역 max minute 까지 전처리). 한 번 로드 후 재사용.
  useEffect(() => {
    loadCityMinuteMaps().then(setCityMinuteMaps).catch(() => {});
  }, []);

  // events 와 cityMinuteMaps 를 결합해 각 이벤트의 endTime 을 실제 유지 시간으로 보정.
  const eventsWithEndTime = useMemo<TradeEvent[]>(() => {
    return events.map(ev => ({
      ...ev,
      endTime: ev.startTime + eventDurationMs(ev, cityMinuteMaps),
    }));
  }, [events, cityMinuteMaps]);

  // 필터 변경 시 localStorage에 자동 저장 (hydration 이후에만 — 초기 default 덮어쓰기 방지)
  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(filters)); } catch {}
  }, [filters, hydrated]);

  // 매분 시각 갱신
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
      const boostEvents: TradeEvent[] = (dbBoosts as DbBoostRow[]).map(b => ({
        id: b.id, zone: b.city || b.zone || '미상', city: b.city || undefined,
        type: b.type, isBoost: true, startTime: new Date(b.start_time).getTime(), items: [],
      }));
      const allEvents = [...autoGenEvents, ...boostEvents];
      (dbItems as DbTradeItemRow[]).forEach(dbItem => {
        const target = allEvents.find(e => e.id === dbItem.schedule_id);
        const item: TradeItem = { id: dbItem.id, name: dbItem.item_name, upvotes: dbItem.upvotes, downvotes: dbItem.downvotes, isUserVoted: null };
        if (target) target.items.push(item);
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

  // BoostForm 등록 시 자동 새로고침 (시트 재요청 없이 DB만 다시 읽음)
  useEffect(() => {
    return onBoostChanged(() => {
      fetchData();
    });
  }, [fetchData]);

  // 특수 물교 등록 fetch + 변경 이벤트 구독
  const refreshSpecials = useCallback(async () => {
    try {
      const { getActiveSpecials } = await import('@/lib/supabaseClient');
      const list = await getActiveSpecials();
      const map = new Map<string, string>();
      for (const s of list) {
        const d = new Date(s.created_at);
        const kstDate = new Date(d.getTime() + 9 * 3600 * 1000).toISOString().slice(0, 10);
        map.set(s.name, kstDate);
      }
      setSpecialItems(map);
    } catch (e) {
      console.error('Failed to load specials:', e);
    }
  }, []);

  useEffect(() => {
    refreshSpecials();
  }, [refreshSpecials]);

  useEffect(() => {
    return onSpecialChanged(() => {
      refreshSpecials();
    });
  }, [refreshSpecials]);

  // 정각마다 자동 새로고침
  useEffect(() => {
    const now = new Date();
    const msUntilNextHour =
      (60 - now.getMinutes()) * 60_000 - now.getSeconds() * 1000 - now.getMilliseconds();

    const doRefresh = () => {
      loadSheets().then(({ newZone, newCity }) => fetchData(newZone, newCity));
    };

    let intervalId: ReturnType<typeof setInterval> | null = null;
    const timeoutId = setTimeout(() => {
      doRefresh();
      intervalId = setInterval(doRefresh, 3_600_000);
    }, msUntilNextHour);

    return () => {
      clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
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

  // 💡 time.ts에서 month만 가져옵니다.
  const inGameTime = getInGameTimeInfo(now);

  const filteredEvents = useMemo(() => {
    let result = eventsWithEndTime.filter(ev => {
      if (ev.isBoost) {
        const bt = getBoostType(ev.type);
        if (bt === '급매') return filters.flash;
        return filters.boost;
      }
      return filters.epidemic;
    });

    // 즐겨찾기 필터: ON일 때 favorited 이벤트만 표시
    if (filters.favorite) {
      result = result.filter(ev => favorites.has(ev.id));
    }

    // 캡처 모드: 오늘 날짜 이벤트만 표시
    if (captureMode) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const tomorrowStart = new Date(todayStart);
      tomorrowStart.setDate(tomorrowStart.getDate() + 1);
      result = result.filter(ev => ev.startTime >= todayStart.getTime() && ev.startTime < tomorrowStart.getTime());
    }

    return result;
  }, [eventsWithEndTime, filters, favorites, captureMode]);

  return (
    <div className="relative flex h-full w-full flex-1 flex-col" id="trade-dashboard-capture-area">

      {/* 헤더 */}
      <div className="mb-2 shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h3 className="flex min-w-0 items-center gap-1.5 text-[14px] font-black text-slate-950">
            <Flame size={15} className="shrink-0 text-amber-300" />
            <span className="truncate">교역 스케줄</span>
            <span className="shrink-0 rounded-md border border-teal-200 bg-teal-50 px-1.5 py-0.5 text-[11px] font-black leading-tight text-teal-700">
              인게임 {inGameTime.month}월
            </span>
          </h3>
          <button onClick={handleRefresh} disabled={isLoading}
            className="flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-black text-slate-600 transition-all hover:bg-slate-100 disabled:opacity-50">
            <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} /> 새로고침
          </button>
        </div>
        <p className="mt-1 text-[10px] leading-tight text-slate-500">
          추천 품목 가격은 판매지식 20렙 / 할증 0% 기준
        </p>
      </div>

      {/* 핫타임 이벤트 일정 공지 (이하 기존과 동일) */}
      {(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const inPeriod = today >= HOTTIME_CONFIG.startDate && today <= HOTTIME_CONFIG.endDate;
        if (!inPeriod) return null;
        return (
          <div className="mb-3 shrink-0 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 shadow-sm">
            <div className="flex items-start gap-2.5">
              <span className="text-base shrink-0">✦</span>
              <div className="flex-1 min-w-0 space-y-1">
                <p className="text-[12px] font-black text-amber-800">핫타임 버프 이벤트</p>
                <div className="flex items-center gap-1.5 flex-wrap text-[11px] font-bold text-amber-700">
                  <span className="whitespace-nowrap rounded-md border border-amber-200 bg-white px-2 py-0.5">
                    2026.03.11 ~ 2026.04.07
                  </span>
                  <span className="text-amber-400">·</span>
                  <span className="whitespace-nowrap rounded-md border border-amber-200 bg-white px-2 py-0.5">
                    매일 17:00 ~ 22:00
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-black ${BONUS_ITEMS['공예품'].color}`}>
                    공예품 판매 가격 +10%
                  </span>
                  <span className={`whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-black ${BONUS_ITEMS['귀금속'].color}`}>
                    귀금속 판매 가격 +30%
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 필터 토글 */}
      <div className="mb-2 flex shrink-0 items-center gap-1.5 overflow-x-auto pb-1 md:overflow-visible md:pb-0">
        <span className="hidden shrink-0 items-center gap-1 text-[11px] font-bold text-slate-500 md:flex"><Filter size={11} /></span>
        {([
          { key: 'boost' as const, label: '부양', activeColor: 'bg-violet-700 text-white border-violet-800', inactiveColor: 'bg-white text-violet-700 border-violet-200' },
          { key: 'flash' as const, label: '급매', activeColor: 'bg-orange-600 text-white border-orange-700', inactiveColor: 'bg-white text-orange-700 border-orange-200' },
          { key: 'epidemic' as const, label: '대유행', activeColor: 'bg-emerald-700 text-white border-emerald-800', inactiveColor: 'bg-white text-emerald-700 border-emerald-200' },
          { key: 'favorite' as const, label: '즐겨찾기', activeColor: 'bg-amber-600 text-white border-amber-700', inactiveColor: 'bg-white text-amber-700 border-amber-200' },
          { key: 'tierFx' as const, label: '가격 강조', activeColor: 'bg-rose-600 text-white border-rose-700', inactiveColor: 'bg-white text-rose-700 border-rose-200' },
        ]).map(f => (
          <button
            key={f.key}
            onClick={() => setFilters(prev => ({ ...prev, [f.key]: !prev[f.key] }))}
            className={`shrink-0 whitespace-nowrap rounded-md border px-2 py-1 text-[10px] font-black transition-all active:scale-95 md:text-[11px] ${
              filters[f.key] ? f.activeColor : f.inactiveColor
            }`}
          >
            {filters[f.key] ? '✓ ' : ''}{f.label}
          </button>
        ))}
      </div>

      {/* 스케줄 테이블 */}
      <div className="flex-1 overflow-y-auto pb-10 scrollbar-thin scrollbar-thumb-slate-300">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-500 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="animate-in fade-in duration-500">
            {/* 데스크톱: 테이블 / 모바일: 카드 */}
            <div className="hidden md:block">
              <ScheduleTable
                events={filteredEvents}
                now={now}
                cityMap={cityMap}
                onVoteOptimistic={handleVoteOptimistic}
                onAddOptimistic={handleAddOptimistic}
                onDeleteBoost={handleDeleteBoost}
                onDeleteItem={handleDeleteItem}
                favorites={favorites}
                onToggleFavorite={toggleFavorite}
                specialItems={specialItems}
                tierFxEnabled={filters.tierFx}
                onMapJump={onMapJump}
              />
            </div>
            <div className="md:hidden">
              <ScheduleCards
                events={filteredEvents}
                now={now}
                onVoteOptimistic={handleVoteOptimistic}
                onAddOptimistic={handleAddOptimistic}
                onDeleteBoost={handleDeleteBoost}
                onDeleteItem={handleDeleteItem}
                favorites={favorites}
                onToggleFavorite={toggleFavorite}
                specialItems={specialItems}
                tierFxEnabled={filters.tierFx}
                onMapJump={onMapJump}
              />
            </div>
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
