'use client';

import React from 'react';
import { MAX_SKILL_LEVELS } from '@/lib/optimizer/rules';
import { AlertTriangle } from 'lucide-react';

interface Props {
  title: string;
  skills: string[];
  totals: Record<string, number>;       // 클램핑된 값 (능력치 계산용)
  rawTotals: Record<string, number>;    // 클램핑 없는 원본 합산 (초과 감지용)
  targets: Record<string, number>;
}

const CATEGORY_STYLE: Record<string, { header: string; badge: string; bar: string; barMaxed: string; text: string; }> = {
  '전리품': { header: 'bg-amber-500', badge: 'bg-amber-50 text-amber-700 border-amber-200', bar: 'bg-amber-200', barMaxed: 'bg-amber-500', text: 'text-amber-700' },
  '전투': { header: 'bg-red-500', badge: 'bg-red-50 text-red-700 border-red-200', bar: 'bg-red-200', barMaxed: 'bg-red-500', text: 'text-red-700' },
  '관찰': { header: 'bg-blue-500', badge: 'bg-blue-50 text-blue-700 border-blue-200', bar: 'bg-blue-200', barMaxed: 'bg-blue-500', text: 'text-blue-700' },
  '채집': { header: 'bg-green-500', badge: 'bg-green-50 text-green-700 border-green-200', bar: 'bg-green-200', barMaxed: 'bg-green-500', text: 'text-green-700' },
};

export default function SkillCategoryCard({ title, skills, totals, rawTotals, targets }: Props) {
  const style = CATEGORY_STYLE[title] || CATEGORY_STYLE['전리품'];

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col h-full">

      {/* 카테고리 헤더 */}
      <div className={`${style.header} px-3 py-2 flex justify-between items-center`}>
        <span className="text-xs font-black text-white uppercase tracking-widest">
          {title}
        </span>
        <span className="text-[9px] font-bold text-white/80 bg-white/20 px-1.5 py-0.5 rounded">
          {skills.length} Skills
        </span>
      </div>

      <div className="p-2 space-y-2 flex-1 overflow-y-auto max-h-[300px] scrollbar-thin scrollbar-thumb-slate-200">
        {skills.map(skill => {
          // rawTotals: 클램핑 없는 실제 합산값 → 초과 감지에 사용
          const raw = rawTotals[skill] || 0;
          const max = MAX_SKILL_LEVELS[skill] || 10;
          const current = Math.min(raw, max);
          const overflow = Math.max(0, raw - max);
          const target = targets[skill] || 0;

          const isOverflow = overflow > 0;
          const isOverTarget = target > 0 && current > target;
          const isUnderTarget = target > 0 && current < target;
          const overTargetAmt = isOverTarget ? current - target : 0;
          const percent = Math.min(100, (current / max) * 100);
          const targetPercent = target > 0 ? Math.min(100, (target / max) * 100) : 0;

          return (
            <div key={skill} className="group">
              <div className="flex items-center gap-2 mb-1">
                {/* 스킬명 */}
                <div className="flex items-center flex-1 min-w-0">
                  <span className="text-[11px] font-bold text-slate-600 group-hover:text-slate-800 transition-colors truncate">
                    {skill}
                  </span>
                </div>

                {/* 현재 / 목표 — 색상: 미달=보라, 달성=초록, 초과=주황, 맥스초과=빨강 */}
                <div className="flex items-center gap-0.5 shrink-0">
                  {isOverflow ? (
                    <>
                      <span className="text-[12px] font-black text-red-500">{max}</span>
                      <span className="text-[10px] text-slate-300">/</span>
                      <span className="text-[11px] font-bold text-slate-400">{target > 0 ? target : max}</span>
                      <span className="text-red-500 bg-red-50 border border-red-200 px-1 rounded flex items-center gap-0.5 ml-0.5 text-[9px] font-black">
                        <AlertTriangle size={8} />+{overflow}
                      </span>
                    </>
                  ) : isOverTarget ? (
                    <>
                      <span className="text-[12px] font-black text-orange-500">{current}</span>
                      <span className="text-[10px] text-slate-300">/</span>
                      <span className="text-[11px] font-bold text-slate-400">{target}</span>
                      <span className="text-orange-500 bg-orange-50 border border-orange-200 px-1 rounded flex items-center gap-0.5 ml-0.5 text-[9px] font-black">
                        <AlertTriangle size={8} />+{overTargetAmt}
                      </span>
                    </>
                  ) : target > 0 ? (
                    <>
                      <span className={`text-[12px] font-black ${current >= target ? 'text-emerald-500' : 'text-violet-500'}`}>{current}</span>
                      <span className="text-[10px] text-slate-300">/</span>
                      <span className="text-[11px] font-bold text-slate-400">{target}</span>
                    </>
                  ) : (
                    <>
                      <span className={`text-[12px] font-black ${current >= max ? 'text-emerald-500' : current > 0 ? 'text-violet-500' : 'text-slate-400'}`}>{current}</span>
                      <span className="text-[10px] text-slate-300">/</span>
                      <span className="text-[11px] font-bold text-slate-400">{max}</span>
                    </>
                  )}
                </div>
              </div>

              {/* 진행바 */}
              <div className={`h-1.5 w-full bg-slate-100 rounded-full overflow-hidden relative border
                ${isOverflow ? 'border-red-200' : isOverTarget ? 'border-orange-200' : 'border-slate-200'}`}>
                {isOverTarget ? (
                  <>
                    <div className={`absolute h-full ${style.barMaxed}`} style={{ width: `${targetPercent}%` }} />
                    <div className="absolute h-full bg-orange-400" style={{ left: `${targetPercent}%`, width: `${percent - targetPercent}%` }} />
                  </>
                ) : (
                  <div
                    className={`h-full rounded-full transition-all duration-500 ease-out
                      ${isOverflow ? 'bg-gradient-to-r from-amber-400 to-red-400' : style.bar}`}
                    style={{ width: `${percent}%` }}
                  />
                )}
                {/* 목표 마커선 */}
                {target > 0 && !isOverTarget && (
                  <div className="absolute top-0 bottom-0 w-0.5 bg-slate-400 z-10" style={{ left: `${targetPercent}%` }} />
                )}
              </div>

              {/* 초과 경고 메시지 */}
              {isOverflow && (
                <p className="text-[9px] text-red-500 mt-0.5 flex items-center gap-0.5">
                  <AlertTriangle size={7} /> 맥스 초과 — {overflow}레벨 낭비 중
                </p>
              )}
              {isOverTarget && !isOverflow && (
                <p className="text-[9px] text-orange-500 mt-0.5 flex items-center gap-0.5">
                  <AlertTriangle size={7} /> 목표 초과 배치 — {overTargetAmt} 초과
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}