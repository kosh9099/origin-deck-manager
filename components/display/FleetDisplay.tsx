'use client';

import React from 'react';
import ResultShipCard from './ResultShipCard';
import { ShipConfig } from '@/types';

interface Props {
  result: any;
  fleetConfig: ShipConfig[]; // [필수] 함선 설정 정보 필요
  onBan: (id: number) => void; // [필수] 밴 핸들러
}

export default function FleetDisplay({ result, fleetConfig, onBan }: Props) {
  if (!result || !result.ships) return null;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mt-6">
      {result.ships.map((shipData: any, idx: number) => (
        <div key={idx} className="h-full">
          {/* ResultShipCard를 사용하여 더 예쁜 UI 적용 */}
          <ResultShipCard 
            shipId={(idx + 1).toString()}
            data={shipData}
            shipConf={fleetConfig[idx]} // 설정값 전달
            onBan={onBan} // 밴 핸들러 전달
          />
        </div>
      ))}
    </div>
  );
}