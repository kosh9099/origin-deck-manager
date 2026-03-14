'use client';

import React, { useMemo } from 'react';
import { MAX_SKILL_LEVELS } from '@/lib/optimizer/rules';
import { getSailorSkillLevel, calculateFleetSkills } from '@/lib/optimizer/scoring';
import { SKILL_STATS, SkillStat } from '@/lib/optimizer/data/skillStats';
import SkillCategoryCard from './SkillCategoryCard';
import StatSummaryCard from './StatSummaryCard';
import { BarChart2 } from 'lucide-react';

interface Props {
  result: any;
  targetLevels: Record<string, number>;
}

export default function SkillDashboard({ result, targetLevels = {} }: Props) {

  const { skillTotals, statSummary } = useMemo(() => {
    if (!result?.ships) {
      return {
        skillTotals: {},
        statSummary: { combat: 0, observation: 0, gathering: 0, loot: 0, pirate: 0, beast: 0 }
      };
    }

    const allCrew: any[] = [];
    result.ships.forEach((ship: any) => {
      if (ship.admiral) allCrew.push(ship.admiral);
      if (ship.adventure) ship.adventure.filter(Boolean).forEach((s: any) => allCrew.push(s));
      if (ship.combat) ship.combat.filter(Boolean).forEach((s: any) => allCrew.push(s));
    });

    const totals = calculateFleetSkills(allCrew);

    const stats: SkillStat = {
      combat: 0, observation: 0, gathering: 0,
      loot: 0, pirate: 0, beast: 0
    };

    Object.entries(totals).forEach(([sk, level]) => {
      const effectiveLevel = Number(level);
      if (effectiveLevel > 0 && SKILL_STATS[sk]?.[effectiveLevel as keyof typeof SKILL_STATS[string]]) {
        const s = SKILL_STATS[sk][effectiveLevel as keyof typeof SKILL_STATS[string]];
        stats.combat += s.combat;
        stats.observation += s.observation;
        stats.gathering += s.gathering;
        stats.loot += s.loot;
        stats.pirate += s.pirate;
        stats.beast += s.beast;
      }
    });

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
      {/* 패널 헤더 */}
      <div className="bg-slate-700 px-4 py-2.5 rounded-t-xl border-b-2 border-slate-600 shadow-sm">
        <h2 className="text-[13px] font-black text-white uppercase tracking-widest flex items-center gap-2">
          <BarChart2 size={16} strokeWidth={2.5} />
          스킬 현황 (Skill Status)
        </h2>
      </div>

      <div className="bg-slate-50 rounded-b-xl p-3 border border-slate-200 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          {categories.map(cat => (
            <SkillCategoryCard
              key={cat.name}
              title={cat.name}
              skills={cat.skills}
              totals={skillTotals}
              targets={targetLevels}
            />
          ))}
          <StatSummaryCard stats={statSummary} />
        </div>
      </div>
    </div>
  );
}