'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Home, Menu, X, Anchor, Download, RefreshCw, HandHeart, Calculator, Sparkles, MapPin, Settings, Globe } from 'lucide-react';
import TradeDashboard from '@/components/trade/TradeDashboard';
import BoostForm from '@/components/trade/BoostForm';
import BarterCalculator from '@/components/trade/BarterCalculator';
import CityMapView, { type MapFocus } from '@/components/trade/CityMapView';
import SpecialForm from '@/components/trade/SpecialForm';
import WeeklyItemsForm from '@/components/trade/WeeklyItemsForm';
import { captureAndDownload } from '@/lib/utils/capture';

type TradeViewType = 'dashboard' | 'boosts' | 'barter' | 'map';

export default function TradeManagerPage() {
  const [activeTab, setActiveTab] = useState<TradeViewType>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [captureMode, setCaptureMode] = useState(false);
  const [captureToast, setCaptureToast] = useState<string | null>(null);
  const [specialOpen, setSpecialOpen] = useState(false);
  const [weeklyOpen, setWeeklyOpen] = useState(false);
  const [mapFocus, setMapFocus] = useState<MapFocus | null>(null);

  const handleTabChange = (tab: TradeViewType) => {
    // 사이드바로 탭 이동 시 지도 점프 focus 정리 — 다음에 지도 탭 다시 진입해도 기본값(세비야/40%/해역off)으로 시작.
    if (mapFocus) setMapFocus(null);
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
  };

  // 교역 스케줄에서 [지도] 버튼 클릭 시: 지도 탭으로 전환 + 해당 도시/해역 포커싱.
  const handleMapJump = (target: { city?: string; region?: string }) => {
    setMapFocus({ ...target, epoch: Date.now() });
    setActiveTab('map');
    setIsMobileMenuOpen(false);
  };

  const navItems = [
    { id: 'dashboard' as const, label: '교역 스케줄', icon: <RefreshCw size={18} /> },
    { id: 'map' as const, label: '세계 지도', icon: <Globe size={18} /> },
    { id: 'barter' as const, label: '물물교환 계산기', icon: <Calculator size={18} /> },
  ];

  const handleCapture = async () => {
    setCaptureMode(true);
    // React 리렌더 대기
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const timestamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 16);
    const result = await captureAndDownload('trade-dashboard-capture-area', `trade-schedule-${timestamp}.png`);
    setCaptureMode(false);
    if (result === 'clipboard') {
      setCaptureToast('📋 클립보드에 복사되었습니다');
    } else if (result === 'download') {
      setCaptureToast('💾 다운로드되었습니다 (클립보드 미지원)');
    } else {
      setCaptureToast('⚠️ 캡처에 실패했습니다');
    }
    setTimeout(() => setCaptureToast(null), 2500);
  };

  return (
    <div className="app-shell app-bg flex h-screen flex-col overflow-hidden font-sans md:flex-row">

      {/* ── 모바일 헤더 ── */}
      <div className="sticky top-0 z-50 flex items-center justify-between border-b border-slate-200 bg-white/92 px-4 py-3 shadow-sm backdrop-blur md:hidden">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-lg border border-teal-100 bg-teal-50 text-teal-700">
            <Anchor size={18} />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-base font-black text-slate-950">교역 매니저</h1>
            <p className="text-[11px] font-bold text-slate-500">스케줄 · 지도 · 물교</p>
          </div>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="tool-button size-9"
          aria-label="메뉴 열기"
        >
          {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* 모바일 오버레이 */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* ── 사이드바 ── */}
      <aside className={`
        app-sidebar fixed left-0 top-0 z-[110] flex h-full w-64 flex-col border-r border-white/10 md:sticky
        transform transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* 모바일 닫기 */}
        <div className="flex justify-end p-4 md:hidden">
          <button onClick={() => setIsMobileMenuOpen(false)} className="flex size-9 items-center justify-center rounded-lg border border-white/15 bg-white/10 text-slate-300 transition hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* 사이드바 헤더 */}
        <div className="hidden border-b border-white/10 p-5 md:block">
          <Link href="/" className="group inline-flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-teal-300/20 bg-teal-300/10 text-teal-200">
              <Anchor size={20} />
            </span>
            <div>
              <h1 className="text-lg font-black text-white">교역 매니저</h1>
              <p className="mt-0.5 text-xs font-semibold text-slate-400">Trade Command</p>
            </div>
          </Link>
          <p className="mt-4 text-xs font-medium leading-5 text-slate-400">
            대유행 & 부양 시간표 실시간 동기화
          </p>
        </div>

        {/* 네비게이션 */}
        <nav className="flex-1 space-y-2 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-white/20">
          <Link href="/"
            className="nav-item mb-4">
            <Home size={18} className="shrink-0" />
            <span className="truncate">메인으로 돌아가기</span>
          </Link>

          <div className="text-xs font-black text-white/40 uppercase tracking-widest pl-2 mb-2">교역 메뉴</div>

          {navItems.map(item => (
            <button key={item.id} onClick={() => handleTabChange(item.id)}
              className={`nav-item ${activeTab === item.id ? 'nav-item-active' : ''}`}>
              <span className={`shrink-0 ${activeTab === item.id ? 'text-emerald-400' : ''}`}>{item.icon}</span>
              <span className="truncate">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="border-t border-white/10 p-3">
          <Link href="/admin"
            className="flex items-center justify-center rounded-lg p-2 text-slate-500 transition-colors hover:bg-white/5 hover:text-slate-300"
            title="설정">
            <Settings size={16} />
          </Link>
        </div>
      </aside>

      {/* 특수 등록 모달 */}
      <SpecialForm open={specialOpen} onClose={() => setSpecialOpen(false)} />
      {/* 주간 기록 모달 */}
      <WeeklyItemsForm open={weeklyOpen} onClose={() => setWeeklyOpen(false)} />

      {/* 캡처 toast */}
      {captureToast && (
        <div className="fixed left-1/2 top-4 z-[300] -translate-x-1/2 rounded-lg bg-slate-950 px-4 py-2.5 text-[13px] font-bold text-white shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
          {captureToast}
        </div>
      )}

      {/* ── 메인 콘텐츠 ── */}
      <main className={`relative flex w-full flex-1 flex-col overflow-y-auto ${
        activeTab === 'map' ? 'p-0' : 'p-2 md:p-3 lg:p-4'
      }`}>
        <div className={`w-full flex-1 flex flex-col md:pb-0 ${
          activeTab === 'map'
            ? 'space-y-0'
            : 'max-w-[1500px] mx-auto space-y-2 md:space-y-3 pb-10'
        }`}>

          {/* 상단 헤더 (대시보드 모드에서는 액션 버튼들, 부양 모드에서는 제목) */}
          {activeTab === 'boosts' && (
            <div className="mb-2 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
              <div>
                <h2 className="text-2xl font-black tracking-normal text-slate-950 sm:text-3xl">부양 등록 / 관리</h2>
                <p className="mt-1 text-sm font-medium text-slate-600">단건 또는 일괄 붙여넣기로 부양 스케줄을 공유하세요.</p>
              </div>
              <button onClick={() => setActiveTab('dashboard')}
                className="tool-button h-9 shrink-0 self-start px-3 sm:self-auto">
                <RefreshCw size={13} />
                <span className="whitespace-nowrap">교역 스케줄</span>
              </button>
            </div>
          )}
          {activeTab === 'dashboard' && (
            <div className="mb-0 flex flex-wrap justify-end gap-1.5 sm:gap-2">
              <button onClick={() => setActiveTab('boosts')}
                title="부양 등록"
                className="tool-button h-8 shrink-0 px-2.5 sm:px-3">
                <HandHeart size={13} />
                <span className="whitespace-nowrap"><span className="sm:hidden">부양</span><span className="hidden sm:inline">부양 등록</span></span>
              </button>
              <button onClick={() => setWeeklyOpen(true)}
                title="주간 기록"
                className="tool-button h-8 shrink-0 px-2.5 sm:px-3">
                <MapPin size={13} />
                <span className="whitespace-nowrap"><span className="sm:hidden">주간</span><span className="hidden sm:inline">주간 기록</span></span>
              </button>
              <button onClick={() => setSpecialOpen(true)}
                title="특수 등록"
                className="tool-button h-8 shrink-0 border-amber-200 text-amber-700 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800 px-2.5 sm:px-3">
                <Sparkles size={13} />
                <span className="whitespace-nowrap"><span className="sm:hidden">특수</span><span className="hidden sm:inline">특수 등록</span></span>
              </button>
              <button onClick={handleCapture}
                title="캡처"
                className="tool-button h-8 shrink-0 px-2.5 sm:px-3">
                <Download size={13} className="group-hover:-translate-y-0.5 transition-transform" />
                <span className="whitespace-nowrap">캡처</span>
              </button>
            </div>
          )}

          {/* 컨텐츠 패널 — map 탭은 항상 full-bleed (테두리/라운드/패딩 제거) */}
          <div className={`relative flex min-h-0 flex-1 flex-col overflow-hidden bg-white animate-in fade-in slide-in-from-bottom-4 duration-500 ${
            activeTab === 'map'
              ? 'rounded-none border-0 shadow-none'
              : 'app-panel rounded-lg p-2 sm:p-3'
          }`}>
            {activeTab === 'dashboard' && <TradeDashboard captureMode={captureMode} onMapJump={handleMapJump} />}
            {activeTab === 'boosts' && (
              <div className="flex justify-center w-full py-4 overflow-y-auto">
                <BoostForm />
              </div>
            )}
            {activeTab === 'barter' && (
              <div className="w-full py-2 overflow-y-auto">
                <BarterCalculator />
              </div>
            )}
            {activeTab === 'map' && (
              <div className="w-full h-full">
                <CityMapView focus={mapFocus} />
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
