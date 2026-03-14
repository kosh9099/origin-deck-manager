import React from 'react';
import { BarChart, Sword, Eye, Sprout, Skull, PawPrint } from 'lucide-react';
import { SkillStat } from '@/lib/optimizer/data/skillStats';

interface Props {
  stats: SkillStat;
}

export default function StatSummaryCard({ stats }: Props) {
  const statItems = [
    { label: '탐험 전투력', value: stats.combat, icon: Sword, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
    { label: '탐험 관찰력', value: stats.observation, icon: Eye, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
    { label: '탐험 채집력', value: stats.gathering, icon: Sprout, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
    { label: '해적 전투', value: stats.pirate, icon: Skull, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
    { label: '맹수 전투', value: stats.beast, icon: PawPrint, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col h-full">

      {/* 헤더 */}
      <div className="bg-slate-700 px-3 py-2 flex justify-between items-center shrink-0">
        <span className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-1.5">
          <BarChart size={12} strokeWidth={2.5} />
          능력치 합계
        </span>
      </div>

      <div className="p-3 flex-1 flex flex-col justify-between gap-1.5">
        {statItems.map((item, idx) => (
          <div key={idx}
            className={`flex items-center justify-between py-1.5 px-2 rounded-lg border ${item.border} ${item.bg} transition-colors`}>
            <div className="flex items-center gap-2">
              <item.icon size={13} className={item.color} />
              <span className={`text-[11px] font-bold ${item.color}`}>
                {item.label}
              </span>
            </div>
            <span className={`text-[13px] font-black ${item.color}`}>
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}