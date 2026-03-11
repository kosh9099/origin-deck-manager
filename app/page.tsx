import Link from 'next/link';
import { Sword, Map, Ship, Anchor, Compass, ArrowRight } from 'lucide-react';
import DonateButton from '@/components/DonateButton';

const managers = [
  {
    href: null,
    icon: Sword,
    iconColor: 'text-slate-500',
    iconBg: 'bg-slate-700/20',
    iconRing: 'ring-slate-600/30',
    gradient: 'from-slate-700 to-slate-800',
    label: '전투 매니저',
    desc: '최적의 전투 함대를 구성하기 위한 승무원 배치 도구.',
    badge: '개발 중',
    active: false,
  },
  {
    href: '/land',
    icon: Map,
    iconColor: 'text-blue-400',
    iconBg: 'bg-blue-500/15',
    iconRing: 'ring-blue-500/40',
    gradient: 'from-blue-500 via-indigo-500 to-purple-600',
    label: '육탐 매니저',
    desc: '육지 탐색 특화 함대 구성 및 모험 스킬 최적화.',
    badge: null,
    active: true,
    glow: 'shadow-[0_0_40px_rgba(79,70,229,0.25)] hover:shadow-[0_0_70px_rgba(79,70,229,0.45)]',
  },
  {
    href: '/trade',
    icon: Ship,
    iconColor: 'text-emerald-400',
    iconBg: 'bg-emerald-500/15',
    iconRing: 'ring-emerald-500/40',
    gradient: 'from-emerald-400 via-teal-500 to-cyan-500',
    label: '교역 매니저',
    desc: '대유행 예측과 실시간 부양 이벤트 공유 스케줄.',
    badge: null,
    active: true,
    glow: 'shadow-[0_0_40px_rgba(16,185,129,0.25)] hover:shadow-[0_0_70px_rgba(16,185,129,0.45)]',
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-[#05070a] text-slate-100 flex flex-col items-center justify-center relative overflow-hidden font-sans px-4 py-16">

      {/* Background blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-15%] left-[-10%] w-[55vw] h-[55vw] bg-blue-700/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-15%] right-[-10%] w-[55vw] h-[55vw] bg-amber-600/10 rounded-full blur-[140px]" />
      </div>

      {/* Title */}
      <div className="z-10 text-center mb-14 space-y-5">
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-orange-400 to-indigo-400 drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] flex items-center justify-center gap-3 sm:gap-5">
          <Anchor className="text-amber-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.5)] hidden sm:block" size={56} />
          호그라나도 덱 매니저
          <Compass className="text-indigo-400 drop-shadow-[0_0_15px_rgba(129,140,248,0.5)] hidden sm:block" size={56} />
        </h1>
        <p className="text-base md:text-lg text-slate-400 max-w-xl mx-auto font-medium border-t border-slate-800/50 pt-5 leading-relaxed">
          원하시는 매니저를 선택하여 함대를 최적화하고<br className="hidden sm:block" /> 최고의 효율을 이끌어내세요.
        </p>
        <div>
          <DonateButton />
        </div>
      </div>

      {/* Manager buttons — always shown in row on md+, stacked on mobile */}
      <div className="z-10 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-4xl">
        {managers.map(m => {
          const Icon = m.icon;
          const inner = (
            <div className={`h-full w-full bg-[#0a0f16]/90 backdrop-blur-xl rounded-[15px] p-5 flex flex-col gap-3 relative border border-white/10 overflow-hidden`}>
              {/* shimmer */}
              {m.active && <div className="absolute inset-0 -translate-x-[100%] group-hover:animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/8 to-transparent skew-x-12" />}

              {/* Icon + label row */}
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-xl ${m.iconBg} ${m.iconColor} ring-2 ${m.iconRing} transition-all duration-500 ${m.active ? 'group-hover:scale-105' : 'grayscale'} shrink-0`}>
                  <Icon size={28} />
                </div>
                <div>
                  <h2 className={`text-lg font-black tracking-tight ${m.active ? 'text-white group-hover:text-amber-200' : 'text-slate-400'} transition-colors`}>{m.label}</h2>
                  {m.badge && (
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700/50">{m.badge}</span>
                  )}
                </div>
              </div>

              {/* Description */}
              <p className={`text-xs leading-relaxed ${m.active ? 'text-slate-400 group-hover:text-slate-200' : 'text-slate-600'} transition-colors flex-1`}>{m.desc}</p>

              {/* CTA */}
              {m.active ? (
                <div className={`w-full py-2.5 bg-gradient-to-r ${m.gradient} bg-opacity-20 rounded-xl flex items-center justify-center gap-1.5 text-white font-black text-sm opacity-80 group-hover:opacity-100 transition-opacity`}>
                  입장하기 <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform duration-300" />
                </div>
              ) : (
                <div className="w-full py-2.5 bg-slate-800/60 rounded-xl flex items-center justify-center text-slate-600 text-xs font-bold border border-slate-700/40">
                  Coming Soon
                </div>
              )}
            </div>
          );

          return m.href ? (
            <Link
              key={m.label}
              href={m.href}
              className={`group relative rounded-2xl p-[1.5px] bg-gradient-to-b ${m.gradient} transition-all duration-500 ${m.glow} hover:-translate-y-1.5`}
            >
              {inner}
            </Link>
          ) : (
            <div key={m.label} className={`group relative rounded-2xl p-[1.5px] bg-gradient-to-b ${m.gradient} opacity-40 cursor-not-allowed`}>
              {inner}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <p className="mt-12 z-10 text-slate-600 text-xs font-medium">
        Developer <b className="text-slate-500">고든이고든요</b>
      </p>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes shimmer { 0% { transform: translateX(-100%) skewX(-12deg); } 100% { transform: translateX(300%) skewX(-12deg); } }
      `}} />
    </div>
  );
}