'use client';

import React from 'react';
import { ShoppingCart } from 'lucide-react';

interface Props {
  totals: Record<string, number>;
  hasMissingRate: boolean;
}

export default function BarterShoppingList({ totals, hasMissingRate }: Props) {
  const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);

  return (
    <div className="bg-white rounded-2xl border-2 border-emerald-300 shadow-sm">
      <div className="px-4 py-3 border-b border-emerald-200 bg-emerald-50 rounded-t-2xl flex items-center gap-2">
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
          <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {entries.map(([name, qty]) => (
              <li key={name} className="flex items-baseline justify-between bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
                <span className="text-sm font-bold text-slate-800 truncate mr-2">{name}</span>
                <span className="text-sm font-black text-emerald-700 tabular-nums">{qty}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
