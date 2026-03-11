'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Home, Menu, X, Anchor, ArrowLeft, Download, RefreshCw, HandHeart
} from 'lucide-react';
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
    <div className="min-h-screen bg-[#05070a] text-slate-100 font-sans flex flex-col md:flex-row h-screen overflow-hidden">
      
      {/* 1. Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900/50 border-r border-white/5 backdrop-blur-md z-20 shrink-0">
        <div className="p-6 border-b border-white/5">
          <Link href="/" className="inline-block group pb-1">
            <h1 className="text-2xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-teal-500 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] flex items-center gap-2 group-hover:scale-105 transition-transform">
              <Anchor className="text-emerald-400 shrink-0" size={24} />
              교역 매니저 V1
            </h1>
          </Link>
          <p className="text-xs text-slate-400 mt-2 font-medium tracking-wide">
            대유행 & 부양 시간표 실시간 동기화
          </p>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-slate-700">
          <Link 
            href="/"
            className="flex items-center gap-3 w-full p-3 rounded-xl text-left text-sm font-bold transition-all text-slate-400 hover:bg-white/5 hover:text-white mb-4"
          >
            <Home size={18} className="shrink-0" />
            <span className="truncate">메인으로 돌아가기</span>
          </Link>

          <div className="text-xs font-black text-slate-500 uppercase tracking-widest pl-2 mb-2">교역 메뉴</div>
          
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleTabChange(item.id)}
              className={`flex items-center gap-3 w-full p-3 rounded-xl text-left text-sm font-bold transition-all ${
                activeTab === item.id 
                ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/10 text-emerald-300 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.15)]' 
                : 'text-slate-400 hover:bg-white/5 hover:text-white border border-transparent'
              }`}
            >
              <span className={`shrink-0 ${activeTab === item.id ? 'text-emerald-400' : ''}`}>
                {item.icon}
              </span>
              <span className="truncate">{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* 2. Mobile Header & Drawer */}
      <div className="md:hidden flex flex-col z-30 shrink-0">
        <header className="bg-slate-900/80 backdrop-blur-md border-b border-white/5 p-4 flex justify-between items-center shadow-lg">
          <Link href="/" className="flex items-center gap-2">
            <Anchor className="text-emerald-400" size={20} />
            <h1 className="text-xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-teal-500">
              교역 매니저 V1
            </h1>
          </Link>
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 bg-white/5 rounded-lg text-slate-300 hover:text-white transition-colors border border-white/10 active:scale-95"
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </header>

        {/* Mobile Drawer Overlay */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-40 flex">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
            
            <div className="relative w-[280px] max-w-[80vw] h-full bg-slate-900 border-r border-white/10 shadow-2xl flex flex-col animate-in slide-in-from-left duration-300">
              <div className="p-5 border-b border-white/5 flex justify-between items-center bg-slate-800/50">
                <span className="text-sm font-black text-slate-300 uppercase tracking-widest">교역 메뉴</span>
                <button 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1.5 bg-white/5 rounded-md text-slate-400 hover:text-white transition-colors border border-white/10"
                >
                  <ArrowLeft size={16} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                <Link 
                  href="/"
                  className="flex items-center gap-3 w-full p-3 rounded-xl text-left text-sm font-bold transition-all text-slate-400 hover:bg-white/5 hover:text-white mb-4 bg-black/20"
                >
                  <Home size={18} />
                  <span>메인으로 돌아가기</span>
                </Link>

                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleTabChange(item.id)}
                    className={`flex items-center gap-3 w-full p-3 rounded-xl text-left text-[15px] font-bold transition-all ${
                      activeTab === item.id 
                      ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/10 text-emerald-300 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.15)]' 
                      : 'text-slate-400 hover:bg-white/5 hover:text-white border border-transparent'
                    }`}
                  >
                    <span className={`${activeTab === item.id ? 'text-emerald-400' : ''}`}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </button>
                ))}
            </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-gradient-to-b from-[#05070a] to-[#0a0f16] p-4 md:p-6 lg:p-8 flex flex-col w-full relative">
        <div className="max-w-[1400px] w-full mx-auto relative z-10 space-y-4 md:space-y-6 flex-1 flex flex-col pb-20 md:pb-0">
          
          {/* Top Feature Bar & Controls */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-2">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
                {activeTab === 'dashboard' ? '교역 스케줄' : '부양 등록 / 관리'}
              </h2>
              <p className="text-sm text-slate-400 mt-1 font-medium">
                {activeTab === 'dashboard' ? '향후 36시간 대유행 및 실시간 제보 연동 병합 시간표' : '본인이 직접 발동한 부양 스케줄을 공유하세요.'}
              </p>
            </div>
            
            {activeTab === 'dashboard' && (
              <button 
                onClick={handleCapture}
                className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-[0_4px_15px_rgba(79,70,229,0.4)] transition-all active:scale-95 w-full sm:w-auto justify-center group shrink-0"
              >
                <Download size={18} className="group-hover:-translate-y-0.5 transition-transform" />
                <span className="whitespace-nowrap">일정표 캡처하기</span>
              </button>
            )}
          </div>

          <div className="flex-1 min-h-0 bg-slate-900/50 rounded-2xl border border-white/5 p-4 sm:p-6 shadow-2xl backdrop-blur-sm relative animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-hidden flex flex-col">
            {/* 렌더링 영역 */}
            {activeTab === 'dashboard' && (
              <TradeDashboard />
            )}
            
            {activeTab === 'boosts' && (
              <div className="flex justify-center items-center h-full w-full py-10 md:py-20 overflow-y-auto">
                 <BoostForm />
              </div>
            )}
            
          </div>

        </div>
      </main>
      
    </div>
  );
}
