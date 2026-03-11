import Link from 'next/link';
import { Sword, Map, Settings2, Ship, Anchor, Compass } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#05070a] text-slate-100 flex flex-col items-center justify-center relative overflow-hidden font-sans py-12">
      {/* Background Effects */}
      <div className="absolute inset-0 z-0 pointer-events-none flex justify-center items-center">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-blue-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-amber-600/10 rounded-full blur-[120px]" />
      </div>

      <div className="z-10 text-center mb-16 space-y-6">
        <h1 className="text-5xl md:text-6xl lg:text-7xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-orange-400 to-indigo-400 drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] flex items-center justify-center gap-4 md:gap-6">
          <Anchor className="text-amber-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.5)] hidden sm:block" size={64} />
          호그라나도 덱 매니저
          <Compass className="text-indigo-400 drop-shadow-[0_0_15px_rgba(129,140,248,0.5)] hidden sm:block" size={64} />
        </h1>
        <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto font-medium tracking-wide border-t border-slate-800/50 pt-6 px-4">
          원하시는 매니저를 선택하여 함대를 최적화하고<br className="md:hidden" /> 최고의 효율을 이끌어내세요.
        </p>
      </div>

      <div className="z-10 grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 max-w-6xl w-full px-6">
        {/* 전투 매니저 (Disabled) */}
        <div className="group relative rounded-3xl p-[1px] bg-gradient-to-b from-slate-800 to-slate-900 opacity-50 cursor-not-allowed overflow-hidden">
          <div className="h-full w-full bg-[#0a0f16] rounded-[23px] py-10 px-8 flex flex-col items-center text-center space-y-6 relative border-t border-slate-800">
            <div className="p-5 bg-red-500/10 rounded-2xl text-red-500 ring-1 ring-red-500/30 grayscale transition-all">
              <Sword size={48} />
            </div>
            <div className="space-y-4">
              <h2 className="text-2xl font-black text-slate-300 tracking-tight">전투 매니저</h2>
              <p className="text-sm text-slate-500 leading-relaxed font-medium">가장 완벽한 전투 함대를 구성하기 위한 승무원 배치 최적화 도구입니다.</p>
            </div>
            <div className="mt-auto pt-8">
              <span className="inline-flex items-center justify-center px-5 py-2 rounded-full bg-slate-800/80 text-xs font-bold text-slate-500 border border-slate-700/50 shadow-inner">
                개발 중 (Coming Soon)
              </span>
            </div>
          </div>
        </div>

        {/* 육탐 매니저 (Active) */}
        <Link href="/land" className="group relative rounded-3xl p-[1px] bg-gradient-to-b from-blue-400 via-indigo-500 to-purple-600 hover:-translate-y-2 lg:hover:-translate-y-3 transition-all duration-500 cursor-pointer shadow-[0_0_40px_rgba(79,70,229,0.2)] hover:shadow-[0_0_80px_rgba(79,70,229,0.4)] z-10">
          <div className="absolute inset-0 bg-gradient-to-b from-blue-400/20 to-transparent blur-2xl rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="h-full w-full bg-[#0a0f16]/80 backdrop-blur-xl rounded-[23px] py-10 px-8 flex flex-col items-center text-center space-y-6 relative border border-white/10 overflow-hidden shadow-2xl">
            {/* Hover shine effect */}
            <div className="absolute inset-0 -translate-x-[100%] group-hover:animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12" />
            
            <div className="relative p-5 bg-blue-500/20 rounded-2xl text-blue-400 ring-2 ring-blue-500/40 group-hover:scale-110 group-hover:bg-blue-500/30 group-hover:text-amber-300 group-hover:ring-amber-500/50 transition-all duration-500 shadow-[0_0_30px_rgba(59,130,246,0.2)] group-hover:shadow-[0_0_40px_rgba(59,130,246,0.4)]">
              <Map size={48} />
              <div className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-amber-400 rounded-full animate-ping opacity-75" />
              <div className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-amber-400 rounded-full shadow-[0_0_10px_rgba(251,191,36,0.8)]" />
            </div>
            <div className="space-y-4">
              <h2 className="text-3xl font-black text-white group-hover:text-amber-200 transition-colors tracking-tight">육탐 매니저</h2>
              <p className="text-sm text-slate-300 group-hover:text-white transition-colors leading-relaxed px-2 font-medium">육지 탐색에 특화된 함대를 구성하고<br/>모험 스킬의 효율을 최대로 끌어올립니다.</p>
            </div>
            <div className="mt-auto pt-8 w-full">
              <div className="w-full py-4 bg-gradient-to-r from-blue-600/30 to-indigo-600/30 group-hover:from-blue-500 group-hover:to-indigo-500 rounded-xl text-blue-200 group-hover:text-white font-black transition-all duration-500 flex justify-center items-center gap-2 border border-blue-500/30 group-hover:border-transparent relative overflow-hidden shadow-[0_4px_15px_rgba(0,0,0,0.5)]">
                <span className="relative z-10 flex items-center gap-2 text-lg tracking-wide">
                  입장하기 <Settings2 size={22} className="group-hover:rotate-90 transition-transform duration-700" />
                </span>
              </div>
            </div>
          </div>
        </Link>

        {/* 교역 매니저 (Disabled) */}
        <div className="group relative rounded-3xl p-[1px] bg-gradient-to-b from-slate-800 to-slate-900 opacity-50 cursor-not-allowed overflow-hidden">
          <div className="h-full w-full bg-[#0a0f16] rounded-[23px] py-10 px-8 flex flex-col items-center text-center space-y-6 relative border-t border-slate-800">
            <div className="p-5 bg-emerald-500/10 rounded-2xl text-emerald-500 ring-1 ring-emerald-500/30 grayscale transition-all">
              <Ship size={48} />
            </div>
            <div className="space-y-4">
              <h2 className="text-2xl font-black text-slate-300 tracking-tight">교역 매니저</h2>
              <p className="text-sm text-slate-500 leading-relaxed font-medium">수익을 극대화하는 교역품과 항로에 맞춘 완벽한 교역 함대를 설정합니다.</p>
            </div>
            <div className="mt-auto pt-8">
              <span className="inline-flex items-center justify-center px-5 py-2 rounded-full bg-slate-800/80 text-xs font-bold text-slate-500 border border-slate-700/50 shadow-inner">
                개발 중 (Coming Soon)
              </span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-12 text-slate-500 text-sm flex items-center justify-center gap-3 font-medium w-full relative z-10">
        <span>Developer <b>고든이고든요</b></span>
      </div>

      {/* Global styles for animations */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}} />
    </div>
  );
}