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
    <div className="min-h-screen bg-[#f0ece4] text-slate-800 font-sans flex flex-col md:flex-row h-screen overflow-hidden">

      {/* ── 모바일 헤더 ── */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-slate-300 bg-white z-50 sticky top-0 shadow-sm">
        <div className="flex items-center gap-2">
          <Anchor className="text-emerald-500" size={20} />
          <h1 className="text-xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-600 pr-1">
            교역 매니저 V2
          </h1>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 bg-slate-100 rounded-lg text-slate-700 hover:bg-slate-200 border border-slate-300 active:scale-95"
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
        fixed md:sticky top-0 left-0 h-full w-64 bg-[#1a3a2a] border-r border-white/10 z-[110]
        transform transition-transform duration-300 ease-in-out flex flex-col
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* 모바일 닫기 */}
        <div className="md:hidden flex justify-end p-4">
          <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-slate-300 hover:text-white bg-white/10 rounded-lg border border-white/20">
            <X size={20} />
          </button>
        </div>

        {/* 사이드바 헤더 */}
        <div className="p-6 border-b border-white/10 hidden md:block">
          <Link href="/" className="inline-block group pb-1">
            <h1 className="text-2xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-teal-400 flex items-center gap-2 group-hover:scale-105 transition-transform pr-1">
              <Anchor className="text-emerald-400 shrink-0" size={24} />
              교역 매니저 V2
            </h1>
          </Link>
          <p className="text-xs text-slate-400 mt-2 font-medium tracking-wide">
            대유행 & 부양 시간표 실시간 동기화
          </p>
        </div>

        {/* 네비게이션 */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto scrollbar-thin scrollbar-thumb-white/20">
          <Link href="/"
            className="flex items-center gap-3 w-full p-3 rounded-xl text-left text-sm font-bold transition-all text-slate-400 hover:bg-white/10 hover:text-white mb-4">
            <Home size={18} className="shrink-0" />
            <span className="truncate">메인으로 돌아가기</span>
          </Link>

          <div className="text-xs font-black text-white/40 uppercase tracking-widest pl-2 mb-2">교역 메뉴</div>

          {navItems.map(item => (
            <button key={item.id} onClick={() => handleTabChange(item.id)}
              className={`flex items-center gap-3 w-full p-3 rounded-xl text-left text-sm font-bold transition-all
                ${activeTab === item.id
                  ? 'bg-gradient-to-r from-emerald-500/30 to-teal-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                  : 'text-slate-400 hover:bg-white/10 hover:text-white border border-transparent'}`}>
              <span className={`shrink-0 ${activeTab === item.id ? 'text-emerald-400' : ''}`}>{item.icon}</span>
              <span className="truncate">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-white/10">
          <Link href="/admin"
            className="flex items-center justify-center p-2 rounded-lg text-slate-500 hover:bg-white/5 hover:text-slate-300 transition-colors"
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
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[300] px-4 py-2.5 bg-slate-900 text-white text-[13px] font-bold rounded-xl shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
          {captureToast}
        </div>
      )}

      {/* ── 메인 콘텐츠 ── */}
      <main className={`flex-1 overflow-y-auto bg-[#f0ece4] flex flex-col w-full relative ${
        activeTab === 'map' ? 'p-0 md:p-6 lg:p-8' : 'p-4 md:p-6 lg:p-8'
      }`}>
        <div className={`max-w-[1400px] w-full mx-auto flex-1 flex flex-col md:pb-0 ${
          activeTab === 'map' ? 'space-y-0 md:space-y-6' : 'space-y-4 md:space-y-6 pb-20'
        }`}>

          {/* 상단 헤더 (대시보드 모드에서는 액션 버튼들, 부양 모드에서는 제목) */}
          {activeTab === 'boosts' && (
            <div className="mb-2 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
              <div>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">부양 등록 / 관리</h2>
                <p className="text-sm text-slate-500 mt-1 font-medium">단건 또는 일괄 붙여넣기로 부양 스케줄을 공유하세요.</p>
              </div>
              <button onClick={() => setActiveTab('dashboard')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[12px] font-bold rounded-lg shadow-sm transition-all active:scale-95 shrink-0 self-start sm:self-auto">
                <RefreshCw size={13} />
                <span className="whitespace-nowrap">교역 스케줄</span>
              </button>
            </div>
          )}
          {activeTab === 'dashboard' && (
            <div className="flex justify-end gap-1.5 sm:gap-2 mb-1">
              <button onClick={() => setActiveTab('boosts')}
                title="부양 등록"
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[12px] font-bold rounded-lg shadow-sm transition-all active:scale-95 shrink-0">
                <HandHeart size={13} />
                <span className="hidden sm:inline whitespace-nowrap">부양 등록</span>
              </button>
              <button onClick={() => setWeeklyOpen(true)}
                title="주간 기록"
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white text-[12px] font-bold rounded-lg shadow-sm transition-all active:scale-95 shrink-0">
                <MapPin size={13} />
                <span className="hidden sm:inline whitespace-nowrap">주간 기록</span>
              </button>
              <button onClick={() => setSpecialOpen(true)}
                title="특수 등록"
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-white text-[12px] font-bold rounded-lg shadow-sm transition-all active:scale-95 shrink-0">
                <Sparkles size={13} />
                <span className="hidden sm:inline whitespace-nowrap">특수 등록</span>
              </button>
              <button onClick={handleCapture}
                title="캡처"
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[12px] font-bold rounded-lg shadow-sm transition-all active:scale-95 group shrink-0">
                <Download size={13} className="group-hover:-translate-y-0.5 transition-transform" />
                <span className="hidden sm:inline whitespace-nowrap">캡처</span>
              </button>
            </div>
          )}

          {/* 컨텐츠 패널 — map 탭은 모바일에서 full-bleed (테두리/라운드/패딩 제거) */}
          <div className={`flex-1 min-h-0 bg-white relative animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-hidden flex flex-col ${
            activeTab === 'map'
              ? 'rounded-none md:rounded-2xl border-0 md:border md:border-slate-200 shadow-none md:shadow-sm'
              : 'rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm'
          }`}>
            {activeTab === 'dashboard' && <TradeDashboard onMapJump={handleMapJump} />}
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