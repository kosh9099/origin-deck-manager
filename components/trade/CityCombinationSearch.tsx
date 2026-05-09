'use client';

import React, { useMemo, useRef, useState } from 'react';
import { Search, Compass, MapPin } from 'lucide-react';
import { REGION_PORTS } from '@/lib/trade/cities';
import { getCityCombination, hasCityCombination } from '@/lib/trade/combinationRotation';
import itemLocationsData from '@/constants/itemLocations.json';

const itemLocations = itemLocationsData as Record<string, string[]>;

const ALL_PORTS = Object.values(REGION_PORTS).flat();

export default function CityCombinationSearch() {
  const [query, setQuery] = useState('');
  const [city, setCity] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    return ALL_PORTS.filter(p => p.includes(q) && hasCityCombination(p)).slice(0, 10);
  }, [query]);

  const handleSelect = (port: string) => {
    setCity(port);
    setQuery(port);
    setShowSuggestions(false);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightedIndex(i => Math.min(i + 1, suggestions.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightedIndex(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      const idx = highlightedIndex >= 0 ? highlightedIndex : 0;
      if (suggestions[idx]) handleSelect(suggestions[idx]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false); setHighlightedIndex(-1);
    }
  };

  const data = city ? getCityCombination(city) : null;

  // 풍근 조합식에 등장하는 모든 재료의 판매 항구 정보
  const itemsWithLocations = useMemo(() => {
    if (!data) return [];
    const formulas = [data['쉬움'], data['보통'], data['어려움']].filter(Boolean) as string[];
    const items = new Set<string>();
    formulas.forEach(formula => {
      const parts = formula.split(/\s*\d+\s*\+?/);
      parts.forEach(part => {
        const t = part.trim();
        if (t) items.add(t);
      });
    });
    return Array.from(items)
      .map(name => ({ name, locations: itemLocations[name] }))
      .filter(it => it.locations && it.locations.length > 0);
  }, [data]);

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="mb-5">
        <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
          <Compass size={22} className="text-indigo-500" /> 도시별 풍근 조합식
        </h2>
        <p className="text-sm text-slate-500 mt-1 font-medium">
          항구를 검색하면 해당 도시의 쉬움 / 보통 / 어려움 조합식과 재료 판매 항구를 보여줍니다.
        </p>
      </div>

      <div className="relative">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setCity(''); setShowSuggestions(true); setHighlightedIndex(-1); }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            onKeyDown={handleKeyDown}
            placeholder="항구명 입력... (예: 런던, 이스탄불)"
            className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-3 text-sm text-slate-700 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 placeholder:text-slate-400"
          />
        </div>
        {showSuggestions && suggestions.length > 0 && (
          <ul className="absolute z-30 top-full mt-1 w-full bg-white border border-slate-200 rounded-xl overflow-hidden shadow-lg">
            {suggestions.map((port, idx) => (
              <li
                key={port}
                onMouseDown={() => handleSelect(port)}
                onMouseEnter={() => setHighlightedIndex(idx)}
                className={`px-4 py-2 text-sm cursor-pointer transition-colors border-b border-slate-100 last:border-0
                  ${idx === highlightedIndex ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                {port}
              </li>
            ))}
          </ul>
        )}
        {showSuggestions && query.trim() && suggestions.length === 0 && (
          <div className="absolute z-30 top-full mt-1 w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-[12px] text-slate-400 shadow-sm">
            일치하는 항구가 없습니다.
          </div>
        )}
      </div>

      {/* 결과 영역 */}
      {!city ? (
        <div className="mt-8 bg-white rounded-2xl border border-dashed border-slate-200 px-6 py-12 text-center">
          <Compass size={36} className="text-slate-300 mx-auto mb-2" />
          <p className="text-[13px] font-bold text-slate-500">위에서 항구명을 검색하세요.</p>
          <p className="text-[11px] text-slate-400 mt-1">자동완성에서 선택하거나 Enter 키로 첫 결과 선택.</p>
        </div>
      ) : !data ? (
        <div className="mt-8 bg-white rounded-2xl border border-rose-200 px-6 py-8 text-center">
          <p className="text-[13px] font-bold text-rose-600">[{city}] 조합식 데이터가 없습니다.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[1.2rem] leading-none">⚓</span>
              <h3 className="font-extrabold text-slate-800">{city} 조합식</h3>
            </div>
            <div className="space-y-2.5">
              <CombinationRow level="쉬움" formula={data['쉬움']} color="bg-emerald-100 text-emerald-700 border-emerald-200" />
              <CombinationRow level="보통" formula={data['보통']} color="bg-amber-100 text-amber-700 border-amber-200" />
              <CombinationRow level="어려움" formula={data['어려움']} color="bg-rose-100 text-rose-700 border-rose-200" />
            </div>
          </div>

          {itemsWithLocations.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <div className="text-[12px] font-black text-slate-500 mb-3 flex items-center gap-1.5">
                <MapPin size={13} className="text-indigo-400" /> 조합 재료 판매 항구
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {itemsWithLocations.map((item, idx) => (
                  <div key={idx} className="flex flex-col gap-1 bg-indigo-50/30 rounded-lg p-3 border border-indigo-100/50">
                    <span className="text-[12px] font-extrabold text-indigo-900">[{item.name}]</span>
                    <span className="text-[11.5px] font-medium text-slate-600 leading-relaxed">
                      {item.locations.join(', ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CombinationRow({ level, formula, color }: { level: string; formula?: string; color: string }) {
  if (!formula || formula.trim() === '') return null;
  return (
    <div className="flex bg-white border border-slate-100 rounded-xl overflow-hidden shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)]">
      <div className={`flex items-center justify-center px-4 py-3 font-black text-sm border-r w-24 shrink-0 ${color}`}>
        {level}
      </div>
      <div className="px-4 py-3 text-[13px] font-medium text-slate-700 leading-relaxed flex items-center bg-gradient-to-r from-white to-slate-50 w-full">
        {formula}
      </div>
    </div>
  );
}
