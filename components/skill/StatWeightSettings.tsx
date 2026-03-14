'use client';

import React from 'react';
import { Sword, Eye, Leaf, Trophy } from 'lucide-react';

export interface StatWeightConfig {
  combat: number;
  observation: number;
  gathering: number;
  lootFirst: boolean;
}

export const DEFAULT_STAT_WEIGHT_CONFIG: StatWeightConfig = {
  combat: 34,
  observation: 33,
  gathering: 33,
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
    color: 'text-red-600',
    barColor: 'bg-red-400',
    trackFill: 'bg-red-100',
    badge: 'bg-red-50 text-red-600 border-red-200',
    border: 'border-red-200',
  },
  {
    key: 'observation' as const,
    label: '탐험 관찰력',
    icon: Eye,
    color: 'text-blue-600',
    barColor: 'bg-blue-400',
    trackFill: 'bg-blue-100',
    badge: 'bg-blue-50 text-blue-600 border-blue-200',
    border: 'border-blue-200',
  },
  {
    key: 'gathering' as const,
    label: '탐험 채집력',
    icon: Leaf,
    color: 'text-green-600',
    barColor: 'bg-green-400',
    trackFill: 'bg-green-100',
    badge: 'bg-green-50 text-green-600 border-green-200',
    border: 'border-green-200',
  },
];

export const LOOT_SKILLS = [
  '투쟁적인 탐험가', '호전적인 탐험가', '꼼꼼한 탐험가',
  '주의깊은 탐험가', '성실한 탐험가', '부지런한 탐험가',
];

export default function StatWeightSettings({ config, onChange }: Props) {

  const handleSlider = (key: 'combat' | 'observation' | 'gathering', newValue: number) => {
    const others = STATS.filter(s => s.key !== key);
    const remaining = 100 - newValue;
    const otherTotal = others.reduce((sum, s) => sum + config[s.key], 0);
    const newConfig = { ...config, [key]: newValue };

    if (otherTotal === 0) {
      const half = Math.floor(remaining / 2);
      newConfig[others[0].key] = half;
      newConfig[others[1].key] = remaining - half;
    } else {
      others.forEach(s => {
        newConfig[s.key] = Math.round((config[s.key] / otherTotal) * remaining);
      });
      const newTotal = newConfig.combat + newConfig.observation + newConfig.gathering;
      const diff = 100 - newTotal;
      if (diff !== 0) {
        const largest = others.reduce((a, b) => newConfig[a.key] >= newConfig[b.key] ? a : b);
        newConfig[largest.key] += diff;
      }
    }
    onChange(newConfig);
  };

  const handleLootFirst = () => onChange({ ...config, lootFirst: !config.lootFirst });

  return (
    <div className="space-y-4">

      {/* 전리품 먼저 맥스 토글 */}
      <div
        onClick={handleLootFirst}
        className={`cursor-pointer rounded-xl border p-4 transition-all
          ${config.lootFirst
            ? 'bg-amber-50 border-amber-300 shadow-sm'
            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Trophy size={18} className={config.lootFirst ? 'text-amber-500' : 'text-slate-400'} />
            <div>
              <p className={`text-[13px] font-black ${config.lootFirst ? 'text-amber-700' : 'text-slate-600'}`}>
                전리품 먼저 맥스
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                전리품 6종 스킬을 먼저 Max 달성 후, 남은 선실에 비중 배치
              </p>
            </div>
          </div>
          {/* 토글 */}
          <div className={`w-10 h-5 rounded-full transition-all relative shrink-0
            ${config.lootFirst ? 'bg-amber-400' : 'bg-slate-200'}`}>
            <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 shadow transition-all
              ${config.lootFirst ? 'left-5' : 'left-0.5'}`} />
          </div>
        </div>

        {config.lootFirst && (
          <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-amber-200">
            {LOOT_SKILLS.map(sk => (
              <span key={sk} className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200">
                {sk} MAX
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 능력치 비중 슬라이더 카드 */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">

        {/* 헤더 */}
        <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 flex justify-between items-center">
          <span className="text-xs font-black text-slate-700 uppercase tracking-widest">
            ⚖️ 능력치 비중
          </span>
          <span className="text-[10px] font-bold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded">
            합계 100%
          </span>
        </div>

        <div className="p-4 space-y-5">

          {/* 비중 시각화 바 */}
          <div className="flex h-3 rounded-full overflow-hidden w-full gap-px shadow-inner bg-slate-100">
            <div className="bg-red-400 transition-all duration-300 rounded-l-full" style={{ width: `${config.combat}%` }} />
            <div className="bg-blue-400 transition-all duration-300" style={{ width: `${config.observation}%` }} />
            <div className="bg-green-400 transition-all duration-300 rounded-r-full" style={{ width: `${config.gathering}%` }} />
          </div>

          {/* 범례 */}
          <div className="flex gap-3 text-[10px] font-bold">
            {STATS.map(s => (
              <span key={s.key} className={`flex items-center gap-1 ${s.color}`}>
                <span className={`w-2 h-2 rounded-full ${s.barColor}`} />
                {s.label.replace('탐험 ', '')} {config[s.key]}%
              </span>
            ))}
          </div>

          {/* 슬라이더들 */}
          {STATS.map(stat => {
            const value = config[stat.key];
            const Icon = stat.icon;
            return (
              <div key={stat.key} className={`p-3 rounded-xl border ${stat.border} ${stat.trackFill}`}>
                <div className="flex justify-between items-center mb-2">
                  <span className={`text-[12px] font-black flex items-center gap-1.5 ${stat.color}`}>
                    <Icon size={13} strokeWidth={2.5} />
                    {stat.label}
                  </span>
                  <span className={`text-[14px] font-black px-2 py-0.5 rounded-lg border ${stat.badge}`}>
                    {value}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={value}
                  onChange={e => handleSlider(stat.key, Number(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer bg-white border border-slate-200"
                />
                <div className="flex justify-between mt-1">
                  <span className="text-[9px] text-slate-400">0%</span>
                  <span className="text-[9px] text-slate-400">50%</span>
                  <span className="text-[9px] text-slate-400">100%</span>
                </div>
              </div>
            );
          })}

          <p className="text-[10px] text-slate-400 pt-1 border-t border-slate-100">
            슬라이더를 올리면 나머지 능력치가 자동으로 줄어들어 합계 100%를 유지합니다.
          </p>
        </div>
      </div>
    </div>
  );
}