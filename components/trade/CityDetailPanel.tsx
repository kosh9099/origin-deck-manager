'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { X, Anchor, Castle, MapPin, Calendar, Hammer, Package, Clock, ChevronDown, ChevronRight, CalendarClock } from 'lucide-react';
import { CITY_MAP } from '@/lib/trade/cityMap';
import { getCityCombination } from '@/lib/trade/combinationRotation';
import { generateEpidemicSchedules } from '@/lib/trade/epidemic';
import { normalizeZoneName } from '@/lib/trade/sheetSync';
import { getBoostType } from '@/constants/tradeData';
import seasonCalendarData from '@/constants/seasonCalendar.json';
import itemLocationsData from '@/constants/itemLocations.json';
import { getInGameTimeInfo } from '@/lib/trade/time';
import { getLatestCityMinutes, getActiveBoosts, type CityMinuteEntry } from '@/lib/supabaseClient';
import type { TradeEvent } from '@/types/trade';
import { useDraggableSheetHeight } from '@/lib/hooks/useDraggableSheetHeight';

const HOME_BASES = new Set<string>([
  '런던', '암스테르담', '리스본', '세비야',
  '이스탄불', '한양', '북경', '에도',
]);

type SeasonCalendar = {
  monthLabels: number[];
  markerLegend: Record<string, string>;
  cities: Record<string, { region: string; months: string[] }>;
  items: Record<string, { category: string; cities: string[] }>;
  itemClasses: Record<string, string>;
  portSeason: Record<string, string[]>;
};

const seasonCalendar = seasonCalendarData as SeasonCalendar;
const itemLocations = itemLocationsData as Record<string, string[]>;

type Props = {
  city: string | null;
  onClose: () => void;
};

export default function CityDetailPanel({ city, onClose }: Props) {
  const entry = city ? CITY_MAP.get(city) : null;
  const isHomeBase = city ? HOME_BASES.has(city) : false;
  const inGameMonth = useMemo(() => getInGameTimeInfo(Date.now()).month, []);
  const { heightVh, setHandleRef } = useDraggableSheetHeight();

  // Collapsible 섹션 — 기본 펼침.
  const [openCombo, setOpenCombo] = useState(true);
  const [openSeason, setOpenSeason] = useState(true);

  // 풍근 조합식 (rotation 기반)
  const combo = useMemo(() => (city ? getCityCombination(city) : null), [city]);
  const comboMaterials = useMemo(() => {
    if (!combo) return [];
    const formulas = [combo['쉬움'], combo['보통'], combo['어려움']].filter(Boolean) as string[];
    const set = new Set<string>();
    for (const formula of formulas) {
      const parts = formula.split(/\s*\d+\s*\+?/);
      for (const p of parts) {
        const t = p.trim();
        if (t) set.add(t);
      }
    }
    return Array.from(set)
      .map((name) => ({ name, locations: itemLocations[name] }))
      .filter((x) => x.locations && x.locations.length > 0);
  }, [combo]);

  // 시즌 매트릭스 — 그 도시에서 거래되는 모든 교역품의 12개월 ▲/―/▼
  const seasonRows = useMemo(() => {
    if (!city) return [];
    const rows: Array<{ name: string; category: string; cls: string; months: string[] }> = [];
    const prefix = `${city}|`;
    for (const [key, months] of Object.entries(seasonCalendar.portSeason)) {
      if (!key.startsWith(prefix)) continue;
      const itemName = key.slice(prefix.length);
      const meta = seasonCalendar.items[itemName];
      rows.push({
        name: itemName,
        category: meta?.category ?? '-',
        cls: seasonCalendar.itemClasses[itemName] ?? '일반',
        months,
      });
    }
    rows.sort((a, b) => {
      // 명산품 우선 → 카테고리 → 이름
      if (a.cls !== b.cls) return a.cls === '명산품' ? -1 : 1;
      if (a.category !== b.category) return a.category.localeCompare(b.category);
      return a.name.localeCompare(b.name);
    });
    return rows;
  }, [city]);

  // 도시 분(minute) 데이터 — 비동기 로드
  const [minuteEntry, setMinuteEntry] = useState<CityMinuteEntry | null>(null);
  useEffect(() => {
    if (!city) {
      setMinuteEntry(null);
      return;
    }
    let cancelled = false;
    getLatestCityMinutes()
      .then((all) => {
        if (cancelled) return;
        setMinuteEntry(all.find((e) => e.city === city) ?? null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [city]);

  // 교역 스케줄 이벤트 — 활성/예정 12시간 lookahead.
  const [allEvents, setAllEvents] = useState<TradeEvent[]>([]);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!city) return;
    let cancelled = false;
    const epidemic = generateEpidemicSchedules(12);
    getActiveBoosts()
      .then((dbBoosts) => {
        if (cancelled) return;
        const boostEvents: TradeEvent[] = (dbBoosts ?? []).map((b: { id: string; city?: string; zone?: string; type: string; start_time: string }) => ({
          id: b.id,
          zone: b.city || b.zone || '미상',
          city: b.city || undefined,
          type: b.type,
          isBoost: true,
          startTime: new Date(b.start_time).getTime(),
          items: [],
        }));
        setAllEvents([...epidemic, ...boostEvents].sort((a, b) => a.startTime - b.startTime));
      })
      .catch(() => setAllEvents(epidemic.sort((a, b) => a.startTime - b.startTime)));
    // 매분 시각 갱신 (진행중 표시)
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [city]);

  // 이 도시와 관련된 이벤트만 필터.
  // - 부양/급매: ev.city === 선택한 도시
  // - 대유행: normalizeZoneName(ev.zone) === 선택한 도시의 해역
  const relevantEvents = useMemo(() => {
    if (!city || !entry) return [];
    return allEvents.filter((ev) => {
      const endTime = ev.endTime ?? ev.startTime + 3600 * 1000;
      if (endTime <= now) return false; // 이미 끝난 이벤트 제외
      if (ev.isBoost) return ev.city === city;
      return normalizeZoneName(ev.zone) === entry.region;
    });
  }, [allEvents, city, entry, now]);

  // 키보드 ESC 닫기
  useEffect(() => {
    if (!city) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [city, onClose]);

  if (!city || !entry) return null;

  return (
    <>
      {/* 오버레이 — 모바일에서 panel 위쪽 영역 클릭 시 닫기. dim 은 가볍게 (지도 시야 확보). */}
      <div
        className="fixed inset-0 z-[150] bg-black/20 md:hidden"
        onClick={onClose}
      />

      {/* 패널 — 모바일: 하단 가변 바텀시트 / 데스크톱: 우측 380px 풀높이 */}
      <aside
        style={{ height: `${heightVh}vh` }}
        className="city-detail-panel fixed z-[160] bg-white shadow-2xl flex flex-col
          inset-x-0 bottom-0 rounded-t-2xl border-t border-slate-200
          md:inset-x-auto md:right-0 md:top-0 md:bottom-0 md:!h-auto md:w-[380px] md:rounded-none md:border-t-0 md:border-l
          animate-in slide-in-from-bottom md:slide-in-from-right duration-200"
      >
        {/* 모바일 드래그 핸들 — 위/아래로 끌어서 패널 높이 조절 */}
        <div
          ref={setHandleRef}
          className="flex justify-center pt-2 pb-1 md:hidden shrink-0 cursor-grab active:cursor-grabbing touch-none select-none"
          aria-label="패널 높이 조절"
        >
          <div className="w-10 h-1 bg-slate-300 rounded-full" />
        </div>
        {/* 헤더 */}
        <div className={`city-detail-panel-header shrink-0 px-4 py-3 border-b border-slate-200
          ${isHomeBase ? 'bg-gradient-to-r from-amber-50 to-amber-100' : 'bg-slate-50'}`}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`inline-flex items-center justify-center w-7 h-7 rounded
                  ${isHomeBase ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
                  {isHomeBase ? <Castle size={16} strokeWidth={2.5} /> : <Anchor size={14} strokeWidth={2.5} />}
                </span>
                <h3 className="text-[16px] font-black text-slate-900 truncate">{city}</h3>
                {isHomeBase && (
                  <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-500 text-white border border-amber-700">
                    👑 본거지
                  </span>
                )}
              </div>
              <div className="text-[11px] font-bold text-slate-600 mt-1 flex items-center gap-1.5 flex-wrap">
                <MapPin size={11} className="text-slate-400" />
                <span>{entry.region}</span>
                {minuteEntry ? (
                  <>
                    <span className="text-slate-400">·</span>
                    <span className="inline-flex items-center gap-0.5 text-emerald-700">
                      <Clock size={11} className="text-emerald-500" />
                      <span className="font-black tabular-nums">:{String(minuteEntry.minute).padStart(2, '0')}</span>
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-slate-400">·</span>
                    <span className="inline-flex items-center gap-0.5 text-slate-400">
                      <Clock size={11} />
                      <span>분 미수집</span>
                    </span>
                  </>
                )}
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

        {/* 본문 — 스크롤 */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
          {/* 교역 스케줄 — 이 도시와 관련된 활성/예정 이벤트 */}
          <div>
            <div className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5 px-1">
              <CalendarClock size={12} /> 교역 스케줄
              <span className="text-slate-400">·</span>
              <span className={relevantEvents.length === 0 ? 'text-slate-400' : 'text-slate-600'}>
                {relevantEvents.length === 0 ? '이벤트 없음' : `${relevantEvents.length}건`}
              </span>
            </div>
            {relevantEvents.length === 0 ? (
              <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl px-3 py-4 text-center">
                <p className="text-[12px] text-slate-400 italic">현재 / 예정된 교역 이벤트 없음</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {relevantEvents.map((ev) => (
                  <ScheduleCard key={ev.id} event={ev} now={now} />
                ))}
              </div>
            )}
          </div>

          {/* 풍근 조합식 (collapsible) */}
          <CollapsibleBox
            open={openCombo}
            onToggle={() => setOpenCombo((o) => !o)}
            icon={<Hammer size={12} />}
            title="풍근 조합식 (이번 주)"
          >
            {combo ? (
              <div className="space-y-1.5">
                <ComboRow level="쉬움" formula={combo['쉬움']} color="bg-emerald-100 text-emerald-700 border-emerald-200" />
                <ComboRow level="보통" formula={combo['보통']} color="bg-amber-100 text-amber-700 border-amber-200" />
                <ComboRow level="어려움" formula={combo['어려움']} color="bg-rose-100 text-rose-700 border-rose-200" />
              </div>
            ) : (
              <div className="text-[12px] text-slate-400 italic">조합식 데이터 없음</div>
            )}
            {comboMaterials.length > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-100">
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Package size={10} /> 재료 판매 항구
                </div>
                <div className="space-y-1.5">
                  {comboMaterials.map((m, idx) => (
                    <div key={idx} className="bg-indigo-50/40 border border-indigo-100 rounded-lg px-2.5 py-1.5">
                      <div className="text-[11px] font-extrabold text-indigo-900">[{m.name}]</div>
                      <div className="text-[11px] text-slate-600 mt-0.5 leading-relaxed flex flex-wrap gap-x-2 gap-y-0.5">
                        {m.locations!.map((port) => {
                          const seasonArr = seasonCalendar.portSeason[`${port}|${m.name}`];
                          const status = seasonArr?.[inGameMonth - 1];
                          const sym = status === '성' ? '▲' : status === '비' ? '▼' : '―';
                          const symCls =
                            status === '성'
                              ? 'text-emerald-600'
                              : status === '비'
                                ? 'text-rose-500'
                                : 'text-slate-300';
                          const symTitle =
                            status === '성'
                              ? `${port} ${inGameMonth}월 성수기`
                              : status === '비'
                                ? `${port} ${inGameMonth}월 비수기`
                                : `${port} ${inGameMonth}월 평수기`;
                          return (
                            <span key={port} className="inline-flex items-center gap-0.5 whitespace-nowrap" title={symTitle}>
                              <span className={`font-black ${symCls}`}>{sym}</span>
                              <span>{port}</span>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CollapsibleBox>

          {/* 교역품 시즌 (collapsible) */}
          <CollapsibleBox
            open={openSeason}
            onToggle={() => setOpenSeason((o) => !o)}
            icon={<Calendar size={12} />}
            title={`교역품 시즌 (현재 인게임 ${inGameMonth}월)`}
          >
            {seasonRows.length > 0 ? (
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-[11px]">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left font-bold px-2 py-1 text-slate-600 sticky left-0 bg-slate-50">품목</th>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                        <th
                          key={m}
                          className={`text-center font-bold px-1 py-1
                            ${m === inGameMonth ? 'text-emerald-600 bg-emerald-50' : 'text-slate-500'}`}
                        >
                          {m}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {seasonRows.map((row) => (
                      <tr key={row.name} className="bg-white">
                        <td className="px-2 py-1 font-bold text-slate-700 sticky left-0 bg-white">
                          <span className="flex items-center gap-1">
                            {row.cls === '명산품' && <span className="text-amber-500">★</span>}
                            {row.name}
                          </span>
                        </td>
                        {row.months.map((s, idx) => {
                          const isCurrent = idx + 1 === inGameMonth;
                          const sym = s === '성' ? '▲' : s === '비' ? '▼' : '―';
                          const cls =
                            s === '성'
                              ? 'text-emerald-600 font-black'
                              : s === '비'
                                ? 'text-rose-500 font-black'
                                : 'text-slate-300';
                          return (
                            <td
                              key={idx}
                              className={`text-center px-0.5 py-1 font-mono ${cls}
                                ${isCurrent ? 'bg-emerald-50' : ''}`}
                            >
                              {sym}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-[12px] text-slate-400 italic">시즌 데이터 없음</div>
            )}
          </CollapsibleBox>
        </div>
      </aside>
    </>
  );
}

function ScheduleCard({ event, now }: { event: TradeEvent; now: number }) {
  const endTime = event.endTime ?? event.startTime + 3600 * 1000;
  const isActive = now >= event.startTime && now < endTime;
  const kst = new Date(event.startTime + 9 * 3600 * 1000);
  const timeLabel = `${String(kst.getUTCHours()).padStart(2, '0')}:${String(kst.getUTCMinutes()).padStart(2, '0')}`;
  const dateLabel = `${kst.getUTCMonth() + 1}/${kst.getUTCDate()}`;

  let kindLabel = '';
  let kindColor = '';
  if (!event.isBoost) {
    kindLabel = '대유행';
    kindColor = 'bg-emerald-500 text-white border-emerald-700';
  } else if (getBoostType(event.type) === '급매') {
    kindLabel = '급매';
    kindColor = 'bg-orange-500 text-white border-orange-700';
  } else {
    kindLabel = '부양';
    kindColor = 'bg-violet-500 text-white border-violet-700';
  }

  const minutesUntilStart = Math.ceil((event.startTime - now) / 60000);
  const minutesUntilEnd = Math.ceil((endTime - now) / 60000);

  return (
    <div className={`border rounded-xl px-3 py-2 ${isActive ? 'bg-emerald-50/60 border-emerald-300' : 'bg-white border-slate-200'}`}>
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border ${kindColor}`}>
          {kindLabel}
        </span>
        <span className="text-[12px] font-black text-slate-800">{event.type}</span>
        <span className="ml-auto text-[11px] font-bold tabular-nums text-slate-500">
          {dateLabel} {timeLabel}
        </span>
      </div>
      <div className="mt-1 text-[11px] text-slate-500 flex items-center gap-1.5">
        {isActive ? (
          <span className="inline-flex items-center gap-1 text-emerald-700 font-black">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            진행 중 · {minutesUntilEnd > 0 ? `${minutesUntilEnd}분 남음` : '곧 종료'}
          </span>
        ) : (
          <span className="text-slate-500">
            {minutesUntilStart > 0 ? `${minutesUntilStart}분 후 시작` : '예정'}
          </span>
        )}
        <span className="text-slate-300">·</span>
        <span className="text-slate-500">{event.zone}</span>
      </div>
    </div>
  );
}

function CollapsibleBox({
  open,
  onToggle,
  icon,
  title,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
      >
        <span className="text-slate-500 shrink-0">
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
        <span className="text-slate-500 shrink-0">{icon}</span>
        <span className="text-[12px] font-black text-slate-700 flex-1 truncate">{title}</span>
      </button>
      {open && <div className="p-3">{children}</div>}
    </div>
  );
}

function ComboRow({ level, formula, color }: { level: string; formula?: string; color: string }) {
  if (!formula || formula.trim() === '') return null;
  return (
    <div className="flex bg-white border border-slate-100 rounded-lg overflow-hidden shadow-sm">
      <div className={`flex items-center justify-center px-3 py-2 font-black text-[12px] border-r w-16 shrink-0 ${color}`}>
        {level}
      </div>
      <div className="city-detail-formula px-3 py-2 text-[12px] font-medium text-slate-700 leading-relaxed flex items-center bg-white w-full">
        {formula}
      </div>
    </div>
  );
}
