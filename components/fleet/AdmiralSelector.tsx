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
  search = "", 
  setSearch, 
  isOpen, 
  setIsOpen, 
  selectedId, 
  onSelect, 
  sailors = [] 
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
    const safeSearch = search || "";
    const q = safeSearch.replace(/\s/g, "").toLowerCase();
    const typePriority: Record<string, number> = { '모험': 0, '전투': 1, '교역': 2 };

    if (!Array.isArray(sailors)) return [];

    return sailors
      .filter(s => s && s.등급 === 'S+')
      .filter(s => {
        const name = s.이름 || "";
        return !q || name.replace(/\s/g, "").toLowerCase().includes(q);
      })
      .sort((a, b) => {
        const pA = typePriority[a.타입] ?? 9;
        const pB = typePriority[b.타입] ?? 9;
        if (pA !== pB) return pA - pB;
        return (a.이름 || "").localeCompare(b.이름 || "");
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
      <div className="bg-amber-500 px-4 py-2 rounded-t-xl border-b-2 border-amber-300 shadow-lg relative z-[52]">
        <h2 className="text-[13px] font-black text-amber-950 uppercase tracking-widest flex items-center gap-2">
          <Crown size={16} strokeWidth={2.5} />
          선장 설정 (Admiral)
        </h2>
      </div>

      <div className="bg-slate-900/90 rounded-b-xl p-4 border border-white/5 backdrop-blur-md relative z-[51]">
        <div className="relative group">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            <Search size={14} />
          </div>

          <input 
            ref={inputRef}
            type="text"
            value={search}
            onFocus={() => setIsOpen(true)}
            onChange={(e) => { setSearch(e.target.value); setIsOpen(true); }}
            onKeyDown={handleKeyDown}
            placeholder="제독 검색"
            className="w-full bg-slate-800 border border-white/10 rounded-lg pl-9 pr-8 py-3 text-sm font-bold text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all"
          />

          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white bg-slate-700/50 rounded-full transition-colors z-10">
              <X size={12} strokeWidth={3} />
            </button>
          )}

          {isOpen && (
            <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-[100] bg-slate-900 border border-amber-500/40 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] max-h-72 overflow-y-auto overflow-x-hidden scrollbar-thin">
              {filtered.length > 0 ? (
                filtered.map((adm, index) => {
                  // [핵심] 초상화 경로 생성: /portraits/제독이름.png
                  const portraitPath = `/portraits/${adm.이름}.png`;

                  return (
                    <div 
                      key={adm.id}
                      onMouseDown={(e) => { 
                        e.preventDefault();
                        onSelect(adm.id);
                        setSearch(adm.이름);
                        setIsOpen(false);
                      }}
                      className={`px-4 py-2.5 cursor-pointer flex justify-between items-center border-b border-white/5 last:border-0 transition-colors
                        ${index === 0 ? 'bg-amber-600/20 border-l-2 border-l-amber-500' : 'hover:bg-amber-600/10'}
                        ${selectedId === adm.id ? 'bg-amber-500/30' : ''}
                      `}
                    >
                      <div className="flex items-center gap-3">
                        {/* 초상화 이미지 */}
                        <div className="w-10 h-10 rounded-full bg-slate-800 border border-white/10 overflow-hidden flex items-center justify-center">
                          <img
                            src={portraitPath}
                            alt={adm.이름}
                            className="w-full h-full object-cover"
                            // 이미지 로드 실패 시 왕관 아이콘으로 대체
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z'%3E%3C/path%3E%3C/svg%3E";
                            }}
                          />
                        </div>
                        
                        <div className="flex flex-col">
                          <span className={`text-sm font-bold ${
                            adm.타입 === '모험' ? 'text-blue-300' : 
                            adm.타입 === '전투' ? 'text-red-300' : 'text-emerald-300'
                          }`}>
                            {adm.이름}
                          </span>
                          <span className="text-[10px] text-slate-500">{adm.직업}</span>
                        </div>
                      </div>

                      <span className={`text-[9px] font-black px-2 py-0.5 rounded border ${
                        adm.타입 === '모험' ? 'border-blue-500/30 text-blue-400 bg-blue-500/10' : 
                        adm.타입 === '전투' ? 'border-red-500/30 text-red-400 bg-red-500/10' : 
                        'border-emerald-500/30 text-emerald-400 bg-emerald-500/10'
                      }`}>
                        {adm.타입}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="p-4 text-center text-xs text-slate-500 italic">
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