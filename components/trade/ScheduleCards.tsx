'use client';

import React from 'react';
import { TradeEvent, TradeItem } from '@/types/trade';
import { format } from 'date-fns';
import ItemVotePanel from './ItemVotePanel';
import { APPLIED_PANDEMIC_ITEMS } from '@/lib/trade/cities';
import { getBoostType } from '@/constants/tradeData';
import { Trash2 } from 'lucide-react';

interface Props {
  events: TradeEvent[];
  onVoteOptimistic: (eventId: string, itemId: string, isUp: boolean) => void;
  onAddOptimistic: (eventId: string, item: TradeItem) => void;
  onDeleteBoost: (eventId: string) => Promise<void>;
  onDeleteItem: (eventId: string, itemId: string) => void;
}

// 타입별 뱃지 스타일 재사용 (간소화)
const typeColors: Record<string, string> = {
  '사치': 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  '호황': 'bg-amber-500/20 text-amber-400 border-amber-500/30 font-bold',
  '개발': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  '후원': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  '전쟁': 'bg-red-500/20 text-red-400 border-red-500/30 font-bold',
  '홍수': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  '전염병': 'bg-stone-500/20 text-stone-400 border-stone-500/30',
  '축제': 'bg-yellow-400/20 text-yellow-300 border-yellow-400/30 font-bold',
};

export default function ScheduleCards({ events, onVoteOptimistic, onAddOptimistic, onDeleteBoost, onDeleteItem }: Props) {
  if (events.length === 0) {
    return (
      <div className="w-full text-center py-10 text-slate-500 bg-slate-900/60 rounded-xl border border-white/5">
        표시할 스케줄이 없습니다.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {events.map((event) => {
        const badgeStyle = event.isBoost 
          ? 'bg-gradient-to-r from-blue-600/30 to-indigo-600/30 text-blue-300 border-indigo-500/40 shadow-[0_0_10px_rgba(79,70,229,0.2)] font-black italic' 
          : (typeColors[event.type] || 'bg-slate-700/50 text-slate-300 border-slate-600');

        return (
          <div key={event.id} className="bg-slate-900/80 rounded-xl border border-white/10 p-4 shadow-lg overflow-hidden relative group">
            
            {/* 상단: 시간 & 타입 뱃지 */}
            <div className="flex justify-between items-start mb-3 border-b border-white/5 pb-3">
              <div className="flex flex-col">
                <span className="text-xs text-slate-400 font-bold">{format(event.startTime, 'MM.dd(EEE)')}</span>
                <span className="text-xl font-black text-white tracking-tight">{format(event.startTime, 'HH')}시</span>
                
                {/* 상단 관리 버튼 (모바일) */}
                {event.isBoost && (
                  <button
                    onClick={() => onDeleteBoost(event.id)}
                    className="mt-1 flex items-center gap-1 text-[10px] text-slate-500 hover:text-red-400 w-max"
                  >
                    <Trash2 size={10} /> 삭제
                  </button>
                )}
              </div>
              
              <div className="flex flex-col items-end gap-1.5 max-w-[50%]">
                <div className="flex flex-col items-end gap-0.5">
                  <span 
                    className={`inline-block px-2.5 py-1 text-xs border rounded-full cursor-help whitespace-nowrap ${badgeStyle}`}
                    title={
                      event.isBoost
                        ? `유저가 등록한 스케줄`
                        : (!event.isBoost && APPLIED_PANDEMIC_ITEMS[event.type] ? `고정 적용 품목: ${APPLIED_PANDEMIC_ITEMS[event.type].join(', ')}` : undefined)
                    }
                  >
                    {event.isBoost
                      ? `${event.type || '?'} ${getBoostType(event.type)}`
                      : event.type}
                  </span>
                </div>

                <span className="font-black text-sm text-slate-200 bg-slate-800 px-2 py-0.5 rounded border border-white/10 flex flex-wrap items-center justify-end gap-1 max-w-full">
                  {event.isBoost ? (event.city || event.zone || '항구미상') : event.zone}
                </span>
              </div>
            </div>

            {/* 하단: 품목 리스트 및 투표 패널 */}
            <div className="pt-1">
               <span className="text-xs font-bold text-slate-500 uppercase tracking-widest inline-block mb-2">
                 추천 품목
               </span>
               <ItemVotePanel 
                  event={event} 
                  onVoteOptimistic={(itemId, isUp) => onVoteOptimistic(event.id, itemId, isUp)}
                  onAddOptimistic={(item) => onAddOptimistic(event.id, item)}
                  onDeleteItem={(itemId) => onDeleteItem(event.id, itemId)}
               />
            </div>

            {/* 강조 효과 막대 */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${event.isBoost ? 'bg-indigo-500' : 'bg-slate-700'}`} />
          </div>
        );
      })}
    </div>
  );
}
