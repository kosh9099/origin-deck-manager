'use client';

import Link from 'next/link';
import { Sword, Map, Ship, Anchor, Compass, ArrowRight, X, Clock, Sparkles, Bug, Wrench, AlertTriangle } from 'lucide-react';
import DonateButton from '@/components/DonateButton';

const managers = [
  {
    href: null,
    icon: Sword,
    iconColor: 'text-slate-400',
    iconBg: 'bg-slate-100',
    gradient: 'from-slate-300 to-slate-400',
    label: '전투 매니저',
    desc: '최적의 전투 함대를 구성하기 위한 승무원 배치 도구.',
    badge: '개발 중',
    active: false,
  },
  {
    href: null, // 링크 비활성화
    icon: Map,
    iconColor: 'text-amber-600',
    iconBg: 'bg-amber-50',
    gradient: 'from-amber-400 via-orange-500 to-rose-500',
    label: '육탐 매니저',
    desc: '육지 탐색 특화 함대 구성 및 모험 스킬 최적화.',
    badge: '점검 중', // 뱃지 변경
    active: false, // 활성화 상태 끄기
    maintenance: true, // 폴리스 라인을 위한 특수 플래그
    border: 'border-slate-300',
    shadow: 'shadow-[0_4px_20px_rgba(245,158,11,0.2)] hover:shadow-[0_8px_30px_rgba(245,158,11,0.35)]',
    ctaColor: 'bg-gradient-to-r from-amber-400 to-orange-500',
    headerColor: 'bg-amber-500',
  },
  {
    href: '/trade',
    icon: Ship,
    iconColor: 'text-emerald-600',
    iconBg: 'bg-emerald-50',
    gradient: 'from-emerald-400 via-teal-500 to-cyan-500',
    label: '교역 매니저',
    desc: '대유행 예측과 실시간 부양 이벤트 공유 스케줄.',
    badge: null,
    active: true,
    border: 'border-emerald-200',
    shadow: 'shadow-[0_4px_20px_rgba(16,185,129,0.2)] hover:shadow-[0_8px_30px_rgba(16,185,129,0.35)]',
    ctaColor: 'bg-gradient-to-r from-emerald-400 to-teal-500',
    headerColor: 'bg-emerald-500',
  },
];

const UPDATE_LOGS = [
  {
    version: 'v1.1',
    label: '교역 매니저',
    date: '2026.03.15',
    labelColor: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    items: [
      { type: 'new', text: '부양 일괄 붙여넣기 등록 — AI 변환 결과를 한 번에 붙여넣어 중복 제거 후 일괄 등록' },
      { type: 'new', text: '구글 시트 자동 연동 — 해역별/도시별 추천 품목을 시트에서 실시간 가져와 자동 매핑' },
      { type: 'new', text: '추천 품목 수동 입력 제거 — 구글 시트로 완전 대체' },
      { type: 'new', text: '스케줄 뷰 단일화 — PC/모바일 통합 반응형 테이블로 전환' },
      { type: 'fix', text: '해역명 줄임말 정규화 — 코드 내 줄임말과 시트 전체이름 매핑 불일치 수정' },
      { type: 'fix', text: '추천 품목 파싱 오류 수정 — 대유행종류가 품목으로 잘못 표시되던 버그 수정' },
      { type: 'fix', text: 'API 캐시 제거 — 구글 시트 수정 즉시 반영' },
      { type: 'improve', text: '교역 매니저 UI 라이트 테마 통일 — 육탐 매니저와 동일한 디자인 시스템 적용' },
    ],
  },
  {
    version: 'v3.2',
    label: '육탐 매니저',
    date: '2026.03.15',
    labelColor: 'text-amber-700 bg-amber-50 border-amber-200',
    items: [
      { type: 'new', text: '능력치 종합 설정 모드 추가 — 전투/관찰/채집 비중 슬라이더로 배치 우선순위 결정' },
      { type: 'new', text: '전리품 먼저 맥스 옵션 추가 — 전리품 6종 달성 후 남은 선실을 비중대로 채움' },
      { type: 'new', text: '스킬 개별 설정 / 능력치 종합 설정 모드 전환 시 반대 설정 자동 초기화' },
      { type: 'new', text: '설정 자동 저장 — 뒤로가기 후에도 제독·함선·필수/금지 항해사 복원' },
      { type: 'fix', text: '스킬 목표 미설정 시 제독·필수 항해사만 배치되도록 수정' },
      { type: 'fix', text: '전투 비중 적용 시 해적/맹수 전투 스킬도 전투력으로 집계되도록 수정' },
      { type: 'fix', text: '필수 항해사가 전투 선실 자격 조건 검사 전에 우선 배치되도록 수정' },
      { type: 'fix', text: '목표 스킬 초과 페널티 이중 계산 버그 수정 (Fix D)' },
      { type: 'fix', text: '맥스레벨 낮은 스킬의 가중치 불이익 해소 — 달성 비율 기반으로 변경 (Fix E)' },
      { type: 'fix', text: '유효 항해사 음수 점수로 탈락하는 현상 방지 — 최소 1점 보장 (Fix F)' },
      { type: 'fix', text: 'lootFirst 페이즈1 완료 후 페이즈2가 기존 슬롯 덮어쓰는 버그 수정' },
      { type: 'improve', text: '전체 UI 라이트 테마로 전환 — 밝은 크림 배경 + 딥 네이비 사이드바' },
      { type: 'improve', text: '스킬 설정 카테고리별 컬러 시스템 적용 (전리품=앰버, 전투=레드, 관찰=블루, 채집=그린)' },
      { type: 'improve', text: '수석 호위기사 직업 전투 선실 자동 배치 대상 추가' },
    ],
  },
];

const TYPE_STYLE = {
  new: { label: 'NEW', color: 'text-blue-700 bg-blue-50 border-blue-200', icon: Sparkles },
  fix: { label: 'FIX', color: 'text-red-700 bg-red-50 border-red-200', icon: Bug },
  improve: { label: 'IMPROVE', color: 'text-green-700 bg-green-50 border-green-200', icon: Wrench },
};

export default function Home() {
  return (
    <div className="min-h-screen bg-[#f0ece4] text-slate-800 flex flex-col items-center justify-center relative overflow-hidden font-sans px-4 py-16">

      {/* Background blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-15%] left-[-10%] w-[55vw] h-[55vw] bg-amber-400/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-15%] right-[-10%] w-[55vw] h-[55vw] bg-indigo-400/10 rounded-full blur-[140px]" />
      </div>

      {/* Title */}
      <div className="z-10 text-center mb-12 space-y-5">
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-amber-500 via-orange-500 to-indigo-500 drop-shadow-[0_2px_2px_rgba(0,0,0,0.15)] flex items-center justify-center gap-3 sm:gap-5">
          <Anchor className="text-amber-500 hidden sm:block" size={52} />
          호그라나도 덱 매니저
          <Compass className="text-indigo-500 hidden sm:block" size={52} />
        </h1>
        <p className="text-base md:text-lg text-slate-500 max-w-xl mx-auto font-medium border-t border-slate-300 pt-5 leading-relaxed">
          원하시는 매니저를 선택하여 함대를 최적화하고<br className="hidden sm:block" /> 최고의 효율을 이끌어내세요.
        </p>

        {/* 버튼 영역 */}
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <DonateButton />

          {/* 업데이트 내역 버튼 */}
          <label
            htmlFor="update-modal"
            className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 text-sm font-bold transition-all shadow-sm"
          >
            <Clock size={14} />
            업데이트 내역
          </label>
        </div>
      </div>

      {/* Manager cards */}
      <div className="z-10 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-4xl">
        {managers.map((m: any) => {
          const Icon = m.icon;
          const inner = (
            <div className={`h-full w-full bg-white rounded-[14px] p-5 flex flex-col gap-3 relative border overflow-hidden
              ${m.active ? (m.border || 'border-slate-200') : 'border-slate-200'}
              ${m.maintenance ? 'bg-slate-50' : ''}`}>

              {/* 폴리스 라인 오버레이 (점검 중일 때만) */}
              {m.maintenance && (
                <div className="absolute top-1/2 left-[-20%] right-[-20%] -translate-y-1/2 -rotate-12 h-12 shadow-2xl z-20 flex items-center justify-center pointer-events-none opacity-95 border-y-[3px] border-yellow-400"
                  style={{ background: 'repeating-linear-gradient(-45deg, #fbbf24, #fbbf24 20px, #0f172a 20px, #0f172a 40px)' }}>
                  <span className="text-yellow-400 font-black text-sm tracking-widest bg-slate-900/90 px-4 py-1 rounded-full border border-yellow-500/50 backdrop-blur-md shadow-[0_0_15px_rgba(251,191,36,0.5)]">
                    알고리즘 고도화 점검 중
                  </span>
                </div>
              )}

              {/* Icon + label */}
              <div className={`flex items-center gap-3 ${m.maintenance ? 'opacity-40 grayscale' : ''}`}>
                <div className={`p-3 rounded-xl ${m.iconBg} ${m.iconColor} transition-all duration-300 shrink-0 border ${m.active ? 'border-current/20' : 'border-slate-200'}`}>
                  <Icon size={26} />
                </div>
                <div>
                  <h2 className={`text-lg font-black tracking-tight ${m.active ? 'text-slate-800' : 'text-slate-400'}`}>
                    {m.label}
                  </h2>
                  {m.badge && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border
                      ${m.maintenance ? 'text-red-600 bg-red-50 border-red-200' : 'text-slate-400 bg-slate-100 border-slate-200'}`}>
                      {m.badge}
                    </span>
                  )}
                </div>
              </div>

              {/* Description */}
              <p className={`text-xs leading-relaxed flex-1 ${m.active ? 'text-slate-500' : 'text-slate-400'} ${m.maintenance ? 'opacity-40 grayscale' : ''}`}>
                {m.desc}
              </p>

              {/* CTA */}
              {m.active ? (
                <div className={`w-full py-2.5 ${m.ctaColor} rounded-xl flex items-center justify-center gap-1.5 text-white font-black text-sm shadow-sm group-hover:brightness-105 transition-all`}>
                  입장하기 <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform duration-300" />
                </div>
              ) : m.maintenance ? (
                // 점검 중 전용 하단 버튼
                <div className="w-full py-2.5 bg-slate-800 rounded-xl flex items-center justify-center text-amber-400 text-xs font-black border border-slate-700 relative overflow-hidden group">
                  <div className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity" style={{ backgroundImage: 'repeating-linear-gradient(-45deg, transparent, transparent 10px, #fbbf24 10px, #fbbf24 20px)' }}></div>
                  <AlertTriangle size={15} className="mr-1.5 z-10" /> <span className="z-10">접근 제한됨</span>
                </div>
              ) : (
                <div className="w-full py-2.5 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 text-xs font-bold border border-slate-200">
                  Coming Soon
                </div>
              )}
            </div>
          );

          return m.href && !m.maintenance ? (
            <Link
              key={m.label}
              href={m.href}
              className={`group relative rounded-2xl transition-all duration-300 hover:-translate-y-1.5 ${m.shadow || ''}`}
            >
              {inner}
            </Link>
          ) : (
            <div key={m.label} className={`group relative rounded-2xl cursor-not-allowed ${m.maintenance ? 'shadow-inner' : 'opacity-60'}`}>
              {inner}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <p className="mt-12 z-10 text-slate-400 text-xs font-medium">
        Developer <b className="text-slate-500">고든이고든요</b>
      </p>

      {/* ── 업데이트 내역 모달 (CSS-only checkbox trick) ── */}
      <input type="checkbox" id="update-modal" className="hidden peer" />

      {/* 오버레이 */}
      <label
        htmlFor="update-modal"
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200] hidden peer-checked:flex items-center justify-center p-4 cursor-default"
      >
        {/* 모달 본체 — 클릭이 오버레이까지 전파되지 않도록 stopPropagation */}
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col border border-slate-200 overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* 모달 헤더 */}
          <div className="bg-indigo-600 px-5 py-3.5 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-white" />
              <h2 className="text-[14px] font-black text-white uppercase tracking-widest">
                업데이트 내역
              </h2>
            </div>
            <label htmlFor="update-modal" className="cursor-pointer text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors">
              <X size={18} strokeWidth={2.5} />
            </label>
          </div>

          {/* 스크롤 영역 */}
          <div className="overflow-y-auto p-5 space-y-6 scrollbar-thin scrollbar-thumb-slate-200">
            {UPDATE_LOGS.map(log => (
              <div key={log.version}>
                {/* 버전 헤더 */}
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <span className={`text-[11px] font-black px-2 py-0.5 rounded-lg border ${log.labelColor}`}>
                    {log.label}
                  </span>
                  <span className="text-[13px] font-black text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-lg">
                    {log.version}
                  </span>
                  <span className="text-[11px] font-bold text-slate-400">{log.date}</span>
                  <div className="flex-1 h-px bg-slate-200" />
                </div>

                {/* 항목 리스트 */}
                <div className="space-y-1.5">
                  {log.items.map((item, idx) => {
                    const s = TYPE_STYLE[item.type as keyof typeof TYPE_STYLE];
                    const Icon = s.icon;
                    return (
                      <div key={idx} className="flex items-start gap-2.5 py-1.5 px-3 bg-slate-50 rounded-lg border border-slate-100">
                        <span className={`shrink-0 text-[9px] font-black px-1.5 py-0.5 rounded border mt-0.5 flex items-center gap-0.5 ${s.color}`}>
                          <Icon size={8} strokeWidth={2.5} />
                          {s.label}
                        </span>
                        <span className="text-[12px] text-slate-600 leading-relaxed font-medium">
                          {item.text}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* 모달 푸터 */}
          <div className="px-5 py-3 border-t border-slate-200 flex justify-end shrink-0">
            <label
              htmlFor="update-modal"
              className="cursor-pointer px-4 py-2 bg-indigo-600 text-white text-sm font-black rounded-xl hover:bg-indigo-700 transition-colors"
            >
              닫기
            </label>
          </div>
        </div>
      </label>
    </div>
  );
}