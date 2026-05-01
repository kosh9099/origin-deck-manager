'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Sparkles } from 'lucide-react';
import type { BarterRecipe } from '@/types/barter';
import { matchesQuery } from '@/lib/barter/hangul';

interface Props {
  recipes: Map<string, BarterRecipe>;
  popular: string[];
  onAdd: (name: string) => void;
}

export default function BarterSearchBar({ recipes, popular, onAdd }: Props) {
  const [query, setQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const listRef = useRef<HTMLUListElement | null>(null);

  const allNames = useMemo(() => Array.from(recipes.keys()), [recipes]);

  const matches = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    return allNames.filter(n => matchesQuery(n, q)).slice(0, 8);
  }, [query, allNames]);

  useEffect(() => {
    setSelectedIdx(0);
  }, [query]);

  useEffect(() => {
    const el = listRef.current?.children[selectedIdx] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIdx]);

  const handleSelect = (name: string) => {
    onAdd(name);
    setQuery('');
    setSelectedIdx(0);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (matches.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx(i => Math.min(matches.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx(i => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleSelect(matches[selectedIdx]);
    } else if (e.key === 'Escape') {
      setQuery('');
    }
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="물물교환 품목 검색 (한글/초성, 예: 파이프, ㅍㅇㅍ)"
          className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-xl bg-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
        />
        {matches.length > 0 && (
          <ul
            ref={listRef}
            className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-20 max-h-64 overflow-y-auto"
          >
            {matches.map((name, idx) => {
              const recipe = recipes.get(name)!;
              const active = idx === selectedIdx;
              return (
                <li key={name}>
                  <button
                    onMouseEnter={() => setSelectedIdx(idx)}
                    onClick={() => handleSelect(name)}
                    className={`w-full text-left px-3 py-2 flex items-center justify-between gap-2 border-b border-slate-100 last:border-0 ${
                      active ? 'bg-emerald-100' : 'hover:bg-emerald-50'
                    }`}
                  >
                    <span className="text-sm font-bold text-slate-800">{name}</span>
                    <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{recipe.category}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {popular.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
            <Sparkles size={12} className="text-amber-500" />
            자주 쓰는 품목:
          </span>
          {popular.map(name => (
            <button
              key={name}
              onClick={() => handleSelect(name)}
              className="text-[11px] font-bold px-2 py-0.5 bg-amber-50 text-amber-900 border border-amber-300 rounded-md hover:bg-amber-100 active:scale-95"
            >
              {name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
