import React from 'react';
import { 
  BarChart, Sword, Eye, Sprout, 
  Skull, PawPrint 
} from 'lucide-react';
import { SkillStat } from '@/lib/optimizer/data/skillStats';

interface Props {
  stats: SkillStat;
}

export default function StatSummaryCard({ stats }: Props) {
  // 전리품 획득(Gem) 아이콘과 항목을 제거하고, 해적/맹수 전투의 % 단위를 삭제했습니다.
  const statItems = [
    { label: '탐험 전투력', value: stats.combat, icon: Sword, color: 'text-red-400', bg: 'bg-red-500/10' },
    { label: '탐험 관찰력', value: stats.observation, icon: Eye, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: '탐험 채집력', value: stats.gathering, icon: Sprout, color: 'text-green-400', bg: 'bg-green-500/10' },
    { label: '해적 전투', value: stats.pirate, icon: Skull, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { label: '맹수 전투', value: stats.beast, icon: PawPrint, color: 'text-orange-400', bg: 'bg-orange-500/10' },
  ];

  return (
    <div className="bg-slate-900 border border-white/10 rounded-xl overflow-hidden shadow-sm flex flex-col h-full">
      
      {/* 헤더 */}
      <div className="bg-[#E5D0AC] px-3 py-2 border-b border-[#C8B28E] flex justify-between items-center shrink-0">
        <span className="text-xs font-black text-[#5D4037] uppercase tracking-widest flex items-center gap-1.5">
          <BarChart size={12} strokeWidth={2.5} className="text-[#5D4037]" />
          능력치 합계
        </span>
      </div>

      {/* [수정] flex-1과 justify-between을 사용하여 높이를 꽉 채우고 균등 분할 */}
      <div className="p-3 flex-1 flex flex-col justify-between">
        {statItems.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between py-1 px-2 rounded border border-white/5 bg-white/5 hover:bg-white/10 transition-colors">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded ${item.bg}`}>
                <item.icon size={14} className={item.color} />
              </div>
              <span className="text-[11px] font-bold text-slate-300">
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