'use client';

import React from 'react';
import { ChevronsUp, RotateCcw, Minus, Plus } from 'lucide-react';

interface Props {
  targetLevels: Record<string, number>;
  setTargetLevels: (levels: Record<string, number>) => void;
}

const MAX_LEVELS: Record<string, number> = {
  '투쟁적인 탐험가': 10, '호전적인 탐험가': 10, '꼼꼼한 탐험가': 10,
  '주의깊은 탐험가': 10, '성실한 탐험가': 10, '부지런한 탐험가': 10,
  '험지 평정': 2, '전투적인 채집': 7, '전투적인 관찰': 8,
  '해적 척결': 10, '맹수 척결': 10, '해적 사냥': 10, '맹수 사냥': 10,
  '관찰 공부': 10, '관측 후 채집': 4, '관측 후 전투': 6,
  '생물 관찰': 7, '관찰 채집': 8, '험지 관찰': 2, '관찰 심화': 8,
  '생물 채집': 6, '채집 우선 전투': 9, '채집 우선 관찰': 6,
  '험지 채집': 2, '채집 심화': 5, '채집 공부': 10, '탐사의 기본': 10,
};

const CATEGORY_COLORS = {
  '전리품': {
    tab: 'bg-amber-500 text-white',
    inactive: 'bg-white text-amber-700 border border-amber-200 hover:bg-amber-50',
    header: 'text-amber-700',
    accent: 'bg-amber-500',
    badge: 'bg-amber-50 text-amber-600 border-amber-200',
    resetHover: 'hover:bg-red-50 hover:text-red-600 hover:border-red-200',
    maxBadge: 'bg-amber-50 text-amber-600 border-amber-200',
    rowHover: 'hover:border-amber-300 hover:bg-amber-50',
    btnActive: 'bg-amber-500 text-white hover:bg-amber-600',
    btnBase: 'bg-white text-amber-600 border-amber-200 hover:bg-amber-50',
    valueActive: 'text-amber-700 font-black',
  },
  '전투': {
    tab: 'bg-red-500 text-white',
    inactive: 'bg-white text-red-700 border border-red-200 hover:bg-red-50',
    header: 'text-red-700',
    accent: 'bg-red-500',
    badge: 'bg-red-50 text-red-600 border-red-200',
    resetHover: 'hover:bg-red-50 hover:text-red-600 hover:border-red-200',
    maxBadge: 'bg-red-50 text-red-600 border-red-200',
    rowHover: 'hover:border-red-300 hover:bg-red-50',
    btnActive: 'bg-red-500 text-white hover:bg-red-600',
    btnBase: 'bg-white text-red-600 border-red-200 hover:bg-red-50',
    valueActive: 'text-red-700 font-black',
  },
  '관찰': {
    tab: 'bg-blue-500 text-white',
    inactive: 'bg-white text-blue-700 border border-blue-200 hover:bg-blue-50',
    header: 'text-blue-700',
    accent: 'bg-blue-500',
    badge: 'bg-blue-50 text-blue-600 border-blue-200',
    resetHover: 'hover:bg-red-50 hover:text-red-600 hover:border-red-200',
    maxBadge: 'bg-blue-50 text-blue-600 border-blue-200',
    rowHover: 'hover:border-blue-300 hover:bg-blue-50',
    btnActive: 'bg-blue-500 text-white hover:bg-blue-600',
    btnBase: 'bg-white text-blue-600 border-blue-200 hover:bg-blue-50',
    valueActive: 'text-blue-700 font-black',
  },
  '채집': {
    tab: 'bg-green-500 text-white',
    inactive: 'bg-white text-green-700 border border-green-200 hover:bg-green-50',
    header: 'text-green-700',
    accent: 'bg-green-500',
    badge: 'bg-green-50 text-green-600 border-green-200',
    resetHover: 'hover:bg-red-50 hover:text-red-600 hover:border-red-200',
    maxBadge: 'bg-green-50 text-green-600 border-green-200',
    rowHover: 'hover:border-green-300 hover:bg-green-50',
    btnActive: 'bg-green-500 text-white hover:bg-green-600',
    btnBase: 'bg-white text-green-600 border-green-200 hover:bg-green-50',
    valueActive: 'text-green-700 font-black',
  },
} as const;

// ── 인라인 숫자 조절기 컴포넌트 ─────────────────────────────────
interface NumberStepperProps {
  value: number;
  min: number;
  max: number;
  onChange: (val: number) => void;
  colors: typeof CATEGORY_COLORS['전리품'];
}

function NumberStepper({ value, min, max, onChange, colors }: NumberStepperProps) {
  const [inputVal, setInputVal] = React.useState(String(value));

  // 외부에서 value가 바뀌면 input 동기화
  React.useEffect(() => {
    setInputVal(String(value));
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputVal(e.target.value);
  };

  const handleInputBlur = () => {
    const parsed = parseInt(inputVal, 10);
    if (isNaN(parsed)) {
      setInputVal(String(value));
    } else {
      const clamped = Math.min(max, Math.max(min, parsed));
      onChange(clamped);
      setInputVal(String(clamped));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
  };

  const isSet = value > min;

  return (
    <div className="flex items-center gap-1">
      {/* 감소 버튼 */}
      <button
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className={`w-7 h-7 rounded-lg border text-sm font-black flex items-center justify-center transition-all
          ${value <= min
            ? 'bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed'
            : `${colors.btnBase} border`}`}
      >
        <Minus size={12} strokeWidth={3} />
      </button>

      {/* 직접 입력 가능한 숫자 필드 */}
      <input
        type="number"
        min={min}
        max={max}
        value={inputVal}
        onChange={handleInputChange}
        onBlur={handleInputBlur}
        onKeyDown={handleKeyDown}
        className={`w-12 h-7 rounded-lg border text-center text-[13px] transition-all outline-none
          focus:ring-2 focus:ring-offset-0
          [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none
          ${isSet
            ? `${colors.badge} border font-black focus:ring-current`
            : 'bg-slate-50 text-slate-500 border-slate-200 font-bold focus:ring-slate-300'}`}
      />

      {/* 증가 버튼 */}
      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className={`w-7 h-7 rounded-lg border text-sm font-black flex items-center justify-center transition-all
          ${value >= max
            ? `${colors.btnActive} border-transparent opacity-80 cursor-not-allowed`
            : `${colors.btnBase} border`}`}
      >
        <Plus size={12} strokeWidth={3} />
      </button>
    </div>
  );
}

export default function SkillSettings({ targetLevels, setTargetLevels }: Props) {
  const [activeTab, setActiveTab] = React.useState<string>('전리품');

  const categories = [
    { name: '전리품', skills: ['투쟁적인 탐험가', '호전적인 탐험가', '꼼꼼한 탐험가', '주의깊은 탐험가', '성실한 탐험가', '부지런한 탐험가'] },
    { name: '전투', skills: ['험지 평정', '전투적인 채집', '전투적인 관찰', '해적 척결', '맹수 척결', '해적 사냥', '맹수 사냥'] },
    { name: '관찰', skills: ['관찰 공부', '관측 후 채집', '관측 후 전투', '생물 관찰', '관찰 채집', '험지 관찰', '관찰 심화'] },
    { name: '채집', skills: ['생물 채집', '채집 우선 전투', '채집 우선 관찰', '험지 채집', '채집 심화', '채집 공부', '탐사의 기본'] },
  ];

  const getMaxLevel = (skillName: string) => MAX_LEVELS[skillName] ?? 10;

  const handleChange = (skill: string, val: number) => {
    setTargetLevels({ ...targetLevels, [skill]: Math.min(getMaxLevel(skill), val) });
  };

  const handleBatchUpdate = (skills: string[], isMax: boolean) => {
    const updates: Record<string, number> = {};
    skills.forEach(skill => { updates[skill] = isMax ? getMaxLevel(skill) : 0; });
    setTargetLevels({ ...targetLevels, ...updates });
  };

  const activeCategory = categories.find(cat => cat.name === activeTab) || categories[0];
  const colors = CATEGORY_COLORS[activeTab as keyof typeof CATEGORY_COLORS] || CATEGORY_COLORS['전리품'];

  return (
    <div className="relative z-0">

      {/* 탭 네비게이션 */}
      <div className="flex overflow-x-auto scrollbar-none gap-2 mb-4 p-1">
        {categories.map(cat => {
          const c = CATEGORY_COLORS[cat.name as keyof typeof CATEGORY_COLORS];
          return (
            <button
              key={cat.name}
              onClick={() => setActiveTab(cat.name)}
              className={`flex-1 min-w-[72px] py-2.5 px-2 rounded-xl text-center font-black text-sm transition-all whitespace-nowrap shadow-sm
                ${activeTab === cat.name ? c.tab : c.inactive}`}
            >
              {cat.name}
            </button>
          );
        })}
      </div>

      {/* 카드 본체 */}
      <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 shadow-sm">
        <div className="max-w-md mx-auto space-y-2">

          {/* 카테고리 헤더 */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3 px-1">
            <div className="flex items-center gap-2">
              <span className={`w-1.5 h-4 ${colors.accent} rounded-full`} />
              <p className={`text-[14px] font-black ${colors.header} uppercase tracking-wider`}>
                {activeCategory.name} 스킬 설정
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleBatchUpdate(activeCategory.skills, true)}
                className={`flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold rounded-lg transition-all border ${colors.badge}`}
              >
                <ChevronsUp size={13} strokeWidth={2.5} /> 일괄 MAX
              </button>
              <button
                onClick={() => handleBatchUpdate(activeCategory.skills, false)}
                className={`flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold text-slate-500 bg-white rounded-lg transition-all border border-slate-200 ${colors.resetHover}`}
              >
                <RotateCcw size={12} strokeWidth={2.5} /> 일괄 리셋
              </button>
            </div>
          </div>

          {/* 스킬 리스트 */}
          <div className="space-y-2">
            {activeCategory.skills.map(skill => {
              const maxLv = getMaxLevel(skill);
              const current = targetLevels[skill] || 0;
              const isSet = current > 0;
              return (
                <div
                  key={skill}
                  className={`flex items-center justify-between py-2.5 px-4 bg-white rounded-xl border border-slate-200 group transition-all shadow-sm ${colors.rowHover}`}
                >
                  {/* 스킬명 + 맥스 배지 */}
                  <div className="flex items-center gap-2 overflow-hidden mr-3 min-w-0">
                    <span className={`text-[13px] font-bold truncate transition-colors
                      ${isSet ? colors.header : 'text-slate-600 group-hover:text-slate-800'}`}>
                      {skill}
                    </span>
                    <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded border ${colors.maxBadge}`}>
                      최대 {maxLv}
                    </span>
                  </div>

                  {/* 숫자 조절기 */}
                  <div className="shrink-0">
                    <NumberStepper
                      value={current}
                      min={0}
                      max={maxLv}
                      onChange={(val) => handleChange(skill, val)}
                      colors={colors}
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