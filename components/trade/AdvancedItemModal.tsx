'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { getMaxPrices } from '@/lib/trade/seasonPrices';

interface Props {
  itemName: string;
  buyCondition?: string;
  buyPorts?: string[];
  sellPorts: string[];
  month: number;
  onClose: () => void;
}

type SeasonStatus = '▲' | '—' | '▼';

// 235,672 → "23", 1,234,567 → "123" (만 단위 정수 floor)
function manShort(n: number): string {
  if (n < 10000) return n.toLocaleString('ko-KR');
  return `${Math.floor(n / 10000)}`;
}

export default function AdvancedItemModal({ itemName, buyCondition, buyPorts, sellPorts, month, onClose }: Props) {
  const [buyCities, setBuyCities] = useState<string[]>([]);
  const [status, setStatus] = useState<SeasonStatus>('—');
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    fetch('/api/barter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemName, month }),
    })
      .then(res => res.json())
      .then(data => {
        if (data?.tree?.bestCities) setBuyCities(data.tree.bestCities);
        if (data?.tree?.status) setStatus(data.tree.status as SeasonStatus);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [itemName, month]);

  if (!mounted) return null;

  const statusLabel = status === '▲' ? '성수기' : status === '▼' ? '비수기' : '평수기';
  const statusClass = status === '▲'
    ? 'bg-red-50 text-red-600 border-red-200'
    : status === '▼'
      ? 'bg-blue-50 text-blue-600 border-blue-200'
      : 'bg-slate-50 text-slate-500 border-slate-200';

  const modal = (
    <div
      className="barter-calc fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="barter-detail-modal bg-white rounded-3xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="barter-detail-modal-header px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
          <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
            <span className="text-xl">⚜</span> [{itemName}] 상급 교역품 정보
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
            ✕
          </button>
        </div>

        <div className="barter-detail-modal-body px-6 py-4 overflow-y-auto bg-slate-50/30 flex-1 min-h-0">
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-3">
            <div className="flex items-baseline gap-3 flex-wrap">
              <span className="text-[12px] font-black text-slate-500 shrink-0 w-16">구매 조건</span>
              <span className="text-sm font-bold text-slate-800">
                {buyCondition || '없음'}
              </span>
            </div>

            <div className="border-t border-slate-100" />

            <div className="flex items-baseline gap-3 flex-wrap">
              <span className="text-[12px] font-black text-slate-500 shrink-0 w-16">구매항</span>
              <div className="flex flex-wrap gap-1.5 items-baseline flex-1">
                {buyPorts && buyPorts.length > 0 ? buyPorts.map(p => (
                  <span
                    key={p}
                    className="inline-flex items-center text-[11px] font-black px-2 py-0.5 rounded-md border border-amber-300 bg-amber-50 text-amber-800"
                  >
                    {p}
                  </span>
                )) : <span className="text-sm text-slate-400">—</span>}
              </div>
            </div>

            <div className="border-t border-slate-100" />

            <div className="flex items-baseline gap-3 flex-wrap">
              <span className="text-[12px] font-black text-slate-500 shrink-0 w-16">추천 매입</span>
              <div className="flex flex-wrap gap-1.5 items-baseline flex-1">
                <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${statusClass}`}>
                  {status} {statusLabel}
                </span>
                <span className="text-sm font-semibold text-slate-700 break-keep">
                  {loading ? '로딩 중...' : buyCities.length > 0 ? buyCities.join(', ') : '—'}
                </span>
              </div>
            </div>

            <div className="border-t border-slate-100" />

            <div className="flex items-baseline gap-3 flex-wrap">
              <span className="text-[12px] font-black text-slate-500 shrink-0 w-16">판매항</span>
              <div className="flex flex-col gap-1.5 flex-1 items-start">
                {sellPorts.length > 0 ? sellPorts.map(p => {
                  const prices = getMaxPrices(p, itemName);
                  return (
                    <span
                      key={p}
                      className="inline-flex items-center gap-1.5 text-[11px] font-black px-2 py-0.5 rounded-md border border-sky-300 bg-sky-50 text-sky-800"
                    >
                      <span>{p}</span>
                      {prices && (
                        <span className="text-[10px] font-bold text-sky-700/80">
                          <span className="text-rose-800">대 {manShort(prices.pandemicHigh)}만</span>
                          <span className="mx-1 text-slate-300">·</span>
                          <span className="text-emerald-800">부 {manShort(prices.boostHigh)}만</span>
                        </span>
                      )}
                    </span>
                  );
                }) : <span className="text-sm text-slate-400">—</span>}
              </div>
            </div>
          </div>
        </div>

        <div className="barter-detail-modal-footer p-3 bg-slate-50 border-t border-slate-100 flex justify-center gap-2 shrink-0">
          <button onClick={onClose} className="px-10 py-2 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-700 transition-all shadow-lg">
            확인
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
