'use client';

import React from 'react';
import { ShipConfig, Sailor } from '@/types';
import AdmiralSelector from './AdmiralSelector';       
import ShipConfiguration from './ShipConfiguration'; 

interface Props {
  sailors: Sailor[];
  admiralSearch: string;
  setAdmiralSearch: (q: string) => void;
  isAdmiralListOpen: boolean;
  setIsAdmiralListOpen: (open: boolean) => void;
  selectedAdmiral: number | null;
  setSelectedAdmiral: (id: number | null) => void;
  fleetConfig: ShipConfig[];
  setFleetConfig: (config: ShipConfig[]) => void;
}

export default function FleetSettings(props: Props) {
  return (
    // [수정] mt-2: 메인 배너와의 간격 확보 / gap-1: 내부 요소 밀착
    <div className="flex flex-col gap-1 relative z-10 px-1 mt-2">
      
      {/* 1. 제독 검색 모듈 */}
      <AdmiralSelector 
        search={props.admiralSearch}
        setSearch={props.setAdmiralSearch}
        isOpen={props.isAdmiralListOpen}
        setIsOpen={props.setIsAdmiralListOpen}
        selectedId={props.selectedAdmiral}
        onSelect={props.setSelectedAdmiral}
        sailors={props.sailors}
      />

      {/* [삭제됨] 구분선 및 여백 제거 */}

      {/* 2. 함선 구성 모듈 */}
      <ShipConfiguration 
        fleetConfig={props.fleetConfig}
        setFleetConfig={props.setFleetConfig}
      />
    </div>
  );
}