'use client';

import React, { useRef, useEffect } from 'react';
import { Search, X, UserPlus } from 'lucide-react';
import { Sailor } from '@/types';

interface Props {
  search: string;
  setSearch: (v: string) => void;
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
  filtered: Sailor[];
  onAdd: (id: number) => void;
}

export default function CrewSearch({ search, setSearch, isOpen, setIsOpen, filtered, onAdd }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered.length > 0) {
        onAdd(filtered[0].id);
        setSearch('');
      }
    }
    if (e.key === 'Escape') setIsOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setIsOpen]);

  return (
    <div className="relative mb-3 z-50" ref={containerRef}>
      <h3 className="text-[11px] font-black text-indigo-700 uppercase mb-2 tracking-widest flex items-center gap-1.5 bg-indigo-50 px-2 py-1.5 rounded border-l-2 border-indigo-400">
        <UserPlus size={12} className="text-indigo-500" />
        필수 항해사 등록
      </h3>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
        <input
          ref={inputRef}
          type="text"
          placeholder="이름 검색 (클릭 시 전체 목록)..."
          className="w-full bg-white rounded-xl py-2.5 pl-9 pr-8 text-sm font-bold outline-none border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all text-slate-700 placeholder:text-slate-400"
          value={search}
          onFocus={() => setIsOpen(true)}
          onClick={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          onChange={e => { setSearch(e.target.value); setIsOpen(true); }}
        />
        {search && (
          <button
            onClick={() => { setSearch(''); inputRef.current?.focus(); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 bg-slate-100 rounded-full p-0.5"
          >
            <X size={12} strokeWidth={3} />
          </button>
        )}
      </div>

      {/* 검색 결과 */}
      {isOpen && (
        <div className="absolute w-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 z-[100]">
          {filtered.length > 0 ? (
            filtered.map((s, index) => (
              <div
                key={s.id}
                onMouseDown={(e) => { e.preventDefault(); onAdd(s.id); setSearch(''); }}
                className={`p-2.5 hover:bg-indigo-50 flex justify-between items-center cursor-pointer border-b border-slate-100 last:border-0 transition-colors
                  ${index === 0 && search ? 'bg-indigo-50 border-l-2 border-l-indigo-400' : ''}`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-slate-700">{s.이름}</span>
                  <span className="text-[10px] text-slate-400">{s.직업}</span>
                </div>
                <div className="flex items-center gap-2">
                  {index === 0 && search && (
                    <span className="text-[9px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded border border-indigo-200 font-black">ENTER</span>
                  )}
                  <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold
                    ${s.타입 === '모험' ? 'border-blue-200 text-blue-600 bg-blue-50' :
                      s.타입 === '전투' ? 'border-red-200 text-red-600 bg-red-50' :
                        'border-green-200 text-green-600 bg-green-50'}`}>
                    {s.타입}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="p-4 text-center text-slate-400 text-xs font-bold">
              검색 결과 없음
            </div>
          )}
        </div>
      )}
    </div>
  );
}