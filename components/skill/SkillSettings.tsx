'use client';

import React from 'react';
import { Mountain, ChevronsUp, RotateCcw } from 'lucide-react';
import NumberInput from '../common/NumberInput';

interface Props {
  targetLevels: Record<string, number>;
  setTargetLevels: (levels: Record<string, number>) => void;
}

// [수정] 작가님이 요청하신 스킬별 최신 맥스 레벨 데이터베이스
const MAX_LEVELS: Record<string, number> = {
  // [전리품]
  '투쟁적인 탐험가': 10,
  '호전적인 탐험가': 10,
  '꼼꼼한 탐험가': 10,
  '주의깊은 탐험가': 10,
  '성실한 탐험가': 10,
  '부지런한 탐험가': 10,

  // [전투]
  '험지 평정': 2,
  '전투적인 채집': 7,
  '전투적인 관찰': 8,
  '해적 척결': 10,
  '맹수 척결': 10,
  '해적 사냥': 10,
  '맹수 사냥': 10,

  // [관찰]
  '관찰 공부': 10,
  '관측 후 채집': 4,
  '관측 후 전투': 6,
  '생물 관찰': 7,
  '관찰 채집': 8,
  '험지 관찰': 2,
  '관찰 심화': 8,

  // [채집]
  '생물 채집': 6,
  '채집 우선 전투': 9,
  '채집 우선 관찰': 6,
  '험지 채집': 2,
  '채집 심화': 5,
  '채집 공부': 1,      // [수정 반영]
  '탐사의 기본': 6,     // [수정 반영]
};

const DEFAULT_MAX = 10;

export default function SkillSettings({ targetLevels, setTargetLevels }: Props) {
  const categories = [
    { name: '전리품', skills: ['투쟁적인 탐험가', '호전적인 탐험가', '꼼꼼한 탐험가', '주의깊은 탐험가', '성실한 탐험가', '부지런한 탐험가'] },
    { name: '전투', skills: ['험지 평정', '전투적인 채집', '전투적인 관찰', '해적 척결', '맹수 척결', '해적 사냥', '맹수 사냥'] },
    { name: '관찰', skills: ['관찰 공부', '관측 후 채집', '관측 후 전투', '생물 관찰', '관찰 채집', '험지 관찰', '관찰 심화'] },
    { name: '채집', skills: ['생물 채집', '채집 우선 전투', '채집 우선 관찰', '험지 채집', '채집 심화', '채집 공부', '탐사의 기본'] },
  ];

  const getMaxLevel = (skillName: string) => {
    return MAX_LEVELS[skillName] !== undefined ? MAX_LEVELS[skillName] : DEFAULT_MAX;
  };

  const handleChange = (skill: string, val: number) => {
    const limit = getMaxLevel(skill);
    // 입력값이 맥스 레벨을 넘지 않도록 제한
    setTargetLevels({ ...targetLevels, [skill]: Math.min(limit, val) });
  };

  const handleBatchUpdate = (skills: string[], isMax: boolean) => {
    const updates: Record<string, number> = {};
    skills.forEach(skill => {
      updates[skill] = isMax ? getMaxLevel(skill) : 0;
    });
    setTargetLevels({ ...targetLevels, ...updates });
  };

  return (
    <div className="relative z-0 mt-2">
      {/* 배너 */}
      <div className="bg-emerald-600 px-4 py-2 rounded-t-xl border-b-2 border-emerald-400 shadow-lg">
        <h2 className="text-[13px] font-black text-white uppercase tracking-widest flex items-center gap-2">
          <Mountain size={14} strokeWidth={3} />
          스킬 설정 (Skill Targets)
        </h2>
      </div>

      <div className="bg-slate-900/90 rounded-b-xl p-3 border border-white/5 backdrop-blur-md">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {categories.map(cat => (
            <div key={cat.name} className="space-y-1">
              {/* 카테고리 헤더 */}
              <div className="flex items-center justify-between pb-1 border-b border-white/10 mb-1 h-[24px]">
                <div className="flex items-center gap-2">
                  <span className="w-1 h-3 bg-emerald-500 rounded-full" />
                  <p className="text-[11px] font-black text-emerald-400 uppercase tracking-wider">{cat.name}</p>
                </div>
                
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => handleBatchUpdate(cat.skills, true)}
                    className="p-1 text-emerald-500 hover:text-white hover:bg-emerald-500/20 rounded transition-colors"
                    title={`${cat.name} 전체 MAX`}
                  >
                    <ChevronsUp size={12} strokeWidth={3} />
                  </button>
                  <button 
                    onClick={() => handleBatchUpdate(cat.skills, false)}
                    className="p-1 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                    title={`${cat.name} 전체 초기화`}
                  >
                    <RotateCcw size={11} strokeWidth={3} />
                  </button>
                </div>
              </div>
              
              {/* 스킬 리스트 */}
              <div className="space-y-1">
                {cat.skills.map(skill => {
                  const maxLv = getMaxLevel(skill);
                  return (
                    <div key={skill} className="flex items-center justify-between h-[28px] px-2 bg-slate-800/60 rounded border border-white/5 group hover:border-emerald-500/30 transition-all">
                      <div className="flex items-center gap-1.5 overflow-hidden mr-1">
                        <span className="text-[11px] font-black text-slate-200 group-hover:text-white transition-colors truncate">
                          {skill}
                        </span>
                        <span className="text-[10px] font-bold text-emerald-400">
                          /{maxLv}
                        </span>
                      </div>
                      
                      <NumberInput 
                        value={targetLevels[skill] || 0}
                        min={0} 
                        max={maxLv}
                        onChange={(val) => handleChange(skill, val)}
                        colorTheme="blue" 
                        size="sm"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}