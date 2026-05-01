'use client';

import React from 'react';
import { TradeEvent, TradeItem } from '@/types/trade';
import { getBoostType } from '@/constants/tradeData';

interface Props {
  event: TradeEvent;
  onVoteOptimistic: (itemId: string, isUp: boolean) => void;
  onAddOptimistic: (item: TradeItem) => void;
  onDeleteItem?: (itemId: string) => void;
  onItemClick?: (itemName: string) => void;
}

const KRW = new Intl.NumberFormat('ko-KR');

// 만원 단위 숫자만 (suffix 없이): 235,672 → "23.6", 1,234,567 → "123"
function manNumber(n: number): string {
  if (n < 10000) return KRW.format(n);
  const man = n / 10000;
  return man >= 100 ? `${Math.round(man)}` : `${man.toFixed(1)}`;
}

// 두 가격 한꺼번에: "23.6~19.0만"
function priceRange(high: number, low: number): string {
  return `${manNumber(high)}~${manNumber(low)}만`;
}

function getRecChipClass(event: TradeEvent): string {
  if (!event.isBoost) {
    // 대유행 (해역 단위, 3개 추천)
    return 'bg-sky-50 text-sky-900 border-sky-300 hover:bg-sky-100';
  }
  if (getBoostType(event.type) === '급매') {
    return 'bg-orange-50 text-orange-900 border-orange-300 hover:bg-orange-100';
  }
  return 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100';
}

export default function ItemVotePanel({ event, onItemClick }: Props) {
  const hasItems = event.items.length > 0;
  const recs = event.seasonRecs ?? [];

  if (!hasItems && recs.length === 0) {
    return <span className="text-[11px] text-slate-400 italic">추천 품목 없음</span>;
  }

  const chipClass = getRecChipClass(event);

  return (
    <div className="flex flex-wrap items-center gap-1">
      {recs.map((rec, idx) => (
        <button
          key={`rec-${idx}-${rec.name}`}
          onClick={() => onItemClick?.(rec.name)}
          title={`최대 ${KRW.format(rec.high)} · 최소 ${KRW.format(rec.low)}`}
          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-bold border whitespace-nowrap transition-all active:scale-95 cursor-pointer ${chipClass}`}
        >
          <span>{rec.name}</span>
          <span className="text-[9px] font-medium tabular-nums opacity-80 tracking-tight">
            {priceRange(rec.high, rec.low)}
          </span>
        </button>
      ))}
      {event.items.map(item => (
        <button
          key={item.id}
          onClick={() => onItemClick?.(item.name)}
          className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-semibold border border-slate-200 whitespace-nowrap transition-all hover:bg-slate-200 hover:border-slate-300 active:scale-95 cursor-pointer"
        >
          {item.name}
        </button>
      ))}
    </div>
  );
}
