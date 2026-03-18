'use client';

import React from 'react';
import { TradeEvent, TradeItem } from '@/types/trade';
import { format } from 'date-fns';
import ItemVotePanel from './ItemVotePanel';
import { APPLIED_PANDEMIC_ITEMS } from '@/lib/trade/cities';
import { getBoostType } from '@/constants/tradeData';
import { Trash2 } from 'lucide-react';
import CityCombinationModal from './CityCombinationModal';
import combinationsData from '@/constants/combinations.json';

interface Props {
  events: TradeEvent[];
  onVoteOptimistic: (eventId: string, itemId: string, isUp: boolean) => void;
  onAddOptimistic: (eventId: string, item: TradeItem) => void;
  onDeleteBoost: (eventId: string) => Promise<void>;
  onDeleteItem: (eventId: string, itemId: string) => void;
}

const typeColors: Record<string, string> = {
  '사치': 'bg-pink-100 text-pink-700 border-pink-200',
  '호황': 'bg-amber-100 text-amber-700 border-amber-200',
  '개발': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  '후원': 'bg-purple-100 text-purple-700 border-purple-200',
  '전쟁': 'bg-red-100 text-red-700 border-red-200',
  '홍수': 'bg-sky-100 text-sky-700 border-sky-200',
  '전염병': 'bg-stone-100 text-stone-700 border-stone-200',
  '축제': 'bg-yellow-100 text-yellow-700 border-yellow-200',
};

const typeIndicators: Record<string, string> = {
  '사치': 'bg-pink-400', '호황': 'bg-amber-400', '개발': 'bg-emerald-500',
  '후원': 'bg-purple-400', '전쟁': 'bg-red-500', '홍수': 'bg-sky-400',
  '전염병': 'bg-stone-400', '축제': 'bg-yellow-400',
};

export default function ScheduleCards({ events, onVoteOptimistic, onAddOptimistic, onDeleteBoost, onDeleteItem }: Props) {
  const [selectedCity, setSelectedCity] = React.useState<string | null>(null);

  if (events.length === 0) {
    return (
      <div className="w-full text-center py-10 text-slate-400 bg-white rounded-xl border border-slate-200 shadow-sm">
        표시할 스케줄이 없습니다.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {events.map((event) => {
        const isBoost = event.isBoost;
        const badgeStyle = isBoost
          ? 'bg-indigo-100 text-indigo-700 border-indigo-200 font-black'
          : (typeColors[event.type] || 'bg-slate-100 text-slate-600 border-slate-200');
        const indicatorCls = isBoost
          ? 'bg-indigo-500'
          : (typeIndicators[event.type] || 'bg-slate-300');

        return (
          <div
            key={event.id}
            className={`bg-white rounded-xl border shadow-sm overflow-hidden relative
              ${isBoost ? 'border-indigo-200' : 'border-slate-200'}`}
          >
            {/* 왼쪽 컬러 인디케이터 */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${indicatorCls}`} />

            <div className="pl-4 pr-4 py-3">
              {/* 상단: 시간 + 배지 + 위치 */}
              <div className="flex justify-between items-start mb-3 pb-3 border-b border-slate-100">
                {/* 왼쪽: 시간 + 삭제 */}
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400 font-bold">
                    {format(event.startTime, 'MM.dd(EEE)')}
                  </span>
                  <span className="text-xl font-black text-slate-800 tracking-tight">
                    {format(event.startTime, 'HH')}시
                  </span>
                  {isBoost && (
                    <button
                      onClick={() => onDeleteBoost(event.id)}
                      className="mt-1 flex items-center gap-1 text-[10px] text-slate-400 hover:text-red-500 transition-colors w-max"
                    >
                      <Trash2 size={10} /> 삭제
                    </button>
                  )}
                </div>

                {/* 오른쪽: 배지 + 위치 */}
                <div className="flex flex-col items-end gap-1.5 max-w-[55%]">
                  <span
                    className={`inline-block px-2.5 py-0.5 text-xs border rounded-full whitespace-nowrap font-bold ${badgeStyle}`}
                    title={isBoost ? '유저가 등록한 스케줄' : (APPLIED_PANDEMIC_ITEMS[event.type] ? `고정 적용 품목: ${APPLIED_PANDEMIC_ITEMS[event.type].join(', ')}` : undefined)}
                  >
                    {isBoost ? `${event.type || '?'} ${getBoostType(event.type)}` : event.type}
                  </span>
                  <span className="font-bold text-sm text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-right break-keep">
                    {(() => {
                      const cityName = isBoost ? (event.city || event.zone || '항구미상') : event.zone;
                      const hasCombination = cityName in combinationsData;
                      
                      if (hasCombination) {
                        return (
                          <button 
                            onClick={() => setSelectedCity(cityName)}
                            className="text-indigo-600 hover:text-indigo-800 hover:underline underline-offset-2 transition-colors inline-flex items-center gap-1 active:scale-95"
                            title={`${cityName} 조합식 보기`}
                          >
                            {cityName}
                          </button>
                        );
                      }
                      return cityName;
                    })()}
                  </span>
                  {isBoost && (
                    <span className="text-[9px] text-indigo-500 font-bold">유저 등록</span>
                  )}
                </div>
              </div>

              {/* 하단: 추천 품목 */}
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest inline-block mb-2">
                  추천 품목
                </span>
                <ItemVotePanel
                  event={event}
                  onVoteOptimistic={(itemId, isUp) => onVoteOptimistic(event.id, itemId, isUp)}
                  onAddOptimistic={(item) => onAddOptimistic(event.id, item)}
                  onDeleteItem={(itemId) => onDeleteItem(event.id, itemId)}
                />
              </div>
            </div>
          </div>
        );
      })}

      {selectedCity && (
        <CityCombinationModal
          cityName={selectedCity}
          onClose={() => setSelectedCity(null)}
        />
      )}
    </div>
  );
}