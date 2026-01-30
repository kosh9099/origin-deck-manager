'use client';

import React, { useState } from 'react';
import { ShipConfig } from '@/types';
import { Ship } from 'lucide-react'; // Copy 아이콘 제거
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

  // [수정] 총선실 일괄 실시간 변경 핸들러
  const handleBatchTotalChange = (val: number) => {
    const limitedVal = Math.min(11, Math.max(8, val));
    setBatchTotal(limitedVal);
    
    const newConfig = fleetConfig.map(ship => ({
      ...ship,
      총선실: limitedVal
    }));
    setFleetConfig(newConfig);
  };

  // [수정] 전투선실 일괄 실시간 변경 핸들러
  const handleBatchCombatChange = (val: number) => {
    const limitedVal = Math.min(5, Math.max(0, val));
    setBatchCombat(limitedVal);
    
    const newConfig = fleetConfig.map(ship => ({
      ...ship,
      전투선실: limitedVal
    }));
    setFleetConfig(newConfig);
  };

  return (
    <div className="relative z-0 mt-2">
      
      {/* 배너 */}
      <div className="bg-indigo-600 px-4 py-2 rounded-t-xl border-b-2 border-indigo-400 shadow-lg">
        <h2 className="text-[13px] font-black text-white uppercase tracking-widest flex items-center gap-2">
          <Ship size={16} strokeWidth={2.5} />
          함대 설정 (Fleet Config)
        </h2>
      </div>

      <div className="bg-slate-900/90 rounded-b-xl p-3 border border-white/5 backdrop-blur-md">
        
        {/* 일괄 적용 패널 (버튼 제거 버전) */}
        <div className="flex items-center justify-between bg-slate-800/80 p-2 mb-3 rounded-xl border border-white/10 shadow-inner mr-1">
          
          <span className="text-[13px] font-black text-indigo-400 border-r border-white/10 pr-3 pl-1 whitespace-nowrap">
            전체 함대
          </span>
          
          <div className="flex items-center gap-1.5 pr-2"> 
            
            {/* 총선실 컨트롤러 */}
            <NumberInput 
              label="TOTAL"
              value={batchTotal} min={8} max={11} 
              onChange={handleBatchTotalChange} 
              colorTheme="blue" 
              size="sm" 
            />

            {/* 전투선실 컨트롤러 */}
            <NumberInput 
              label="COMBAT"
              value={batchCombat} min={0} max={5} 
              onChange={handleBatchCombatChange} 
              colorTheme="red" 
              size="sm" 
            />
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