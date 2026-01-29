'use client';

import React, { useMemo } from 'react';
import { MAX_SKILL_LEVELS } from '@/lib/optimizer/rules';
import { getSailorSkillLevel } from '@/lib/optimizer/scoring';
import { SKILL_STATS, SkillStat } from '@/lib/optimizer/data/skillStats';
import SkillCategoryCard from './SkillCategoryCard';
import StatSummaryCard from './StatSummaryCard';
import { BarChart2 } from 'lucide-react';

interface Props {
  result: any;
  targetLevels: Record<string, number>;
}

export default function SkillDashboard({ result, targetLevels = {} }: Props) {
  
  // [계산] 스킬 레벨 합계 및 능력치 총합 계산
  const { skillTotals, statSummary } = useMemo(() => {
    // 실제 합산값을 저장할 객체 (초과분 포함)
    const totals: Record<string, number> = {};
    const stats: SkillStat = { 
      combat: 0, observation: 0, gathering: 0, 
      loot: 0, pirate: 0, beast: 0 
    };

    // 1. 초기화
    Object.keys(MAX_SKILL_LEVELS).forEach(sk => totals[sk] = 0);

    // 2. 현재 함대 스킬 레벨 합산 (실제 총합을 구함)
    if (result?.ships) {
      result.ships.forEach((ship: any) => {
        const shipCrew = [
          ship.admiral, 
          ...(ship.adventure || []), 
          ...(ship.combat || [])
        ].filter(Boolean);

        shipCrew.forEach(sailor => {
          Object.keys(MAX_SKILL_LEVELS).forEach(sk => {
            const lv = getSailorSkillLevel(sailor, sk);
            totals[sk] += lv;
          });
        });
      });
    }

    // 3. 능력치 환산 시에만 상한(MAX 10) 적용
    Object.keys(totals).forEach(sk => {
      // 능력치 계산용 레벨 (최대 10)
      const effectiveLevel = Math.min(totals[sk], 10);
      
      if (effectiveLevel > 0 && SKILL_STATS[sk] && SKILL_STATS[sk][effectiveLevel]) {
        const s = SKILL_STATS[sk][effectiveLevel];
        stats.combat += s.combat;
        stats.observation += s.observation;
        stats.gathering += s.gathering;
        stats.loot += s.loot;
        stats.pirate += s.pirate;
        stats.beast += s.beast;
      }
    });

    // skillTotals는 초과분이 포함된 totals를 그대로 반환합니다.
    return { skillTotals: totals, statSummary: stats };
  }, [result]);

  const categories = [
    { name: '전리품', skills: ['투쟁적인 탐험가', '호전적인 탐험가', '꼼꼼한 탐험가', '주의깊은 탐험가', '성실한 탐험가', '부지런한 탐험가'] },
    { name: '전투', skills: ['험지 평정', '전투적인 채집', '전투적인 관찰', '해적 척결', '맹수 척결', '해적 사냥', '맹수 사냥'] },
    { name: '관찰', skills: ['관찰 공부', '관측 후 채집', '관측 후 전투', '생물 관찰', '관찰 채집', '험지 관찰', '관찰 심화'] },
    { name: '채집', skills: ['생물 채집', '채집 우선 전투', '채집 우선 관찰', '험지 채집', '채집 심화', '채집 공부', '탐사의 기본'] },
  ];

  return (
    <div className="relative z-0 mt-4">
      <div className="bg-[#E5D0AC] px-4 py-2 rounded-t-xl border-b-2 border-[#C8B28E] shadow-lg">
        <h2 className="text-[13px] font-black text-[#5D4037] uppercase tracking-widest flex items-center gap-2">
          <BarChart2 size={16} strokeWidth={2.5} />
          스킬 현황 (Skill Status)
        </h2>
      </div>

      <div className="bg-slate-900/90 rounded-b-xl p-3 border border-white/5 backdrop-blur-md shadow-2xl">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          {categories.map(cat => (
            <SkillCategoryCard 
              key={cat.name} 
              title={cat.name} 
              skills={cat.skills} 
              totals={skillTotals} // 이제 초과된 숫자가 그대로 전달됩니다.
              targets={targetLevels} 
            />
          ))}
          <StatSummaryCard stats={statSummary} />
        </div>
      </div>
    </div>
  );
}