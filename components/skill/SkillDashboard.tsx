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
    const totals: Record<string, number> = {};
    const stats: SkillStat = { 
      combat: 0, observation: 0, gathering: 0, 
      loot: 0, pirate: 0, beast: 0 
    };

    // 1. 초기화
    Object.keys(MAX_SKILL_LEVELS).forEach(sk => totals[sk] = 0);

    // 2. 현재 함대 스킬 레벨 합산
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

    // 3. 10레벨 상한 적용 및 능력치 환산
    Object.keys(totals).forEach(sk => {
      // 10레벨 초과분은 버림 (지휘관님 규정)
      if (totals[sk] > 10) totals[sk] = 10;
      
      const level = totals[sk];
      if (level > 0 && SKILL_STATS[sk] && SKILL_STATS[sk][level]) {
        const s = SKILL_STATS[sk][level];
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
      {/* 배너 */}
      <div className="bg-[#E5D0AC] px-4 py-2 rounded-t-xl border-b-2 border-[#C8B28E] shadow-lg">
        <h2 className="text-[13px] font-black text-[#5D4037] uppercase tracking-widest flex items-center gap-2">
          <BarChart2 size={16} strokeWidth={2.5} />
          스킬 현황 (Skill Status)
        </h2>
      </div>

      {/* 컨텐츠 박스 */}
      <div className="bg-slate-900/90 rounded-b-xl p-3 border border-white/5 backdrop-blur-md shadow-2xl">
        
        {/* [수정] Grid 레이아웃: 5열 (lg:grid-cols-5) 로 확장 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          
          {/* 기존 4개 카테고리 */}
          {categories.map(cat => (
            <SkillCategoryCard 
              key={cat.name} title={cat.name} skills={cat.skills} 
              totals={skillTotals} targets={targetLevels} 
            />
          ))}

          {/* [신규] 5번째 컬럼: 능력치 합계 */}
          <StatSummaryCard stats={statSummary} />

        </div>
      </div>
    </div>
  );
}