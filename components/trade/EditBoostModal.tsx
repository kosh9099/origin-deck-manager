'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, X, Save, Search } from 'lucide-react';
import { TradeEvent } from '@/types/trade';
import { REGION_PORTS } from '@/lib/trade/cities';
import { BOOST_EVENT_TYPES, getBoostType } from '@/constants/tradeData';
import { updateBoost, deleteBoost } from '@/lib/supabaseClient';
import { emitBoostChanged } from '@/lib/trade/boostEvents';

interface Props {
  boost: TradeEvent;
  onClose: () => void;
}

const ALL_PORTS = Object.values(REGION_PORTS).flat();
const FLASH_OPTIONS = ['흑요석', '수정세공', '네베르스로이드', '일렉트럼'];

// 한글 초성 추출 (예: "낭트" → "ㄴㅌ")
const CHOSEONG = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
const CHOSEONG_SET = new Set(CHOSEONG);

function getChoseong(s: string): string {
  let out = '';
  for (const ch of s) {
    const code = ch.charCodeAt(0);
    if (code >= 0xAC00 && code <= 0xD7A3) {
      out += CHOSEONG[Math.floor((code - 0xAC00) / 588)];
    } else if (CHOSEONG_SET.has(ch)) {
      out += ch;
    } else {
      out += ch;
    }
  }
  return out;
}

// 쿼리 전체가 초성 자모로만 구성되었는지
function isChoseongOnly(s: string): boolean {
  if (!s) return false;
  for (const ch of s) {
    if (!CHOSEONG_SET.has(ch)) return false;
  }
  return true;
}

// 항구 이름이 쿼리에 매칭되는지 (일반 substring + 초성)
function matchPort(port: string, query: string): boolean {
  if (port.includes(query)) return true;
  if (isChoseongOnly(query)) return getChoseong(port).includes(query);
  return false;
}

export default function EditBoostModal({ boost, onClose }: Props) {
  const initialCity = boost.city || boost.zone || '';
  const [city, setCity] = useState(initialCity);
  const [portQuery, setPortQuery] = useState(initialCity);
  const [showSuggest, setShowSuggest] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [boostType, setBoostType] = useState<'부양' | '급매'>(() => getBoostType(boost.type));
  const [category, setCategory] = useState(boost.type);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const suggestions = useMemo(() => {
    const q = portQuery.trim();
    if (!q || q === city) return [];
    return ALL_PORTS.filter(p => matchPort(p, q)).slice(0, 8);
  }, [portQuery, city]);

  const handleSelectPort = (p: string) => {
    setCity(p); setPortQuery(p); setShowSuggest(false); setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggest || suggestions.length === 0) {
      if (e.key === 'Enter') e.preventDefault(); // form submit 방지
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const idx = highlightedIndex >= 0 ? highlightedIndex : 0;
      if (suggestions[idx]) handleSelectPort(suggestions[idx]);
    } else if (e.key === 'Escape') {
      setShowSuggest(false);
      setHighlightedIndex(-1);
    }
  };

  const handleTypeChange = (newType: '부양' | '급매') => {
    setBoostType(newType);
    setCategory(newType === '급매' ? FLASH_OPTIONS[0] : BOOST_EVENT_TYPES['부양'][0]);
  };

  const handleSave = async () => {
    if (!city) { alert('항구를 선택하세요'); return; }
    if (!category) { alert('이벤트를 선택하세요'); return; }
    setSaving(true);
    try {
      await updateBoost(boost.id, { port_name: city, category });
      emitBoostChanged();
      onClose();
    } catch (e) {
      console.error(e);
      alert('수정 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('이 일정을 삭제하시겠습니까?')) return;
    setDeleting(true);
    try {
      await deleteBoost(boost.id);
      emitBoostChanged();
      onClose();
    } catch (e) {
      console.error(e);
      alert('삭제 중 오류가 발생했습니다.');
    } finally {
      setDeleting(false);
    }
  };

  if (!mounted) return null;

  const modal = (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
            <span className="text-lg">✏️</span> 일정 수정
          </h3>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="space-y-1.5 relative">
            <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider">항구</label>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={portQuery}
                onChange={e => { setPortQuery(e.target.value); setCity(''); setShowSuggest(true); setHighlightedIndex(-1); }}
                onFocus={() => setShowSuggest(true)}
                onBlur={() => setTimeout(() => setShowSuggest(false), 150)}
                onKeyDown={handleKeyDown}
                placeholder="항구명 입력 (초성 검색 OK, ↑↓ Enter)"
                className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-emerald-400"
              />
            </div>
            {showSuggest && suggestions.length > 0 && (
              <ul className="absolute z-20 top-full mt-1 w-full bg-white border border-slate-200 rounded-xl overflow-hidden shadow-lg max-h-48 overflow-y-auto">
                {suggestions.map((p, idx) => (
                  <li key={p}
                    onMouseDown={() => handleSelectPort(p)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`px-3 py-1.5 text-sm cursor-pointer border-b border-slate-100 last:border-0 transition-colors ${
                      idx === highlightedIndex
                        ? 'bg-emerald-50 text-emerald-700 font-bold'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}>
                    {p}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider">이벤트 종류</label>
              <select value={boostType} onChange={e => handleTypeChange(e.target.value as '부양' | '급매')}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-emerald-400">
                <option value="부양">부양</option>
                <option value="급매">급매</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider">
                {boostType === '급매' ? '품목' : '카테고리'}
              </label>
              <select value={category} onChange={e => setCategory(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-emerald-400">
                {(boostType === '급매' ? FLASH_OPTIONS : BOOST_EVENT_TYPES['부양']).map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex justify-between items-center rounded-b-3xl">
          <button onClick={handleDelete} disabled={deleting || saving}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50">
            <Trash2 size={14} /> 삭제
          </button>
          <div className="flex gap-2">
            <button onClick={onClose} disabled={saving || deleting}
              className="px-4 py-1.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50">
              취소
            </button>
            <button onClick={handleSave} disabled={saving || deleting}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-500 transition-colors disabled:opacity-50">
              <Save size={14} /> 저장
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
