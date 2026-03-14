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

const CATEGORY_STYLE: Record<string, { header: string; badge: string; bar: string; barMaxed: string; text: string; }> = {
  '전리품': { header: 'bg-amber-500', badge: 'bg-amber-50 text-amber-700 border-amber-200', bar: 'bg-amber-200', barMaxed: 'bg-amber-500', text: 'text-amber-700' },
  '전투': { header: 'bg-red-500', badge: 'bg-red-50 text-red-700 border-red-200', bar: 'bg-red-200', barMaxed: 'bg-red-500', text: 'text-red-700' },
  '관찰': { header: 'bg-blue-500', badge: 'bg-blue-50 text-blue-700 border-blue-200', bar: 'bg-blue-200', barMaxed: 'bg-blue-500', text: 'text-blue-700' },
  '채집': { header: 'bg-green-500', badge: 'bg-green-50 text-green-700 border-green-200', bar: 'bg-green-200', barMaxed: 'bg-green-500', text: 'text-green-700' },
};

export default function SkillCategoryCard({ title, skills, totals, targets }: Props) {
  const style = CATEGORY_STYLE[title] || CATEGORY_STYLE['전리품'];

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col h-full">

      {/* 카테고리 헤더 */}
      <div className={`${style.header} px-3 py-2 flex justify-between items-center`}>
        <span className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-1.5">
          <Trophy size={12} strokeWidth={2.5} />
          {title}
        </span>
        <span className="text-[9px] font-bold text-white/80 bg-white/20 px-1.5 py-0.5 rounded">
          {skills.length} Skills
        </span>
      </div>

      <div className="p-2 space-y-2 flex-1 overflow-y-auto max-h-[300px] scrollbar-thin scrollbar-thumb-slate-200">
        {skills.map(skill => {
          const raw = totals[skill] || 0;
          const max = MAX_SKILL_LEVELS[skill] || 10;
          const current = Math.min(raw, max);
          const overflow = Math.max(0, raw - max);
          const target = targets[skill] || 0;

          const isTargetMet = target > 0 && current >= target;
          const isMaxed = current >= max;
          const isOverflow = overflow > 0;
          const percent = Math.min(100, (current / max) * 100);

          return (
            <div key={skill} className="group">
              <div className="flex justify-between items-end mb-1">
                {/* 스킬명 */}
                <span className={`text-[11px] font-bold transition-colors
                  ${isOverflow ? 'text-red-500' :
                    isTargetMet ? style.text :
                      'text-slate-500 group-hover:text-slate-700'}`}>
                  {skill}
                </span>

                <div className="flex items-center gap-1">
                  {/* 목표 레벨 배지 */}
                  {target > 0 && (
                    <span className={`text-[9px] flex items-center gap-0.5 px-1 rounded border
                      ${isTargetMet
                        ? 'text-green-600 bg-green-50 border-green-200'
                        : 'text-red-500 bg-red-50 border-red-200'}`}>
                      <Target size={8} /> {target}
                    </span>
                  )}

                  {/* 레벨 표기 */}
                  {isOverflow ? (
                    <span className="text-[10px] font-black flex items-center gap-0.5">
                      <span className="text-amber-600">{max}</span>
                      <span className="text-slate-400 text-[9px]">/ {max}</span>
                      <span className="text-red-500 bg-red-50 border border-red-200 px-1 rounded flex items-center gap-0.5 ml-0.5">
                        <AlertTriangle size={8} />+{overflow}
                      </span>
                    </span>
                  ) : (
                    <span className={`text-[10px] font-black ${isMaxed ? style.text : 'text-slate-600'}`}>
                      {current} <span className="text-slate-400 text-[9px]">/ {max}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* 진행바 */}
              <div className={`h-1.5 w-full bg-slate-100 rounded-full overflow-hidden relative border
                ${isOverflow ? 'border-red-200' : 'border-slate-200'}`}>
                <div
                  className={`h-full rounded-full transition-all duration-500 ease-out
                    ${isOverflow
                      ? 'bg-gradient-to-r from-amber-400 to-red-400'
                      : isMaxed
                        ? style.barMaxed
                        : style.bar}`}
                  style={{ width: `${percent}%` }}
                />
                {target > 0 && (
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-red-400 z-10"
                    style={{ left: `${(target / max) * 100}%` }}
                  />
                )}
              </div>

              {/* 초과 경고 */}
              {isOverflow && (
                <p className="text-[9px] text-red-500 mt-0.5 flex items-center gap-0.5">
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