'use client';

import React from 'react';
import { MAX_SKILL_LEVELS } from '@/lib/optimizer/rules';
import { Target, Trophy, AlertTriangle } from 'lucide-react';

interface Props {
  title: string;
  skills: string[];
  totals: Record<string, number>;
  targets: Record<string, number>;
}

export default function SkillCategoryCard({ title, skills, totals, targets }: Props) {
  return (
    <div className="bg-slate-900 border border-white/10 rounded-xl overflow-hidden shadow-sm flex flex-col h-full">

      {/* 카테고리 헤더 */}
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
          const raw = totals[skill] || 0;       // 클램핑 전 실제 합산값 (초과 포함)
          const max = MAX_SKILL_LEVELS[skill] || 10;
          const current = Math.min(raw, max);   // 진행바/표시에 쓸 클램핑값
          const overflow = Math.max(0, raw - max); // 초과분
          const target = targets[skill] || 0;

          const isTargetMet = target > 0 && current >= target;
          const isMaxed = current >= max;
          const isOverflow = overflow > 0;

          // 진행률: 클램핑된 값 기준 (항상 0~100%)
          const percent = Math.min(100, (current / max) * 100);

          return (
            <div key={skill} className="group">
              <div className="flex justify-between items-end mb-1">
                {/* 스킬명 */}
                <span className={`text-[11px] font-bold transition-colors
                  ${isOverflow ? 'text-red-400' :
                    isTargetMet ? 'text-amber-400' :
                      'text-slate-400 group-hover:text-slate-200'}`}>
                  {skill}
                </span>

                <div className="flex items-center gap-1">
                  {/* 목표 레벨 배지 */}
                  {target > 0 && (
                    <span className={`text-[9px] flex items-center gap-0.5 px-1 rounded
                      ${isTargetMet ? 'text-green-400 bg-green-500/10' : 'text-red-400 bg-red-500/10'}`}>
                      <Target size={8} /> {target}
                    </span>
                  )}

                  {/* 레벨 표기: 초과 시 raw값 강조 */}
                  {isOverflow ? (
                    <span className="text-[10px] font-black flex items-center gap-0.5">
                      {/* 맥스 달성 부분 */}
                      <span className="text-amber-500">{max}</span>
                      <span className="text-slate-600 text-[9px]">/ {max}</span>
                      {/* 초과 부분 */}
                      <span className="text-red-400 bg-red-500/10 px-1 rounded flex items-center gap-0.5 ml-0.5">
                        <AlertTriangle size={8} />
                        +{overflow}
                      </span>
                    </span>
                  ) : (
                    <span className={`text-[10px] font-black ${isMaxed ? 'text-amber-500' : 'text-slate-300'}`}>
                      {current} <span className="text-slate-600 text-[9px]">/ {max}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* 진행바 트랙 */}
              <div className={`h-1.5 w-full bg-slate-800 rounded-full overflow-hidden relative
                ${isOverflow ? 'border border-red-500/40' : 'border border-white/5'}`}>
                {/* 진행바 본체 */}
                <div
                  className={`h-full rounded-full transition-all duration-500 ease-out
                    ${isOverflow
                      ? 'bg-gradient-to-r from-amber-600 to-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]'
                      : isMaxed
                        ? 'bg-gradient-to-r from-amber-600 to-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.5)]'
                        : 'bg-slate-600 group-hover:bg-slate-500'}`}
                  style={{ width: `${percent}%` }}
                />

                {/* 목표 지점 마커 */}
                {target > 0 && (
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 shadow-[0_0_5px_rgba(239,68,68,0.8)]"
                    style={{ left: `${(target / max) * 100}%` }}
                  />
                )}
              </div>

              {/* 초과 경고 메시지 */}
              {isOverflow && (
                <p className="text-[9px] text-red-400/80 mt-0.5 flex items-center gap-0.5">
                  <AlertTriangle size={7} />
                  맥스 초과 — {overflow}레벨 낭비 중
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}