'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Sailor, ShipConfig, OptimizerOptions } from '@/types';
import { generateOptimizedFleet } from '@/lib/optimizer';
import { Play, Home, LayoutDashboard, Anchor, Users, Target, Menu, X, Camera } from 'lucide-react';
import Link from 'next/link';
import { captureAndDownload } from '@/lib/utils/capture';

// 컴포넌트 임포트
import FleetSettings from '@/components/fleet/FleetSettings';
import CrewManager from '@/components/crew/CrewManager';
import SkillSettings from '@/components/skill/SkillSettings';
import SkillDashboard from '@/components/skill/SkillDashboard';
import FleetDisplay from '@/components/display/FleetDisplay';

type TabType = 'dashboard' | 'fleet' | 'crew' | 'skills';

export default function FleetMasterV2() {
  // --- 1. 네비게이션 상태 ---
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // --- 2. 상태 관리 (State) ---
  const [sailors, setSailors] = useState<Sailor[]>([]);
  
  // 선장 설정 상태
  const [admiralSearch, setAdmiralSearch] = useState('');
  const [isAdmiralListOpen, setIsAdmiralListOpen] = useState(false);
  const [selectedAdmiral, setSelectedAdmiral] = useState<number | null>(null);
  
  // 함대 설정 상태
  const [fleetConfig, setFleetConfig] = useState<ShipConfig[]>(
    Array.from({ length: 7 }, (_, i) => ({ id: i + 1, 총선실: 10, 전투선실: 3 }))
  );
  
  // 엔진 계산을 위해 기본 설정값은 유지
  const [options, setOptions] = useState<OptimizerOptions>({
    includeBoarding: false,
    includeSpecialForces: false,
    includeTrade: false,
    prioritizeSupply: false
  });

  // 스킬 및 결과 상태
  const [targetLevels, setTargetLevels] = useState<Record<string, number>>({});
  const [result, setResult] = useState<any>(null);

  // 필수/금지 항해사 및 검색 상태
  const [essentialIds, setEssentialIds] = useState<Set<number>>(new Set());
  const [bannedIds, setBannedIds] = useState<Set<number>>(new Set());
  const [crewSearch, setCrewSearch] = useState('');
  const [isCrewSearchOpen, setIsCrewSearchOpen] = useState(false);

  // --- 3. 데이터 보급 라인 ---
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

  // --- 4. 엔진 가동 함수 ---
  const handleStart = () => {
    if (!selectedAdmiral) {
      alert("선장(제독)을 먼저 선택해야 함대가 출항할 수 있습니다!");
      return;
    }

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
      setActiveTab('dashboard'); // 계산 완료 후 대시보드로 자동 이동
      if(isMobileMenuOpen) setIsMobileMenuOpen(false);
    } catch (error: any) {
      alert(error.message);
    }
  };

  // --- 5. 덱에서 밴 처리 핸들러 (즉시 리필) ---
  const handleBanFromDeck = (id: number) => {
    const nextBan = new Set(bannedIds).add(id);
    const nextEssential = new Set(essentialIds);
    if (nextEssential.has(id)) nextEssential.delete(id);

    setBannedIds(nextBan);
    setEssentialIds(nextEssential);

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

  // 탭 변경 핸들러 (모바일 메뉴 닫기 포함)
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
  };

  const navItems = [
    { id: 'dashboard', label: '대시보드', icon: <LayoutDashboard size={20} /> },
    { id: 'fleet', label: '함대 및 선장 설정', icon: <Anchor size={20} /> },
    { id: 'crew', label: '인원 설정', icon: <Users size={20} /> },
    { id: 'skills', label: '스킬 목표 설정', icon: <Target size={20} /> },
  ] as const;

  return (
    <div className="min-h-screen bg-[#05070a] text-slate-100 font-sans flex flex-col md:flex-row">
      
      {/* --- 모바일 헤더 --- */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-white/10 bg-slate-900 z-50 sticky top-0">
        <div className="flex items-end gap-2">
          <h1 className="text-2xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-orange-400 to-indigo-400 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] pr-1">
            육탐 V3
          </h1>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-2 bg-slate-800 rounded-lg text-white hover:bg-slate-700"
        >
          <Menu size={24} />
        </button>
      </div>

      {/* --- 모바일 드로워 오버레이 --- */}
      {isMobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/60 z-[100] backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* --- 사이드바 (PC에서는 항시 표출, 모바일에서는 드로워 작동) --- */}
      <aside className={`
        fixed md:sticky top-0 left-0 h-full w-64 bg-slate-900/50 border-r border-white/5 backdrop-blur-md z-[110]
        transform transition-transform duration-300 ease-in-out flex flex-col
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* 모바일 닫기 버튼 */}
        <div className="md:hidden flex justify-end p-4">
          <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-slate-400 hover:text-white bg-white/5 rounded-lg border border-white/10">
            <X size={20} />
          </button>
        </div>

        {/* 사이드바 헤더 (PC) */}
        <div className="p-6 border-b border-white/5 hidden md:block">
          <Link href="/" className="inline-block group pb-1">
            <h1 className="text-2xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-orange-400 to-indigo-400 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] flex items-center gap-2 group-hover:scale-105 transition-transform">
              <Anchor className="text-amber-400 shrink-0" size={24} />
              육탐 매니저 V3
            </h1>
          </Link>
          <p className="text-xs text-slate-400 mt-2 font-medium tracking-wide">
            함대 최적화 및 모험 스킬 분석
          </p>
        </div>

        {/* 네비게이션 메뉴 */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-slate-700">
          <Link 
            href="/" 
            className="flex items-center gap-3 w-full p-3 rounded-xl text-left text-sm font-bold transition-all text-slate-400 hover:bg-white/5 hover:text-white mb-4"
          >
            <Home size={18} className="shrink-0" /> 
            <span className="truncate">메인으로 돌아가기</span>
          </Link>
          
          <div className="text-xs font-black text-slate-500 uppercase tracking-widest pl-2 mb-2">관리 메뉴</div>

          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleTabChange(item.id)}
              className={`
                flex items-center gap-3 w-full p-3 rounded-xl text-left text-sm font-bold transition-all
                ${activeTab === item.id 
                  ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/10 text-amber-300 border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.15)]' 
                  : 'text-slate-400 hover:bg-white/5 hover:text-white border border-transparent'}
              `}
            >
              <span className={`shrink-0 ${activeTab === item.id ? 'text-amber-400' : ''}`}>
                {item.icon}
              </span>
              <span className="truncate">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* 계산 시작 버튼 (사이드바 하단 고정) */}
        <div className="mt-auto p-4 border-t border-white/5">
          <button 
            onClick={handleStart} 
            className="w-full py-4 bg-gradient-to-r from-amber-600 to-orange-600 rounded-xl font-black text-lg text-white shadow-[0_0_20px_rgba(245,158,11,0.3)] border border-amber-400/30 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 group"
          >
            <Play size={20} fill="currentColor" className="group-hover:scale-110 transition-transform" />
            덱 생성 START
          </button>
        </div>
      </aside>

      {/* --- 메인 콘텐츠 뷰 영역 --- */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto max-w-[1200px] mx-auto w-full">
        
        {/* 1. 대시보드 뷰 */}
        {activeTab === 'dashboard' && (
          <div id="land-dashboard-capture-area" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-black text-white/90 flex items-center gap-2">
                <LayoutDashboard className="text-indigo-400" />
                현재 대시보드 현황
              </h2>
              <button
                onClick={() => captureAndDownload('land-dashboard-capture-area')}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold border border-white/10 transition-all"
                title="대시보드를 클립보드에 복사"
              >
                <Camera size={14} />
                클립보드 복사
              </button>
            </div>
            <SkillDashboard result={result} targetLevels={targetLevels} />
            <div className="mt-8">
              <h3 className="text-xl font-bold text-white mb-4">함대 배치 결과</h3>
              {result ? (
                <FleetDisplay 
                  result={result} 
                  fleetConfig={fleetConfig} 
                  onBan={handleBanFromDeck} 
                />
              ) : (
                <div className="bg-slate-900 border border-white/10 rounded-xl p-8 flex flex-col items-center justify-center text-slate-500 min-h-[200px]">
                  <Anchor size={48} className="mb-4 text-slate-700" />
                  <p>왼쪽 메뉴 하단의 "덱 생성 START" 버튼을 눌러 함대를 생성하세요.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 2. 함대 및 선장 설정 뷰 */}
        {activeTab === 'fleet' && (
          <div className="space-y-6 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-2xl font-black text-white/90 mb-4 flex items-center gap-2">
              <Anchor className="text-indigo-400" />
              함대 및 선장 설정
            </h2>
            <div className="bg-slate-900/50 p-4 rounded-2xl border border-white/5 shadow-lg">
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
            </div>
          </div>
        )}

        {/* 3. 인원 관리 뷰 */}
        {activeTab === 'crew' && (
          <div className="space-y-6 max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-2xl font-black text-white/90 mb-4 flex items-center gap-2">
              <Users className="text-indigo-400" />
              필수/금지 인원 설정
            </h2>
            <div className="bg-slate-900/50 p-4 rounded-2xl border border-white/5 shadow-lg">
              <CrewManager 
                sailors={sailors}
                essentialIds={essentialIds} setEssentialIds={setEssentialIds}
                bannedIds={bannedIds} setBannedIds={setBannedIds}
                crewSearch={crewSearch} setCrewSearch={setCrewSearch}
                isCrewSearchOpen={isCrewSearchOpen} setIsCrewSearchOpen={setIsCrewSearchOpen}
              />
            </div>
          </div>
        )}

        {/* 4. 스킬 목표 설정 뷰 */}
        {activeTab === 'skills' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-2xl font-black text-white/90 mb-4 flex items-center gap-2">
              <Target className="text-indigo-400" />
              스킬 목표 설정
            </h2>
            <div className="bg-slate-900/50 p-2 md:p-6 rounded-2xl border border-white/5 shadow-lg">
              <SkillSettings targetLevels={targetLevels} setTargetLevels={setTargetLevels} />
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
