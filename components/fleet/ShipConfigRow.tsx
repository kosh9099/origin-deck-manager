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
    <div className="bg-slate-800/60 rounded-xl border border-white/5 hover:border-indigo-500/30 transition-all mb-2 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
      
      {/* 1. 함선 번호 헤더 */}
      <div className="flex items-center gap-3">
        <div className="w-1.5 h-4 bg-indigo-400 rounded-full" />
        <span className="font-black text-[14px] italic text-indigo-300 whitespace-nowrap">
          {ship.id}번 함선
        </span>
      </div>
      
      {/* 2. 입력 컨텐츠 */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-end">
        <div className="flex justify-between sm:justify-end items-center gap-4">
          <span className="text-sm font-bold text-slate-400 sm:hidden">총 선실:</span>
          <NumberInput 
            value={ship.총선실} 
            min={8} 
            max={11} 
            onChange={(val) => onChange({...ship, 총선실: val})} 
            colorTheme="blue"
            size="sm"
          />
        </div>
        
        <div className="flex justify-between sm:justify-end items-center gap-4">
          <span className="text-sm font-bold text-slate-400 sm:hidden">전투 선실:</span>
          <NumberInput 
            value={ship.전투선실} 
            min={0} 
            max={5} 
            colorTheme="red"
            onChange={(val) => onChange({...ship, 전투선실: val})} 
            size="sm"
          />
        </div>
      </div>
      
    </div>
  );
}