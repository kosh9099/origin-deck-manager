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
      {/* [변경] 텍스트 가시성 강화: 밝은 배경 박스 스타일 적용 */}
      <h3 className="text-[11px] font-black text-blue-100 uppercase mb-2 tracking-widest flex items-center gap-1.5 bg-blue-500/20 px-2 py-1.5 rounded border-l-2 border-blue-400">
        <UserPlus size={12} className="text-blue-300" /> 
        필수 항해사 등록
      </h3>
      
      <div className="relative group">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
        <input 
          ref={inputRef}
          type="text" 
          placeholder="이름 검색 (클릭 시 전체 목록)..." 
          className="w-full bg-slate-800 rounded-xl py-2.5 pl-9 pr-8 text-sm font-bold outline-none border border-white/5 focus:border-blue-500/50 focus:bg-slate-800/80 transition-all text-white placeholder:text-slate-600" 
          value={search} 
          onFocus={() => setIsOpen(true)}
          onClick={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          onChange={e => { setSearch(e.target.value); setIsOpen(true); }}
        />
        {search && (
          <button 
            onClick={() => { setSearch(''); inputRef.current?.focus(); }} 
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white bg-slate-700/50 rounded-full p-0.5"
          >
            <X size={12} strokeWidth={3} />
          </button>
        )}
      </div>
      
      {/* 검색 결과 리스트 */}
      {isOpen && (
        <div className="absolute w-full mt-2 bg-slate-900 border border-slate-700 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 z-[100]">
          {filtered.length > 0 ? (
            filtered.map((s, index) => (
              <div 
                key={s.id} 
                onMouseDown={(e) => { e.preventDefault(); onAdd(s.id); setSearch(''); }}
                className={`p-2.5 hover:bg-blue-600/20 flex justify-between items-center cursor-pointer border-b border-white/5 last:border-0 transition-colors 
                  ${index === 0 && search ? 'bg-blue-500/10 border-l-2 border-l-blue-500' : ''}`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-white">{s.이름}</span>
                  <span className="text-[10px] text-slate-500">{s.직업}</span>
                </div>
                <div className="flex items-center gap-2">
                  {index === 0 && search && <span className="text-[9px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/30 font-black">ENTER</span>}
                  <span className={`text-[9px] px-1.5 py-0.5 rounded border ${
                      s.타입 === '모험' ? 'border-blue-500/30 text-blue-400' : 
                      s.타입 === '전투' ? 'border-red-500/30 text-red-400' : 'border-emerald-500/30 text-emerald-400'
                    }`}>
                    {s.타입}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="p-4 text-center text-slate-500 text-xs font-bold">
              검색 결과 없음
            </div>
          )}
        </div>
      )}
    </div>
  );
}