'use client';

import React from 'react';
import { X, Package, Repeat, ClipboardCopy } from 'lucide-react';
import type { BarterRecipe, BarterRate, CartCard, CalcNode, CalcResult } from '@/types/barter';
import { rowKey } from '@/lib/barter/calculate';

interface Props {
  cards: CartCard[];
  results: CalcResult[];
  recipes: Map<string, BarterRecipe>;
  rates: Record<string, BarterRate>;
  intermediates: Set<string>;
  asLeaf: Set<string>;
  cardLabels: string[];
  onTicksChange: (id: string, ticks: number) => void;
  onRemove: (id: string) => void;
  onRateChange: (cardId: string, name: string, rate: BarterRate) => void;
  onToggleAsLeaf: (name: string) => void;
  onCopyRates: (targetCardId: string, sourceCardId: string) => void;
  onItemClick: (name: string) => void;
  checkedRows: Set<string>;
  onToggleChecked: (key: string) => void;
}

type FlatRow = {
  depth: number;
  name: string;
  isLeaf: boolean;
  needed: number;
  rateMissing: boolean;
  parentName: string;
};

function flattenChildren(parent: CalcNode, parentName: string, depth: number, out: FlatRow[]) {
  for (const c of parent.children) {
    out.push({
      depth,
      name: c.name,
      isLeaf: c.isLeaf,
      needed: c.needed,
      rateMissing: c.rateMissing,
      parentName,
    });
    if (!c.isLeaf && !c.rateMissing) {
      flattenChildren(c, c.name, depth + 1, out);
    }
  }
}

function NumInput({
  value,
  onChange,
  placeholder = '0',
  max,
  className = '',
}: {
  value: number;
  onChange: (n: number) => void;
  placeholder?: string;
  max?: number;
  className?: string;
}) {
  return (
    <input
      type="number"
      min={0}
      max={max}
      value={value > 0 ? value : ''}
      placeholder={placeholder}
      onChange={e => {
        const raw = e.target.value;
        const v = raw === '' ? 0 : Number(raw);
        if (Number.isNaN(v) || v < 0) return;
        if (max !== undefined && v > max) return;
        onChange(v);
      }}
      onFocus={e => e.target.select()}
      className={`px-1.5 py-1 text-[12px] font-bold tabular-nums text-center border border-slate-300 rounded-md bg-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200 transition-colors [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${className}`}
    />
  );
}

function TypeTag({
  isLeaf,
  toggleable,
  onToggle,
}: {
  isLeaf: boolean;
  toggleable: boolean;
  onToggle?: () => void;
}) {
  const baseClass =
    'inline-flex items-center gap-0.5 text-[9px] font-black px-1 py-0.5 rounded shrink-0 uppercase transition-colors';
  if (isLeaf) {
    const cls = toggleable
      ? `${baseClass} bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200 cursor-pointer`
      : `${baseClass} bg-amber-100 text-amber-800 border border-amber-300`;
    const Tag = toggleable ? 'button' : 'span';
    return (
      <Tag
        type={toggleable ? 'button' : undefined}
        className={cls}
        title={toggleable ? '클릭: 다시 물물교환으로 처리' : '교역품'}
        onClick={toggleable ? onToggle : undefined}
      >
        <Package size={9} />
        교역
      </Tag>
    );
  }
  // intermediate (always toggleable since it's in CSV recipes)
  return (
    <button
      type="button"
      className={`${baseClass} bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200 cursor-pointer`}
      title="클릭: 교역품으로 처리(분해 중단)"
      onClick={onToggle}
    >
      <Repeat size={9} />
      물교
    </button>
  );
}

// 3-column grid: 재료 | 1회량 | 필요량
// 단일 템플릿 사용 — 카드 폭이 좁아져도 (3-4열 가로 배치) 깔끔하게 표시
const GRID_TEMPLATE = 'minmax(0,1fr) 3rem 2.5rem';

export default function BarterCart({
  cards,
  results,
  recipes,
  rates,
  cardLabels,
  onTicksChange,
  onRemove,
  onRateChange,
  onToggleAsLeaf,
  onCopyRates,
  onItemClick,
  checkedRows,
  onToggleChecked,
}: Props) {
  if (cards.length === 0) {
    return (
      <div className="barter-empty-state bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center text-sm text-slate-500">
        장바구니가 비어있습니다. 검색창에서 물물교환 품목을 추가하세요.
      </div>
    );
  }

  const updateMatQty = (
    cardId: string,
    cardRates: Record<string, BarterRate>,
    parentName: string,
    matName: string,
    qty: number
  ) => {
    const cur = cardRates[parentName] ?? { outputQty: 0, materialQty: {} };
    onRateChange(cardId, parentName, {
      ...cur,
      materialQty: { ...cur.materialQty, [matName]: qty },
    });
  };

  const updateOutQty = (
    cardId: string,
    cardRates: Record<string, BarterRate>,
    name: string,
    qty: number
  ) => {
    const cur = cardRates[name] ?? { outputQty: 0, materialQty: {} };
    onRateChange(cardId, name, { ...cur, outputQty: qty });
  };

  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {cards.map((card, idx) => {
        const result = results[idx];
        // 카드별 rates 우선. 없으면 글로벌 rates fallback (이전 카드 호환).
        const cardRates = card.rates ?? rates;
        const cardRate = cardRates[card.name];
        const label = cardLabels[idx];
        const totalOutput = (cardRate?.outputQty ?? 0) * card.ticks;
        const rows: FlatRow[] = [];
        flattenChildren(result.tree, card.name, 0, rows);

        // 같은 품목의 직전 카드 — 수량 복사 소스
        let copySourceIdx = -1;
        for (let j = idx - 1; j >= 0; j--) {
          if (cards[j].name === card.name) {
            copySourceIdx = j;
            break;
          }
        }

        return (
          <div
            key={card.id}
            className="barter-cart-card bg-white border border-slate-200 hover:border-emerald-400 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col overflow-hidden"
          >
            {/* 카드 헤더 */}
            <div className="barter-cart-card-header px-4 py-3 border-b border-slate-200 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
              <div className="flex items-start gap-2">
                <button
                  type="button"
                  onClick={() => onItemClick(card.name)}
                  className="min-w-0 max-w-[calc(100%-2.25rem)] mr-auto font-black text-slate-800 text-base truncate text-left hover:text-emerald-600 hover:underline transition-colors"
                  title={`${label} — 판매 항구 보기`}
                >
                  {label}
                </button>
                <button
                  onClick={() => onRemove(card.id)}
                  className="p-1.5 -m-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                  aria-label="삭제"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="flex items-center gap-x-4 gap-y-1.5 mt-2 flex-wrap">
                <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600">
                  <span className="text-slate-500">교환</span>
                  <NumInput
                    value={card.ticks}
                    max={20}
                    onChange={n => onTicksChange(card.id, n)}
                    className="w-12"
                  />
                  <span className="text-slate-500">회</span>
                </label>
                <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600">
                  <span className="text-slate-500">1회 산출</span>
                  <NumInput
                    value={cardRate?.outputQty ?? 0}
                    onChange={n => updateOutQty(card.id, cardRates, card.name, n)}
                    className="w-20"
                  />
                </label>
                {totalOutput > 0 && (
                  <span className="barter-total-badge text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-300">
                    총 {totalOutput.toLocaleString()}개
                  </span>
                )}
              </div>
              {copySourceIdx >= 0 && (
                <button
                  type="button"
                  onClick={() => onCopyRates(card.id, cards[copySourceIdx].id)}
                  className="mt-2 inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700 transition-colors hover:bg-emerald-100 active:scale-95"
                  title={`${cardLabels[copySourceIdx]}의 수량(레시피 입력값)을 이 카드로 복사`}
                >
                  <ClipboardCopy size={11} />
                  {cardLabels[copySourceIdx]} 수량 복사
                </button>
              )}
            </div>

            {/* 본문 */}
            <div className="p-2">
              {/* 컬럼 헤더 */}
              <div
                className="grid items-center gap-x-1.5 px-1 sm:px-2 pb-2 border-b border-slate-200"
                style={{ gridTemplateColumns: GRID_TEMPLATE }}
              >
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">재료</div>
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider text-center">1회량</div>
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider text-right pr-1">필요량</div>
              </div>

              {rows.length === 0 ? (
                <div className="text-[12px] text-slate-400 italic px-2 py-3 text-center">
                  상단의 1회 산출량과 재료를 입력하면 자동 계산됩니다.
                </div>
              ) : (
                <div
                  className="grid items-center gap-x-1.5 gap-y-0.5 mt-1"
                  style={{ gridTemplateColumns: GRID_TEMPLATE }}
                >
                  {rows.map((row, i) => {
                    const matQty = cardRates[row.parentName]?.materialQty[row.name] ?? 0;
                    const ownRate = cardRates[row.name];
                    const isMissingChild = !row.isLeaf && row.rateMissing;
                    const indentPx = row.depth * 8;
                    const checkKey = rowKey(card.id, row.parentName, row.name);
                    const isChecked = checkedRows.has(checkKey);
                    const dimCls = isChecked ? 'opacity-40' : '';
                    return (
                      <React.Fragment key={`${row.name}-${i}`}>
                        <div className="barter-row flex items-center gap-1.5 min-w-0 py-1.5 px-1 rounded-md hover:bg-slate-50 transition-colors">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => onToggleChecked(checkKey)}
                            className="size-3.5 shrink-0 cursor-pointer accent-emerald-600"
                            title="구매/준비 완료 체크"
                          />
                          <div
                            className={`flex items-center gap-1 min-w-0 flex-1 transition-opacity ${dimCls}`}
                            style={{ paddingLeft: indentPx }}
                          >
                            {row.depth > 0 && (
                              <span className="barter-row-indent text-slate-300 text-[10px] font-mono shrink-0">└</span>
                            )}
                            <TypeTag
                              isLeaf={row.isLeaf}
                              toggleable={recipes.has(row.name)}
                              onToggle={() => onToggleAsLeaf(row.name)}
                            />
                            <button
                              type="button"
                              onClick={() => onItemClick(row.name)}
                              className={`font-bold text-[13px] truncate text-left hover:underline transition-colors ${
                                row.isLeaf ? 'text-amber-900 hover:text-amber-600' : 'text-emerald-900 hover:text-emerald-600'
                              } ${isChecked ? 'line-through' : ''}`}
                              title={`${row.name} — 판매 항구 보기`}
                            >
                              {row.name}
                            </button>
                            {!row.isLeaf && (
                              <span
                                className="inline-flex items-center shrink-0"
                                title={`${row.name} 1회 산출량`}
                              >
                                <NumInput
                                  value={ownRate?.outputQty ?? 0}
                                  onChange={n => updateOutQty(card.id, cardRates, row.name, n)}
                                  className="w-11 !border-emerald-300 !bg-emerald-50 !text-emerald-800 !px-1"
                                />
                              </span>
                            )}
                          </div>
                        </div>
                        <NumInput
                          value={matQty}
                          onChange={n => updateMatQty(card.id, cardRates, row.parentName, row.name, n)}
                          className={`w-12 transition-opacity ${dimCls}`}
                        />
                        <span
                          className={`text-[13px] tabular-nums font-black text-right px-0.5 transition-opacity ${dimCls} ${
                            isMissingChild
                              ? 'text-amber-500'
                              : row.isLeaf
                              ? 'text-amber-700'
                              : 'text-emerald-700'
                          }`}
                        >
                          {isMissingChild ? '?' : row.needed.toLocaleString()}
                        </span>
                      </React.Fragment>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
