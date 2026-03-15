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

export default function ScheduleTable({ events, onVoteOptimistic, onAddOptimistic, onDeleteBoost, onDeleteItem }: Props) {
  if (events.length === 0) {
    return (
      <div className="w-full bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="text-center py-16 text-slate-400 text-sm">표시할 스케줄이 없습니다.</div>
      </div>
    );
  }

  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm overflow-x-auto">
      <table className="w-full min-w-[480px] border-collapse table-fixed">
        <colgroup><col style={{ width: '72px' }} /><col style={{ width: '100px' }} /><col style={{ width: '120px' }} /><col style={{ minWidth: '120px' }} /></colgroup>

        <thead>
          <tr className="bg-slate-100 border-b border-slate-200">
            <th className="px-3 py-2.5 text-left text-[11px] font-black text-slate-500 uppercase tracking-widest">시간</th>
            <th className="px-3 py-2.5 text-left text-[11px] font-black text-slate-500 uppercase tracking-widest">해역 / 항구</th>
            <th className="px-3 py-2.5 text-left text-[11px] font-black text-slate-500 uppercase tracking-widest">이벤트</th>
            <th className="px-3 py-2.5 text-left text-[11px] font-black text-slate-500 uppercase tracking-widest">추천 품목</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100">
          {events.map(event => {
            const isBoost = event.isBoost;
            const boostType = isBoost ? getBoostType(event.type) : null;
            const tooltip = isBoost
              ? '유저 등록 스케줄'
              : (APPLIED_PANDEMIC_ITEMS[event.type] ? `고정 품목: ${APPLIED_PANDEMIC_ITEMS[event.type].join(', ')}` : undefined);

            const badgeCls = isBoost
              ? 'bg-indigo-100 text-indigo-700 border-indigo-200'
              : (typeColors[event.type] || 'bg-slate-100 text-slate-600 border-slate-200');

            const indicatorCls = isBoost
              ? 'bg-indigo-500'
              : (typeIndicators[event.type] || 'bg-slate-300');

            return (
              <tr
                key={event.id}
                className={`transition-colors ${isBoost ? 'bg-indigo-50/40 hover:bg-indigo-50' : 'hover:bg-slate-50'}`}
              >
                {/* 시간 */}
                <td className="px-3 py-2.5 relative align-middle">
                  <div className={`absolute left-0 top-3 bottom-3 w-[3px] rounded-full ${indicatorCls}`} />
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 font-semibold leading-tight whitespace-nowrap">
                      {format(event.startTime, 'M.d(EEE)', { locale: ko })}
                    </span>
                    <span className="text-[15px] font-black text-slate-800 tabular-nums leading-tight">
                      {format(event.startTime, 'HH')}시
                    </span>
                  </div>
                </td>

                {/* 해역/항구 */}
                <td className="px-3 py-2.5 align-middle">
                  <span className="text-sm font-bold text-slate-700 break-keep">
                    {isBoost ? (event.city || event.zone || '항구 미상') : event.zone}
                  </span>
                  {isBoost && (
                    <div className="text-[10px] text-indigo-500 font-bold mt-0.5">유저 등록</div>
                  )}
                </td>

                {/* 이벤트 */}
                <td className="px-3 py-2.5 align-middle">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border whitespace-nowrap ${badgeCls}`}
                    title={tooltip}
                  >
                    {isBoost
                      ? <>{event.type || '?'}<span className="opacity-60 text-[10px] ml-0.5">{boostType}</span></>
                      : event.type}
                  </span>
                  {isBoost && (
                    <button
                      onClick={() => onDeleteBoost(event.id)}
                      className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-red-500 transition-colors mt-1"
                    >
                      <Trash2 size={10} /> 삭제
                    </button>
                  )}
                </td>

                {/* 추천 품목 */}
                <td className="px-3 py-2.5 align-middle">
                  <ItemVotePanel
                    event={event}
                    onVoteOptimistic={(itemId, isUp) => onVoteOptimistic(event.id, itemId, isUp)}
                    onAddOptimistic={(item) => onAddOptimistic(event.id, item)}
                    onDeleteItem={(itemId) => onDeleteItem(event.id, itemId)}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}