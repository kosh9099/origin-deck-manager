'use client';

import React from 'react';
import { MAX_SKILL_LEVELS } from '@/lib/optimizer/rules';
import { Target, Trophy } from 'lucide-react';

interface Props {
  title: string;
  skills: string[];
  totals: Record<string, number>;
  targets: Record<string, number>;
}

export default function SkillCategoryCard({ title, skills, totals, targets }: Props) {
  return (
    <div className="bg-slate-900 border border-white/10 rounded-xl overflow-hidden shadow-sm flex flex-col h-full">
      
      {/* [수정] 카테고리 헤더: 베이지 테마 적용 */}
      <div className="bg-[#E5D0AC] px-3 py-2 border-b border-[#C8B28E] flex justify-between items-center">
        <span className="text-xs font-black text-[#5D4037] uppercase tracking-widest flex items-center gap-1.5">
          <Trophy size={12} strokeWidth={2.5} className="text-[#5D4037]" />
          {title}
        </span>
        <span className="text-[9px] font-bold text-[#5D4037]/70 bg-[#5D4037]/10 px-1.5 py-0.5 rounded border border-[#5D4037]/20">
          {skills.length} Skills
        </span>
      </div>

      <div className="p-2 space-y-2 flex-1 overflow-y-auto max-h-[300px] scrollbar-thin scrollbar-thumb-slate-700">
        {skills.map(skill => {
          const current = totals[skill] || 0;
          const max = MAX_SKILL_LEVELS[skill] || 10;
          const target = targets[skill] || 0;
          
          // 목표 달성 여부 체크
          const isTargetMet = target > 0 && current >= target;
          const isMaxed = current >= max;
          
          // 진행률 계산
          const percent = Math.min(100, (current / max) * 100);

          return (
            <div key={skill} className="group">
              <div className="flex justify-between items-end mb-1">
                <span className={`text-[11px] font-bold transition-colors ${isTargetMet ? 'text-amber-400' : 'text-slate-400 group-hover:text-slate-200'}`}>
                  {skill}
                </span>
                <div className="flex items-center gap-1">
                  {target > 0 && (
                     <span className={`text-[9px] flex items-center gap-0.5 px-1 rounded ${isTargetMet ? 'text-green-400 bg-green-500/10' : 'text-red-400 bg-red-500/10'}`}>
                       <Target size={8} /> {target}
                     </span>
                  )}
                  <span className={`text-[10px] font-black ${isMaxed ? 'text-amber-500' : 'text-slate-300'}`}>
                    {current} <span className="text-slate-600 text-[9px]">/ {max}</span>
                  </span>
                </div>
              </div>
              
              {/* 진행바 트랙 */}
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden border border-white/5 relative">
                {/* [수정] 진행바 색상: 테마에 맞춰 Amber(골드) 계열로 통일 */}
                <div 
                  className={`h-full rounded-full transition-all duration-500 ease-out flex items-center justify-end
                    ${isMaxed 
                      ? 'bg-gradient-to-r from-amber-600 to-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.5)]' 
                      : 'bg-slate-600 group-hover:bg-slate-500'}`}
                  style={{ width: `${percent}%` }}
                />
                
                {/* 목표 지점 표시기 (Target Marker) */}
                {target > 0 && (
                  <div 
                    className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 shadow-[0_0_5px_rgba(239,68,68,0.8)]"
                    style={{ left: `${(target / max) * 100}%` }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}