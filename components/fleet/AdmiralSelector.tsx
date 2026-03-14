'use client';

import React, { useMemo, useRef, useEffect } from 'react';
import { Search, X, Crown } from 'lucide-react';
import { Sailor } from '@/types';

interface Props {
  search: string;
  setSearch: (v: string) => void;
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
  selectedId: number | null;
  onSelect: (id: number) => void;
  sailors: Sailor[];
}

export default function AdmiralSelector({
  search = "", setSearch, isOpen, setIsOpen, selectedId, onSelect, sailors = []
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setIsOpen]);

  const filtered = useMemo(() => {
    const q = (search || "").replace(/\s/g, "").toLowerCase();
    const typePriority: Record<string, number> = { '모험': 0, '전투': 1, '교역': 2 };
    return (Array.isArray(sailors) ? sailors : [])
      .filter(s => s?.등급 === 'S+')
      .filter(s => !q || (s.이름 || "").replace(/\s/g, "").toLowerCase().includes(q))
      .sort((a, b) => {
        const pA = typePriority[a.타입] ?? 9;
        const pB = typePriority[b.타입] ?? 9;
        return pA !== pB ? pA - pB : (a.이름 || "").localeCompare(b.이름 || "");
      });
  }, [sailors, search]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === 'Enter' && filtered.length > 0) {
      onSelect(filtered[0].id);
      setSearch(filtered[0].이름);
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div className="relative z-[50]" ref={containerRef}>
      {/* 헤더 */}
      <div className="bg-amber-500 px-4 py-2.5 rounded-t-xl border-b-2 border-amber-400 shadow-sm">
        <h2 className="text-[13px] font-black text-white uppercase tracking-widest flex items-center gap-2">
          <Crown size={16} strokeWidth={2.5} />
          선장 설정 (Admiral)
        </h2>
      </div>

      <div className="bg-slate-50 rounded-b-xl p-4 border border-slate-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onFocus={() => setIsOpen(true)}
            onChange={(e) => { setSearch(e.target.value); setIsOpen(true); }}
            onKeyDown={handleKeyDown}
            placeholder="제독 검색"
            className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-8 py-2.5 text-sm font-bold text-slate-700 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none transition-all placeholder:text-slate-400"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 bg-slate-100 rounded-full"
            >
              <X size={12} strokeWidth={3} />
            </button>
          )}

          {isOpen && (
            <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-[100] bg-white border border-slate-200 rounded-xl shadow-lg max-h-72 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200">
              {filtered.length > 0 ? (
                filtered.map((adm, index) => (
                  <div
                    key={adm.id || index}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      onSelect(adm.id);
                      setSearch(adm.이름);
                      setIsOpen(false);
                    }}
                    className={`px-4 py-2.5 cursor-pointer flex justify-between items-center border-b border-slate-100 last:border-0 transition-colors
                      ${index === 0 ? 'bg-amber-50 border-l-2 border-l-amber-400' : 'hover:bg-amber-50'}
                      ${selectedId === adm.id ? 'bg-amber-100' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                        <img
                          src={`/portraits/${adm.이름}.png`}
                          alt={adm.이름}
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      </div>
                      <div className="flex flex-col">
                        <span className={`text-sm font-bold
                          ${adm.타입 === '모험' ? 'text-blue-600' :
                            adm.타입 === '전투' ? 'text-red-600' : 'text-green-600'}`}>
                          {adm.이름}
                        </span>
                        <span className="text-[10px] text-slate-400">{adm.직업}</span>
                      </div>
                    </div>
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded border
                      ${adm.타입 === '모험' ? 'border-blue-200 text-blue-600 bg-blue-50' :
                        adm.타입 === '전투' ? 'border-red-200 text-red-600 bg-red-50' :
                          'border-green-200 text-green-600 bg-green-50'}`}>
                      {adm.타입}
                    </span>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-xs text-slate-400">
                  일치하는 제독이 없습니다.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}