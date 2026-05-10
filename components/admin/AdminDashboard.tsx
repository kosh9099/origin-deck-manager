'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, LogOut, Loader2, Clock, KeyRound, Check, Users, MapPin } from 'lucide-react';

export default function AdminDashboard() {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f0ece4] p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between gap-2">
          <Link href="/trade"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-[12px] font-bold rounded-lg shadow-sm transition-all">
            <ArrowLeft size={13} /> 교역 매니저로
          </Link>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[12px] font-bold rounded-lg shadow-sm transition-all active:scale-95 disabled:opacity-50"
          >
            {loggingOut ? <Loader2 size={13} className="animate-spin" /> : <LogOut size={13} />}
            로그아웃
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">관리자 대시보드</h1>
          <p className="text-[12px] text-slate-500 mt-1">관리자 전용 도구.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link
            href="/admin/city-minutes"
            className="block bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:border-emerald-300 hover:shadow-md transition-all group"
          >
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-100 transition-colors shrink-0">
                <Clock size={18} />
              </div>
              <div className="min-w-0">
                <h2 className="font-black text-slate-800 text-[14px]">도시별 이벤트 시작 분 수집 현황</h2>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  스캔 등록으로 쌓인 도시별 분 데이터의 현재 커버리지를 확인.
                </p>
              </div>
            </div>
          </Link>

          <Link
            href="/admin/visitors"
            className="block bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:border-indigo-300 hover:shadow-md transition-all group"
          >
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-100 transition-colors shrink-0">
                <Users size={18} />
              </div>
              <div className="min-w-0">
                <h2 className="font-black text-slate-800 text-[14px]">방문자 통계</h2>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  현재 접속 중인 방문자, 오늘·누적 접속, 최근 7일 일별 추이.
                </p>
              </div>
            </div>
          </Link>

          <Link
            href="/admin/town-labeler"
            className="block bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:border-rose-300 hover:shadow-md transition-all group"
          >
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center group-hover:bg-rose-100 transition-colors shrink-0">
                <MapPin size={18} />
              </div>
              <div className="min-w-0">
                <h2 className="font-black text-slate-800 text-[14px]">도시 라벨링 도구</h2>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  세계지도 위 빨간 점을 클릭해 town ID에 한글 도시명을 매핑.
                </p>
              </div>
            </div>
          </Link>

          <Link
            href="/admin/village-labeler"
            className="block bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:border-amber-300 hover:shadow-md transition-all group"
          >
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-100 transition-colors shrink-0">
                <MapPin size={18} />
              </div>
              <div className="min-w-0">
                <h2 className="font-black text-slate-800 text-[14px]">마을 라벨링 도구</h2>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  발견물 마을 69개에 한글명 매핑. 60개는 물물교환 가능.
                </p>
              </div>
            </div>
          </Link>
        </div>

        <ChangePasswordCard />
      </div>
    </div>
  );
}

function ChangePasswordCard() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (!current || !next) {
      setMsg({ type: 'err', text: '현재 비밀번호와 새 비밀번호를 모두 입력하세요.' });
      return;
    }
    if (next !== confirm) {
      setMsg({ type: 'err', text: '새 비밀번호와 확인이 일치하지 않습니다.' });
      return;
    }
    if (next.length < 4) {
      setMsg({ type: 'err', text: '새 비밀번호는 4자 이상이어야 합니다.' });
      return;
    }
    if (next === current) {
      setMsg({ type: 'err', text: '새 비밀번호가 현재 비밀번호와 동일합니다.' });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        setMsg({ type: 'ok', text: '비밀번호가 변경되었습니다.' });
        setCurrent(''); setNext(''); setConfirm('');
      } else {
        const errMap: Record<string, string> = {
          wrong_current: '현재 비밀번호가 일치하지 않습니다.',
          too_short: '새 비밀번호는 4자 이상이어야 합니다.',
          same_password: '새 비밀번호가 현재 비밀번호와 동일합니다.',
          unauthorized: '로그인이 만료되었습니다. 다시 로그인하세요.',
          db_error: '저장 중 오류가 발생했습니다 (admin_settings 테이블 확인).',
          admin_disabled: '관리자 게이트가 잠겨있습니다.',
        };
        setMsg({ type: 'err', text: errMap[body?.error] ?? '변경에 실패했습니다.' });
      }
    } catch {
      setMsg({ type: 'err', text: '네트워크 오류가 발생했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
          <KeyRound size={18} />
        </div>
        <div>
          <h2 className="font-black text-slate-800 text-[14px]">비밀번호 변경</h2>
          <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
            변경 후에는 .env 파일이 아닌 DB(admin_settings) 의 값이 사용됩니다. 다른 기기의 세션은 자동으로 풀립니다.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3 max-w-md">
        <div className="space-y-1">
          <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider">현재 비밀번호</label>
          <input type="password" value={current} onChange={e => setCurrent(e.target.value)}
            autoComplete="current-password"
            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100" />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider">새 비밀번호</label>
          <input type="password" value={next} onChange={e => setNext(e.target.value)}
            autoComplete="new-password"
            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100" />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider">새 비밀번호 확인</label>
          <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
            autoComplete="new-password"
            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100" />
        </div>

        {msg && (
          <p className={`text-[12px] font-bold flex items-center gap-1 ${msg.type === 'ok' ? 'text-emerald-600' : 'text-red-600'}`}>
            {msg.type === 'ok' && <Check size={13} />}
            {msg.text}
          </p>
        )}

        <button type="submit" disabled={loading}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-700 text-white font-black rounded-xl text-[13px] transition-all shadow-sm disabled:opacity-50">
          {loading ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
          비밀번호 변경
        </button>
      </form>
    </div>
  );
}
