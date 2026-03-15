'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Home, Menu, X, Anchor, Download, RefreshCw, HandHeart } from 'lucide-react';
import TradeDashboard from '@/components/trade/TradeDashboard';
import BoostForm from '@/components/trade/BoostForm';
import { captureAndDownload } from '@/lib/utils/capture';

type TradeViewType = 'dashboard' | 'boosts';

export default function TradeManagerPage() {
  const [activeTab, setActiveTab] = useState<TradeViewType>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleTabChange = (tab: TradeViewType) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
  };

  const navItems = [
    { id: 'dashboard' as const, label: '교역 스케줄', icon: <RefreshCw size={18} /> },
    { id: 'boosts' as const, label: '부양 등록 / 관리', icon: <HandHeart size={18} /> },
  ];

  const handleCapture = async () => {
    const timestamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 16);
    await captureAndDownload('trade-dashboard-capture-area', `trade-schedule-${timestamp}.png`);
  };

  return (
    <div className="min-h-screen bg-[#f0ece4] text-slate-800 font-sans flex flex-col md:flex-row h-screen overflow-hidden">

      {/* ── 모바일 헤더 ── */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-slate-300 bg-white z-50 sticky top-0 shadow-sm">
        <div className="flex items-center gap-2">
          <Anchor className="text-emerald-500" size={20} />
          <h1 className="text-xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-600">
            교역 매니저 V1
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
            <h1 className="text-2xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-teal-400 flex items-center gap-2 group-hover:scale-105 transition-transform">
              <Anchor className="text-emerald-400 shrink-0" size={24} />
              교역 매니저 V1
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
      </aside>

      {/* ── 메인 콘텐츠 ── */}
      <main className="flex-1 overflow-y-auto bg-[#f0ece4] p-4 md:p-6 lg:p-8 flex flex-col w-full relative">
        <div className="max-w-[1400px] w-full mx-auto space-y-4 md:space-y-6 flex-1 flex flex-col pb-20 md:pb-0">

          {/* 상단 헤더 */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-2">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">
                {activeTab === 'dashboard' ? '교역 스케줄' : '부양 등록 / 관리'}
              </h2>
              <p className="text-sm text-slate-500 mt-1 font-medium">
                {activeTab === 'dashboard'
                  ? '향후 12시간 대유행 및 실시간 제보 연동 병합 시간표'
                  : '단건 또는 일괄 붙여넣기로 부양 스케줄을 공유하세요.'}
              </p>
            </div>
            {activeTab === 'dashboard' && (
              <button onClick={handleCapture}
                className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-sm transition-all active:scale-95 w-full sm:w-auto justify-center group shrink-0">
                <Download size={16} className="group-hover:-translate-y-0.5 transition-transform" />
                <span className="whitespace-nowrap">일정표 캡처하기</span>
              </button>
            )}
          </div>

          {/* 컨텐츠 패널 */}
          <div className="flex-1 min-h-0 bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm relative animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-hidden flex flex-col">
            {activeTab === 'dashboard' && <TradeDashboard />}
            {activeTab === 'boosts' && (
              <div className="flex justify-center w-full py-4 overflow-y-auto">
                <BoostForm />
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}