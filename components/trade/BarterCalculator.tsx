'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import type { BarterRecipe, BarterRate, CartCard, CalcResult } from '@/types/barter';
import { loadRecipes } from '@/lib/barter/recipes';
import { loadRates, saveRate, bumpFreq, topFreq, loadAsLeaf, saveAsLeaf, loadTicks, saveTicks } from '@/lib/barter/storage';
import { calculateCard, mergeLeafTotals } from '@/lib/barter/calculate';
import BarterSearchBar from './BarterSearchBar';
import BarterCart from './BarterCart';
import BarterShoppingList from './BarterShoppingList';

const CIRCLED = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'];
const SOFT_LIMIT = 4;

function newId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export default function BarterCalculator() {
  const [recipes, setRecipes] = useState<Map<string, BarterRecipe> | null>(null);
  const [intermediates, setIntermediates] = useState<Set<string> | null>(null);
  const [cards, setCards] = useState<CartCard[]>([]);
  const [rates, setRates] = useState<Record<string, BarterRate>>({});
  const [asLeaf, setAsLeaf] = useState<Set<string>>(new Set());
  const [savedTicks, setSavedTicks] = useState<Record<string, number>>({});
  const [popular, setPopular] = useState<string[]>([]);
  const [overflowWarning, setOverflowWarning] = useState(false);

  // 초기 로드
  useEffect(() => {
    let alive = true;
    loadRecipes().then(({ recipes, intermediates }) => {
      if (!alive) return;
      setRecipes(recipes);
      setIntermediates(intermediates);
    });
    setRates(loadRates());
    setAsLeaf(loadAsLeaf());
    setSavedTicks(loadTicks());
    setPopular(topFreq(6));
    return () => {
      alive = false;
    };
  }, []);

  const cardLabels = useMemo(() => {
    const counts: Record<string, number> = {};
    const indices = cards.map(c => {
      counts[c.name] = (counts[c.name] ?? 0) + 1;
      return counts[c.name];
    });
    const totals: Record<string, number> = {};
    for (const c of cards) totals[c.name] = (totals[c.name] ?? 0) + 1;
    return cards.map((c, i) => (totals[c.name] > 1 ? `${c.name} ${CIRCLED[indices[i] - 1] ?? indices[i]}` : c.name));
  }, [cards]);

  const results: CalcResult[] = useMemo(() => {
    if (!recipes || !intermediates) return [];
    return cards.map(card => calculateCard(card, recipes, rates, intermediates, asLeaf));
  }, [cards, recipes, rates, intermediates, asLeaf]);

  const merged = useMemo(() => mergeLeafTotals(results), [results]);
  const hasMissingRate = results.some(r => r.hasMissingRate);

  const handleAdd = (name: string) => {
    if (cards.length >= SOFT_LIMIT) setOverflowWarning(true);
    const initialTicks = savedTicks[name] ?? 0;
    setCards(prev => [...prev, { id: newId(), name, ticks: initialTicks }]);
    bumpFreq(name);
    setPopular(topFreq(6));
  };

  const handleTicksChange = (id: string, ticks: number) => {
    const card = cards.find(c => c.id === id);
    setCards(prev => prev.map(c => (c.id === id ? { ...c, ticks } : c)));
    if (card) {
      setSavedTicks(prev => ({ ...prev, [card.name]: ticks }));
      saveTicks(card.name, ticks);
    }
  };

  const handleRemove = (id: string) => {
    setCards(prev => prev.filter(c => c.id !== id));
    if (cards.length - 1 < SOFT_LIMIT) setOverflowWarning(false);
  };

  const handleRateChange = (name: string, rate: BarterRate) => {
    setRates(prev => ({ ...prev, [name]: rate }));
    saveRate(name, rate);
  };

  const handleToggleAsLeaf = (name: string) => {
    setAsLeaf(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      saveAsLeaf(next);
      return next;
    });
  };

  if (!recipes || !intermediates) {
    return <div className="text-sm text-slate-400">물물교환 데이터 로딩 중...</div>;
  }

  return (
    <div className="space-y-4 w-full">
      <div>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">물물교환 계산기</h2>
        <p className="text-sm text-slate-500 mt-1 font-medium">
          최종 품목과 교환 횟수를 정하면 필요한 교역품 수량을 자동 계산합니다.
        </p>
      </div>

      <BarterSearchBar recipes={recipes} popular={popular} onAdd={handleAdd} />

      {overflowWarning && cards.length > SOFT_LIMIT && (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-300 rounded-lg text-[12px] text-amber-800">
          <AlertTriangle size={14} className="text-amber-600" />
          카드가 {cards.length}개입니다. 보통 2~4개로 충분해요.
        </div>
      )}

      <BarterCart
        cards={cards}
        results={results}
        recipes={recipes}
        rates={rates}
        intermediates={intermediates}
        asLeaf={asLeaf}
        cardLabels={cardLabels}
        onTicksChange={handleTicksChange}
        onRemove={handleRemove}
        onRateChange={handleRateChange}
        onToggleAsLeaf={handleToggleAsLeaf}
      />

      <BarterShoppingList totals={merged} hasMissingRate={hasMissingRate} />
    </div>
  );
}
