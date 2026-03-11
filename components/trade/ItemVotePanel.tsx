'use client';

import React, { useState } from 'react';
import { TradeItem, TradeEvent } from '@/types/trade';
import { insertTradeItem, deleteTradeItem } from '@/lib/supabaseClient';
import { X } from 'lucide-react';

interface Props {
  event: TradeEvent;
  onVoteOptimistic: (itemId: string, isUp: boolean) => void;
  onAddOptimistic: (item: TradeItem) => void;
  onDeleteItem?: (itemId: string) => void;
}

export default function ItemVotePanel({ event, onAddOptimistic, onDeleteItem }: Props) {
  const [newItemName, setNewItemName] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || isAdding) return;

    // 중복 체크
    if (event.items.some(it => it.name === newItemName.trim())) {
      alert('이미 등록된 품목입니다.');
      return;
    }

    setIsAdding(true);
    try {
      const data = await insertTradeItem(event.id, newItemName.trim());
      if (data) {
        onAddOptimistic({
          id: data.id,
          name: data.item_name,
          upvotes: data.upvotes,
          downvotes: data.downvotes,
          isUserVoted: undefined,
        });
        setNewItemName('');
      }
    } catch {
      alert('품목 등록 중 오류가 발생했습니다.');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (itemId: string) => {
    try {
      await deleteTradeItem(itemId);
      onDeleteItem?.(itemId);
    } catch {
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1">
      {/* 품목 태그들 */}
      {event.items.map(item => (
        <button
          key={item.id}
          onClick={() => handleDelete(item.id)}
          title="클릭하여 삭제"
          className="group inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-slate-700/60 hover:bg-red-500/20 text-slate-300 hover:text-red-400 text-[11px] font-semibold border border-white/5 hover:border-red-500/30 transition-all cursor-pointer"
        >
          {item.name}
          <X size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      ))}

      {/* 추가 입력 (최대 5개) */}
      {event.items.length < 5 && (
        <form onSubmit={handleAddItem} className="inline-flex">
          <input
            type="text"
            value={newItemName}
            onChange={e => setNewItemName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddItem(e as unknown as React.FormEvent); } }}
            placeholder="+ 품목 추가"
            className="w-[72px] focus:w-[108px] bg-transparent border-b border-white/10 focus:border-indigo-500/60 text-slate-400 focus:text-white text-[11px] px-1 py-0.5 focus:outline-none placeholder:text-slate-600 transition-all"
            maxLength={12}
            disabled={isAdding}
          />
        </form>
      )}
    </div>
  );
}
