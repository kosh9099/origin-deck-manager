'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Sailor, ShipConfig, OptimizerOptions } from '@/types';
import { generateOptimizedFleet } from '@/lib/optimizer';
import { RefreshCw, Play } from 'lucide-react';

// 컴포넌트 임포트
import FleetSettings from '@/components/fleet/FleetSettings';
import CrewManager from '@/components/crew/CrewManager';
import SkillSettings from '@/components/skill/SkillSettings';
import SkillDashboard from '@/components/skill/SkillDashboard';
import FleetDisplay from '@/components/display/FleetDisplay';

export default function FleetMasterV2() {
  // --- 1. 상태 관리 (State) ---
  const [sailors, setSailors] = useState<Sailor[]>([]);
  
  // 선장 설정 상태
  const [admiralSearch, setAdmiralSearch] = useState('');
  const [isAdmiralListOpen, setIsAdmiralListOpen] = useState(false);
  const [selectedAdmiral, setSelectedAdmiral] = useState<number | null>(null);
  
  // 함대 설정 상태
  const [fleetConfig, setFleetConfig] = useState<ShipConfig[]>(
    Array.from({ length: 7 }, (_, i) => ({ id: i + 1, 총선실: 10, 전투선실: 3 }))
  );
  
  const [options, setOptions] = useState<OptimizerOptions>({
    includeBoarding: false,
    includeSpecialForces: false,
    includeTrade: false
  });

  // 스킬 및 결과 상태
  const [targetLevels, setTargetLevels] = useState<Record<string, number>>({});
  const [result, setResult] = useState<any>(null);

  // 필수/금지 항해사 및 검색 상태
  const [essentialIds, setEssentialIds] = useState<Set<number>>(new Set());
  const [bannedIds, setBannedIds] = useState<Set<number>>(new Set());
  const [crewSearch, setCrewSearch] = useState('');
  const [isCrewSearchOpen, setIsCrewSearchOpen] = useState(false);

  // --- 2. 데이터 보급 라인 (Data Fetch) ---
  useEffect(() => {
    async function fetchSailors() {
      const { data, error } = await supabase.from('sailors').select('*').order('이름');
      
      if (error) {
        console.error("❌ 데이터 보급 실패:", error);
      } else {
        setSailors(data || []);
      }
    }
    fetchSailors();
  }, []);

  // --- 3. 엔진 가동 함수 (수동 실행용) ---
  const handleStart = () => {
    if (!selectedAdmiral) {
      alert("선장(제독)을 먼저 선택해야 함대가 출항할 수 있습니다!");
      return;
    }

    // [수정] try-catch 문으로 감싸서 에러(스킬 미설정 등)를 잡아냅니다.
    try {
      const res = generateOptimizedFleet(
        sailors,
        essentialIds,
        bannedIds,
        fleetConfig,
        selectedAdmiral,
        targetLevels,
        options
      );
      setResult(res);
    } catch (error: any) {
      // 에러 메시지("스킬을 설정해주세요.")를 알림창으로 표시
      alert(error.message);
    }
  };

  // --- 4. 옵션 변경 시 실시간 반영 핸들러 ---
  const handleOptionChange = (newOpts: OptimizerOptions) => {
    setOptions(newOpts);
    
    // 이미 덱이 생성되어 있다면, 옵션 변경 즉시 재계산
    if (result && selectedAdmiral) {
      try {
        const res = generateOptimizedFleet(
          sailors,
          essentialIds,
          bannedIds,
          fleetConfig,
          selectedAdmiral,
          targetLevels,
          newOpts // 변경된 옵션 적용
        );
        setResult(res);
      } catch (error: any) {
        // 백그라운드 재계산 중 에러는 조용히 콘솔에만 남기거나 무시
        console.warn("옵션 반영 실패:", error.message);
      }
    }
  };

  // --- 5. 덱에서 밴 처리 핸들러 (즉시 리필) ---
  const handleBanFromDeck = (id: number) => {
    // 1. 로컬 변수로 먼저 계산
    const nextBan = new Set(bannedIds);
    nextBan.add(id);
    
    const nextEssential = new Set(essentialIds);
    if (nextEssential.has(id)) {
      nextEssential.delete(id);
    }

    // 2. State 업데이트
    setBannedIds(nextBan);
    setEssentialIds(nextEssential);

    // 3. 즉시 재계산 (빈자리 채우기)
    if (selectedAdmiral) {
      try {
        const res = generateOptimizedFleet(
          sailors,
          nextEssential,
          nextBan,
          fleetConfig,
          selectedAdmiral,
          targetLevels,
          options
        );
        setResult(res);
      } catch (error: any) {
        console.warn("밴 처리 후 재계산 실패:", error.message);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#05070a] text-slate-100 p-2 font-sans">
      {/* 최상단 헤더 */}
      <header className="max-w-[1550px] mx-auto mb-6 flex justify-between items-end px-2 mt-4">
        <div className="flex flex-col gap-1">
          {/* 타이틀 그룹 */}
          <div className="flex items-end gap-3">
            <h1 className="text-4xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-orange-400 to-indigo-400 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
              호그라나도 육탐 매니저 <span className="text-3xl not-italic text-indigo-400">V2</span>
            </h1>
            
            {/* 서명 */}
            <span className="text-sm font-bold text-slate-300 mb-2 tracking-wide">
              by 고든이고든요
            </span>
          </div>
        </div>

        {/* 덱 생성 버튼 */}
        <button 
          onClick={handleStart} 
          className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl font-black text-lg text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] border border-blue-400/30 hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 group"
        >
          <Play size={20} fill="currentColor" className="group-hover:scale-110 transition-transform" />
          덱 생성 START
        </button>
      </header>

      <main className="max-w-[1550px] mx-auto grid grid-cols-12 gap-3">
        {/* 좌측: 설정창 */}
        <div className="col-span-3 space-y-3">
          <FleetSettings 
            sailors={sailors}
            admiralSearch={admiralSearch}
            setAdmiralSearch={setAdmiralSearch}
            isAdmiralListOpen={isAdmiralListOpen}
            setIsAdmiralListOpen={setIsAdmiralListOpen}
            selectedAdmiral={selectedAdmiral}
            setSelectedAdmiral={setSelectedAdmiral}
            fleetConfig={fleetConfig}
            setFleetConfig={setFleetConfig}
          />

          <CrewManager 
            sailors={sailors}
            essentialIds={essentialIds} setEssentialIds={setEssentialIds}
            bannedIds={bannedIds} setBannedIds={setBannedIds}
            crewSearch={crewSearch} setCrewSearch={setCrewSearch}
            isCrewSearchOpen={isCrewSearchOpen} setIsCrewSearchOpen={setIsCrewSearchOpen}
            options={options} 
            setOptions={handleOptionChange}
          />
        </div>

        {/* 우측: 대시보드 및 결과 */}
        <div className="col-span-9 space-y-3">
          <SkillSettings targetLevels={targetLevels} setTargetLevels={setTargetLevels} />
          <SkillDashboard result={result} targetLevels={targetLevels} />
          
          <FleetDisplay 
            result={result} 
            fleetConfig={fleetConfig} 
            onBan={handleBanFromDeck} 
          />
        </div>
      </main>
    </div>
  );
}