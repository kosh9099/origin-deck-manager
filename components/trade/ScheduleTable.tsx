'use client';

import React from 'react';
import { TradeEvent, TradeItem } from '@/types/trade';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import ItemVotePanel from './ItemVotePanel';
import { APPLIED_PANDEMIC_ITEMS } from '@/lib/trade/cities';
import { getBoostType } from '@/constants/tradeData';
import { Trash2 } from 'lucide-react';
import { getGoldBonuses, isCurrentlyActive, BONUS_ITEMS } from './TradeDashboard';

// 💡 기후 판별 함수(getClimateStatus)는 내부 계산용으로만 남기고 UI용 import에서는 제거 가능합니다.
import { getInGameTimeInfo } from '@/lib/trade/time';
import BarterDetailModal from './BarterDetailModal';

interface Props {
  events: TradeEvent[];
  now: number;
  cityMap: Record<string, string[]>;
  onVoteOptimistic: (eventId: string, itemId: string, isUp: boolean) => void;
  onAddOptimistic: (eventId: string, item: TradeItem) => void;
  onDeleteBoost: (eventId: string) => Promise<void>;
  onDeleteItem: (eventId: string, itemId: string) => void;
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

export default function ScheduleTable({ events, now, cityMap, onVoteOptimistic, onAddOptimistic, onDeleteBoost, onDeleteItem }: Props) {
  const [selectedItem, setSelectedItem] = React.useState<string | null>(null);

  if (events.length === 0) {
    return (
      <div className="w-full bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="text-center py-16 text-slate-400 text-sm">표시할 스케줄이 없습니다.</div>
      </div>
    );
  }

  const inGameTime = getInGameTimeInfo(now);

  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      <table className="w-full border-collapse table-fixed">
        <colgroup><col style={{ width: '14%' }} /><col style={{ width: '20%' }} /><col style={{ width: '26%' }} /><col style={{ width: '40%' }} /></colgroup>
        <thead>
          <tr className="bg-slate-100 border-b border-slate-200">
            <th className="px-1.5 py-2.5 text-left text-[11px] font-black text-slate-500 uppercase tracking-widest">시간</th>
            <th className="px-1.5 py-2.5 text-left text-[11px] font-black text-slate-500 uppercase tracking-widest">해역 / 항구</th>
            <th className="px-1.5 py-2.5 text-left text-[11px] font-black text-slate-500 uppercase tracking-widest">이벤트</th>
            <th className="px-1.5 py-2.5 text-left text-[11px] font-black text-slate-500 uppercase tracking-widest">추천 품목</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {events.map(event => {
            const isBoost = event.isBoost;
            const boostType = isBoost ? getBoostType(event.type) : null;
            const tooltip = isBoost ? '유저 등록 스케줄'
              : (APPLIED_PANDEMIC_ITEMS[event.type] ? `고정 품목: ${APPLIED_PANDEMIC_ITEMS[event.type].join(', ')}` : undefined);

            let badgeCls = typeColors[event.type] || 'bg-slate-200 text-slate-800 border-slate-400';
            let indicatorCls = typeIndicators[event.type] || 'bg-slate-400';
            let rowColorCls = typeRowColors[event.type] || 'bg-emerald-100/80 hover:bg-emerald-200/80';
            let textColorCls = '';

            if (isBoost) {
              if (boostType === '급매') {
                badgeCls = 'bg-orange-100 text-orange-800 border-orange-300';
                indicatorCls = 'bg-orange-500';
                rowColorCls = 'bg-orange-100/80 hover:bg-orange-200/80';
                textColorCls = 'text-orange-600';
              } else {
                badgeCls = 'bg-violet-100 text-violet-800 border-violet-300';
                indicatorCls = 'bg-violet-500';
                rowColorCls = 'bg-violet-100/80 hover:bg-violet-200/80';
                textColorCls = 'text-violet-600';
              }
            }

            const isActive = isCurrentlyActive(event);
            const bonuses = getGoldBonuses(event, cityMap);
            const isGold = bonuses.length > 0;

            return (
              <tr
                key={event.id}
                className={`transition-colors ${rowColorCls} ${isGold ? 'gold-shimmer' : ''}`}
                style={isGold ? { borderWidth: 2, borderStyle: 'solid' } : undefined}
              >
                {/* 시간 */}
                <td className="px-1.5 py-2.5 relative align-middle">
                  <div className={`absolute left-0 top-3 bottom-3 w-[3px] rounded-full ${isGold ? 'bg-yellow-400' : indicatorCls}`} />
                  <div className="flex flex-col pl-1">
                    <span className="text-[9px] text-slate-400 font-semibold leading-tight whitespace-nowrap">
                      {format(event.startTime, 'M.d(EEE)', { locale: ko })}
                    </span>
                    <span className={`text-[14px] font-black tabular-nums leading-tight ${isActive ? 'text-emerald-600' : 'text-slate-800'}`}>
                      {format(event.startTime, 'HH')}시
                    </span>
                    {isActive && (
                      <span className="text-[9px] font-black text-emerald-500 leading-tight">진행 중</span>
                    )}
                  </div>
                </td>

                {/* 💡 해역/항구 (기후 배지 제거됨) */}
                <td className="px-1.5 py-2.5 align-middle">
                  <div className="flex flex-col gap-1">
                    <span className="text-[12px] font-bold text-slate-700 break-keep">
                      {isBoost ? (event.city || event.zone || '항구 미상') : event.zone}
                    </span>
                  </div>
                  {isBoost && <div className={`text-[10px] font-bold mt-0.5 ${textColorCls}`}>유저 등록</div>}
                </td>

                {/* 이벤트 */}
                <td className="px-1.5 py-2.5 align-middle">
                  <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${badgeCls}`} title={tooltip}>
                    {isBoost ? <>{event.type || '?'}<span className="opacity-60 text-[9px] ml-0.5">{boostType}</span></> : event.type}
                  </span>
                  {isBoost && (
                    <button onClick={() => onDeleteBoost(event.id)}
                      className="flex items-center gap-0.5 text-[9px] text-slate-400 hover:text-red-500 transition-colors mt-1">
                      <Trash2 size={9} /> 삭제
                    </button>
                  )}
                </td>

                {/* 추천 품목 */}
                <td className="px-1.5 py-2.5 align-top pt-3">
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
    </div>
  );
}