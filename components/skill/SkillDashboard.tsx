'use client';

import React, { useMemo } from 'react';
import { MAX_SKILL_LEVELS } from '@/lib/optimizer/rules';
import { getSailorSkillLevel } from '@/lib/optimizer/scoring';
import SkillCategoryCard from './SkillCategoryCard';
import { BarChart2 } from 'lucide-react'; // 아이콘 추가

interface Props {
  result: any;
  targetLevels: Record<string, number>;
}

export default function SkillDashboard({ result, targetLevels = {} }: Props) {
  const skillTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    Object.keys(MAX_SKILL_LEVELS).forEach(sk => totals[sk] = 0);

    if (!result?.ships) return totals;

    result.ships.forEach((ship: any) => {
      // ship 객체 내의 모든 인원을 정확히 추출
      const shipCrew = [
        ship.admiral, 
        ...(ship.adventure || []), 
        ...(ship.combat || [])
      ].filter(Boolean);

      shipCrew.forEach(sailor => {
        Object.keys(MAX_SKILL_LEVELS).forEach(sk => {
          // DB의 실제 레벨을 가져와 합산
          const lv = getSailorSkillLevel(sailor, sk);
          totals[sk] += lv;
        });
      });
    });

    // 지휘관님 규정: 함대 스킬 합계는 10레벨이 최대 (초과분은 낭비)
    Object.keys(totals).forEach(sk => {
      if (totals[sk] > 10) totals[sk] = 10;
    });

    return totals;
  }, [result]);

  const categories = [
    { name: '전리품', skills: ['투쟁적인 탐험가', '호전적인 탐험가', '꼼꼼한 탐험가', '주의깊은 탐험가', '성실한 탐험가', '부지런한 탐험가'] },
    { name: '전투', skills: ['험지 평정', '전투적인 채집', '전투적인 관찰', '해적 척결', '맹수 척결', '해적 사냥', '맹수 사냥'] },
    { name: '관찰', skills: ['관찰 공부', '관측 후 채집', '관측 후 전투', '생물 관찰', '관찰 채집', '험지 관찰', '관찰 심화'] },
    { name: '채집', skills: ['생물 채집', '채집 우선 전투', '채집 우선 관찰', '험지 채집', '채집 심화', '채집 공부', '탐사의 기본'] },
  ];

  return (
    <div className="relative z-0 mt-4">
      {/* [수정] 배너: 베이지(Beige) 테마, 높이 축소(py-2), 텍스트 변경 */}
      <div className="bg-[#E5D0AC] px-4 py-2 rounded-t-xl border-b-2 border-[#C8B28E] shadow-lg">
        <h2 className="text-[13px] font-black text-[#5D4037] uppercase tracking-widest flex items-center gap-2">
          <BarChart2 size={16} strokeWidth={2.5} />
          스킬 현황 (Skill Status)
        </h2>
      </div>

      {/* [수정] 컨텐츠 박스: 분리형 구조 적용 */}
      <div className="bg-slate-900/90 rounded-b-xl p-3 border border-white/5 backdrop-blur-md shadow-2xl">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {categories.map(cat => (
            <SkillCategoryCard 
              key={cat.name} title={cat.name} skills={cat.skills} 
              totals={skillTotals} targets={targetLevels} 
            />
          ))}
        </div>
      </div>
    </div>
  );
}