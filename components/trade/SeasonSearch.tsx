'use client';

import React, { useMemo, useRef, useState } from 'react';
import { Search, CalendarDays } from 'lucide-react';
import seasonCalendar from '@/constants/seasonCalendar.json';
import { getInGameTimeInfo } from '@/lib/trade/time';

type SeasonStatus = '성' | '평' | '비';

type SeasonCalendar = {
  monthLabels: number[];
  seasonLabels: string[];
  markerLegend: Record<SeasonStatus, '▲' | '―' | '▼'>;
  cities: Record<string, { region: string | null; months: (string | null)[] }>;
  items: Record<string, { category: string | null; cities: string[] }>;
  itemClasses: Record<string, string>;
  portSeason: Record<string, string[]>;
};

const cal = seasonCalendar as SeasonCalendar;
const ALL_ITEM_NAMES = Object.keys(cal.items).sort();

const STATUS_STYLES: Record<SeasonStatus, { bg: string; text: string; marker: string; label: string }> = {
  '성': { bg: 'bg-emerald-100', text: 'text-emerald-700', marker: '▲', label: '성수기' },
  '평': { bg: 'bg-slate-100', text: 'text-slate-500', marker: '―', label: '평수기' },
  '비': { bg: 'bg-rose-100', text: 'text-rose-700', marker: '▼', label: '비수기' },
};

function getStatus(city: string, item: string, month: number): SeasonStatus {
  const months = cal.portSeason[`${city}|${item}`];
  if (!months) return '평';
  const v = months[month - 1];
  if (v === '성' || v === '비') return v;
  return '평';
}

export default function SeasonSearch() {
  const [query, setQuery] = useState('');
  const [item, setItem] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  // 인게임 현재월 (1~12)
  const currentMonth = useMemo(() => getInGameTimeInfo(Date.now()).month, []);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);

  const suggestions = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    return ALL_ITEM_NAMES.filter(n => n.includes(q)).slice(0, 12);
  }, [query]);

  const handleSelect = (name: string) => {
    setItem(name);
    setQuery(name);
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

  const meta = item ? cal.items[item] : null;
  const cities = meta ? [...meta.cities].sort((a, b) => a.localeCompare(b)) : [];
  const category = meta?.category;
  const itemClass = item ? cal.itemClasses[item] : undefined;

  // 선택 월 기준 도시 그룹핑
  const groupedByMonth = useMemo(() => {
    const groups: Record<SeasonStatus, string[]> = { '성': [], '평': [], '비': [] };
    if (!item) return groups;
    for (const c of cities) groups[getStatus(c, item, selectedMonth)].push(c);
    return groups;
  }, [item, cities, selectedMonth]);

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="mb-5">
        <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
          <CalendarDays size={22} className="text-emerald-500" /> 교역품 성수기 검색
        </h2>
        <p className="text-sm text-slate-500 mt-1 font-medium">
          교역품을 검색하면 도시별·월별 성수기(▲) / 평수기(―) / 비수기(▼) 정보를 보여줍니다.
        </p>
      </div>

      {/* 검색바 */}
      <div className="relative">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setItem(''); setShowSuggestions(true); setHighlightedIndex(-1); }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            onKeyDown={handleKeyDown}
            placeholder="교역품명 입력... (예: 목재, 후추, 설탕)"
            className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-3 text-sm text-slate-700 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 placeholder:text-slate-400"
          />
        </div>
        {showSuggestions && suggestions.length > 0 && (
          <ul className="absolute z-30 top-full mt-1 w-full bg-white border border-slate-200 rounded-xl overflow-hidden shadow-lg max-h-80 overflow-y-auto">
            {suggestions.map((n, idx) => (
              <li
                key={n}
                onMouseDown={() => handleSelect(n)}
                onMouseEnter={() => setHighlightedIndex(idx)}
                className={`px-4 py-2 text-sm cursor-pointer transition-colors border-b border-slate-100 last:border-0 flex items-center justify-between gap-2
                  ${idx === highlightedIndex ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                <span>{n}</span>
                {cal.items[n]?.category && (
                  <span className="text-[10px] text-slate-400 font-normal">{cal.items[n].category}</span>
                )}
              </li>
            ))}
          </ul>
        )}
        {showSuggestions && query.trim() && suggestions.length === 0 && (
          <div className="absolute z-30 top-full mt-1 w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-[12px] text-slate-400 shadow-sm">
            일치하는 교역품이 없습니다.
          </div>
        )}
      </div>

      {/* 결과 영역 */}
      {!item ? (
        <div className="mt-8 bg-white rounded-2xl border border-dashed border-slate-200 px-6 py-12 text-center">
          <CalendarDays size={36} className="text-slate-300 mx-auto mb-2" />
          <p className="text-[13px] font-bold text-slate-500">위에서 교역품을 검색하세요.</p>
          <p className="text-[11px] text-slate-400 mt-1">자동완성에서 선택하거나 Enter 키로 첫 결과 선택.</p>
        </div>
      ) : !meta || cities.length === 0 ? (
        <div className="mt-8 bg-white rounded-2xl border border-rose-200 px-6 py-8 text-center">
          <p className="text-[13px] font-bold text-rose-600">[{item}] 교역 정보가 없습니다.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {/* 품목 헤더 */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h3 className="font-extrabold text-slate-800 text-lg">{item}</h3>
              {category && <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">{category}</span>}
              {itemClass && <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">{itemClass}</span>}
              <span className="text-[11px] text-slate-400 ml-auto">{cities.length}개 도시</span>
            </div>
          </div>

          {/* 월 선택 */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
            <div className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-2">
              인게임 월 선택 (현재: {currentMonth}월)
            </div>
            <div className="flex flex-wrap gap-1">
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <button
                  key={m}
                  onClick={() => setSelectedMonth(m)}
                  className={`px-2.5 py-1 rounded-md text-[12px] font-bold transition-all border
                    ${m === selectedMonth
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : m === currentMonth
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                        : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                >
                  {m}월
                </button>
              ))}
            </div>
          </div>

          {/* 선택 월 기준 도시 그룹 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(['성', '평', '비'] as SeasonStatus[]).map(s => {
              const list = groupedByMonth[s];
              const style = STATUS_STYLES[s];
              return (
                <div key={s} className={`rounded-2xl border shadow-sm overflow-hidden ${list.length > 0 ? 'bg-white border-slate-200' : 'bg-slate-50/40 border-slate-200'}`}>
                  <div className={`px-4 py-2 ${style.bg} ${style.text} font-black text-[13px] flex items-center justify-between`}>
                    <span>{style.marker} {style.label}</span>
                    <span className="text-[11px] opacity-70">{list.length}개</span>
                  </div>
                  <div className="p-3 min-h-[44px]">
                    {list.length === 0 ? (
                      <span className="text-[11px] text-slate-300">없음</span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {list.map(c => (
                          <span key={c} className="text-[12px] font-bold px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700">
                            {c}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 전체 12개월 매트릭스 */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 font-black text-slate-700 text-[13px]">
              12개월 전체 보기
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="bg-white border-b border-slate-100 text-slate-500">
                    <th className="text-left font-bold px-3 py-2 sticky left-0 bg-white">도시</th>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                      <th key={m} className={`text-center font-bold px-1 py-2 ${m === selectedMonth ? 'bg-emerald-50 text-emerald-700' : ''}`}>
                        {m}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cities.map(city => (
                    <tr key={city} className="bg-white hover:bg-slate-50/40">
                      <td className="px-3 py-1.5 font-bold text-slate-700 sticky left-0 bg-white whitespace-nowrap">
                        {city}
                      </td>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(m => {
                        const status = getStatus(city, item, m);
                        const style = STATUS_STYLES[status];
                        return (
                          <td key={m} className={`text-center font-black px-1 py-1.5 ${style.text} ${m === selectedMonth ? 'bg-emerald-50/40' : ''}`}>
                            {style.marker}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
