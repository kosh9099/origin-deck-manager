'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { Heart, X } from 'lucide-react';

export default function DonateButton() {
  const [open, setOpen] = useState(false);

  const modal = open ? (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      style={{ zIndex: 9999 }}
      onClick={() => setOpen(false)}
    >
      <div
        className="relative bg-[#0d1117] rounded-2xl border border-white/10 shadow-2xl p-6 flex flex-col items-center gap-4 max-w-xs w-full mx-4"
        style={{ animation: 'fadeIn 0.15s ease' }}
        onClick={e => e.stopPropagation()}
      >
        <style>{`@keyframes fadeIn { from { opacity:0; transform:scale(.95); } to { opacity:1; transform:scale(1); } }`}</style>

        <button
          onClick={() => setOpen(false)}
          className="absolute top-3 right-3 p-1.5 text-slate-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
        >
          <X size={16} />
        </button>

        <div className="flex items-center gap-2">
          <Heart size={18} className="text-yellow-400" fill="currentColor" />
          <h2 className="text-base font-black text-white">카카오페이 후원</h2>
        </div>

        <p className="text-xs text-slate-400 text-center leading-relaxed">
          개발자에게 커피 한 잔을 선물해주세요 ☕<br />
          QR코드를 카카오톡 앱으로 스캔해주세요.
        </p>

        <div className="rounded-xl overflow-hidden border border-white/10 bg-white p-2">
          <Image
            src="/kakaopay_qr.png"
            alt="카카오페이 송금 QR코드"
            width={220}
            height={220}
            className="rounded-lg"
          />
        </div>

        <p className="text-[11px] text-slate-600 text-center">개발자: 고든이고든요</p>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#FFEB00] hover:bg-yellow-300 text-[#3A1A00] font-black text-sm transition-all duration-300 shadow-[0_0_20px_rgba(255,235,0,0.3)] hover:shadow-[0_0_30px_rgba(255,235,0,0.5)] hover:scale-105 active:scale-95"
      >
        <Heart size={16} fill="currentColor" />
        후원하기
      </button>

      {/* Portal: document.body에 직접 마운트하여 stacking context 문제 해결 */}
      {typeof document !== 'undefined' && createPortal(modal, document.body)}
    </>
  );
}
