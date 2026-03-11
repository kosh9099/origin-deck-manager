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
  '채집 공부': 10,
  '탐사의 기본': 10,
};

const DEFAULT_MAX = 10;

export default function SkillSettings({ targetLevels, setTargetLevels }: Props) {
  const [activeTab, setActiveTab] = React.useState<string>('전리품');
  
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
  
  const activeCategory = categories.find(cat => cat.name === activeTab) || categories[0];

  return (
    <div className="relative z-0">
      
      {/* 커스텀 탭 네비게이션 */}
      <div className="flex overflow-x-auto scrollbar-none gap-2 mb-4 p-1">
        {categories.map(cat => (
          <button
            key={cat.name}
            onClick={() => setActiveTab(cat.name)}
            className={`
              flex-1 min-w-[80px] py-3 px-2 rounded-xl text-center font-black text-sm transition-all whitespace-nowrap
              ${activeTab === cat.name 
                ? 'bg-emerald-500 text-white shadow-[0_4px_15px_rgba(16,185,129,0.3)]' 
                : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700 hover:text-slate-200 border border-transparent'}
            `}
          >
            {cat.name}
          </button>
        ))}
      </div>

      <div className="bg-slate-900/90 rounded-2xl p-4 border border-emerald-500/20 shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
        <div className="max-w-md mx-auto space-y-2">
          {/* 카테고리 헤더 컨트롤 */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4 px-1">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-4 bg-emerald-500 rounded-full" />
              <p className="text-[14px] font-black text-emerald-400 uppercase tracking-wider">{activeCategory.name} 스킬 설정</p>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={() => handleBatchUpdate(activeCategory.skills, true)}
                className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold text-emerald-100 bg-emerald-600/30 hover:bg-emerald-500 hover:text-white rounded-lg transition-all border border-emerald-500/30"
                title={`${activeCategory.name} 전체 MAX`}
              >
                <ChevronsUp size={14} strokeWidth={2.5} /> 일괄 MAX
              </button>
              <button 
                onClick={() => handleBatchUpdate(activeCategory.skills, false)}
                className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold text-slate-300 bg-slate-800 hover:bg-red-500/90 hover:text-white rounded-lg transition-all border border-slate-700"
                title={`${activeCategory.name} 전체 초기화`}
              >
                <RotateCcw size={13} strokeWidth={2.5} /> 일괄 리셋
              </button>
            </div>
          </div>
          
          {/* 하위 스킬 리스트 (그리드 레이아웃 X, 세로 리스트형 O) */}
          <div className="space-y-2.5">
            {activeCategory.skills.map(skill => {
              const maxLv = getMaxLevel(skill);
              return (
                <div key={skill} className="flex items-center justify-between py-2 px-4 bg-slate-800/60 rounded-xl border border-white/5 group hover:border-emerald-500/40 hover:bg-slate-800 transition-all shadow-sm">
                  <div className="flex items-center gap-2 overflow-hidden mr-4">
                    <span className="text-[13px] font-black text-slate-200 group-hover:text-white transition-colors truncate">
                      {skill}
                    </span>
                    <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      최대 {maxLv}Lv
                    </span>
                  </div>
                  
                  <div className="shrink-0">
                    <NumberInput 
                      value={targetLevels[skill] || 0}
                      min={0} 
                      max={maxLv}
                      onChange={(val) => handleChange(skill, val)}
                      colorTheme="blue" 
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}