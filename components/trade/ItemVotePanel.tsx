'use client';

import React, { useMemo } from 'react';
import { TradeEvent, TradeItem } from '@/types/trade';
import { getBoostType } from '@/constants/tradeData';
import { SPECIAL_BARTER_ITEMS } from '@/lib/trade/seasonPrices';

interface Props {
  event: TradeEvent;
  onVoteOptimistic: (itemId: string, isUp: boolean) => void;
  onAddOptimistic: (item: TradeItem) => void;
  onDeleteItem?: (itemId: string) => void;
  onItemClick?: (itemName: string) => void;
  specialItems?: Set<string>;
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

export default function ItemVotePanel({ event, onItemClick, specialItems }: Props) {
  const hasItems = event.items.length > 0;
  const recs = event.seasonRecs ?? [];

  if (!hasItems && recs.length === 0) {
    return <span className="text-[11px] text-slate-400 italic">추천 품목 없음</span>;
  }

  const chipClass = getRecChipClass(event);
  const isRegisteredSpecial = (name: string) => specialItems?.has(name) ?? false;
  const isInactiveSpecial = (name: string) =>
    SPECIAL_BARTER_ITEMS.has(name) && !isRegisteredSpecial(name);

  // 비활성 특수 물교는 뒤로 보냄 (활성 추천을 시각적으로 1순위로 끌어올림)
  const orderedRecs = useMemo(() => {
    const actives = recs.filter(r => !isInactiveSpecial(r.name));
    const inactives = recs.filter(r => isInactiveSpecial(r.name));
    return [...actives, ...inactives];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recs, specialItems]);

  return (
    <div className="flex flex-wrap items-center gap-1">
      {orderedRecs.map((rec, idx) => {
        const sparkle = isRegisteredSpecial(rec.name);
        const inactive = isInactiveSpecial(rec.name);
        return (
          <button
            key={`rec-${idx}-${rec.name}`}
            onClick={() => onItemClick?.(rec.name)}
            title={
              inactive
                ? `특수 물교 (미등록) · 최대 ${KRW.format(rec.high)} · 최소 ${KRW.format(rec.low)}`
                : sparkle
                ? `★ 특수 물교 · 최대 ${KRW.format(rec.high)} · 최소 ${KRW.format(rec.low)}`
                : `최대 ${KRW.format(rec.high)} · 최소 ${KRW.format(rec.low)}`
            }
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-bold border whitespace-nowrap transition-all active:scale-95 cursor-pointer ${chipClass} ${
              sparkle ? 'animate-sparkle ring-1 ring-amber-400' : ''
            } ${inactive ? 'opacity-40 grayscale' : ''}`}
          >
            <span>{rec.name}</span>
            <span className="text-[9px] font-medium tabular-nums opacity-80 tracking-tight">
              {priceRange(rec.high, rec.low)}
            </span>
          </button>
        );
      })}
      {event.items.map(item => {
        const sparkle = isRegisteredSpecial(item.name);
        return (
          <button
            key={item.id}
            onClick={() => onItemClick?.(item.name)}
            title={sparkle ? '★ 특수 물교' : undefined}
            className={`inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-semibold border border-slate-200 whitespace-nowrap transition-all hover:bg-slate-200 hover:border-slate-300 active:scale-95 cursor-pointer ${
              sparkle ? 'animate-sparkle ring-1 ring-amber-400' : ''
            }`}
          >
            {item.name}
          </button>
        );
      })}
    </div>
  );
}
