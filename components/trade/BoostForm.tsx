'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { insertBoost, getActiveBoosts } from '@/lib/supabaseClient';
import { REGION_PORTS } from '@/lib/trade/cities';
import { BOOST_EVENT_TYPES } from '@/constants/tradeData';
import { Search, Plus, CheckCircle, XCircle, AlertTriangle, Loader2, Upload } from 'lucide-react';

// ── 시트에서 급매 목록 가져오기 ──────────────────────────────────
async function fetchFlashItems(): Promise<string[]> {
  try {
    const res = await fetch('/api/sheet?gid=647153257', { cache: 'no-store' });
    if (!res.ok) return [];
    const text = await res.text();
    const lines = text.split('\n').slice(1); // 헤더 스킵
    const items = new Set<string>();
    for (const line of lines) {
      const cols = line.split(',');
      const flashItem = cols[9]?.replace(/"/g, '').trim(); // J열 = 급매1
      if (flashItem && flashItem.length > 0) items.add(flashItem);
    }
    return Array.from(items).sort();
  } catch {
    return ['흑요석', '수정세공', '네베르스로이드', '일렉트럼']; // fallback
  }
}

const ALL_PORTS = Object.values(REGION_PORTS).flat();
const POP_TYPES = ["부양", "급매"];

// ── 탭 구분 텍스트 파서 ───────────────────────────────────────────
interface ParsedRow {
  type: string;
  category: string;
  startTime: Date | null;
  city: string;
  raw: string;
  error?: string;
  isDuplicate?: boolean;
}

function parsePastedText(text: string): ParsedRow[] {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => {
      const cols = line.split('\t').map(c => c.trim());
      const raw = line;
      if (cols.length < 4) {
        return { type: '', category: '', startTime: null, city: '', raw, error: '열이 부족합니다' };
      }
      const [typeRaw, category, timeRaw, cityRaw] = cols;
      const type = typeRaw.includes('급매') ? '급매' : '부양';
      const allCategories = [...BOOST_EVENT_TYPES['부양'], ...BOOST_EVENT_TYPES['급매']];
      const matchedCategory = allCategories.find(c => category.includes(c)) || category;
      const timeNormalized = timeRaw.replace(/\//g, '-');
      const parsed = new Date(timeNormalized);
      const startTime = isNaN(parsed.getTime()) ? null : parsed;
      const city = cityRaw.replace(/관세\s*:\s*\d+%?/g, '').replace(/\d+%/g, '').trim();
      if (!startTime) {
        return { type, category: matchedCategory, startTime: null, city, raw, error: `시간 파싱 실패: "${timeRaw}"` };
      }
      return { type, category: matchedCategory, startTime, city, raw };
    });
}

// ── 단건 등록 폼 ─────────────────────────────────────────────────
function SingleForm() {
  const [portQuery, setPortQuery] = useState('');
  const [city, setCity] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = useMemo(() => {
    if (!portQuery.trim()) return [];
    return ALL_PORTS.filter(p => p.includes(portQuery.trim())).slice(0, 8);
  }, [portQuery]);

  const handleSelectPort = (port: string) => {
    setCity(port); setPortQuery(port);
    setShowSuggestions(false); setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightedIndex(i => Math.min(i + 1, suggestions.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightedIndex(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); const idx = highlightedIndex >= 0 ? highlightedIndex : 0; if (suggestions[idx]) handleSelectPort(suggestions[idx]); }
    else if (e.key === 'Escape') { setShowSuggestions(false); setHighlightedIndex(-1); }
  };

  const [popType, setPopType] = useState<keyof typeof BOOST_EVENT_TYPES>('부양');
  const [category, setCategory] = useState(BOOST_EVENT_TYPES['부양'][0]);
  const [flashItems, setFlashItems] = useState<string[]>([]);

  // 급매 목록 시트에서 로딩
  useEffect(() => {
    fetchFlashItems().then(items => {
      setFlashItems(items);
    });
  }, []);
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [day, setDay] = useState(now.getDate());
  const [hour, setHour] = useState(now.getHours());
  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = e.target.value as keyof typeof BOOST_EVENT_TYPES;
    setPopType(newType);
    setCategory(newType === '급매' ? (flashItems[0] || '') : (BOOST_EVENT_TYPES[newType]?.[0] || ''));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const startDate = new Date(now.getFullYear(), month - 1, day, hour, 0, 0);
    if (startDate.getTime() < Date.now() - 60 * 60 * 1000) {
      alert('현재 시간보다 이전 시간은 등록할 수 없습니다.');
      return;
    }
    if (!city) { alert('항구명을 입력해주세요.'); return; }
    setIsLoading(true); setSuccessMsg('');
    try {
      await insertBoost(city, category, startDate.toISOString());
      setSuccessMsg(`✅ [${city}] ${category} 스케줄이 추가되었습니다!`);
    } catch (error) {
      console.error(error); alert('부양 등록 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5 relative">
        <label className="text-[12px] font-black text-slate-600 uppercase tracking-wider">항구 검색</label>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            value={portQuery}
            onChange={e => { setPortQuery(e.target.value); setCity(''); setShowSuggestions(true); setHighlightedIndex(-1); }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            onKeyDown={handleKeyDown}
            placeholder="항구명 입력... (예: 런던, 이스탄불)"
            className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 placeholder:text-slate-400"
          />
        </div>
        {showSuggestions && suggestions.length > 0 && (
          <ul className="absolute z-30 top-full mt-1 w-full bg-white border border-slate-200 rounded-xl overflow-hidden shadow-lg">
            {suggestions.map((port, idx) => (
              <li key={port} onMouseDown={() => handleSelectPort(port)} onMouseEnter={() => setHighlightedIndex(idx)}
                className={`px-4 py-2 text-sm cursor-pointer transition-colors border-b border-slate-100 last:border-0
                  ${idx === highlightedIndex ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}>
                {port}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex gap-3 w-full">
        <div className="space-y-1.5 flex-1">
          <label className="text-[12px] font-black text-slate-600 uppercase tracking-wider">이벤트 종류</label>
          <select value={popType} onChange={handleTypeChange}
            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-emerald-400">
            {POP_TYPES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div className="space-y-1.5 flex-1">
          <label className="text-[12px] font-black text-slate-600 uppercase tracking-wider">
            {popType === '급매' ? '품목명 직접 입력' : '카테고리'}
          </label>
          {popType === '급매' ? (
            <select value={category} onChange={e => setCategory(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-emerald-400">
              {flashItems.length > 0
                ? flashItems.map(c => <option key={c} value={c}>{c}</option>)
                : <option value="">로딩 중...</option>}
            </select>
          ) : (
            <select value={category} onChange={e => setCategory(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-emerald-400">
              {BOOST_EVENT_TYPES[popType]?.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-[12px] font-black text-slate-600 uppercase tracking-wider">시작 시간</label>
        <div className="flex gap-2">
          {[
            { value: month, setter: setMonth, options: Array.from({ length: 12 }, (_, i) => ({ v: i + 1, label: `${i + 1}월` })) },
            { value: day, setter: setDay, options: Array.from({ length: 31 }, (_, i) => ({ v: i + 1, label: `${i + 1}일` })) },
            { value: hour, setter: setHour, options: Array.from({ length: 24 }, (_, i) => ({ v: i, label: `${String(i).padStart(2, '0')}시` })) },
          ].map((sel, i) => (
            <select key={i} value={sel.value} onChange={e => sel.setter(Number(e.target.value))}
              className="flex-1 bg-white border border-slate-200 rounded-xl px-2 py-2.5 text-sm text-slate-700 text-center focus:outline-none focus:border-emerald-400">
              {sel.options.map(o => <option key={o.v} value={o.v}>{o.label}</option>)}
            </select>
          ))}
        </div>
      </div>

      <button type="submit" disabled={isLoading}
        className="w-full mt-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 rounded-xl transition-all shadow-sm disabled:opacity-50 flex justify-center items-center gap-2">
        {isLoading ? <Loader2 size={18} className="animate-spin" /> : <><Upload size={16} /> 스케줄 등록하기</>}
      </button>

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[13px] font-bold rounded-xl text-center">
          {successMsg}
        </div>
      )}
    </form>
  );
}

// ── AI 스캔 등록 폼 ──────────────────────────────────────────────
function BulkForm() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [parsed, setParsed] = useState<ParsedRow[]>([]);
  const [isParsed, setIsParsed] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [resultMsg, setResultMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    setImageFile(file);
    setIsParsed(false); setParsed([]); setResultMsg('');
    const reader = new FileReader();
    reader.onload = e => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleImageSelect(file);
  };

  // 전역 클립보드 붙여넣기 (Ctrl+V)
  useEffect(() => {
    const handler = (e: ClipboardEvent) => {
      if (imagePreview) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) { handleImageSelect(file); break; }
        }
      }
    };
    window.addEventListener('paste', handler);
    return () => window.removeEventListener('paste', handler);
  }, [imagePreview]);

  const handleAnalyze = async () => {
    if (!imageFile || !imagePreview) return;
    setIsAnalyzing(true); setResultMsg('');
    try {
      const base64 = imagePreview.split(',')[1];
      const mediaType = imageFile.type;

      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64, mediaType }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'AI 분석 실패');
      }

      const { text } = await res.json();
      if (!text?.trim()) throw new Error('분석 결과가 없습니다');

      const rows = parsePastedText(text);
      const existing = await getActiveBoosts().catch(() => []);
      const newExistingKeys = new Set<string>(existing.map((b: any) => {
        const t = new Date(b.start_time);
        return `${b.city}|${b.type}|${t.getFullYear()}-${t.getMonth()}-${t.getDate()}-${t.getHours()}`;
      }));
      setExistingKeys(newExistingKeys);

      const seenKeys = new Set<string>();
      const checked = rows.map(row => {
        if (!row.startTime || row.error) return row;
        const t = row.startTime;
        const key = `${row.city}|${row.category}|${t.getFullYear()}-${t.getMonth()}-${t.getDate()}-${t.getHours()}`;
        const isDuplicate = newExistingKeys.has(key) || seenKeys.has(key);
        seenKeys.add(key);
        return { ...row, isDuplicate };
      });
      setParsed(checked); setIsParsed(true);
    } catch (e: any) {
      setResultMsg(`❌ ${e.message || '다시 시도해주세요'}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const [editedRows, setEditedRows] = useState<ParsedRow[]>([]);
  const [existingKeys, setExistingKeys] = useState<Set<string>>(new Set());

  // parsed가 바뀌면 editedRows도 동기화
  useEffect(() => {
    setEditedRows(parsed);
  }, [parsed]);

  // editedRows가 바뀔 때마다 중복 + 과거 시간 재계산
  const reCheckedRows = useMemo(() => {
    const seenKeys = new Set<string>();
    const nowMs = Date.now() - 60 * 60 * 1000; // 1시간 전까지는 허용
    return editedRows.map(row => {
      if (!row.startTime || row.error) return { ...row, isDuplicate: false };
      // 과거 시간 체크
      if (row.startTime.getTime() < nowMs) {
        return { ...row, isDuplicate: false, error: '과거 시간은 등록 불가' };
      }
      const t = row.startTime;
      const key = `${row.city}|${row.category}|${t.getFullYear()}-${t.getMonth()}-${t.getDate()}-${t.getHours()}`;
      const isDuplicate = existingKeys.has(key) || seenKeys.has(key);
      seenKeys.add(key);
      return { ...row, isDuplicate, error: undefined };
    });
  }, [editedRows, existingKeys]);

  const updateRow = (i: number, field: keyof ParsedRow, value: string) => {
    setEditedRows(prev => prev.map((row, idx) => {
      if (idx !== i) return row;
      if (field === 'startTime') {
        const p = new Date(value.replace(/\//g, '-'));
        return { ...row, startTime: isNaN(p.getTime()) ? null : p };
      }
      return { ...row, [field]: value };
    }));
  };

  const validRows = reCheckedRows.filter(r => !r.error && !r.isDuplicate && r.startTime);
  const errorRows = reCheckedRows.filter(r => r.error);
  const dupRows = reCheckedRows.filter(r => r.isDuplicate && !r.error);

  const handleBulkUpload = async () => {
    if (validRows.length === 0) return;
    setIsUploading(true); setResultMsg('');
    let success = 0, fail = 0;
    for (const row of validRows) {
      try { await insertBoost(row.city, row.category, row.startTime!.toISOString()); success++; }
      catch { fail++; }
    }
    setResultMsg(`✅ ${success}건 등록 완료${fail > 0 ? ` / ⚠️ ${fail}건 실패` : ''}`);
    setIsUploading(false);
    setImageFile(null); setImagePreview(null);
    setParsed([]); setEditedRows([]); setIsParsed(false);
  };

  return (
    <div className="space-y-4">

      {/* 이미지 업로드 / 붙여넣기 영역 */}
      {!imagePreview ? (
        <div
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-300 hover:border-emerald-400 rounded-2xl p-8 text-center cursor-pointer transition-all bg-slate-50 hover:bg-emerald-50 group"
        >
          <div className="text-3xl mb-2">📷</div>
          <p className="text-[13px] font-black text-slate-600 group-hover:text-emerald-700">
            스크린샷 드래그 / 클릭해서 업로드
          </p>
          <p className="text-[12px] font-bold text-indigo-500 mt-1.5 flex items-center justify-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[11px] font-black text-slate-600 shadow-sm">Ctrl</kbd>
            +
            <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[11px] font-black text-slate-600 shadow-sm">V</kbd>
            로 클립보드 붙여넣기도 가능
          </p>
          <p className="text-[10px] text-slate-400 mt-1">PNG, JPG 지원</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleImageSelect(f); }}
          />
        </div>
      ) : (
        <div className="space-y-3">
          <div className="relative rounded-xl overflow-hidden border border-slate-200 shadow-sm">
            <img src={imagePreview} alt="업로드된 스크린샷" className="w-full max-h-64 object-contain bg-slate-100" />
            <button
              onClick={() => { setImageFile(null); setImagePreview(null); setIsParsed(false); setParsed([]); setResultMsg(''); }}
              className="absolute top-2 right-2 bg-white rounded-full p-1 shadow border border-slate-200 text-slate-500 hover:text-red-500 transition-colors"
            >
              <XCircle size={16} />
            </button>
          </div>

          {!isParsed && (
            <button onClick={handleAnalyze} disabled={isAnalyzing}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-3 rounded-xl transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-2">
              {isAnalyzing
                ? <><Loader2 size={16} className="animate-spin" /> AI 분석 중...</>
                : <><span className="text-base">🤖</span> AI로 스케줄 자동 추출</>}
            </button>
          )}
        </div>
      )}

      {/* 미리보기 테이블 */}
      {isParsed && parsed.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-black px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
              ✅ 등록 가능 {validRows.length}건
            </span>
            {dupRows.length > 0 && (
              <span className="text-[11px] font-black px-2 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
                ⚠️ 중복 {dupRows.length}건
              </span>
            )}
            {errorRows.length > 0 && (
              <span className="text-[11px] font-black px-2 py-1 rounded-lg bg-red-50 text-red-700 border border-red-200">
                ❌ 오류 {errorRows.length}건
              </span>
            )}
            <span className="text-[10px] text-slate-400 ml-auto">셀 클릭하여 직접 수정 가능</span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200">
                  {['상태', '행사', '교역품', '시작 시간', '도시'].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-black text-slate-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reCheckedRows.map((row, i) => (
                  <tr key={i} className={row.error ? 'bg-red-50' : row.isDuplicate ? 'bg-amber-50' : 'bg-white'}>
                    <td className="px-3 py-2 shrink-0">
                      {row.error
                        ? <span className="flex items-center gap-1 text-red-500"><XCircle size={12} /> 오류</span>
                        : row.isDuplicate
                          ? <span className="flex items-center gap-1 text-amber-600"><AlertTriangle size={12} /> 중복</span>
                          : <span className="flex items-center gap-1 text-emerald-600"><CheckCircle size={12} /> 등록</span>}
                    </td>
                    {/* 행사 */}
                    <td className="px-2 py-1.5">
                      <select value={row.type || '부양'} onChange={e => updateRow(i, 'type', e.target.value)}
                        className="w-full text-[11px] font-bold bg-white border border-slate-200 rounded-lg px-1.5 py-1 focus:outline-none focus:border-emerald-400">
                        <option value="부양">부양</option>
                        <option value="급매">급매</option>
                      </select>
                    </td>
                    {/* 교역품 */}
                    <td className="px-2 py-1.5">
                      <input type="text" value={row.category || ''} onChange={e => updateRow(i, 'category', e.target.value)}
                        className="w-full text-[11px] bg-white border border-slate-200 rounded-lg px-1.5 py-1 focus:outline-none focus:border-emerald-400 min-w-[60px]" />
                    </td>
                    {/* 시작 시간 */}
                    <td className="px-2 py-1.5">
                      <input type="text"
                        defaultValue={row.startTime
                          ? `${row.startTime.getFullYear()}/${row.startTime.getMonth() + 1}/${row.startTime.getDate()} ${String(row.startTime.getHours()).padStart(2, '0')}:${String(row.startTime.getMinutes()).padStart(2, '0')}`
                          : ''}
                        onBlur={e => updateRow(i, 'startTime', e.target.value)}
                        placeholder="YYYY/MM/DD HH:MM"
                        className="w-full text-[11px] font-mono bg-white border border-slate-200 rounded-lg px-1.5 py-1 focus:outline-none focus:border-emerald-400 min-w-[110px]" />
                    </td>
                    {/* 도시 */}
                    <td className="px-2 py-1.5">
                      <input type="text" value={row.city || ''} onChange={e => updateRow(i, 'city', e.target.value)}
                        className="w-full text-[11px] bg-white border border-slate-200 rounded-lg px-1.5 py-1 focus:outline-none focus:border-emerald-400 min-w-[60px]" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-3">
            <button onClick={() => { setIsParsed(false); setParsed([]); }}
              className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold rounded-xl text-sm transition-all">
              다시 분석
            </button>
            <button onClick={handleBulkUpload} disabled={validRows.length === 0 || isUploading}
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-sm transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-2">
              {isUploading
                ? <><Loader2 size={15} className="animate-spin" /> 등록 중...</>
                : <><Upload size={15} /> {validRows.length}건 일괄 등록</>}
            </button>
          </div>
        </div>
      )}

      {resultMsg && (
        <div className={`p-3 border rounded-xl text-[13px] font-bold text-center
          ${resultMsg.startsWith('❌') ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
          {resultMsg}
        </div>
      )}
    </div>
  );
}

// ── 메인 BoostForm ───────────────────────────────────────────────
export default function BoostForm() {
  const [tab, setTab] = useState<'single' | 'bulk'>('single');

  return (
    <div className="w-full max-w-xl mx-auto space-y-4">
      <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
        <button onClick={() => setTab('single')}
          className={`py-2 rounded-lg text-sm font-black transition-all flex items-center justify-center gap-1.5
            ${tab === 'single' ? 'bg-white text-emerald-700 shadow-sm border border-emerald-200' : 'text-slate-500 hover:text-slate-700'}`}>
          <Plus size={15} /> 단건 등록
        </button>
        <button onClick={() => setTab('bulk')}
          className={`py-2 rounded-lg text-sm font-black transition-all flex items-center justify-center gap-1.5
            ${tab === 'bulk' ? 'bg-white text-indigo-700 shadow-sm border border-indigo-200' : 'text-slate-500 hover:text-slate-700'}`}>
          <span className="text-base">🤖</span> AI 스캔 등록
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="mb-4 pb-3 border-b border-slate-100">
          <h2 className="text-[15px] font-black text-slate-800">
            {tab === 'single' ? '새 부양 스케줄 등록' : 'AI 스크린샷 일괄 등록'}
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {tab === 'single'
              ? '서버 시장님이 오픈한 부양 상황을 제보해주세요.'
              : '스크린샷을 올리면 AI가 자동으로 일정을 추출해 등록합니다.'}
          </p>
        </div>
        {tab === 'single' ? <SingleForm /> : <BulkForm />}
      </div>
    </div>
  );
}