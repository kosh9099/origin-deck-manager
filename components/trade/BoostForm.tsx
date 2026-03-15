'use client';

import React, { useState, useMemo, useRef } from 'react';
import { insertBoost, getActiveBoosts } from '@/lib/supabaseClient';
import { REGION_PORTS } from '@/lib/trade/cities';
import { BOOST_EVENT_TYPES } from '@/constants/tradeData';
import { Search, ClipboardPaste, Plus, CheckCircle, XCircle, AlertTriangle, Loader2, Upload } from 'lucide-react';

const ALL_PORTS = Object.values(REGION_PORTS).flat();
const POP_TYPES = ["부양", "급매"];

// ── 탭 구분 텍스트 파서 ───────────────────────────────────────────
// 기대 포맷 (AI 변환 결과):
//   행사\t교역품\t시작시간\t도시
//   부양\t식료품\t2026/03/15 14:09\t나사우
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
        return { type: '', category: '', startTime: null, city: '', raw, error: '열이 부족합니다 (최소 4열 필요)' };
      }

      const [typeRaw, category, timeRaw, cityRaw] = cols;

      // 행사 타입 정규화
      const type = typeRaw.includes('급매') ? '급매' : '부양';

      // 카테고리 유효성 검사
      const allCategories = [...BOOST_EVENT_TYPES['부양'], ...BOOST_EVENT_TYPES['급매']];
      const matchedCategory = allCategories.find(c => category.includes(c)) || category;

      // 시간 파싱 (2026/03/15 14:09 또는 2026-03-15 14:09 형식)
      const timeNormalized = timeRaw.replace(/\//g, '-');
      const parsed = new Date(timeNormalized);
      const startTime = isNaN(parsed.getTime()) ? null : parsed;

      // 도시명 정리 (관세 정보 제거: "나사우 관세: 0%" → "나사우")
      const city = cityRaw
        .replace(/관세\s*:\s*\d+%?/g, '')
        .replace(/\d+%/g, '')
        .trim();

      // 도시 유효성 검사
      const cityValid = ALL_PORTS.some(p => p === city || city.includes(p) || p.includes(city));

      if (!startTime) {
        return { type, category: matchedCategory, startTime: null, city, raw, error: `시간 파싱 실패: "${timeRaw}"` };
      }
      if (!city) {
        return { type, category: matchedCategory, startTime, city, raw, error: '도시명 없음' };
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
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [day, setDay] = useState(now.getDate());
  const [hour, setHour] = useState(now.getHours());
  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = e.target.value as keyof typeof BOOST_EVENT_TYPES;
    setPopType(newType);
    // 급매로 전환 시 직접 입력하도록 카테고리 초기화
    setCategory(newType === '급매' ? '' : (BOOST_EVENT_TYPES[newType]?.[0] || ''));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const startDate = new Date(now.getFullYear(), month - 1, day, hour, 0, 0);
    if (startDate.getTime() < Date.now() - 60 * 60 * 1000) {
      alert(`⛔ 현재 시간보다 이전 시간은 등록할 수 없습니다.`);
      return;
    }
    if (!city) { alert('항구명을 입력해주세요.'); return; }
    setIsLoading(true); setSuccessMsg('');
    try {
      await insertBoost(city, category, startDate.toISOString());
      setSuccessMsg(`✅ [${city}] ${category} 스케줄이 추가되었습니다!`);
    } catch (error) {
      console.error(error); alert("부양 등록 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* 항구 검색 */}
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

      {/* 이벤트 종류 + 카테고리 */}
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
            <input
              type="text"
              value={category}
              onChange={e => setCategory(e.target.value)}
              placeholder="급매 품목명 입력..."
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-emerald-400 placeholder:text-slate-400"
            />
          ) : (
            <select value={category} onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-emerald-400">
              {BOOST_EVENT_TYPES[popType]?.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* 시작 시간 */}
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

// ── 일괄 붙여넣기 폼 ─────────────────────────────────────────────
function BulkForm() {
  const [pasteText, setPasteText] = useState('');
  const [parsed, setParsed] = useState<ParsedRow[]>([]);
  const [isParsed, setIsParsed] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [resultMsg, setResultMsg] = useState('');

  const handleParse = async () => {
    if (!pasteText.trim()) return;
    setIsChecking(true);
    setResultMsg('');

    const rows = parsePastedText(pasteText);

    // DB에서 기존 부양 목록 가져와서 중복 체크
    try {
      const existing = await getActiveBoosts();
      const existingKeys = new Set(
        existing.map((b: any) => {
          const t = new Date(b.start_time);
          return `${b.city}|${b.type}|${t.getFullYear()}-${t.getMonth()}-${t.getDate()}-${t.getHours()}`;
        })
      );

      // 붙여넣기 내 중복도 체크
      const seenKeys = new Set<string>();

      const checked = rows.map(row => {
        if (!row.startTime || row.error) return row;
        const t = row.startTime;
        const key = `${row.city}|${row.category}|${t.getFullYear()}-${t.getMonth()}-${t.getDate()}-${t.getHours()}`;
        const isDuplicate = existingKeys.has(key) || seenKeys.has(key);
        seenKeys.add(key);
        return { ...row, isDuplicate };
      });

      setParsed(checked);
      setIsParsed(true);
    } catch (e) {
      console.error(e);
      setParsed(rows);
      setIsParsed(true);
    } finally {
      setIsChecking(false);
    }
  };

  const validRows = parsed.filter(r => !r.error && !r.isDuplicate && r.startTime);
  const errorRows = parsed.filter(r => r.error);
  const dupRows = parsed.filter(r => r.isDuplicate && !r.error);

  const handleBulkUpload = async () => {
    if (validRows.length === 0) return;
    setIsUploading(true);
    setResultMsg('');
    let success = 0;
    let fail = 0;
    for (const row of validRows) {
      try {
        await insertBoost(row.city, row.category, row.startTime!.toISOString());
        success++;
      } catch {
        fail++;
      }
    }
    setResultMsg(`✅ ${success}건 등록 완료${fail > 0 ? ` / ⚠️ ${fail}건 실패` : ''}`);
    setIsUploading(false);
    setPasteText('');
    setParsed([]);
    setIsParsed(false);
  };

  return (
    <div className="space-y-4">
      {/* 안내 */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
        <p className="text-[12px] font-black text-blue-700 mb-1">📋 사용 방법</p>
        <p className="text-[11px] text-blue-600 leading-relaxed">
          AI로 스크린샷을 분석 후 아래 형식으로 변환하여 붙여넣기 하세요.<br />
          <span className="font-black">행사 · 교역품 · 날짜시간 · 도시명</span> 순서로 탭(Tab)으로 구분
        </p>
        <div className="mt-2 bg-white border border-blue-200 rounded-lg px-3 py-2 font-mono text-[11px] text-slate-600">
          부양&nbsp;&nbsp;&nbsp;&nbsp;식료품&nbsp;&nbsp;&nbsp;&nbsp;2026/03/15 14:09&nbsp;&nbsp;&nbsp;&nbsp;나사우<br />
          부양&nbsp;&nbsp;&nbsp;&nbsp;조미료&nbsp;&nbsp;&nbsp;&nbsp;2026/03/15 16:01&nbsp;&nbsp;&nbsp;&nbsp;캘리마누
        </div>
      </div>

      {/* 텍스트 입력 */}
      <div className="space-y-1.5">
        <label className="text-[12px] font-black text-slate-600 uppercase tracking-wider">붙여넣기 영역</label>
        <textarea
          value={pasteText}
          onChange={e => { setPasteText(e.target.value); setIsParsed(false); setResultMsg(''); }}
          placeholder="AI 변환 결과를 여기에 붙여넣기 하세요..."
          rows={6}
          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 font-mono focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 placeholder:text-slate-400 resize-none"
        />
      </div>

      {/* 파싱 버튼 */}
      {!isParsed && (
        <button onClick={handleParse} disabled={!pasteText.trim() || isChecking}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-3 rounded-xl transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-2">
          {isChecking ? <Loader2 size={16} className="animate-spin" /> : <ClipboardPaste size={16} />}
          {isChecking ? '중복 확인 중...' : '내용 분석 및 중복 확인'}
        </button>
      )}

      {/* 미리보기 테이블 */}
      {isParsed && parsed.length > 0 && (
        <div className="space-y-3">
          {/* 요약 */}
          <div className="flex gap-2 flex-wrap">
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
          </div>

          {/* 테이블 */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200">
                  <th className="px-3 py-2 text-left font-black text-slate-600">상태</th>
                  <th className="px-3 py-2 text-left font-black text-slate-600">행사</th>
                  <th className="px-3 py-2 text-left font-black text-slate-600">교역품</th>
                  <th className="px-3 py-2 text-left font-black text-slate-600">시작 시간</th>
                  <th className="px-3 py-2 text-left font-black text-slate-600">도시</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {parsed.map((row, i) => (
                  <tr key={i} className={`
                    ${row.error ? 'bg-red-50' : row.isDuplicate ? 'bg-amber-50' : 'bg-white hover:bg-emerald-50'}
                    transition-colors
                  `}>
                    <td className="px-3 py-2">
                      {row.error
                        ? <span className="flex items-center gap-1 text-red-500"><XCircle size={13} /> 오류</span>
                        : row.isDuplicate
                          ? <span className="flex items-center gap-1 text-amber-600"><AlertTriangle size={13} /> 중복</span>
                          : <span className="flex items-center gap-1 text-emerald-600"><CheckCircle size={13} /> 등록</span>}
                    </td>
                    <td className="px-3 py-2 text-slate-700">{row.type || '-'}</td>
                    <td className="px-3 py-2 text-slate-700">{row.category || '-'}</td>
                    <td className="px-3 py-2 text-slate-600 font-mono">
                      {row.startTime
                        ? `${row.startTime.getMonth() + 1}/${row.startTime.getDate()} ${String(row.startTime.getHours()).padStart(2, '0')}:${String(row.startTime.getMinutes()).padStart(2, '0')}`
                        : <span className="text-red-400">{row.error}</span>}
                    </td>
                    <td className="px-3 py-2 text-slate-700">{row.city || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 액션 버튼 */}
          <div className="flex gap-3">
            <button
              onClick={() => { setIsParsed(false); setParsed([]); }}
              className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold rounded-xl text-sm transition-all"
            >
              다시 수정
            </button>
            <button
              onClick={handleBulkUpload}
              disabled={validRows.length === 0 || isUploading}
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-sm transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isUploading
                ? <><Loader2 size={15} className="animate-spin" /> 등록 중...</>
                : <><Upload size={15} /> {validRows.length}건 일괄 등록</>}
            </button>
          </div>
        </div>
      )}

      {resultMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[13px] font-bold rounded-xl text-center">
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
      {/* 탭 전환 */}
      <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
        <button
          onClick={() => setTab('single')}
          className={`py-2 rounded-lg text-sm font-black transition-all flex items-center justify-center gap-1.5
            ${tab === 'single' ? 'bg-white text-emerald-700 shadow-sm border border-emerald-200' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Plus size={15} /> 단건 등록
        </button>
        <button
          onClick={() => setTab('bulk')}
          className={`py-2 rounded-lg text-sm font-black transition-all flex items-center justify-center gap-1.5
            ${tab === 'bulk' ? 'bg-white text-indigo-700 shadow-sm border border-indigo-200' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <ClipboardPaste size={15} /> 일괄 붙여넣기
        </button>
      </div>

      {/* 패널 */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="mb-4 pb-3 border-b border-slate-100">
          <h2 className="text-[15px] font-black text-slate-800">
            {tab === 'single' ? '새 부양 스케줄 등록' : 'AI 변환 결과 일괄 등록'}
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {tab === 'single' ? '서버 시장님이 오픈한 부양 상황을 제보해주세요.' : '스크린샷을 AI로 분석한 결과를 한 번에 등록합니다.'}
          </p>
        </div>
        {tab === 'single' ? <SingleForm /> : <BulkForm />}
      </div>
    </div>
  );
}