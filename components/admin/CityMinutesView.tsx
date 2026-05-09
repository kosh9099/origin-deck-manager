'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, Loader2, X } from 'lucide-react';
import { getLatestCityMinutes, type CityMinuteEntry } from '@/lib/supabaseClient';
import { REGION_PORTS } from '@/lib/trade/cities';

const KST_FMT = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit',
  hour12: false,
});

function formatObservedAt(iso: string): string {
  return KST_FMT.format(new Date(iso));
}

type Toast = { kind: 'ok' | 'err' | 'migrate'; text: string };

export default function CityMinutesView() {
  const [entries, setEntries] = useState<CityMinuteEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchedAt, setFetchedAt] = useState<Date | null>(null);
  const [excludingId, setExcludingId] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  const load = async () => {
    setLoading(true);
    const data = await getLatestCityMinutes();
    setEntries(data);
    setFetchedAt(new Date());
    setLoading(false);
    return data;
  };

  useEffect(() => { load(); }, []);

  // 성공 토스트는 4초 후 자동 사라짐. 에러/마이그레이션 안내는 사용자가 닫을 때까지 유지.
  useEffect(() => {
    if (toast?.kind !== 'ok') return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const handleExclude = async (entry: CityMinuteEntry) => {
    if (!confirm(`[${entry.city}] :${String(entry.minute).padStart(2, '0')} 샘플을 삭제할까요?`)) return;
    setToast(null);
    setExcludingId(entry.id);
    try {
      const res = await fetch('/api/admin/city-minutes/exclude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: entry.id }),
      });
      if (res.ok) {
        const newData = await load();
        const next = newData.find(e => e.city === entry.city);
        const nextLabel = next
          ? `다음 관측치 :${String(next.minute).padStart(2, '0')} 으로 승계됨`
          : '다른 관측치 없음 (— 표시)';
        setToast({ kind: 'ok', text: `[${entry.city}] :${String(entry.minute).padStart(2, '0')} 삭제 완료 — ${nextLabel}` });
      } else {
        const body = await res.json().catch(() => ({}));
        const detail: string = body?.detail ?? body?.error ?? '';
        if (/city_minute_samples|relation .* does not exist/i.test(detail)) {
          setToast({
            kind: 'migrate',
            text: 'city_minute_samples 테이블이 없어 삭제할 수 없습니다. Supabase 에서 테이블 생성 SQL 실행 필요.',
          });
        } else {
          setToast({ kind: 'err', text: `삭제 실패: ${detail || '알 수 없는 오류'}` });
        }
      }
    } catch {
      setToast({ kind: 'err', text: '네트워크 오류' });
    } finally {
      setExcludingId(null);
    }
  };

  const minuteByCity = useMemo(() => {
    const m = new Map<string, CityMinuteEntry>();
    for (const e of entries) m.set(e.city, e);
    return m;
  }, [entries]);

  const totalCities = useMemo(
    () => Object.values(REGION_PORTS).reduce((s, l) => s + l.length, 0),
    []
  );

  return (
    <div className="min-h-screen bg-[#f0ece4] text-slate-800 font-sans p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-4">

        <div className="flex items-center justify-between gap-2">
          <Link href="/admin"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-[12px] font-bold rounded-lg shadow-sm transition-all">
            <ArrowLeft size={13} /> 관리자로
          </Link>
          <button onClick={load} disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[12px] font-bold rounded-lg shadow-sm transition-all active:scale-95 disabled:opacity-50">
            {loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
            새로고침
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
          <div>
            <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">
              도시별 이벤트 시작 분(minute) 수집 현황
            </h1>
            <p className="text-[12px] text-slate-500 mt-1 leading-relaxed">
              <code className="px-1 py-0.5 bg-slate-100 rounded text-[11px]">city_minute_samples</code> 전용 테이블에서 도시당 가장 최근 관측치 1건만 조회.
              스캔 등록(BulkForm) 에서만 적재됨 — 단건 등록은 애초에 들어오지 않음.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 font-black">
              수집됨 {entries.length} / 전체 {totalCities} 도시
            </span>
            <span className="px-2 py-1 rounded-lg bg-slate-50 text-slate-600 border border-slate-200 font-bold">
              커버리지 {totalCities > 0 ? Math.round((entries.length / totalCities) * 100) : 0}%
            </span>
            {fetchedAt && (
              <span className="text-slate-400">조회 시각: {KST_FMT.format(fetchedAt)} KST</span>
            )}
          </div>
        </div>

        {toast && (
          <div className={`sticky top-2 z-30 rounded-xl px-4 py-3 shadow-lg border-2 flex items-start gap-3
            ${toast.kind === 'ok'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
              : toast.kind === 'migrate'
                ? 'bg-amber-50 border-amber-300 text-amber-900'
                : 'bg-rose-50 border-rose-300 text-rose-800'}`}
          >
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-black">
                {toast.kind === 'ok' ? '제외 완료' : toast.kind === 'migrate' ? 'SQL 마이그레이션 필요' : '오류'}
              </div>
              <div className="text-[12px] mt-1 leading-relaxed break-words">{toast.text}</div>
              {toast.kind === 'migrate' && (
                <pre className="mt-2 bg-white/60 border border-amber-200 rounded-md p-2 text-[11px] font-mono text-amber-900 overflow-x-auto">{`CREATE TABLE city_minute_samples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city text NOT NULL,
  minute integer NOT NULL CHECK (minute >= 0 AND minute <= 59),
  recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_cms_city_recorded ON city_minute_samples (city, recorded_at DESC);
ALTER TABLE city_minute_samples DISABLE ROW LEVEL SECURITY;`}</pre>
              )}
            </div>
            <button
              onClick={() => setToast(null)}
              className="text-current opacity-60 hover:opacity-100 shrink-0"
              title="닫기"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {loading && entries.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 flex flex-col items-center gap-2 text-slate-500">
            <Loader2 size={20} className="animate-spin" />
            <span className="text-[13px] font-bold">데이터 불러오는 중...</span>
          </div>
        ) : (
          <div className="space-y-3">
            {Object.entries(REGION_PORTS).map(([zone, cities]) => {
              const collected = cities.filter(c => minuteByCity.has(c)).length;
              return (
                <div key={zone} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <span className="font-black text-slate-700 text-[13px]">{zone}</span>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border
                      ${collected === cities.length
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : collected === 0
                          ? 'bg-slate-100 text-slate-400 border-slate-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                      {collected} / {cities.length}
                    </span>
                  </div>
                  <table className="w-full text-[12px]">
                    <thead>
                      <tr className="bg-white border-b border-slate-100 text-slate-500">
                        <th className="text-left font-bold px-4 py-1.5 w-1/3">도시</th>
                        <th className="text-left font-bold px-4 py-1.5 w-[70px]">분</th>
                        <th className="text-left font-bold px-4 py-1.5">마지막 관측 (KST)</th>
                        <th className="text-right font-bold px-4 py-1.5 w-[70px]">액션</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {cities.map(city => {
                        const e = minuteByCity.get(city);
                        const isExcluding = e && excludingId === e.id;
                        return (
                          <tr key={city} className={e ? 'bg-white' : 'bg-slate-50/40'}>
                            <td className={`px-4 py-1.5 ${e ? 'text-slate-700 font-bold' : 'text-slate-400'}`}>
                              {city}
                            </td>
                            <td className="px-4 py-1.5 font-mono">
                              {e
                                ? <span className="font-black text-emerald-700">:{String(e.minute).padStart(2, '0')}</span>
                                : <span className="text-slate-300">—</span>}
                            </td>
                            <td className="px-4 py-1.5 text-slate-500 tabular-nums">
                              {e ? formatObservedAt(e.observedAt) : <span className="text-slate-300">—</span>}
                            </td>
                            <td className="px-4 py-1.5 text-right">
                              {e ? (
                                <button
                                  onClick={() => handleExclude(e)}
                                  disabled={!!excludingId}
                                  title="이 샘플을 city_minute_samples 에서 삭제"
                                  className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md bg-white border border-slate-200 text-slate-500 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-colors disabled:opacity-50"
                                >
                                  {isExcluding ? <Loader2 size={10} className="animate-spin" /> : <X size={10} />}
                                  삭제
                                </button>
                              ) : null}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}
