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
      {/* 필수 인원 */}
      <div className="bg-green-50 p-3 rounded-xl border border-green-200 min-h-[60px]">
        <p className="text-[10px] font-black text-green-700 mb-2 uppercase tracking-widest">
          필수 인원 ({essentialIds.size})
        </p>
        <div className="flex flex-wrap gap-1.5">
          {Array.from(essentialIds).map(id => (
            <span
              key={id}
              onClick={() => onRemoveEssential(id)}
              className="text-[11px] bg-white text-green-700 px-2 py-0.5 rounded-lg border border-green-300 cursor-pointer hover:bg-red-50 hover:text-red-600 hover:border-red-300 transition-colors font-bold shadow-sm"
            >
              {findName(id)} ×
            </span>
          ))}
        </div>
      </div>

      {/* 금지 인원 */}
      <div className="bg-red-50 p-3 rounded-xl border border-red-200 min-h-[60px]">
        <p className="text-[10px] font-black text-red-700 mb-2 uppercase tracking-widest">
          금지 인원 ({bannedIds.size})
        </p>
        <div className="flex flex-wrap gap-1.5">
          {Array.from(bannedIds).map(id => (
            <span
              key={id}
              onClick={() => onRemoveBanned(id)}
              className="text-[11px] bg-white text-red-700 px-2 py-0.5 rounded-lg border border-red-300 cursor-pointer hover:bg-green-50 hover:text-green-700 hover:border-green-300 transition-colors font-bold shadow-sm"
            >
              {findName(id)} ×
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}