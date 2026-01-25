'use client';

import React from 'react';
import SailorCard from './SailorCard';
import { Sailor, ShipConfig } from '@/types';

interface Props {
  shipId: string;
  data: any;
  shipConf: ShipConfig;
  onBan?: (id: number) => void;
}

export default function ResultShipCard({ shipId, data, shipConf, onBan }: Props) {
  const config = shipConf || { 총선실: 10, 전투선실: 0 };
  const total = config.총선실 || 10;
  const combatCount = config.전투선실 || 0;

  const slots = Array.from({ length: total }).map((_, idx) => {
    let type: 'admiral' | 'adventure' | 'combat' = 'adventure';
    let sailor: Sailor | null = null;
    let isCaptain = false;
    
    if (shipId === "1" && idx === 0) { 
      type = 'admiral'; 
      sailor = data?.admiral || null; 
      isCaptain = true; 
    }
    else if (idx >= total - combatCount) { 
      type = 'combat'; 
      const combatIdx = idx - (total - combatCount);
      sailor = data?.combat?.[combatIdx] || null; 
    } 
    else { 
      type = 'adventure';
      const advIdx = shipId === "1" ? idx - 1 : idx;
      sailor = data?.adventure?.[advIdx] || null;
    }
    
    if (sailor && !sailor.타입) sailor = null;

    return { type, sailor, isCaptain };
  });

  // [유틸리티] 빈 슬롯 타입별 스타일 반환 (테두리 및 배경)
  const getEmptySlotStyle = (type: string) => {
    switch (type) {
      case 'combat':
        return 'border-red-500/20 bg-red-500/5 text-red-500/40';
      case 'admiral':
        return 'border-amber-500/30 bg-amber-500/5 text-amber-500/50';
      case 'adventure':
      default:
        return 'border-blue-500/20 bg-blue-500/5 text-blue-400/40';
    }
  };

  return (
    <div className="bg-slate-900/90 border border-white/5 rounded-[1.5rem] overflow-hidden shadow-2xl h-full flex flex-col">
      {/* 함선 헤더 */}
      <div className="bg-white/5 px-4 py-2 flex justify-between items-center border-b border-white/5 shrink-0 min-h-[40px]">
        <span className="font-black text-blue-400 italic text-sm">{shipId}번 함선</span>
        <div className="flex gap-2 text-[9px] font-black uppercase">
          <span className="text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">
            ADV: {total - combatCount - (shipId === "1" ? 1 : 0)}
          </span>
          <span className="text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">
            CBT: {combatCount}
          </span>
        </div>
      </div>

      {/* 카드 그리드 영역 (간격 축소: gap-1, 패딩 축소: p-2) */}
      <div className="p-2 grid grid-cols-5 gap-1 flex-1 items-start content-start">
        {slots.map((slot, i) => (
          <div key={i} className="flex items-start justify-center">
            {slot.sailor ? (
              <SailorCard 
                sailor={slot.sailor} 
                label={slot.type} // 라벨 전달
                isCaptain={slot.isCaptain} 
                onClick={slot.isCaptain ? undefined : () => onBan?.(slot.sailor!.id)} 
              />
            ) : (
              /* [수정] 빈 슬롯 높이: h-[145px] -> h-[124px] (카드와 일치) */
              <div className={`w-full h-[124px] border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-1 transition-all duration-300
                ${getEmptySlotStyle(slot.type)}`}>
                <span className="text-[10px] font-black uppercase tracking-widest">
                  {slot.type === 'combat' ? 'Combat' : slot.type === 'admiral' ? 'Flag' : 'Adv'}
                </span>
                <span className="text-[8px] font-bold opacity-50 uppercase tracking-tighter">Empty</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}