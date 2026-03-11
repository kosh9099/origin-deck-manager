'use client';

import React from 'react';
import { TradeEvent, TradeItem } from '@/types/trade';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
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

const typeColors: Record<string, string> = {
  '사치':   'bg-pink-500/15 text-pink-300 border-pink-500/30',
  '호황':   'bg-amber-400/15 text-amber-300 border-amber-400/30',
  '개발':   'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  '후원':   'bg-purple-500/15 text-purple-300 border-purple-500/30',
  '전쟁':   'bg-red-500/15 text-red-300 border-red-500/30',
  '홍수':   'bg-sky-500/15 text-sky-300 border-sky-500/30',
  '전염병': 'bg-stone-400/15 text-stone-300 border-stone-400/30',
  '축제':   'bg-yellow-400/15 text-yellow-200 border-yellow-400/30',
};

export default function ScheduleTable({ events, onVoteOptimistic, onAddOptimistic, onDeleteBoost, onDeleteItem }: Props) {
  if (events.length === 0) {
    return (
      <div className="w-full bg-slate-900/60 rounded-2xl border border-white/5 overflow-hidden">
        <div className="text-center py-16 text-slate-500 text-sm">표시할 스케줄이 없습니다.</div>
      </div>
    );
  }

  return (
    <div className="w-full bg-slate-900/60 rounded-2xl border border-white/5 overflow-hidden">
      {/* 헤더 */}
      <div className="grid grid-cols-[72px_1fr_130px_2fr] gap-0 bg-slate-800/90 border-b border-white/10 text-slate-400 text-[11px] font-bold tracking-widest uppercase px-1">
        <div className="px-3 py-3">시간</div>
        <div className="px-3 py-3">해역 / 항구</div>
        <div className="px-3 py-3">이벤트</div>
        <div className="px-3 py-3">추천 품목</div>
      </div>

      {/* 행 목록 */}
      <div className="divide-y divide-white/5">
        {events.map(event => {
          const isBoost = event.isBoost;
          const boostType = isBoost ? getBoostType(event.type) : null;
          const tooltip = isBoost
            ? '유저 등록 스케줄'
            : (APPLIED_PANDEMIC_ITEMS[event.type] ? `고정 품목: ${APPLIED_PANDEMIC_ITEMS[event.type].join(', ')}` : undefined);

          const badgeCls = isBoost
            ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/40'
            : (typeColors[event.type] || 'bg-slate-700/20 text-slate-300 border-slate-600/40');

          return (
            <div
              key={event.id}
              className={`grid grid-cols-[72px_1fr_130px_2fr] gap-0 px-1 transition-colors ${isBoost ? 'hover:bg-indigo-500/5' : 'hover:bg-white/[0.02]'}`}
            >
              {/* 시간 */}
              <div className="px-3 py-2 flex flex-col justify-center relative">
                <div className={`absolute left-0 top-2 bottom-2 w-[3px] rounded-full ${isBoost ? 'bg-indigo-500' : 'bg-slate-700/50'}`} />
                <span className="text-[10px] text-slate-500 font-semibold leading-tight">
                  {format(event.startTime, 'M.d(EEE)', { locale: ko })}
                </span>
                <span className="text-base font-black text-white tabular-nums leading-tight">
                  {format(event.startTime, 'HH')}시
                </span>
              </div>

              {/* 해역/항구 */}
              <div className="px-3 py-2 flex flex-col justify-center">
                <span className="text-sm font-bold text-slate-200 break-keep leading-snug">
                  {isBoost ? (event.city || event.zone || '항구 미상') : event.zone}
                </span>
                {isBoost && <span className="text-[10px] text-slate-500 mt-0.5">유저</span>}
              </div>

              {/* 이벤트 + 삭제 버튼 통합 */}
              <div className="px-3 py-2 flex flex-col gap-1 justify-center">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border whitespace-nowrap w-fit cursor-default ${badgeCls}`}
                  title={tooltip}
                >
                  {isBoost
                    ? <>{event.type || '?'} <span className="opacity-60 text-[10px]">{boostType}</span></>
                    : event.type}
                </span>
                {/* 삭제 버튼 (부양 이벤트에만 표시) */}
                {isBoost && (
                  <button
                    onClick={() => onDeleteBoost(event.id)}
                    title="이 스케줄 삭제"
                    className="inline-flex items-center gap-1 text-[10px] text-slate-500 hover:text-red-400 transition-colors w-fit px-1"
                  >
                    <Trash2 size={11} />
                    삭제
                  </button>
                )}
              </div>

              <div className="px-3 py-2">
                <ItemVotePanel
                  event={event}
                  onVoteOptimistic={(itemId, isUp) => onVoteOptimistic(event.id, itemId, isUp)}
                  onAddOptimistic={(item) => onAddOptimistic(event.id, item)}
                  onDeleteItem={(itemId) => onDeleteItem(event.id, itemId)}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
