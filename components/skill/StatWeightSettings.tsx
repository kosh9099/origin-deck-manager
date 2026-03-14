'use client';

import React from 'react';
import { Sword, Eye, Leaf, Trophy } from 'lucide-react';

export interface StatWeightConfig {
  combat: number;      // 0~100
  observation: number; // 0~100
  gathering: number;   // 0~100
  lootFirst: boolean;  // 전리품 6종 먼저 맥스 후 배치
}

export const DEFAULT_STAT_WEIGHT_CONFIG: StatWeightConfig = {
  combat: 0,
  observation: 0,
  gathering: 0,
  lootFirst: false,
};

interface Props {
  config: StatWeightConfig;
  onChange: (config: StatWeightConfig) => void;
}

const STATS = [
  {
    key: 'combat' as const,
    label: '탐험 전투력',
    icon: Sword,
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    glow: 'shadow-[0_0_8px_rgba(239,68,68,0.3)]',
  },
  {
    key: 'observation' as const,
    label: '탐험 관찰력',
    icon: Eye,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    glow: 'shadow-[0_0_8px_rgba(59,130,246,0.3)]',
  },
  {
    key: 'gathering' as const,
    label: '탐험 채집력',
    icon: Leaf,
    color: 'text-green-400',
    bg: 'bg-green-500/10',
    border: 'border-green-500/20',
    glow: 'shadow-[0_0_8px_rgba(34,197,94,0.3)]',
  },
];

export const LOOT_SKILLS = [
  '투쟁적인 탐험가', '호전적인 탐험가', '꼼꼼한 탐험가',
  '주의깊은 탐험가', '성실한 탐험가', '부지런한 탐험가',
];

export default function StatWeightSettings({ config, onChange }: Props) {
  const total = config.combat + config.observation + config.gathering;
  const isActive = total > 0;

  const handleSlider = (key: 'combat' | 'observation' | 'gathering', value: number) => {
    onChange({ ...config, [key]: value });
  };

  const handleLootFirst = () => {
    onChange({ ...config, lootFirst: !config.lootFirst });
  };

  return (
    <div className="space-y-4">

      {/* 전리품 먼저 맥스 버튼 */}
      <div
        onClick={handleLootFirst}
        className={`cursor-pointer rounded-xl border p-4 transition-all
          ${config.lootFirst
            ? 'bg-amber-500/10 border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
            : 'bg-slate-800/60 border-white/5 hover:border-white/20'}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy size={16} className={config.lootFirst ? 'text-amber-400' : 'text-slate-500'} />
            <div>
              <p className={`text-[13px] font-black ${config.lootFirst ? 'text-amber-300' : 'text-slate-300'}`}>
                전리품 먼저 맥스
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                전리품 6종 스킬을 먼저 Max 달성 후, 남은 선실에 비중 배치
              </p>
            </div>
          </div>
          {/* 토글 표시 */}
          <div className={`w-10 h-5 rounded-full transition-all relative
            ${config.lootFirst ? 'bg-amber-500' : 'bg-slate-700'}`}>
            <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all
              ${config.lootFirst ? 'left-5' : 'left-0.5'}`} />
          </div>
        </div>

        {/* 전리품 스킬 목록 */}
        {config.lootFirst && (
          <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-amber-500/20">
            {LOOT_SKILLS.map(sk => (
              <span key={sk} className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                {sk} MAX
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 슬라이더 카드 */}
      <div className="bg-slate-900 border border-white/10 rounded-xl overflow-hidden shadow-sm">
        <div className="bg-[#E5D0AC] px-3 py-2 border-b border-[#C8B28E] flex justify-between items-center">
          <span className="text-xs font-black text-[#5D4037] uppercase tracking-widest">
            ⚖️ 능력치 비중
          </span>
          <div className="flex items-center gap-1.5">
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border
              ${isActive
                ? 'text-amber-400 bg-amber-500/10 border-amber-500/30'
                : 'text-slate-500 bg-slate-800 border-slate-700'}`}>
              {isActive ? `합계 ${total}` : '미설정'}
            </span>
          </div>
        </div>

        <div className="p-3 space-y-4">
          {STATS.map(stat => {
            const value = config[stat.key];
            const percent = total > 0 ? Math.round((value / total) * 100) : 0;
            const Icon = stat.icon;

            return (
              <div key={stat.key}>
                <div className="flex justify-between items-center mb-1.5">
                  <span className={`text-[11px] font-bold flex items-center gap-1 ${stat.color}`}>
                    <Icon size={11} strokeWidth={2.5} />
                    {stat.label}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {isActive && (
                      <span className={`text-[9px] font-bold px-1 rounded border ${stat.bg} ${stat.color} ${stat.border}`}>
                        {percent}%
                      </span>
                    )}
                    <span className={`text-[11px] font-black w-6 text-right ${value > 0 ? stat.color : 'text-slate-600'}`}>
                      {value}
                    </span>
                  </div>
                </div>

                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={value}
                  onChange={e => handleSlider(stat.key, Number(e.target.value))}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-slate-800 border border-white/5"
                />

                <div className="flex justify-between mt-0.5">
                  <span className="text-[8px] text-slate-700">0</span>
                  <span className="text-[8px] text-slate-700">50</span>
                  <span className="text-[8px] text-slate-700">100</span>
                </div>
              </div>
            );
          })}

          <p className="text-[9px] text-slate-600 pt-1 border-t border-white/5">
            {isActive
              ? '설정된 비중에 따라 해당 능력치에 기여하는 항해사가 우선 배치됩니다.'
              : '슬라이더를 조정하면 능력치 비중이 배치 우선순위에 반영됩니다.'}
          </p>
        </div>
      </div>
    </div>
  );
}