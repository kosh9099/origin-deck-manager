'use client';

'use client';

import React, { useState, useMemo, useRef } from 'react';
import { insertBoost } from '@/lib/supabaseClient';
import { REGION_PORTS } from '@/lib/trade/cities';
import { BOOST_EVENT_TYPES } from '@/constants/tradeData';
import { Search } from 'lucide-react';

// 모든 항구를 검색하기 쉽도록 평탄화
const ALL_PORTS = Object.values(REGION_PORTS).flat();

const POP_TYPES = ["부양", "급매"];

export default function BoostForm() {
  const [portQuery, setPortQuery] = useState('');
  const [city, setCity] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = useMemo(() => {
    if (!portQuery.trim()) return [];
    return ALL_PORTS.filter(p => p.includes(portQuery.trim())).slice(0, 8);
  }, [portQuery]);

  const handleSelectPort = (port: string) => {
    setCity(port);
    setPortQuery(port);
    setShowSuggestions(false);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const idx = highlightedIndex >= 0 ? highlightedIndex : 0;
      if (suggestions[idx]) handleSelectPort(suggestions[idx]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setHighlightedIndex(-1);
    }
  };
  const [popType, setPopType] = useState<keyof typeof BOOST_EVENT_TYPES>('부양');
  const [category, setCategory] = useState(BOOST_EVENT_TYPES['부양'][0]);
  
  // 시작 시간 커스텀 (월, 일, 시)
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [day, setDay] = useState(now.getDate());
  const [hour, setHour] = useState(now.getHours());
  
  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');


  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = e.target.value as keyof typeof BOOST_EVENT_TYPES;
    setPopType(newType);
    setCategory(BOOST_EVENT_TYPES[newType]?.[0] || '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 선택한 시간 구성 (현재 연도 기준)
    const startDate = new Date(now.getFullYear(), month - 1, day, hour, 0, 0);

    // ✅ 과거 시간 방지: 현재 시간보다 이전이면 등록 불가
    if (startDate.getTime() < Date.now() - 60 * 60 * 1000) {
      alert(`⛔ 현재 시간보다 이전 시간은 등록할 수 없습니다.\n선택한 시간: ${month}월 ${day}일 ${hour}시`);
      return;
    }

    setIsLoading(true);
    setSuccessMsg('');
    
    try {
      if (!city) {
        alert('항구명을 입력해주세요.');
        return;
      }
      // 1. 이벤트 생성 (직접 port_name과 category 전달)
      await insertBoost(city, category, startDate.toISOString());

      // 기존처럼 초기 품목(item)을 넣지 않고, 빈 상태로 생성합니다.
      // (기획안 요구사항: 사용자가 직접 자유롭게 품목명을 추가)

      setSuccessMsg(`성공적으로 [${city}] ${category} 스케줄이 추가되었습니다!`);
    } catch (error) {
       console.error(error);
       alert("부양 등록 중 오류가 발생했습니다.");
    } finally {
       setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-slate-800/80 rounded-2xl border border-white/10 p-6 shadow-xl relative z-10 w-full hover:shadow-[0_0_30px_rgba(79,70,229,0.15)] transition-shadow duration-300">
      <div className="mb-6">
        <h2 className="text-xl font-black text-indigo-400">새 부양 스케줄 등록</h2>
        <p className="text-sm text-slate-400 mt-1">
          서버 시장님이 오픈한 부양 상황을 제보해주세요. 
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        
        {/* 항구 검색 */}
        <div className="space-y-1.5 relative">
          <label className="text-[13px] font-bold text-slate-300">항구 검색</label>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              ref={inputRef}
              type="text"
              value={portQuery}
              onChange={e => { setPortQuery(e.target.value); setCity(''); setShowSuggestions(true); setHighlightedIndex(-1); }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              onKeyDown={handleKeyDown}
              placeholder="항구명 입력... (예: 런던, 이스탄불)"
              className="w-full bg-slate-900/80 border border-white/10 rounded-xl pl-8 pr-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50 placeholder:text-slate-600"
            />
          </div>
          {/* 자동완성 드롭다운 */}
          {showSuggestions && suggestions.length > 0 && (
            <ul className="absolute z-30 top-full mt-1 w-full bg-slate-900 border border-white/10 rounded-xl overflow-hidden shadow-2xl">
              {suggestions.map((port, idx) => (
                <li
                  key={port}
                  onMouseDown={() => handleSelectPort(port)}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  className={`px-4 py-2 text-sm cursor-pointer transition-colors ${
                    idx === highlightedIndex
                      ? 'bg-indigo-500/30 text-white font-bold'
                      : 'text-slate-200 hover:bg-indigo-500/20 hover:text-white'
                  }`}
                >
                  {port}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 1차: 이벤트 종류 2차: 카테고리 선택 */}
        <div className="flex gap-3 w-full">
          <div className="space-y-1.5 flex-1">
            <label className="text-[13px] font-bold text-slate-300">이벤트 종류</label>
            <select 
              value={popType} 
              onChange={handleTypeChange}
              className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50"
            >
              {POP_TYPES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div className="space-y-1.5 flex-1">
            <label className="text-[13px] font-bold text-slate-300">카테고리</label>
            <select 
              value={category} 
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50"
            >
              {BOOST_EVENT_TYPES[popType]?.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* 시간 선택 (월, 일, 시 표기로 단순화) */}
        <div className="space-y-1.5">
          <label className="text-[13px] font-bold text-slate-300">시작 시간</label>
          <div className="flex gap-2">
            <select 
              value={month} 
              onChange={e => setMonth(Number(e.target.value))}
              className="flex-1 bg-slate-900/80 border border-white/10 rounded-xl px-2 py-2 text-sm text-white text-center focus:outline-none focus:border-indigo-500/50"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <option key={m} value={m}>{m}월</option>
              ))}
            </select>
            <select 
              value={day} 
              onChange={e => setDay(Number(e.target.value))}
              className="flex-1 bg-slate-900/80 border border-white/10 rounded-xl px-2 py-2 text-sm text-white text-center focus:outline-none focus:border-indigo-500/50"
            >
              {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                <option key={d} value={d}>{d}일</option>
              ))}
            </select>
            <select 
              value={hour} 
              onChange={e => setHour(Number(e.target.value))}
              className="flex-1 bg-slate-900/80 border border-white/10 rounded-xl px-2 py-2 text-sm text-white text-center focus:outline-none focus:border-indigo-500/50"
            >
              {Array.from({ length: 24 }, (_, i) => i).map(h => (
                <option key={h} value={h}>{h.toString().padStart(2, '0')}시</option>
              ))}
            </select>
          </div>
        </div>

        {/* 제출 버튼 */}
        <button 
          type="submit" 
          disabled={isLoading}
          className="w-full mt-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-colors shadow-[0_0_15px_rgba(79,70,229,0.3)] hover:shadow-[0_0_20px_rgba(79,70,229,0.5)] disabled:opacity-50 flex justify-center items-center"
        >
          {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : '스케줄 글로별 연동하기'}
        </button>

        {successMsg && (
          <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[13px] font-bold rounded-xl text-center animate-in fade-in zoom-in-95 duration-300 shadow-inner">
            {successMsg}
          </div>
        )}
      </form>
    </div>
  );
}
