'use client';

import React from 'react';
import { Sailor } from '@/types';
import { RANK_COLORS, TYPE_COLORS } from '@/lib/optimizer/rules';
import { Ban, Crown } from 'lucide-react';

interface Props {
  sailor: Sailor | null;
  label: string;
  isCaptain?: boolean;
  onClick?: () => void;
}

export default function SailorCard({ sailor, label, isCaptain, onClick }: Props) {
  // 1. 빈 슬롯 디자인 (높이 124px로 축소)
  if (!sailor) {
    return (
      <div className={`h-[124px] w-full rounded-xl bg-slate-800/40 border border-dashed border-slate-700 flex flex-col items-center justify-center gap-1 ${isCaptain ? 'border-amber-500/50 bg-amber-900/10' : ''}`}>
        {isCaptain && <Crown size={14} className="text-amber-500 mb-0.5" />}
        <span className={`text-[10px] font-bold uppercase tracking-wider text-center leading-tight ${isCaptain ? 'text-amber-500' : 'text-slate-600'}`}>
          {label}<br/>Empty
        </span>
      </div>
    );
  }

  const borderColor = isCaptain ? '#FBBF24' : (TYPE_COLORS[sailor.타입] || '#475569');
  const nameColor = RANK_COLORS[sailor.등급] || '#E2E8F0';

  return (
    <div 
      onClick={onClick}
      // [수정] 높이 145px -> 124px / 패딩 p-2 -> p-1.5 / gap 최소화
      className={`relative group flex flex-col items-center justify-center gap-0.5 p-1.5 rounded-xl bg-slate-900/90 border-[2px] transition-all hover:scale-[1.02] hover:shadow-lg hover:bg-slate-800 h-[124px] w-full
        ${onClick ? 'cursor-pointer' : ''} ${isCaptain ? 'shadow-[0_0_15px_rgba(251,191,36,0.15)]' : ''}`}
      style={{ borderColor: borderColor }}
      title={onClick ? "클릭하여 덱에서 제외 및 금지(BAN)" : ""}
    >
      {/* 호버 시 BAN 오버레이 */}
      {onClick && (
        <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 rounded-xl backdrop-blur-[1px]">
          <div className="bg-red-600 text-white text-[10px] font-black px-3 py-1.5 rounded-full flex items-center gap-1 shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
            <Ban size={14} strokeWidth={3} /> BAN
          </div>
        </div>
      )}

      {/* [상단] 초상화 영역 (마진 완전 제거) */}
      <div className="relative">
        {isCaptain && (
          <div className="absolute -top-3 -right-2 z-10 bg-amber-500 text-amber-950 p-1 rounded-full shadow-lg border border-amber-300 transform rotate-12">
            <Crown size={10} strokeWidth={3} />
          </div>
        )}
        
        {/* 초상화 크기 유지 (w-14) */}
        <div className={`w-14 h-14 rounded-full overflow-hidden border-2 bg-slate-800 shadow-md ${isCaptain ? 'border-amber-400' : 'border-slate-600'}`}>
          <img 
            src={`/portraits/${sailor.이름}.png`} 
            alt={sailor.이름}
            onError={e => e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(sailor.이름)}&background=1e293b&color=fff&size=128&font-size=0.4`}
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* [하단] 정보 영역 */}
      <div className="flex flex-col items-center w-full">
        {/* 이름: 높이 고정으로 레이아웃 흔들림 방지 */}
        <div className="h-[26px] flex items-center justify-center w-full px-0.5 mt-0.5">
          <span 
            className="text-[12px] font-black leading-[1.1] tracking-tight shadow-black drop-shadow-md text-center break-keep whitespace-normal line-clamp-2"
            style={{ color: nameColor }}
          >
            {sailor.이름}
          </span>
        </div>
        
        {/* 직업 및 등급 */}
        <div className="flex items-center gap-1 mt-0.5">
          <span className="text-[10px] font-bold text-slate-400 truncate max-w-[60px]">
            {sailor.직업}
          </span>
           <span 
             className="text-[9px] font-black px-1.5 rounded bg-slate-950/80 border border-white/10" 
             style={{ color: nameColor }}
           >
            {sailor.등급}
          </span>
        </div>
      </div>
    </div>
  );
}