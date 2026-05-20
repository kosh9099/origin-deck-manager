'use client';

import React from 'react';
import { ShoppingCart, Layers } from 'lucide-react';

interface Props {
  totals: Record<string, number>;
  intermediateTotals: Record<string, number>;
  prepared: Record<string, number>;
  preparedIntermediate: Record<string, number>;
  hasMissingRate: boolean;
}

function ShoppingItem({
  name,
  qty,
  prep,
  totalColor,
  doneBg,
}: {
  name: string;
  qty: number;
  prep: number;
  totalColor: string;
  doneBg: string;
}) {
  const done = qty > 0 && prep >= qty;
  return (
    <li
      className={`barter-shopping-item flex items-baseline justify-between rounded-lg px-3 py-1.5 border transition-opacity ${
        done ? `${doneBg} opacity-60` : 'bg-slate-50 border-slate-200'
      }`}
      title={prep > 0 ? `준비 ${prep} / 필요 ${qty}` : `필요 ${qty}`}
    >
      <span className={`text-sm font-bold text-slate-800 truncate mr-2 ${done ? 'line-through' : ''}`}>
        {name}
      </span>
      <span className="text-sm font-black tabular-nums shrink-0">
        {prep > 0 && (
          <>
            <span className="text-emerald-600">{prep}</span>
            <span className="text-slate-300"> / </span>
          </>
        )}
        <span className={totalColor}>{qty}</span>
      </span>
    </li>
  );
}

export default function BarterShoppingList({
  totals,
  intermediateTotals,
  prepared,
  preparedIntermediate,
  hasMissingRate,
}: Props) {
  const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  const intermediateEntries = Object.entries(intermediateTotals).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-3">
      <div className="barter-shopping-list bg-white rounded-2xl border-2 border-emerald-300 shadow-sm">
        <div className="barter-shopping-list-header px-4 py-3 border-b border-emerald-200 bg-emerald-50 rounded-t-2xl flex items-center gap-2">
          <ShoppingCart size={18} className="text-emerald-600" />
          <h3 className="font-black text-slate-800 text-sm">최종 교역품 쇼핑 리스트</h3>
          {hasMissingRate && (
            <span className="ml-auto text-[11px] font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-300">
              일부 비율 미입력
            </span>
          )}
        </div>
        <div className="p-4">
          {entries.length === 0 ? (
            <p className="text-sm text-slate-400 italic">장바구니에 품목을 추가하고 1회 교환 비율을 입력하세요.</p>
          ) : (
            <>
              <p className="text-[11px] text-slate-400 mb-2">
                카드의 재료 행을 체크하면 <span className="font-bold text-emerald-600">준비 수량</span>이 집계됩니다.
              </p>
              <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {entries.map(([name, qty]) => (
                  <ShoppingItem
                    key={name}
                    name={name}
                    qty={qty}
                    prep={prepared[name] ?? 0}
                    totalColor="text-emerald-700"
                    doneBg="bg-emerald-50 border-emerald-300"
                  />
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      {intermediateEntries.length > 0 && (
        <div className="barter-shopping-list bg-white rounded-2xl border-2 border-amber-300 shadow-sm">
          <div className="barter-shopping-list-header px-4 py-3 border-b border-amber-200 bg-amber-50 rounded-t-2xl flex items-center gap-2">
            <Layers size={18} className="text-amber-600" />
            <h3 className="font-black text-slate-800 text-sm">중간 물교품 (직접 물물교환으로 만드는 재료)</h3>
          </div>
          <div className="p-4">
            <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {intermediateEntries.map(([name, qty]) => (
                <ShoppingItem
                  key={name}
                  name={name}
                  qty={qty}
                  prep={preparedIntermediate[name] ?? 0}
                  totalColor="text-amber-700"
                  doneBg="bg-amber-50 border-amber-300"
                />
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
