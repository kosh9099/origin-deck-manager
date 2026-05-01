'use client';

import React, { useEffect, useState } from 'react';
import { X, Sparkles, Loader2 } from 'lucide-react';
import type { BarterRecipe } from '@/types/barter';
import { loadRecipes } from '@/lib/barter/recipes';
import {
  addSpecial,
  deleteSpecial,
  getActiveSpecials,
  SpecialRow,
} from '@/lib/supabaseClient';
import { emitSpecialChanged } from '@/lib/trade/boostEvents';
import BarterSearchBar from './BarterSearchBar';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function SpecialForm({ open, onClose }: Props) {
  const [recipes, setRecipes] = useState<Map<string, BarterRecipe> | null>(null);
  const [items, setItems] = useState<SpecialRow[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    loadRecipes().then(({ recipes }) => setRecipes(recipes));
    refreshList();
  }, [open]);

  const refreshList = async () => {
    const list = await getActiveSpecials();
    setItems(list);
  };

  const handleAdd = async (name: string) => {
    if (busy) return;
    setBusy(true);
    try {
      await addSpecial(name);
      await refreshList();
      emitSpecialChanged();
    } catch (e) {
      console.error('addSpecial failed:', e);
      alert('등록 중 오류가 발생했습니다.');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (busy) return;
    setBusy(true);
    try {
      await deleteSpecial(id);
      await refreshList();
      emitSpecialChanged();
    } catch (e) {
      console.error('deleteSpecial failed:', e);
      alert('삭제 중 오류가 발생했습니다.');
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[10vh] px-4 bg-black/40 backdrop-blur-sm">
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="px-5 py-3 border-b border-slate-200 bg-gradient-to-r from-amber-50 to-yellow-50 flex items-center gap-2">
          <Sparkles size={18} className="text-amber-500" />
          <h3 className="font-black text-slate-800 text-base flex-1">특수 물교 등록</h3>
          <button
            onClick={onClose}
            className="p-1.5 -m-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            aria-label="닫기"
          >
            <X size={18} />
          </button>
        </div>

        {/* 본문 */}
        <div className="p-4 space-y-3">
          <p className="text-[12px] text-slate-500">
            검색 후 ↑↓ 방향키로 선택하고 Enter로 즉시 등록됩니다. 한국 시간 자정까지 유효합니다.
          </p>

          {recipes ? (
            <BarterSearchBar recipes={recipes} popular={[]} onAdd={handleAdd} />
          ) : (
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Loader2 size={14} className="animate-spin" />
              물교 데이터 로딩 중...
            </div>
          )}

          {/* 현재 active 목록 */}
          <div className="pt-2 border-t border-slate-100">
            <div className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-2">
              현재 등록된 특수 품목
            </div>
            {items.length === 0 ? (
              <p className="text-[12px] text-slate-400 italic">아직 등록된 품목이 없습니다.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {items.map(item => (
                  <span
                    key={item.id}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 border border-amber-300 text-amber-900 text-[12px] font-bold rounded-md"
                  >
                    {item.name}
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      disabled={busy}
                      className="text-amber-500 hover:text-red-500 disabled:opacity-50"
                      aria-label={`${item.name} 삭제`}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 푸터 */}
        <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-[12px] font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
