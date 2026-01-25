'use client';

import React, { useState } from 'react';
import { ShipConfig } from '@/types';
import { Copy, Ship } from 'lucide-react';
import ShipConfigRow from './ShipConfigRow';
import NumberInput from '../common/NumberInput';

interface Props {
  fleetConfig: ShipConfig[];
  setFleetConfig: (config: ShipConfig[]) => void;
}

export default function ShipConfiguration({ fleetConfig, setFleetConfig }: Props) {
  const [batchTotal, setBatchTotal] = useState(10);
  const [batchCombat, setBatchCombat] = useState(3);

  const handleRowChange = (updatedShip: ShipConfig) => {
    setFleetConfig(fleetConfig.map(s => s.id === updatedShip.id ? updatedShip : s));
  };

  const applyBatch = () => {
    const newConfig = fleetConfig.map(ship => ({
      ...ship,
      총선실: Math.min(11, Math.max(8, batchTotal)),
      전투선실: Math.min(5, Math.max(0, batchCombat))
    }));
    setFleetConfig(newConfig);
  };

  return (
    <div className="relative z-0 mt-2">
      
      {/* 배너: 배 아이콘 + 함대 설정 (Indigo) */}
      <div className="bg-indigo-600 px-4 py-2 rounded-t-xl border-b-2 border-indigo-400 shadow-lg">
        <h2 className="text-[13px] font-black text-white uppercase tracking-widest flex items-center gap-2">
          <Ship size={16} strokeWidth={2.5} />
          함대 설정 (Fleet Config)
        </h2>
      </div>

      <div className="bg-slate-900/90 rounded-b-xl p-3 border border-white/5 backdrop-blur-md">
        
        {/* 일괄 적용 패널 */}
        <div className="flex items-center justify-between bg-slate-800/80 p-2 mb-3 rounded-xl border border-white/10 shadow-inner">
          
          {/* [수정] 라벨 변경: ALL -> 전체 함대 */}
          <span className="text-[13px] font-black text-indigo-400 border-r border-white/10 pr-3 pl-1 whitespace-nowrap">
            전체 함대
          </span>
          
          {/* 컨트롤러 그룹 */}
          <div className="flex items-end gap-2"> 
            
            {/* 총선실 */}
            <NumberInput 
              label="TOTAL"
              value={batchTotal} min={8} max={11} 
              onChange={setBatchTotal} 
              colorTheme="blue" 
              size="sm" 
            />

            {/* 전투선실 */}
            <NumberInput 
              label="COMBAT"
              value={batchCombat} min={0} max={5} 
              onChange={setBatchCombat} 
              colorTheme="red" 
              size="sm" 
            />

            {/* 적용 버튼 */}
            <button 
              onClick={applyBatch}
              className="flex flex-col items-center justify-center gap-0.5 px-3 py-0.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded border-b-2 border-indigo-800 active:border-b-0 active:translate-y-[1px] transition-all h-[28px] min-w-[45px] shadow ml-1"
            >
              <Copy size={12} />
              <span className="text-[9px] font-bold leading-none">적용</span>
            </button>
          </div>
        </div>

        {/* 개별 함선 리스트 */}
        <div className="space-y-1 max-h-[400px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-700">
          {fleetConfig.map((ship) => (
            <ShipConfigRow 
              key={ship.id} 
              ship={ship} 
              onChange={handleRowChange} 
            />
          ))}
        </div>
      </div>
    </div>
  );
}