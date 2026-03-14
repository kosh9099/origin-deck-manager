'use client';

import React, { useMemo } from 'react';
import { Sailor } from '@/types';
import CrewSearch from './CrewSearch';
import StatusLists from './StatusLists';
import { Users } from 'lucide-react';

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
}

export default function CrewManager({
  sailors,
  essentialIds, setEssentialIds,
  bannedIds, setBannedIds,
  crewSearch, setCrewSearch,
  isCrewSearchOpen, setIsCrewSearchOpen
}: Props) {

  const filteredCrews = useMemo(() => {
    const q = crewSearch.replace(/\s/g, "").toLowerCase();
    return sailors
      .filter(s => !essentialIds.has(s.id) && !bannedIds.has(s.id))
      .filter(s => !q || s.이름.replace(/\s/g, "").toLowerCase().includes(q))
      .sort((a, b) => a.이름.localeCompare(b.이름))
      .slice(0, 20);
  }, [sailors, crewSearch, essentialIds, bannedIds]);

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
    <div className="relative z-10 w-full mb-4">
      {/* 헤더 */}
      <div className="bg-indigo-600 px-4 py-2.5 rounded-t-xl border-b-2 border-indigo-500 shadow-sm">
        <h2 className="text-[13px] font-black text-white uppercase tracking-widest flex items-center gap-2">
          <Users size={16} strokeWidth={2.5} />
          인원 설정 (Crew Management)
        </h2>
      </div>

      <div className="bg-slate-50 rounded-b-xl p-4 border border-slate-200">
        <div className="space-y-4">
          <CrewSearch
            search={crewSearch}
            setSearch={setCrewSearch}
            isOpen={isCrewSearchOpen}
            setIsOpen={setIsCrewSearchOpen}
            filtered={filteredCrews}
            onAdd={addEssential}
          />
          <div className="pt-2">
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
    </div>
  );
}