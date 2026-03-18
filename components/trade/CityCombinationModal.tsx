import React from 'react';
import { X, MapPin } from 'lucide-react';
import combinationsData from '@/constants/combinations.json';
import itemLocationsData from '@/constants/itemLocations.json';

interface CityCombinationModalProps {
  cityName: string;
  onClose: () => void;
}

type CombinationBook = {
  쉬움?: string;
  보통?: string;
  어려움?: string;
};

// JSON data type casting
const combinations = combinationsData as Record<string, CombinationBook>;
const itemLocations = itemLocationsData as Record<string, string[]>;

export default function CityCombinationModal({ cityName, onClose }: CityCombinationModalProps) {
  const data = combinations[cityName];
  
  if (!data) return null;

  // 모든 조합식에서 품목 추출 및 중복 제거
  const allFormulas = [data['쉬움'], data['보통'], data['어려움']].filter(Boolean) as string[];
  const allParsedItems = new Set<string>();
  
  allFormulas.forEach(formula => {
    const rawItems = formula.split(/[\s+]+/); 
    rawItems.forEach(item => {
      const parsedItem = item.replace(/[0-9]+$/, '').trim();
      if (parsedItem) {
        allParsedItems.add(parsedItem);
      }
    });
  });

  const uniqueItems = Array.from(allParsedItems);
  const itemsWithLocations = uniqueItems.map(item => ({
    name: item,
    locations: itemLocations[item]
  })).filter(item => item.locations && item.locations.length > 0);

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4 duration-200 animate-in fade-in"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
          <h3 className="font-extrabold text-slate-800 flex items-center gap-2">
            <span className="text-[1.2rem] leading-none">⚓</span>
            {cityName} 조합식
          </h3>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-full transition-colors active:scale-95"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* 본문 (조합 정보) */}
        <div className="p-5 flex flex-col gap-3 relative">
           {/* 장식용 배경 */}
          <div className="absolute right-[-20px] top-[-20px] text-[120px] opacity-[0.03] pointer-events-none select-none">
            📜
          </div>

          <CombinationRow level="쉬움" formula={data['쉬움']} color="bg-emerald-100 text-emerald-700 border-emerald-200" />
          <CombinationRow level="보통" formula={data['보통']} color="bg-amber-100 text-amber-700 border-amber-200" />
          <CombinationRow level="어려움" formula={data['어려움']} color="bg-rose-100 text-rose-700 border-rose-200" />
          
          {/* 판매 항구 통합 목록 */}
          {itemsWithLocations.length > 0 && (
            <div className="mt-2 pt-4 border-t border-slate-100">
              <div className="text-[11px] font-bold text-slate-400 mb-2.5 flex items-center gap-1.5 px-1">
                <MapPin size={12} className="text-indigo-400" /> 조합 재료 판매 항구
              </div>
              <div className="flex flex-col gap-2.5 px-1 max-h-[14rem] overflow-y-auto custom-scrollbar pr-2">
                {itemsWithLocations.map((item, idx) => (
                  <div key={idx} className="flex flex-col gap-1 bg-indigo-50/30 rounded-lg p-2.5 border border-indigo-100/50">
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

        {/* 푸터 */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button 
            onClick={onClose}
            className="px-4 py-1.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 active:scale-95 transition-all shadow-sm"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

function CombinationRow({ level, formula, color }: { level: string; formula?: string; color: string }) {
  if (!formula || formula.trim() === '') return null;

  return (
    <div className="flex bg-white border border-slate-100 rounded-xl overflow-hidden shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] transition-all hover:shadow-md hover:border-slate-200">
      <div className={`flex items-center justify-center px-4 py-3 font-black text-sm border-r w-24 shrink-0 ${color}`}>
        {level}
      </div>
      <div className="px-4 py-3 text-[13px] font-medium text-slate-700 leading-relaxed flex items-center bg-gradient-to-r from-white to-slate-50 w-full">
        {formula}
      </div>
    </div>
  );
}
