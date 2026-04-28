'use client';

import React from 'react';
import { TradeEvent, TradeItem } from '@/types/trade';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import ItemVotePanel from './ItemVotePanel';
import { APPLIED_PANDEMIC_ITEMS } from '@/lib/trade/cities';
import { getBoostType } from '@/constants/tradeData';
import CityCombinationModal from './CityCombinationModal';
import EditBoostModal from './EditBoostModal';
import BarterDetailModal from './BarterDetailModal';
import { hasCityCombination } from '@/lib/trade/combinationRotation';
import { getInGameTimeInfo } from '@/lib/trade/time';
import { isCurrentlyActive } from './TradeDashboard';

interface Props {
  events: TradeEvent[];
  now: number;
  onVoteOptimistic: (eventId: string, itemId: string, isUp: boolean) => void;
  onAddOptimistic: (eventId: string, item: TradeItem) => void;
  onDeleteBoost: (eventId: string) => Promise<void>;
  onDeleteItem: (eventId: string, itemId: string) => void;
  favorites: Set<string>;
  onToggleFavorite: (eventId: string) => void;
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

export default function ScheduleCards({
  events,
  now,
  onVoteOptimistic,
  onAddOptimistic,
  onDeleteItem,
  favorites,
  onToggleFavorite,
}: Props) {
  const [selectedCity, setSelectedCity] = React.useState<string | null>(null);
  const [selectedItem, setSelectedItem] = React.useState<string | null>(null);
  const [editingBoost, setEditingBoost] = React.useState<TradeEvent | null>(null);
  const inGameTime = getInGameTimeInfo(now);

  if (events.length === 0) {
    return (
      <div className="w-full text-center py-10 text-slate-400 bg-white rounded-xl border border-slate-200 shadow-sm">
        표시할 스케줄이 없습니다.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {events.map((event) => {
        const isBoost = event.isBoost;
        const boostType = isBoost ? getBoostType(event.type) : null;
        const isFav = favorites.has(event.id);

        let badgeCls = typeColors[event.type] || 'bg-slate-200 text-slate-800 border-slate-400';
        let indicatorCls = typeIndicators[event.type] || 'bg-slate-400';

        if (isBoost) {
          if (boostType === '급매') {
            badgeCls = 'bg-orange-100 text-orange-800 border-orange-300';
            indicatorCls = 'bg-orange-500';
          } else {
            badgeCls = 'bg-violet-100 text-violet-800 border-violet-300';
            indicatorCls = 'bg-violet-500';
          }
        }

        const cityName = isBoost ? (event.city || event.zone || '항구 미상') : event.zone;
        const hasCombo = hasCityCombination(cityName);
        const isActive = isCurrentlyActive(event);

        return (
          <div
            key={event.id}
            className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden relative"
          >
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${indicatorCls}`} />

            <div className="pl-3 pr-3 py-2.5">
              {/* 상단 행: [별표] [시간] [도시] [이벤트 배지] */}
              <div className="flex items-center gap-2 mb-2">
                {/* 즐겨찾기 별표 */}
                <button
                  onClick={() => onToggleFavorite(event.id)}
                  title={isFav ? '즐겨찾기 해제' : '즐겨찾기 추가'}
                  className={`text-[18px] leading-none shrink-0 active:scale-90 transition-all ${
                    isFav ? 'text-amber-500 drop-shadow-[0_0_2px_rgba(245,158,11,0.4)]' : 'text-slate-300'
                  }`}
                >
                  {isFav ? '★' : '☆'}
                </button>

                {/* 시간 (부양/급매는 클릭하면 편집 모달) */}
                {isBoost ? (
                  <button
                    onClick={() => setEditingBoost(event)}
                    title="클릭하여 수정 / 삭제"
                    className="flex flex-col items-start text-left rounded-md px-1 py-0.5 -mx-1 hover:bg-slate-100 active:scale-95 transition-all shrink-0"
                  >
                    <span className="text-[9px] text-slate-500 font-semibold leading-tight whitespace-nowrap">
                      {format(event.startTime, 'M.d(EEE)', { locale: ko })}
                    </span>
                    <span className={`text-[14px] font-black tabular-nums leading-tight ${isActive ? 'text-emerald-600' : 'text-slate-800'}`}>
                      {format(event.startTime, 'HH')}시
                    </span>
                    {isActive && (
                      <span className="text-[9px] font-black text-emerald-600 leading-tight mt-0.5">진행 중</span>
                    )}
                  </button>
                ) : (
                  <div className="flex flex-col shrink-0">
                    <span className="text-[9px] text-slate-500 font-semibold leading-tight whitespace-nowrap">
                      {format(event.startTime, 'M.d(EEE)', { locale: ko })}
                    </span>
                    <span className={`text-[14px] font-black tabular-nums leading-tight ${isActive ? 'text-emerald-600' : 'text-slate-800'}`}>
                      {format(event.startTime, 'HH')}시
                    </span>
                    {isActive && (
                      <span className="text-[9px] font-black text-emerald-600 leading-tight mt-0.5">진행 중</span>
                    )}
                  </div>
                )}

                {/* 도시명 */}
                <span className="text-[13px] font-bold text-slate-800 break-keep min-w-0 truncate">
                  {hasCombo ? (
                    <button
                      onClick={() => setSelectedCity(cityName)}
                      className="text-indigo-600 hover:text-indigo-800 hover:underline underline-offset-2 active:scale-95"
                      title={`${cityName} 조합식 보기`}
                    >
                      {cityName}
                    </button>
                  ) : (
                    cityName
                  )}
                </span>

                {/* 이벤트 배지 */}
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border whitespace-nowrap shrink-0 ${badgeCls}`}
                  title={
                    isBoost
                      ? '유저 등록 스케줄'
                      : APPLIED_PANDEMIC_ITEMS[event.type]
                        ? `고정 품목: ${APPLIED_PANDEMIC_ITEMS[event.type].join(', ')}`
                        : undefined
                  }
                >
                  {isBoost ? (
                    <>{event.type || '?'}<span className="opacity-60 text-[9px]">{boostType}</span></>
                  ) : (
                    event.type
                  )}
                </span>
              </div>

              {/* 하단: 추천 품목 칩 */}
              <div className="pl-7">
                <ItemVotePanel
                  event={event}
                  onVoteOptimistic={(itemId, isUp) => onVoteOptimistic(event.id, itemId, isUp)}
                  onAddOptimistic={(item) => onAddOptimistic(event.id, item)}
                  onDeleteItem={(itemId) => onDeleteItem(event.id, itemId)}
                  onItemClick={setSelectedItem}
                />
              </div>
            </div>
          </div>
        );
      })}

      {selectedCity && (
        <CityCombinationModal cityName={selectedCity} onClose={() => setSelectedCity(null)} />
      )}

      {selectedItem && (
        <BarterDetailModal
          itemName={selectedItem}
          month={inGameTime.month}
          onClose={() => setSelectedItem(null)}
        />
      )}

      {editingBoost && (
        <EditBoostModal boost={editingBoost} onClose={() => setEditingBoost(null)} />
      )}
    </div>
  );
}
