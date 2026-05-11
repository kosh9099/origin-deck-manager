'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Sailor, ShipConfig, OptimizerOptions } from '@/types';
import { autoDeployFleet, OptimizerMode } from '@/lib/optimizer';
import { Play, Home, LayoutDashboard, Anchor, Users, Target, Menu, X, Camera, SlidersHorizontal, BarChart3, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { captureAndDownload } from '@/lib/utils/capture';
import ThemeToggle from '@/components/common/ThemeToggle';

// 컴포넌트 임포트
import FleetSettings from '@/components/fleet/FleetSettings';
import CrewManager from '@/components/crew/CrewManager';
import SkillSettings from '@/components/skill/SkillSettings';
import SkillDashboard from '@/components/skill/SkillDashboard';
import FleetDisplay from '@/components/display/FleetDisplay';
import StatWeightSettings, { StatWeightConfig, DEFAULT_STAT_WEIGHT_CONFIG } from '@/components/skill/StatWeightSettings';

// localStorage 저장 키
const STORAGE_KEY = 'yutam_settings_v3';

// 저장할 설정의 타입 정의
interface SavedSettings {
  selectedAdmiral: number | null;
  fleetConfig: ShipConfig[];
  essentialIds: number[];
  bannedIds: number[];
}

// localStorage에서 설정 불러오기
function loadSettings(): SavedSettings | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SavedSettings;
  } catch {
    return null;
  }
}

// localStorage에 설정 저장하기
function saveSettings(settings: SavedSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // localStorage 저장 실패 시 무시
  }
}

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
  const [options] = useState<OptimizerOptions>({
    includeBoarding: false,
    includeSpecialForces: false,
    includeTrade: false,
    prioritizeSupply: false
  });

  // 스킬 및 결과 상태
  const [optimizerMode, setOptimizerMode] = useState<OptimizerMode>('skill');
  const [targetLevels, setTargetLevels] = useState<Record<string, number>>({});
  const [statConfig, setStatConfig] = useState<StatWeightConfig>(DEFAULT_STAT_WEIGHT_CONFIG);
  const [result, setResult] = useState<any>(null);

  // 필수/금지 항해사 및 검색 상태
  const [essentialIds, setEssentialIds] = useState<Set<number>>(new Set());
  const [bannedIds, setBannedIds] = useState<Set<number>>(new Set());
  const [crewSearch, setCrewSearch] = useState('');
  const [isCrewSearchOpen, setIsCrewSearchOpen] = useState(false);

  // 저장 상태 표시용
  const [saveIndicator, setSaveIndicator] = useState<'saved' | 'saving' | null>(null);

  // 최적화 진행 상태
  const [isOptimizing, setIsOptimizing] = useState(false);

  // --- [자동 저장] 설정이 변경될 때마다 localStorage에 저장 ---
  useEffect(() => {
    if (sailors.length === 0) return;

    setSaveIndicator('saving');

    const settings: SavedSettings = {
      selectedAdmiral,
      fleetConfig,
      essentialIds: Array.from(essentialIds),
      bannedIds: Array.from(bannedIds),
    };
    saveSettings(settings);

    const timer = setTimeout(() => setSaveIndicator('saved'), 300);
    const clearTimer = setTimeout(() => setSaveIndicator(null), 2000);
    return () => { clearTimeout(timer); clearTimeout(clearTimer); };
  }, [selectedAdmiral, fleetConfig, essentialIds, bannedIds]);

  // --- 3. 데이터 보급 라인 ---
  useEffect(() => {
    async function fetchSailors() {
      const { data, error } = await supabase.from('sailors').select('*').order('이름');
      if (error) {
        console.error("❌ 데이터 보급 실패:", error);
      } else {

        const processedData = (data || []).map((row, index) => {
          const item: any = { ...row };
          if (!item.id && item.id !== 0) {
            item.id = index + 1;
          }
          item.제독여부 = String(row['등급']).trim() === 'S+';
          return item;
        });

        setSailors(processedData);

        // --- [자동 불러오기] 항해사 데이터 로드 완료 후 저장된 설정 복원 ---
        const saved = loadSettings();
        if (saved) {
          if (saved.selectedAdmiral !== null) setSelectedAdmiral(saved.selectedAdmiral);
          if (saved.fleetConfig) setFleetConfig(saved.fleetConfig);
          if (saved.essentialIds) setEssentialIds(new Set(saved.essentialIds));
          if (saved.bannedIds) setBannedIds(new Set(saved.bannedIds));
          console.log("✅ 저장된 설정 복원 완료");
        }
      }
    }
    fetchSailors();
  }, []);

  // --- 4. 엔진 가동 함수 ---
  const handleStart = async () => {
    if (!selectedAdmiral) {
      alert("선장(제독)을 먼저 선택해야 함대가 출항할 수 있습니다!");
      return;
    }

    setIsOptimizing(true);
    setResult(null);
    setActiveTab('dashboard');
    if (isMobileMenuOpen) setIsMobileMenuOpen(false);

    // UI 갱신을 위해 두 프레임 대기
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

    try {
      const res = autoDeployFleet(
        sailors,
        essentialIds,
        bannedIds,
        fleetConfig,
        selectedAdmiral,
        optimizerMode,
        targetLevels,
        options,
        optimizerMode === 'stat' ? statConfig : undefined
      );
      setResult(res);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsOptimizing(false);
    }
  };

  // --- 5. 덱에서 밴 처리 핸들러 (선원만 제거, 재생성 안 함) ---
  const handleBanFromDeck = (id: number) => {
    const nextBan = new Set(bannedIds).add(id);
    const nextEssential = new Set(essentialIds);
    if (nextEssential.has(id)) nextEssential.delete(id);

    setBannedIds(nextBan);
    setEssentialIds(nextEssential);

    // 결과에서 해당 선원만 제거 (빈 슬롯으로 남김)
    if (result) {
      const updatedShips = result.ships.map((ship: any) => ({
        ...ship,
        admiral: ship.admiral?.id === id ? null : ship.admiral,
        combat: ship.combat.map((s: any) => s?.id === id ? null : s),
        adventure: ship.adventure.map((s: any) => s?.id === id ? null : s),
      }));
      setResult({ ships: updatedShips });
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
    <div className="app-shell app-bg flex min-h-screen flex-col font-sans md:flex-row">

      {/* --- 모바일 헤더 --- */}
      <div className="sticky top-0 z-50 flex items-center justify-between border-b border-slate-200 bg-white/92 px-4 py-3 shadow-sm backdrop-blur md:hidden">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-lg border border-amber-100 bg-amber-50 text-amber-700">
            <Anchor size={18} />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-base font-black text-slate-950">육탐 매니저</h1>
            <p className="text-[11px] font-bold text-slate-500">덱 생성 · 스킬 분석</p>
          </div>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="tool-button size-9"
          aria-label="메뉴 열기"
        >
          <Menu size={20} />
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
        app-sidebar fixed left-0 top-0 z-[110] flex h-full w-64 flex-col border-r border-white/10 md:sticky
        transform transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* 모바일 닫기 버튼 */}
        <div className="flex items-center justify-between p-4 md:hidden">
          <ThemeToggle compact />
          <button onClick={() => setIsMobileMenuOpen(false)} className="flex size-9 items-center justify-center rounded-lg border border-white/15 bg-white/10 text-slate-300 transition hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* 사이드바 헤더 (PC) */}
        <div className="hidden border-b border-white/10 p-5 md:block">
          <div className="flex items-start justify-between gap-2">
            <Link href="/" className="group inline-flex min-w-0 items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-amber-300/20 bg-amber-300/10 text-amber-200">
                <Anchor size={20} />
              </span>
              <div className="min-w-0">
                <h1 className="text-lg font-black text-white truncate">육탐 매니저</h1>
                <p className="mt-0.5 text-xs font-semibold text-slate-400">Expedition Deck</p>
              </div>
            </Link>
            <ThemeToggle compact />
          </div>
          <p className="mt-4 text-xs font-medium leading-5 text-slate-400">
            함대 최적화 및 모험 스킬 분석
          </p>
        </div>

        {/* 네비게이션 메뉴 */}
        <nav className="flex-1 space-y-2 overflow-y-auto overflow-x-hidden p-4 scrollbar-thin scrollbar-thumb-white/20">
          <Link
            href="/"
            className="nav-item mb-4"
          >
            <Home size={18} className="shrink-0" />
            <span className="truncate">메인으로 돌아가기</span>
          </Link>

          <div className="text-xs font-black text-white/40 uppercase tracking-widest pl-2 mb-2">관리 메뉴</div>

          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleTabChange(item.id)}
              className={`nav-item ${activeTab === item.id ? 'border-amber-300/35 bg-amber-500/18 text-amber-200' : ''}`}
            >
              <span className={`shrink-0 ${activeTab === item.id ? 'text-amber-400' : ''}`}>
                {item.icon}
              </span>
              <span className="truncate">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* 계산 시작 버튼 (사이드바 하단 고정) */}
        <div className="mt-auto space-y-2 border-t border-white/10 p-4">
          {/* 자동 저장 인디케이터 */}
          <div className={`flex items-center justify-center gap-1.5 text-[10px] font-bold transition-all duration-500
            ${saveIndicator === 'saving' ? 'text-amber-400 opacity-100' :
              saveIndicator === 'saved' ? 'text-emerald-400 opacity-100' :
                'opacity-0'}`}>
            {saveIndicator === 'saving' && (
              <><span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />설정 저장 중...</>
            )}
            {saveIndicator === 'saved' && (
              <><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />설정이 저장되었습니다</>
            )}
          </div>

          <button
            onClick={handleStart}
            disabled={isOptimizing}
            className={`flex w-full items-center justify-center gap-2 rounded-lg border border-amber-400/30 py-3.5 text-base font-black text-white shadow-[0_10px_28px_rgba(183,121,31,0.24)] transition-all group
              ${isOptimizing
                ? 'bg-gradient-to-r from-slate-500 to-slate-600 cursor-not-allowed opacity-80'
                : 'bg-gradient-to-r from-amber-600 to-orange-600 hover:brightness-110 active:scale-95'}`}
          >
            {isOptimizing ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                덱 생성 중...
              </>
            ) : (
              <>
                <Play size={20} fill="currentColor" className="group-hover:scale-110 transition-transform" />
                덱 생성 START
              </>
            )}
          </button>
        </div>
      </aside>

      {/* --- 메인 콘텐츠 뷰 영역 --- */}
      <main className="mx-auto w-full max-w-[1280px] flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">

        {/* 1. 대시보드 뷰 */}
        {activeTab === 'dashboard' && (
          <div id="land-dashboard-capture-area" className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="flex items-center gap-2 text-2xl font-black tracking-normal text-slate-950">
                <LayoutDashboard className="text-amber-600" />
                대시보드
              </h2>
              <button
                onClick={() => captureAndDownload('land-dashboard-capture-area')}
                className="tool-button h-9 self-start px-3 sm:self-auto"
                title="대시보드를 클립보드에 복사"
              >
                <Camera size={14} />
                클립보드 복사
              </button>
            </div>
            <SkillDashboard result={result} targetLevels={targetLevels} />
            <div className="mt-8">
              <h3 className="mb-4 text-xl font-black text-slate-800">함대 배치 결과</h3>
              {isOptimizing ? (
                <div className="grid gap-4">
                  {fleetConfig.map((cfg, i) => (
                    <div key={i} className="app-card animate-pulse rounded-lg p-6">
                      <div className="h-6 bg-slate-200 rounded w-1/4 mb-4" />
                      <div className="grid grid-cols-5 gap-2">
                        {Array.from({ length: cfg.총선실 }).map((_, j) => (
                          <div key={j} className="h-20 bg-slate-100 rounded-lg" />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : result ? (
                <FleetDisplay
                  result={result}
                  fleetConfig={fleetConfig}
                  onBan={handleBanFromDeck}
                />
              ) : (
                <div className="app-card flex min-h-[220px] flex-col items-center justify-center rounded-lg p-8 text-center text-slate-400">
                  <Anchor size={48} className="mb-4 text-slate-300" />
                  <p>왼쪽 메뉴 하단의 덱 생성 START 버튼을 눌러 함대를 생성하세요.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 2. 함대 및 선장 설정 뷰 */}
        {activeTab === 'fleet' && (
          <div className="space-y-6 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="mb-4 flex items-center gap-2 text-2xl font-black tracking-normal text-slate-950">
              <Anchor className="text-amber-600" />
              함대 및 선장 설정
            </h2>
            <div className="app-panel rounded-lg p-4">
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
            <h2 className="mb-4 flex items-center gap-2 text-2xl font-black tracking-normal text-slate-950">
              <Users className="text-amber-600" />
              필수/금지 인원 설정
            </h2>
            <div className="app-panel rounded-lg p-4">
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
            <h2 className="mb-4 flex items-center gap-2 text-2xl font-black tracking-normal text-slate-950">
              <Target className="text-amber-600" />
              배치 모드 설정
            </h2>

            {/* 모드 선택 토글 */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                onClick={() => {
                  setOptimizerMode('skill');
                  setStatConfig(DEFAULT_STAT_WEIGHT_CONFIG);
                }}
                className={`app-card flex flex-col items-center gap-2 rounded-lg p-4 font-black transition-all
                  ${optimizerMode === 'skill'
                    ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                    : 'text-slate-500 hover:border-slate-300 hover:text-slate-700'}`}
              >
                <SlidersHorizontal size={22} />
                <span className="text-sm">스킬 개별 설정</span>
                <span className="text-[10px] font-normal text-current opacity-70">
                  스킬별 목표 레벨 지정
                </span>
              </button>

              <button
                onClick={() => {
                  setOptimizerMode('stat');
                  setTargetLevels({});
                }}
                className={`app-card flex flex-col items-center gap-2 rounded-lg p-4 font-black transition-all
                  ${optimizerMode === 'stat'
                    ? 'border-sky-400 bg-sky-50 text-sky-700'
                    : 'text-slate-500 hover:border-slate-300 hover:text-slate-700'}`}
              >
                <BarChart3 size={22} />
                <span className="text-sm">능력치 종합 설정</span>
                <span className="text-[10px] font-normal text-current opacity-70">
                  전투/관찰/채집 비중 슬라이더
                </span>
              </button>
            </div>

            {/* 모드 A: 스킬 개별 설정 */}
            {optimizerMode === 'skill' && (
              <div className="app-panel rounded-lg border-emerald-200 p-2 md:p-6">
                <SkillSettings targetLevels={targetLevels} setTargetLevels={setTargetLevels} />
              </div>
            )}

            {/* 모드 B: 능력치 종합 설정 */}
            {optimizerMode === 'stat' && (
              <div className="app-panel rounded-lg border-sky-200 p-2 md:p-6">
                <StatWeightSettings config={statConfig} onChange={setStatConfig} />
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}
