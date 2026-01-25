'use client';

import React, { useMemo, useRef, useEffect } from 'react';
import { Search, X, Crown } from 'lucide-react'; // [수정] Crown 아이콘 추가
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

  // 1. 외부 클릭 시 리스트 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setIsOpen]);

  // 2. 필터링 및 정렬 (모험 > 전투 > 교역)
  const filtered = useMemo(() => {
    const safeSearch = search || "";
    const q = safeSearch.replace(/\s/g, "").toLowerCase();
    const typePriority: Record<string, number> = { '모험': 0, '전투': 1, '교역': 2 };

    if (!Array.isArray(sailors)) return [];

    return sailors
      .filter(s => s && s.등급 === 'S+') // S+ 등급만
      .filter(s => {
        const name = s.이름 || "";
        return !q || name.replace(/\s/g, "").toLowerCase().includes(q);
      })
      .sort((a, b) => {
        const pA = typePriority[a.타입] ?? 9;
        const pB = typePriority[b.타입] ?? 9;
        
        // 1순위: 타입 정렬
        if (pA !== pB) return pA - pB;
        // 2순위: 이름 정렬
        return (a.이름 || "").localeCompare(b.이름 || "");
      });
  }, [sailors, search]);

  // 3. 엔터 키 핸들러
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered.length > 0) {
        onSelect(filtered[0].id);
        setSearch(filtered[0].이름);
        setIsOpen(false);
        inputRef.current?.blur();
      }
    }
  };

  // 4. 이름 지우기 핸들러
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation(); // 클릭 이벤트 전파 방지
    setSearch('');
    // 필요 시 선택 해제 로직 추가: onSelect(null as any); 
    setIsOpen(true); // 리스트 다시 열기
    inputRef.current?.focus(); // 입력창 포커스 유지
  };

  return (
    <div className="relative z-[50]" ref={containerRef}>
      
      {/* [수정] 선장 설정 배너 (Blue -> Gold/Amber) */}
      <div className="bg-amber-500 px-4 py-2 rounded-t-xl border-b-2 border-amber-300 shadow-lg relative z-[52]">
        <h2 className="text-[13px] font-black text-amber-950 uppercase tracking-widest flex items-center gap-2">
          {/* [수정] 펄스 -> 왕관 아이콘 교체 */}
          <Crown size={16} strokeWidth={2.5} />
          선장 설정 (Admiral)
        </h2>
      </div>

      {/* 컨텐츠 영역 */}
      <div className="bg-slate-900/90 rounded-b-xl p-4 border border-white/5 backdrop-blur-md relative z-[51]">
        <div className="relative group">
          {/* 검색 아이콘 */}
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            <Search size={14} />
          </div>

          {/* 입력창 */}
          <input 
            ref={inputRef}
            type="text"
            value={search}
            onFocus={() => setIsOpen(true)}
            onChange={(e) => {
              setSearch(e.target.value);
              setIsOpen(true);
            }}
            onKeyDown={handleKeyDown}
            placeholder="제독 검색 (모험 > 전투 > 교역)"
            className="w-full bg-slate-800 border border-white/10 rounded-lg pl-9 pr-8 py-3 text-sm font-bold text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all placeholder:text-slate-500/80"
          />

          {/* X 버튼 (입력값이 있을 때만 표시) */}
          {search && (
            <button 
              onClick={handleClear}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white bg-slate-700/50 hover:bg-slate-600 rounded-full transition-colors z-10"
              title="입력 초기화"
            >
              <X size={12} strokeWidth={3} />
            </button>
          )}

          {/* 드롭다운 리스트 */}
          {isOpen && (
            <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-[100] bg-slate-900 border border-amber-500/40 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] max-h-72 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-slate-700">
              {filtered.length > 0 ? (
                filtered.map((adm, index) => (
                  <div 
                    key={adm.id}
                    onMouseDown={(e) => { 
                      e.preventDefault(); // 포커스 아웃 방지
                      onSelect(adm.id);
                      setSearch(adm.이름);
                      setIsOpen(false);
                    }}
                    className={`px-4 py-2.5 cursor-pointer flex justify-between items-center border-b border-white/5 last:border-0 transition-colors
                      ${index === 0 ? 'bg-amber-600/20 border-l-2 border-l-amber-500' : 'hover:bg-amber-600/10'}
                      ${selectedId === adm.id ? 'bg-amber-500/30' : ''}
                    `}
                  >
                    <div className="flex flex-col">
                      <span className={`text-sm font-bold ${
                        adm.타입 === '모험' ? 'text-blue-300' : 
                        adm.타입 === '전투' ? 'text-red-300' : 'text-emerald-300'
                      }`}>
                        {adm.이름}
                      </span>
                      <span className="text-[10px] text-slate-500">{adm.직업}</span>
                    </div>
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded border ${
                      adm.타입 === '모험' ? 'border-blue-500/30 text-blue-400 bg-blue-500/10' : 
                      adm.타입 === '전투' ? 'border-red-500/30 text-red-400 bg-red-500/10' : 
                      'border-emerald-500/30 text-emerald-400 bg-emerald-500/10'
                    }`}>
                      {adm.타입}
                    </span>
                  </div>
                ))
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