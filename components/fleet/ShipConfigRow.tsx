'use client';

import React from 'react';
import NumberInput from '../common/NumberInput';
import { ShipConfig } from '@/types';

interface Props {
  ship: ShipConfig;
  onChange: (updatedShip: ShipConfig) => void;
}

export default function ShipConfigRow({ ship, onChange }: Props) {
  return (
    <div className="flex items-center justify-between bg-white/5 p-1.5 px-3 rounded-xl border border-transparent hover:border-white/10 transition-all mb-1">
      
      {/* 1. 함선 번호 */}
      <div className="flex items-center gap-2 min-w-[70px]">
        <div className="w-1 h-3 bg-slate-600 rounded-full" />
        <span className="font-black text-slate-300 text-[12px] italic whitespace-nowrap">
          {ship.id}번 함선
        </span>
      </div>
      
      {/* 2. 입력 컨트롤러 (간격 좁힘: gap-1.5) */}
      <div className="flex items-center justify-end gap-1.5"> 
        <NumberInput 
          value={ship.총선실} 
          min={8} 
          max={11} 
          onChange={(val) => onChange({...ship, 총선실: val})} 
          colorTheme="blue"
          size="sm" // 작은 사이즈 사용
        />
        
        <NumberInput 
          value={ship.전투선실} 
          min={0} 
          max={5} 
          colorTheme="red"
          onChange={(val) => onChange({...ship, 전투선실: val})} 
          size="sm" // 작은 사이즈 사용
        />
      </div>
    </div>
  );
}