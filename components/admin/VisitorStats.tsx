'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, Loader2, Users, Calendar, TrendingUp, Eye } from 'lucide-react';

type ActiveSession = { id: string; lastSeen: string; pagePath: string | null };
type DailyCount = { date: string; count: number };
type Stats = {
  activeCount: number;
  activeSessions: ActiveSession[];
  todayCount: number;
  totalCount: number;
  last7Days: DailyCount[];
};

const KST_FMT = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
});
const KST_DATE_FMT = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  month: '2-digit', day: '2-digit',
});

function relativeKstTime(iso: string, nowMs: number): string {
  const ms = nowMs - new Date(iso).getTime();
  if (ms < 60_000) return `${Math.floor(ms / 1000)}초 전`;
  if (ms < 3600_000) return `${Math.floor(ms / 60_000)}분 전`;
  return `${Math.floor(ms / 3600_000)}시간 전`;
}

export default function VisitorStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<Date | null>(null);
  const [now, setNow] = useState(Date.now());

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/visitor-stats', { cache: 'no-store' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (/visitor_sessions|relation .* does not exist/i.test(body?.detail ?? '')) {
          setError('visitor_sessions 테이블이 없습니다. 아래 SQL 실행 후 새로고침하세요.');
        } else {
          setError(body?.detail ?? body?.error ?? '불러오기 실패');
        }
      } else {
        setStats(body as Stats);
        setFetchedAt(new Date());
      }
    } catch {
      setError('네트워크 오류');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // 30초마다 자동 새로고침
  useEffect(() => {
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, []);

  // 1초마다 상대 시각 갱신
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const maxDaily = useMemo(() => {
    if (!stats) return 1;
    return Math.max(1, ...stats.last7Days.map(d => d.count));
  }, [stats]);

  return (
    <div className="min-h-screen bg-[#f0ece4] p-4 md:p-8">
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

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Users size={22} className="text-indigo-500" /> 방문자 통계
          </h1>
          <p className="text-[12px] text-slate-500 mt-1 leading-relaxed">
            익명 세션 기반. 활성: 최근 5분 이내 활동. 자동 새로고침 30초 간격.
            {fetchedAt && <span className="ml-2">마지막 조회: {KST_FMT.format(fetchedAt)} KST</span>}
          </p>
        </div>

        {error && (
          <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 space-y-2">
            <div className="font-black text-amber-900 text-[13px]">⚠️ {error}</div>
            <pre className="bg-white/60 border border-amber-200 rounded-md p-3 text-[11px] font-mono text-amber-900 overflow-x-auto">{`CREATE TABLE visitor_sessions (
  id uuid PRIMARY KEY,
  first_seen timestamptz NOT NULL DEFAULT now(),
  last_seen timestamptz NOT NULL DEFAULT now(),
  page_path text
);
CREATE INDEX idx_visitor_last_seen ON visitor_sessions (last_seen DESC);
CREATE INDEX idx_visitor_first_seen ON visitor_sessions (first_seen);
ALTER TABLE visitor_sessions ENABLE ROW LEVEL SECURITY;`}</pre>
          </div>
        )}

        {stats && !error && (
          <>
            {/* 요약 카드 3개 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <StatCard
                icon={<Eye size={18} />}
                label="현재 접속 중"
                value={stats.activeCount}
                accent="bg-emerald-50 text-emerald-700 border-emerald-200"
                hint="최근 5분 이내 활동"
              />
              <StatCard
                icon={<Calendar size={18} />}
                label="오늘 방문 (KST)"
                value={stats.todayCount}
                accent="bg-sky-50 text-sky-700 border-sky-200"
                hint="자정부터 신규 세션"
              />
              <StatCard
                icon={<TrendingUp size={18} />}
                label="누적 방문"
                value={stats.totalCount}
                accent="bg-violet-50 text-violet-700 border-violet-200"
                hint="전체 기간 고유 세션"
              />
            </div>

            {/* 7일 차트 */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <div className="text-[13px] font-black text-slate-700 mb-3">최근 7일 일별 신규 방문</div>
              <div className="flex items-end gap-2 h-40">
                {stats.last7Days.map(d => {
                  const heightPct = (d.count / maxDaily) * 100;
                  return (
                    <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                      <div className="text-[10px] font-bold text-slate-500 tabular-nums">{d.count}</div>
                      <div className="w-full flex-1 flex items-end">
                        <div
                          className="w-full rounded-t bg-gradient-to-t from-indigo-500 to-indigo-300 transition-all"
                          style={{ height: `${Math.max(heightPct, 2)}%` }}
                        />
                      </div>
                      <div className="text-[10px] font-bold text-slate-400 tabular-nums">
                        {KST_DATE_FMT.format(new Date(d.date + 'T00:00:00+09:00'))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 활성 세션 리스트 */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <span className="font-black text-slate-700 text-[13px]">현재 활성 세션 ({stats.activeSessions.length}건)</span>
                <span className="text-[10px] text-slate-400">최대 50건 표시</span>
              </div>
              {stats.activeSessions.length === 0 ? (
                <div className="px-4 py-8 text-center text-[12px] text-slate-400">활성 세션 없음</div>
              ) : (
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="bg-white border-b border-slate-100 text-slate-500">
                      <th className="text-left font-bold px-4 py-1.5">세션 ID</th>
                      <th className="text-left font-bold px-4 py-1.5">현재 페이지</th>
                      <th className="text-right font-bold px-4 py-1.5">마지막 활동</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {stats.activeSessions.map(s => (
                      <tr key={s.id} className="bg-white">
                        <td className="px-4 py-1.5 font-mono text-[10.5px] text-slate-500">{s.id.slice(0, 8)}…{s.id.slice(-4)}</td>
                        <td className="px-4 py-1.5 text-slate-700">{s.pagePath ?? '—'}</td>
                        <td className="px-4 py-1.5 text-right text-slate-500 tabular-nums">{relativeKstTime(s.lastSeen, now)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

      </div>
    </div>
  );
}

function StatCard({
  icon, label, value, accent, hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  accent: string;
  hint?: string;
}) {
  return (
    <div className={`rounded-2xl border shadow-sm overflow-hidden ${accent}`}>
      <div className="p-5">
        <div className="flex items-center gap-2 text-[12px] font-black opacity-80">
          {icon} {label}
        </div>
        <div className="mt-2 text-3xl font-black tabular-nums">{value.toLocaleString('ko-KR')}</div>
        {hint && <div className="text-[10px] mt-1 opacity-60">{hint}</div>}
      </div>
    </div>
  );
}
