'use client';

import React from 'react';
import { TradeEvent, TradeItem } from '@/types/trade';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import ItemVotePanel from './ItemVotePanel';
import { APPLIED_PANDEMIC_ITEMS } from '@/lib/trade/cities';
import { getBoostType } from '@/constants/tradeData';
import { getGoldBonuses, isCurrentlyActive, BONUS_ITEMS } from './TradeDashboard';

// 💡 기후 판별 함수(getClimateStatus)는 내부 계산용으로만 남기고 UI용 import에서는 제거 가능합니다.
import { getInGameTimeInfo } from '@/lib/trade/time';
import BarterDetailModal from './BarterDetailModal';
import CityCombinationModal from './CityCombinationModal';
import EditBoostModal from './EditBoostModal';
import { hasCityCombination } from '@/lib/trade/combinationRotation';
import { normalizeZoneName } from '@/lib/trade/sheetSync';
import { Map as MapIcon } from 'lucide-react';

function getTariffDiscount(startTime: number): { label: string; level: number } | null {
  const kst = new Date(startTime + 9 * 3600 * 1000);
  if (kst.getUTCDay() !== 1) return null;
  const h = kst.getUTCHours();
  if (h >= 18 && h <= 19) return { label: '관세10%', level: 1 };
  if (h >= 20 && h <= 21) return { label: '관세30%', level: 2 };
  if (h >= 22 && h <= 23) return { label: '면세', level: 3 };
  return null;
}

interface Props {
  events: TradeEvent[];
  now: number;
  cityMap: Record<string, string[]>;
  onVoteOptimistic: (eventId: string, itemId: string, isUp: boolean) => void;
  onAddOptimistic: (eventId: string, item: TradeItem) => void;
  onDeleteBoost: (eventId: string) => Promise<void>;
  onDeleteItem: (eventId: string, itemId: string) => void;
  favorites: Set<string>;
  onToggleFavorite: (eventId: string) => void;
  specialItems?: Map<string, string>;
  tierFxEnabled?: boolean;
  onMapJump?: (target: { city?: string; region?: string }) => void;
}

const typeColors: Record<string, string> = {
  '사치': 'bg-pink-100 text-pink-800 border-pink-300',
  '호황': 'bg-amber-100 text-amber-800 border-amber-300',
  '개발': 'bg-blue-100 text-blue-800 border-blue-300',
  '후원': 'bg-purple-100 text-purple-800 border-purple-300',
  '전쟁': 'bg-red-100 text-red-800 border-red-300',
  '홍수': 'bg-sky-100 text-sky-800 border-sky-300',
  '전염병': 'bg-slate-200 text-slate-800 border-slate-400',
  '축제': 'bg-green-100 text-green-800 border-green-300',
};

const typeIndicators: Record<string, string> = {
  '사치': 'bg-pink-500', '호황': 'bg-amber-500', '개발': 'bg-blue-500',
  '후원': 'bg-purple-500', '전쟁': 'bg-red-500', '홍수': 'bg-sky-500',
  '전염병': 'bg-slate-500', '축제': 'bg-green-500',
};

const typeRowColors: Record<string, string> = {
  '사치': 'bg-emerald-100/80 hover:bg-emerald-200/80',
  '호황': 'bg-emerald-100/80 hover:bg-emerald-200/80',
  '개발': 'bg-emerald-100/80 hover:bg-emerald-200/80',
  '후원': 'bg-emerald-100/80 hover:bg-emerald-200/80',
  '전쟁': 'bg-emerald-100/80 hover:bg-emerald-200/80',
  '홍수': 'bg-emerald-100/80 hover:bg-emerald-200/80',
  '전염병': 'bg-emerald-100/80 hover:bg-emerald-200/80',
  '축제': 'bg-emerald-100/80 hover:bg-emerald-200/80',
};

export default function ScheduleTable({ events, now, cityMap, onVoteOptimistic, onAddOptimistic, onDeleteItem, favorites, onToggleFavorite, specialItems, tierFxEnabled = true, onMapJump }: Props) {
  const [selectedItem, setSelectedItem] = React.useState<string | null>(null);
  const [selectedCity, setSelectedCity] = React.useState<string | null>(null);
  const [editingBoost, setEditingBoost] = React.useState<TradeEvent | null>(null);

  if (events.length === 0) {
    return (
      <div className="w-full bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="text-center py-16 text-slate-400 text-sm">표시할 스케줄이 없습니다.</div>
      </div>
    );
  }

  const inGameTime = getInGameTimeInfo(now);

  return (
    <div className="w-full rounded-lg border border-slate-200 bg-slate-50/60 p-1.5 shadow-sm">
      <table className="w-full table-fixed" style={{ borderCollapse: 'separate', borderSpacing: '0 4px' }}>
        <colgroup><col style={{ width: '13%' }} /><col style={{ width: '17%' }} /><col style={{ width: '15%' }} /><col style={{ width: '55%' }} /></colgroup>
        <thead>
          <tr>
            <th className="pl-4 pr-4 pb-2 text-left text-[11px] font-black text-slate-500 uppercase tracking-widest">시간</th>
            <th className="pl-3 pr-2 pb-2 text-left text-[11px] font-black text-slate-500 uppercase tracking-widest">위치</th>
            <th className="pl-2 pr-2 pb-2 text-left text-[11px] font-black text-slate-500 uppercase tracking-widest">이벤트</th>
            <th className="pl-3 pr-2 pb-2 text-left text-[11px] font-black text-slate-500 uppercase tracking-widest">추천 품목</th>
          </tr>
        </thead>
        <tbody>
          {events.map(event => {
            const isBoost = event.isBoost;
            const boostType = isBoost ? getBoostType(event.type) : null;
            const tooltip = isBoost ? '유저 등록 스케줄'
              : (APPLIED_PANDEMIC_ITEMS[event.type] ? `고정 품목: ${APPLIED_PANDEMIC_ITEMS[event.type].join(', ')}` : undefined);

            let badgeCls = typeColors[event.type] || 'bg-slate-200 text-slate-800 border-slate-400';
            let indicatorCls = typeIndicators[event.type] || 'bg-slate-400';
            let rowColorCls = typeRowColors[event.type] || 'bg-emerald-100/80 hover:bg-emerald-200/80';
            if (isBoost) {
              if (boostType === '급매') {
                badgeCls = 'bg-orange-100 text-orange-800 border-orange-300';
                indicatorCls = 'bg-orange-500';
                rowColorCls = 'bg-orange-100/80 hover:bg-orange-200/80';
              } else {
                badgeCls = 'bg-violet-100 text-violet-800 border-violet-300';
                indicatorCls = 'bg-violet-500';
                rowColorCls = 'bg-violet-100/80 hover:bg-violet-200/80';
              }
            }

            const isActive = isCurrentlyActive(event);
            const bonuses = getGoldBonuses(event, cityMap);
            const isGold = bonuses.length > 0;
            const tariff = getTariffDiscount(event.startTime);

            const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;
            const isAfter12Hours = event.isBoost && event.startTime > now + TWELVE_HOURS_MS;

            return (
              <tr
                key={event.id}
                className={`transition-colors ${rowColorCls} ${isGold ? 'gold-shimmer' : ''} ${tariff ? 'tariff-glow' : ''} shadow-sm hover:shadow-md`}
                style={{
                  ...(isGold ? { borderWidth: 2, borderStyle: 'solid' as const } : {}),
                  ...(tariff ? { borderWidth: 2, borderStyle: 'solid' as const, borderColor: '#fbbf24' } : {}),
                  ...(isAfter12Hours ? { opacity: 0.45 } : {}),
                }}
              >
                {/* 시간 (부양/급매는 클릭으로 편집 모달 열림) */}
                <td className="pl-4 pr-4 py-1 relative align-middle rounded-l-lg border-l border-y border-slate-200/60">
                  <div className={`absolute left-0 top-3 bottom-3 w-[3px] rounded-full ${isGold ? 'bg-yellow-400' : indicatorCls}`} />
                  <div className="flex items-center gap-1.5">
                    {/* 즐겨찾기 별표 */}
                    {(() => {
                      const isFav = favorites.has(event.id);
                      return (
                        <button
                          onClick={() => onToggleFavorite(event.id)}
                          title={isFav ? '즐겨찾기 해제' : '즐겨찾기 추가'}
                          className={`text-[15px] leading-none shrink-0 active:scale-90 transition-all ${
                            isFav ? 'text-amber-500 drop-shadow-[0_0_2px_rgba(245,158,11,0.4)]' : 'text-slate-300 hover:text-amber-400'
                          }`}
                        >
                          {isFav ? '★' : '☆'}
                        </button>
                      );
                    })()}
                    {/* 시간 정보 (부양/급매는 클릭하면 편집 모달) */}
                    {isBoost ? (
                      <button
                        onClick={() => setEditingBoost(event)}
                        className="flex flex-col items-start text-left rounded-md px-1 py-0.5 -mx-1 hover:bg-white/40 active:scale-95 transition-all cursor-pointer"
                        title="클릭하여 수정 / 삭제"
                      >
                        <span className="text-[10px] text-slate-500 font-semibold leading-tight whitespace-nowrap">
                          {format(event.startTime, 'M.d(EEE)', { locale: ko })}
                        </span>
                        <span className={`text-[16px] font-black tabular-nums leading-tight mt-0.5 ${isActive ? 'text-emerald-600' : 'text-slate-800'}`}>
                          {format(event.startTime, 'HH')}시
                        </span>
                        {isActive && (
                          <span className="text-[10px] font-black text-emerald-600 leading-tight mt-0.5">진행 중</span>
                        )}
                      </button>
                    ) : (
                      <div className="flex flex-col">
                        <span className="text-[10px] text-slate-500 font-semibold leading-tight whitespace-nowrap">
                          {format(event.startTime, 'M.d(EEE)', { locale: ko })}
                        </span>
                        <span className={`text-[16px] font-black tabular-nums leading-tight mt-0.5 ${isActive ? 'text-emerald-600' : 'text-slate-800'}`}>
                          {format(event.startTime, 'HH')}시
                        </span>
                        {isActive && (
                          <span className="text-[10px] font-black text-emerald-600 leading-tight mt-0.5">진행 중</span>
                        )}
                      </div>
                    )}
                  </div>
                </td>

                {/* 해역/항구 */}
                <td className="pl-3 pr-2 py-1 align-middle border-y border-slate-200/60">
                  <div className="flex items-center gap-1.5">
                    {onMapJump && (() => {
                      const target = isBoost
                        ? { city: event.city || event.zone }
                        : { region: normalizeZoneName(event.zone) };
                      return (
                        <button
                          onClick={() => onMapJump(target)}
                          title={isBoost ? '지도에서 해당 도시 보기' : '지도에서 해역 보기'}
                          className="inline-flex size-6 items-center justify-center rounded-md border border-indigo-200 bg-indigo-50 text-indigo-700 transition-colors hover:bg-indigo-100 active:scale-95 shrink-0"
                        >
                          <MapIcon size={12} />
                        </button>
                      );
                    })()}
                    <span className="text-[12px] font-bold text-slate-800 break-keep leading-tight whitespace-normal min-w-0">
                      {(() => {
                        const cityName = isBoost ? (event.city || event.zone || '항구 미상') : event.zone;
                        const hasCombination = hasCityCombination(cityName);

                        if (hasCombination) {
                          return (
                            <button
                              onClick={() => setSelectedCity(cityName)}
                              className="text-indigo-600 hover:text-indigo-800 hover:underline underline-offset-2 transition-colors text-left active:scale-95 break-keep"
                              title={`${cityName} 조합식 보기`}
                            >
                              {cityName}
                            </button>
                          );
                        }
                        return cityName;
                      })()}
                    </span>
                  </div>
                </td>

                {/* 이벤트 */}
                <td className="pl-2 pr-2 py-1 align-middle border-y border-slate-200/60">
                  <div className="flex min-w-0 flex-col items-start gap-1">
                    <span className={`inline-flex max-w-full items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-bold leading-4 whitespace-nowrap ${badgeCls}`} title={tooltip}>
                      {isBoost ? <>{event.type || '?'}<span className="opacity-60 text-[10px]">{boostType}</span></> : event.type}
                    </span>
                    {tariff && (
                      <span className={`inline-flex max-w-full items-center rounded-md border px-2 py-0.5 text-[10px] font-black leading-4 whitespace-nowrap ${
                        tariff.level === 3
                          ? 'bg-amber-400 text-amber-950 border-amber-500 animate-sparkle'
                          : tariff.level === 2
                          ? 'bg-amber-100 text-amber-800 border-amber-400'
                          : 'bg-yellow-50 text-yellow-800 border-yellow-300'
                      }`}>
                        {tariff.label}
                      </span>
                    )}
                  </div>
                </td>

                {/* 추천 품목 */}
                <td className="pl-3 pr-2 py-1 align-middle rounded-r-lg border-r border-y border-slate-200/60">
                  {bonuses.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-1.5">
                      {bonuses.map(b => (
                        <button
                          key={b}
                          onClick={() => setSelectedItem(b)}
                          className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-black border whitespace-nowrap transition-transform active:scale-95
                            ${isActive ? BONUS_ITEMS[b].color : `${BONUS_ITEMS[b].color} opacity-60`}`}>
                          {isActive ? '✦' : '◇'} {b} {BONUS_ITEMS[b].label}
                        </button>
                      ))}
                    </div>
                  )}
                  <ItemVotePanel
                    event={event}
                    onVoteOptimistic={(itemId, isUp) => onVoteOptimistic(event.id, itemId, isUp)}
                    onAddOptimistic={(item) => onAddOptimistic(event.id, item)}
                    onDeleteItem={(itemId) => onDeleteItem(event.id, itemId)}
                    onItemClick={setSelectedItem}
                    specialItems={specialItems}
                    tierFxEnabled={tierFxEnabled}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {selectedItem && (
        <BarterDetailModal
          itemName={selectedItem}
          month={inGameTime.month}
          onClose={() => setSelectedItem(null)}
        />
      )}

      {selectedCity && (
        <CityCombinationModal
          cityName={selectedCity}
          onClose={() => setSelectedCity(null)}
        />
      )}

      {editingBoost && (
        <EditBoostModal
          boost={editingBoost}
          onClose={() => setEditingBoost(null)}
        />
      )}
    </div>
  );
}
