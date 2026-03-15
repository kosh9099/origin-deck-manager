'use client';

import React from 'react';
import { TradeEvent, TradeItem } from '@/types/trade';

interface Props {
  event: TradeEvent;
  onVoteOptimistic: (itemId: string, isUp: boolean) => void;
  onAddOptimistic: (item: TradeItem) => void;
  onDeleteItem?: (itemId: string) => void;
}

export default function ItemVotePanel({ event }: Props) {
  if (event.items.length === 0) {
    return (
      <span className="text-[11px] text-slate-400 italic">추천 품목 없음</span>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      {event.items.map(item => (
        <span
          key={item.id}
          className="inline-flex items-center px-2 py-0.5 rounded-full
            bg-slate-100 text-slate-700 text-[11px] font-semibold
            border border-slate-200 whitespace-nowrap"
        >
          {item.name}
        </span>
      ))}
    </div>
  );
}