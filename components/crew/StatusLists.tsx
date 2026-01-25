'use client';

import React from 'react';
import { Sailor } from '@/types';

interface Props {
  sailors: Sailor[];
  essentialIds: Set<number>;
  bannedIds: Set<number>;
  onRemoveEssential: (id: number) => void;
  onRemoveBanned: (id: number) => void;
}

export default function StatusLists({ sailors, essentialIds, bannedIds, onRemoveEssential, onRemoveBanned }: Props) {
  const findName = (id: number) => sailors.find(s => s.id === id)?.이름 || 'Unknown';

  return (
    <div className="space-y-3">
      <div className="bg-green-950/20 p-3 rounded-xl border border-green-500/20 min-h-[60px]">
        <p className="text-[10px] font-black text-green-400 mb-2 uppercase tracking-widest">필수 인원 ({essentialIds.size})</p>
        <div className="flex flex-wrap gap-1.5">
          {Array.from(essentialIds).map(id => (
            <span 
              key={id} onClick={() => onRemoveEssential(id)}
              className="text-[11px] bg-green-600/20 text-green-300 px-2 py-0.5 rounded-lg border border-green-500/30 cursor-pointer hover:bg-red-500/30 transition-colors"
            >
              {findName(id)} ×
            </span>
          ))}
        </div>
      </div>

      <div className="bg-red-950/20 p-3 rounded-xl border border-red-500/20 min-h-[60px]">
        <p className="text-[10px] font-black text-red-400 mb-2 uppercase tracking-widest">금지 인원 ({bannedIds.size})</p>
        <div className="flex flex-wrap gap-1.5">
          {Array.from(bannedIds).map(id => (
            <span 
              key={id} onClick={() => onRemoveBanned(id)}
              className="text-[11px] bg-red-600/20 text-red-300 px-2 py-0.5 rounded-lg border border-red-500/30 cursor-pointer hover:bg-green-500/30 transition-colors"
            >
              {findName(id)} ×
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}