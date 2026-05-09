'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Lock, Loader2, ArrowLeft } from 'lucide-react';

export default function LoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!password) {
      setError('비밀번호를 입력하세요.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        setPassword('');
        router.refresh();
      } else {
        setError('비밀번호가 일치하지 않습니다.');
      }
    } catch {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f0ece4] flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-4">
        <Link href="/trade"
          className="inline-flex items-center gap-1.5 text-[12px] font-bold text-slate-500 hover:text-slate-700">
          <ArrowLeft size={13} /> 교역 매니저로
        </Link>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center">
              <Lock size={18} />
            </div>
            <h1 className="text-lg font-black text-slate-800">관리자 로그인</h1>
            <p className="text-[11px] text-slate-500">
              승인된 사용자만 접근할 수 있습니다.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="비밀번호"
              autoFocus
              autoComplete="current-password"
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 placeholder:text-slate-400"
            />
            {error && (
              <p className="text-[12px] font-bold text-red-600 text-center">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 hover:bg-slate-700 text-white font-black py-2.5 rounded-xl transition-all shadow-sm disabled:opacity-50 flex justify-center items-center gap-2 text-sm"
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : '로그인'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
