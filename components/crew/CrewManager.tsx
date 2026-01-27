'use client';

import React, { useMemo } from 'react';
import { Sailor, OptimizerOptions } from '@/types';
import CrewSearch from './CrewSearch';
import StatusLists from './StatusLists';
import { UserCheck, Swords, Crosshair, Anchor, Zap, Package } from 'lucide-react'; // Package 아이콘 추가

interface Props {
  sailors: Sailor[];
  essentialIds: Set<number>;
  setEssentialIds: (ids: Set<number>) => void;
  bannedIds: Set<number>;
  setBannedIds: (ids: Set<number>) => void;
  crewSearch: string;
  setCrewSearch: (q: string) => void;
  isCrewSearchOpen: boolean;
  setIsCrewSearchOpen: (open: boolean) => void;
  options: OptimizerOptions;
  setOptions: (options: OptimizerOptions) => void;
}

export default function CrewManager({ 
  sailors,
  essentialIds, setEssentialIds, 
  bannedIds, setBannedIds, 
  crewSearch, setCrewSearch, 
  isCrewSearchOpen, setIsCrewSearchOpen,
  options, setOptions
}: Props) {

  const filteredCrews = useMemo(() => {
    const q = crewSearch.replace(/\s/g, "").toLowerCase();
    
    return sailors
      .filter(s => !essentialIds.has(s.id) && !bannedIds.has(s.id))
      .filter(s => !q || s.이름.replace(/\s/g, "").toLowerCase().includes(q))
      .sort((a, b) => a.이름.localeCompare(b.이름))
      .slice(0, 20);
  }, [sailors, crewSearch, essentialIds, bannedIds]);

  const toggleOption = (key: keyof OptimizerOptions) => {
    setOptions({ ...options, [key]: !options[key] });
  };

  const addEssential = (id: number) => {
    const next = new Set(essentialIds);
    next.add(id);
    if (bannedIds.has(id)) {
        const nextBan = new Set(bannedIds);
        nextBan.delete(id);
        setBannedIds(nextBan);
    }
    setEssentialIds(next);
  };

  const removeEssential = (id: number) => {
    const next = new Set(essentialIds);
    next.delete(id);
    setEssentialIds(next);
  };

  const removeBanned = (id: number) => {
    const next = new Set(bannedIds);
    next.delete(id);
    setBannedIds(next);
  };

  return (
    <div className="relative z-10">
      {/* 배치 설정 배너 (Blue Theme) */}
      <div className="bg-blue-600 px-4 py-2 rounded-t-xl border-b-2 border-blue-400 shadow-lg">
        <h2 className="text-[13px] font-black text-white uppercase tracking-widest flex items-center gap-2">
          <UserCheck size={16} strokeWidth={2.5} />
          배치 설정 (Placement Settings)
        </h2>
      </div>

      <div className="bg-slate-900/90 rounded-b-xl p-4 border border-white/5 backdrop-blur-md space-y-5">
        
        {/* 1. 자동 충원 옵션 */}
        <div className="space-y-2">
          <h3 className="text-[11px] font-black text-blue-100 uppercase tracking-widest flex items-center gap-1.5 bg-blue-500/20 px-2 py-1.5 rounded border-l-2 border-blue-400">
            <Zap size={12} className="text-blue-300" />
            자동 충원 옵션
          </h3>
          
          <div className="grid grid-cols-1 gap-2">
            {/* 백병 추가 */}
            <div 
              onClick={() => toggleOption('includeBoarding')}
              className={`flex items-center justify-between p-2 rounded-lg cursor-pointer border transition-all ${
                options.includeBoarding 
                  ? 'bg-red-500/20 border-red-500/50' 
                  : 'bg-slate-800 border-white/5 hover:bg-slate-700/50'
              }`}
            >
              <div className="flex items-center gap-2">
                <Swords size={14} className={options.includeBoarding ? "text-red-400" : "text-slate-500"} />
                <span className={`text-xs font-bold ${options.includeBoarding ? "text-red-100" : "text-slate-400"}`}>
                  백병대 추가 (Boarding)
                </span>
              </div>
              <div className={`w-3 h-3 rounded-full transition-colors ${options.includeBoarding ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]" : "bg-slate-600"}`} />
            </div>

            {/* 특공 추가 */}
            <div 
              onClick={() => toggleOption('includeSpecialForces')}
              className={`flex items-center justify-between p-2 rounded-lg cursor-pointer border transition-all ${
                options.includeSpecialForces 
                  ? 'bg-orange-500/20 border-orange-500/50' 
                  : 'bg-slate-800 border-white/5 hover:bg-slate-700/50'
              }`}
            >
              <div className="flex items-center gap-2">
                <Crosshair size={14} className={options.includeSpecialForces ? "text-orange-400" : "text-slate-500"} />
                <span className={`text-xs font-bold ${options.includeSpecialForces ? "text-orange-100" : "text-slate-400"}`}>
                  특공대 추가 (Special)
                </span>
              </div>
              <div className={`w-3 h-3 rounded-full transition-colors ${options.includeSpecialForces ? "bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]" : "bg-slate-600"}`} />
            </div>

            {/* 교역 추가 */}
            <div 
              onClick={() => toggleOption('includeTrade')}
              className={`flex items-center justify-between p-2 rounded-lg cursor-pointer border transition-all ${
                options.includeTrade 
                  ? 'bg-emerald-500/20 border-emerald-500/50' 
                  : 'bg-slate-800 border-white/5 hover:bg-slate-700/50'
              }`}
            >
              <div className="flex items-center gap-2">
                <Anchor size={14} className={options.includeTrade ? "text-emerald-400" : "text-slate-500"} />
                <span className={`text-xs font-bold ${options.includeTrade ? "text-emerald-100" : "text-slate-400"}`}>
                  교역 항해사 허용 (Trade)
                </span>
              </div>
              <div className={`w-3 h-3 rounded-full transition-colors ${options.includeTrade ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" : "bg-slate-600"}`} />
            </div>

            {/* [신규] 보급/직업 우선 */}
            <div 
              onClick={() => toggleOption('prioritizeSupply')}
              className={`flex items-center justify-between p-2 rounded-lg cursor-pointer border transition-all ${
                options.prioritizeSupply 
                  ? 'bg-indigo-500/20 border-indigo-500/50' 
                  : 'bg-slate-800 border-white/5 hover:bg-slate-700/50'
              }`}
            >
              <div className="flex items-center gap-2">
                <Package size={14} className={options.prioritizeSupply ? "text-indigo-400" : "text-slate-500"} />
                <span className={`text-xs font-bold ${options.prioritizeSupply ? "text-indigo-100" : "text-slate-400"}`}>
                  보급/직업 우선 (Sort by Supply)
                </span>
              </div>
              <div className={`w-3 h-3 rounded-full transition-colors ${options.prioritizeSupply ? "bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]" : "bg-slate-600"}`} />
            </div>

          </div>
        </div>

        <div className="h-px bg-white/10" />

        {/* 2. 필수 항해사 관리 */}
        <div>
          <CrewSearch 
            search={crewSearch}
            setSearch={setCrewSearch}
            isOpen={isCrewSearchOpen}
            setIsOpen={setIsCrewSearchOpen}
            filtered={filteredCrews}
            onAdd={addEssential}
          />
          <StatusLists 
            sailors={sailors}
            essentialIds={essentialIds}
            bannedIds={bannedIds}
            onRemoveEssential={removeEssential}
            onRemoveBanned={removeBanned}
          />
        </div>

      </div>
    </div>
  );
}