'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import {
  Anchor,
  ArrowRight,
  Bug,
  Calculator,
  Clock,
  Compass,
  ExternalLink,
  FileSpreadsheet,
  Map,
  Settings,
  Ship,
  Sparkles,
  Sword,
  UserCog,
  Wrench,
  X,
} from 'lucide-react';
import ThemeToggle from '@/components/common/ThemeToggle';

type Manager = {
  href: string | null;
  icon: LucideIcon;
  label: string;
  desc: string;
  stat: string;
  accent: string;
  iconClass: string;
  active: boolean;
  badge?: string;
};

type UpdateType = 'new' | 'fix' | 'improve';

type UpdateLog = {
  version: string;
  label: string;
  date: string;
  tone: string;
  items: { type: UpdateType; text: string }[];
};

type BoardLink = {
  icon: LucideIcon;
  label: string;
  value: string;
  href?: string;
  external?: boolean;
  disabled?: boolean;
  modal?: 'pension';
};

const managers: Manager[] = [
  {
    href: '/trade',
    icon: Ship,
    label: '교역 매니저',
    desc: '대유행 예측, 부양 이벤트, 교역품 추천을 한 화면에서 확인합니다.',
    stat: '스케줄 · 지도 · 물교',
    accent: 'from-teal-500 to-emerald-600',
    iconClass: 'bg-teal-50 text-teal-700 border-teal-100',
    active: true,
  },
  {
    href: '/land',
    icon: Map,
    label: '육탐 매니저',
    desc: '항해사와 함선을 조합해 육지 탐색용 함대를 빠르게 구성합니다.',
    stat: '덱 생성 · 스킬 분석',
    accent: 'from-amber-500 to-orange-600',
    iconClass: 'bg-amber-50 text-amber-700 border-amber-100',
    active: true,
  },
  {
    href: null,
    icon: Sword,
    label: '전투 매니저',
    desc: '전투 함대 배치 도구는 이후 업데이트에서 열릴 예정입니다.',
    stat: '준비 중',
    accent: 'from-slate-400 to-slate-500',
    iconClass: 'bg-slate-100 text-slate-400 border-slate-200',
    active: false,
    badge: '개발 중',
  },
];

const UPDATE_LOGS: UpdateLog[] = [
  {
    version: 'v1.6',
    label: '메인',
    date: '2026.05.13',
    tone: 'text-teal-700 bg-teal-50 border-teal-200',
    items: [
      { type: 'new', text: '연금항 이벤트 투자 점수, 공훈서 환산 점수, 필요 두캇을 계산할 수 있는 모달형 계산기 추가' },
    ],
  },
  {
    version: 'v1.5',
    label: '교역 매니저',
    date: '2026.05.12',
    tone: 'text-teal-700 bg-teal-50 border-teal-200',
    items: [
      { type: 'improve', text: '물물교환 계산기의 하위 재료 필요량에 +3개 여유분을 자동 가산 (게임 내부 정밀도 차이로 인한 소수점 부족분 보정)' },
    ],
  },
  {
    version: 'v1.4',
    label: '전체 앱',
    date: '2026.05.12',
    tone: 'text-slate-700 bg-slate-50 border-slate-200',
    items: [
      { type: 'improve', text: 'PC와 모바일 화면을 모두 읽기 쉬운 항해 도구 스타일로 정리' },
      { type: 'improve', text: '메인 항해 관리판을 내 항해사 관리, 공식 사이트, 통합시트 바로가기 중심으로 개편' },
      { type: 'new', text: '다크 모드 추가 및 메인/교역/세계 지도 화면의 어두운 테마 가독성 개선' },
      { type: 'improve', text: '교역 스케줄의 여백, 카드 폭, 사이드바 간섭 문제 조정' },
      { type: 'improve', text: '교역 이벤트 배지와 추천 품목 배지의 글자 깨짐을 줄이고 가격 표기를 간결하게 정리' },
      { type: 'fix', text: '세계 지도 도시 패널의 마을 정보, 재료 판매 항구, 교역품 시즌 표 다크 모드 표시 문제 수정' },
      { type: 'new', text: '사이트 이름과 브라우저 탭 아이콘을 대항오 덱 매니저에 맞게 변경' },
      { type: 'new', text: '개인정보처리방침 페이지 추가 및 하단 바로가기 제공' },
    ],
  },
  {
    version: 'v1.3',
    label: '교역 매니저',
    date: '2026.05.10',
    tone: 'text-teal-700 bg-teal-50 border-teal-200',
    items: [
      { type: 'new', text: '세계 지도 신설: 224개 항구를 해역별 컬러 배지로 표시' },
      { type: 'new', text: '도시 상세 패널에서 활성/예정 교역 스케줄과 시즌 매트릭스 조회' },
      { type: 'new', text: '교역 스케줄의 지도 버튼으로 해당 해역/도시 즉시 이동' },
      { type: 'improve', text: '검색 자동완성 및 초성 검색 지원' },
      { type: 'improve', text: '사이드바 메뉴를 정리하고 지도 중심 흐름으로 통합' },
    ],
  },
  {
    version: 'v1.2',
    label: '교역 매니저',
    date: '2026.05.10',
    tone: 'text-teal-700 bg-teal-50 border-teal-200',
    items: [
      { type: 'new', text: '풍근 조합식과 교역품 성수기 검색 추가' },
      { type: 'new', text: '추천 품목 가격 강조 효과 및 필터 추가' },
      { type: 'new', text: '특수 물교 품목 추가' },
      { type: 'improve', text: '대유행 추천 품목 기준과 툴팁 표시 개선' },
      { type: 'improve', text: '이벤트 유지 시간과 진행 효과 보정' },
    ],
  },
  {
    version: 'v3.2',
    label: '육탐 매니저',
    date: '2026.03.15',
    tone: 'text-amber-700 bg-amber-50 border-amber-200',
    items: [
      { type: 'new', text: '능력치 종합 설정 모드와 전리품 우선 옵션 추가' },
      { type: 'new', text: '제독, 함선, 필수/금지 항해사 자동 저장' },
      { type: 'fix', text: '필수 항해사 우선 배치와 목표 스킬 계산 버그 수정' },
      { type: 'improve', text: '스킬 설정 카테고리별 컬러 시스템 적용' },
    ],
  },
];

const TYPE_STYLE: Record<UpdateType, { label: string; color: string; icon: LucideIcon }> = {
  new: { label: 'NEW', color: 'text-sky-700 bg-sky-50 border-sky-200', icon: Sparkles },
  fix: { label: 'FIX', color: 'text-rose-700 bg-rose-50 border-rose-200', icon: Bug },
  improve: { label: 'IMPROVE', color: 'text-teal-700 bg-teal-50 border-teal-200', icon: Wrench },
};

const boardLinks: BoardLink[] = [
  {
    icon: UserCog,
    label: '항해사 설정',
    value: '준비',
    disabled: true,
  },
  {
    icon: Calculator,
    label: '연금/투자 계산기',
    value: '계산',
    modal: 'pension',
  },
  {
    icon: ExternalLink,
    label: '공식 홈페이지',
    value: '공식',
    href: 'https://uwo.floor.line.games/kr/main',
    external: true,
  },
  {
    icon: FileSpreadsheet,
    label: '공략 시트',
    value: '시트',
    href: 'https://docs.google.com/spreadsheets/d/1rrg8_Wv542-VYUWCQHUhu1HpCXlKfGspcYOFZTXGyLk/edit?pli=1&gid=2021973594#gid=2021973594',
    external: true,
  },
];

const DUCAT_PER_POINT = 50_000;
const TOTAL_PENSION_PORTS = 191;
const DUCAT_PER_EOK = 100_000_000;

const meritBooks = [
  { key: 'bronze', label: '제국의 동빛 공훈서', shortLabel: '동빛', ducat: 1_000_000, tone: 'border-orange-200 bg-orange-50 text-orange-800' },
  { key: 'silver', label: '제국의 은빛 공훈서', shortLabel: '은빛', ducat: 100_000_000, tone: 'border-slate-200 bg-slate-50 text-slate-700' },
  { key: 'gold', label: '제국의 금빛 공훈서', shortLabel: '금빛', ducat: 1_000_000_000, tone: 'border-amber-200 bg-amber-50 text-amber-800' },
] as const;

type MeritBookKey = (typeof meritBooks)[number]['key'];

const pensionWeeks = [
  { week: 1, date: '5/11', requiredScore: 4657 },
  { week: 2, date: '5/18', requiredScore: 4424 },
  { week: 3, date: '5/25', requiredScore: 4202 },
  { week: 4, date: '6/1', requiredScore: 3907 },
  { week: 5, date: '6/8', requiredScore: 3516 },
  { week: 6, date: '6/15', requiredScore: 2988 },
  { week: 7, date: '6/22', requiredScore: 2390 },
  { week: 8, date: '6/29', requiredScore: 1912 },
  { week: 9, date: '7/6', requiredScore: 1529 },
  { week: 10, date: '7/13', requiredScore: 1223 },
  { week: 11, date: '7/20', requiredScore: 978 },
  { week: 12, date: '7/27', requiredScore: 782 },
  { week: 13, date: '8/3', requiredScore: 625 },
  { week: 14, date: '8/10', requiredScore: 500 },
];

function formatNumber(value: number) {
  return Math.round(value).toLocaleString('ko-KR');
}

function formatDucat(value: number) {
  const man = Math.round(value / 10_000);
  if (man >= 10_000) {
    const eok = Math.floor(man / 10_000);
    const rest = man % 10_000;
    return rest > 0 ? `${formatNumber(eok)}억 ${formatNumber(rest)}만` : `${formatNumber(eok)}억`;
  }
  return `${formatNumber(man)}만`;
}

function parseLooseNumber(value: string) {
  const parsed = Number(value.replace(/[^\d.]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatNumberInput(value: string) {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// 비중(%) 입력용 — 숫자와 소수점 한 개만 허용
function formatDecimalInput(value: string) {
  const cleaned = value.replace(/[^\d.]/g, '');
  const firstDot = cleaned.indexOf('.');
  if (firstDot === -1) return cleaned;
  return cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '');
}

type MonopolyCompany = { name: string; before: string; after: string };

const MONOPOLY_DEFAULT_COMPANIES: MonopolyCompany[] = [
  { name: '내 상회', before: '', after: '' },
  { name: '상회 2', before: '', after: '' },
  { name: '상회 3', before: '', after: '' },
  { name: '상회 4', before: '', after: '' },
  { name: '상회 5', before: '', after: '' },
];

export default function Home() {
  const [pensionOpen, setPensionOpen] = useState(false);
  const [pensionWeekIndex, setPensionWeekIndex] = useState(0);
  const [pensionPortCount, setPensionPortCount] = useState(formatNumberInput(String(TOTAL_PENSION_PORTS)));
  const [pensionBudgetEok, setPensionBudgetEok] = useState('');
  const [bronzeBookCount, setBronzeBookCount] = useState('');
  const [silverBookCount, setSilverBookCount] = useState('');
  const [goldBookCount, setGoldBookCount] = useState('');
  const [targetScore, setTargetScore] = useState('');
  const [scoreToConvert, setScoreToConvert] = useState('');
  const [pensionTab, setPensionTab] = useState<'pension' | 'monopoly'>('pension');
  const [monopolyInvestment, setMonopolyInvestment] = useState('');
  const [monopolyMyIndex, setMonopolyMyIndex] = useState(0);
  const [monopolyCompanies, setMonopolyCompanies] = useState<MonopolyCompany[]>(MONOPOLY_DEFAULT_COMPANIES);
  const [monopolyMemberCount, setMonopolyMemberCount] = useState('');

  const scoreToDucat = useMemo(() => {
    const score = Math.max(0, Math.floor(parseLooseNumber(scoreToConvert)));
    return { score, ducat: score * DUCAT_PER_POINT };
  }, [scoreToConvert]);

  const monopolyCalc = useMemo(() => {
    const investment = Math.max(0, Math.floor(parseLooseNumber(monopolyInvestment)));
    const rows = monopolyCompanies.map((c, i) => {
      const beforeFilled = c.before.trim() !== '';
      const afterFilled = c.after.trim() !== '';
      const before = parseLooseNumber(c.before);
      const after = parseLooseNumber(c.after);
      const filled = beforeFilled && afterFilled;
      const delta = filled ? after - before : 0;
      const ratePerPoint = filled && investment > 0 ? delta / investment : 0;
      return {
        index: i,
        name: c.name || `상회 ${i + 1}`,
        before,
        after,
        filled,
        delta,
        ratePerPoint,
        isMine: i === monopolyMyIndex,
      };
    });
    const filledRows = rows.filter(r => r.filled);
    const sumBefore = filledRows.reduce((s, r) => s + r.before, 0);
    const sumAfter = filledRows.reduce((s, r) => s + r.after, 0);
    const me = rows[monopolyMyIndex];
    const filledOthers = filledRows.filter(r => !r.isMine);

    // 비교 대상: 투자 후 비중이 가장 높은 다른 상회
    const leader = filledOthers.length > 0
      ? filledOthers.reduce((max, r) => (r.after > max.after ? r : max), filledOthers[0])
      : null;

    let status: 'idle' | 'invalid_sum' | 'invalid_investment' | 'invalid_rate' | 'lead' | 'never' | 'behind' = 'idle';
    let gap = 0;
    let closingRate = 0;
    let remainingPoints = 0;
    let projectedMe = me?.after ?? 0;
    let projectedLeader = leader?.after ?? 0;

    if (!me?.filled || !leader) {
      status = 'idle';
    } else if (investment <= 0) {
      status = 'invalid_investment';
    } else if (Math.abs(sumBefore - 100) > 0.5 || Math.abs(sumAfter - 100) > 0.5) {
      // 합계가 100%에서 0.5%p 넘게 벗어나면 입력 오류 의심
      status = 'invalid_sum';
    } else if (me.after >= leader.after) {
      status = 'lead';
    } else if (me.ratePerPoint <= 0) {
      status = 'invalid_rate';
    } else {
      closingRate = me.ratePerPoint - leader.ratePerPoint; // leader.ratePerPoint는 보통 음수 → 빼기로 절댓값 합쳐짐
      gap = leader.after - me.after;
      if (closingRate <= 0) {
        status = 'never';
      } else {
        status = 'behind';
        // 투자 단위(investment)의 배수로 올림 — 사용자 멘탈 모델 일치
        const unitsNeeded = Math.ceil(gap / (closingRate * investment));
        remainingPoints = unitsNeeded * investment;
        projectedMe = me.after + me.ratePerPoint * remainingPoints;
        projectedLeader = leader.after + leader.ratePerPoint * remainingPoints;
      }
    }

    const memberCount = Math.max(0, Math.floor(parseLooseNumber(monopolyMemberCount)));
    const perMemberPoints = memberCount > 0 ? Math.ceil(remainingPoints / memberCount) : 0;
    const perMemberDucat = perMemberPoints * DUCAT_PER_POINT;

    return {
      investment,
      rows,
      filledRows,
      sumBefore,
      sumAfter,
      me,
      leader,
      status,
      gap,
      closingRate,
      remainingPoints,
      remainingDucat: remainingPoints * DUCAT_PER_POINT,
      projectedMe,
      projectedLeader,
      perUnitGapClose: investment > 0 ? closingRate * investment : 0,
      memberCount,
      perMemberPoints,
      perMemberDucat,
    };
  }, [monopolyCompanies, monopolyInvestment, monopolyMyIndex, monopolyMemberCount]);

  const pensionWeek = pensionWeeks[pensionWeekIndex] ?? pensionWeeks[0];
  const pensionCalc = useMemo(() => {
    const meritCounts: Record<MeritBookKey, number> = {
      bronze: Math.floor(parseLooseNumber(bronzeBookCount)),
      silver: Math.floor(parseLooseNumber(silverBookCount)),
      gold: Math.floor(parseLooseNumber(goldBookCount)),
    };
    const meritDucat = meritBooks.reduce((sum, book) => sum + meritCounts[book.key] * book.ducat, 0);
    const meritScore = Math.floor(meritDucat / DUCAT_PER_POINT);
    const ports = Math.min(TOTAL_PENSION_PORTS, Math.max(0, Math.floor(parseLooseNumber(pensionPortCount))));
    const budgetDucat = parseLooseNumber(pensionBudgetEok) * DUCAT_PER_EOK;
    const budgetScore = Math.floor(budgetDucat / DUCAT_PER_POINT);
    const ownedScore = meritScore + budgetScore;
    const perPortRequiredScore = pensionWeek.requiredScore;
    const perPortDucat = perPortRequiredScore * DUCAT_PER_POINT;
    const targetScoreValue = Math.max(0, Math.floor(parseLooseNumber(targetScore)));
    const targetGap = targetScoreValue - ownedScore;

    return {
      ports,
      budgetDucat,
      budgetScore,
      meritCounts,
      meritDucat,
      meritScore,
      ownedScore,
      perPortRequiredScore,
      perPortDucat,
      targetScoreValue,
      targetGap,
    };
  }, [bronzeBookCount, goldBookCount, pensionBudgetEok, pensionPortCount, pensionWeek.requiredScore, silverBookCount, targetScore]);

  return (
    <main className="app-bg min-h-screen overflow-x-hidden px-4 py-5 text-slate-900 sm:px-6 lg:px-8">
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.055]"
        style={{ backgroundImage: 'url(/maps/world-map.webp)', backgroundSize: 'cover', backgroundPosition: 'center' }}
      />

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-2.5rem)] w-full max-w-[calc(100vw-2rem)] flex-col overflow-hidden lg:max-w-6xl">
        <header className="flex w-full min-w-0 items-center justify-between gap-3 border-b border-slate-900/10 py-3">
          <Link href="/" className="flex min-w-0 items-center gap-2">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-teal-800/15 bg-white/80 text-teal-700 shadow-sm">
              <Anchor size={18} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-slate-900">대항오 덱 매니저</p>
              <p className="hidden text-xs font-semibold text-slate-500 sm:block">항해 의사결정을 빠르게 정리하는 도구</p>
            </div>
          </Link>

          <div className="flex shrink-0 items-center gap-2">
            <ThemeToggle compact />
            <label
              htmlFor="update-modal"
              className="tool-button h-9 w-9 cursor-pointer px-0 sm:w-auto sm:px-3"
              aria-label="업데이트 내역"
            >
              <Clock size={14} />
              <span className="hidden sm:inline">업데이트</span>
            </label>
            <Link
              href="/admin"
              className="tool-button h-9 w-9 px-0"
              aria-label="관리자"
              title="관리자"
            >
              <Settings size={14} />
            </Link>
          </div>
        </header>

        <section className="grid w-full min-w-0 flex-1 items-center gap-6 py-8 lg:grid-cols-[0.76fr_1.24fr] lg:py-10">
          <div className="app-panel w-full min-w-0 max-w-md rounded-lg p-4 sm:p-5">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-widest text-teal-700">Command Board</p>
                <h1 className="mt-1 text-xl font-black text-slate-950">항해 관리판</h1>
              </div>
              <span className="flex size-11 items-center justify-center rounded-lg border border-teal-100 bg-teal-50 text-teal-700">
                <Compass size={22} />
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              {boardLinks.map(item => {
                const Icon = item.icon;
                const className = `flex min-h-[86px] flex-col items-start justify-between gap-3 rounded-lg border border-slate-200 bg-white/80 p-3 transition ${
                  item.disabled
                    ? 'cursor-default opacity-75'
                    : 'hover:border-teal-300 hover:bg-teal-50/70 hover:shadow-sm'
                }`;
                const content = (
                  <>
                    <span className="flex w-full items-start justify-between gap-2">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-teal-100 bg-teal-50 text-teal-700">
                        <Icon size={16} />
                      </span>
                      <span className="shrink-0 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-1 text-[10px] font-black text-slate-500">
                        {item.value}
                      </span>
                    </span>
                    <span className="min-w-0 text-sm font-black leading-5 text-slate-800 [overflow-wrap:anywhere]">
                      {item.label}
                    </span>
                  </>
                );

                if (item.href && item.external) {
                  return (
                    <a key={item.label} href={item.href} target="_blank" rel="noreferrer" className={className}>
                      {content}
                    </a>
                  );
                }

                if (item.modal === 'pension') {
                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => setPensionOpen(true)}
                      className={`${className} w-full text-left`}
                    >
                      {content}
                    </button>
                  );
                }

                return (
                  <div key={item.label} className={className} aria-disabled={item.disabled}>
                    {content}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid w-full min-w-0 gap-3 sm:grid-cols-3 lg:gap-4">
            {managers.map(manager => {
              const Icon = manager.icon;
              const card = (
                <div className={`app-card group flex h-full min-w-0 min-h-[190px] flex-col rounded-lg p-4 transition duration-200 ${manager.active ? 'hover:-translate-y-1 hover:border-teal-700/25 hover:shadow-[0_18px_45px_rgba(15,35,31,0.12)]' : 'opacity-70'}`}>
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <span className={`flex size-11 items-center justify-center rounded-lg border ${manager.iconClass}`}>
                      <Icon size={22} />
                    </span>
                    {manager.badge && (
                      <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-black text-slate-500">
                        {manager.badge}
                      </span>
                    )}
                  </div>

                  <div className="flex-1">
                    <h2 className="text-lg font-black text-slate-950">{manager.label}</h2>
                    <p className="mt-2 max-w-[300px] text-xs font-semibold leading-5 text-slate-500 [overflow-wrap:anywhere] sm:max-w-none">{manager.desc}</p>
                  </div>

                  <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
                    <span className="text-[11px] font-black text-slate-500">{manager.stat}</span>
                    <span className={`flex size-8 items-center justify-center rounded-lg bg-gradient-to-br ${manager.accent} text-white shadow-sm ${manager.active ? 'group-hover:translate-x-0.5' : ''} transition-transform`}>
                      <ArrowRight size={15} />
                    </span>
                  </div>
                </div>
              );

              return manager.href && manager.active ? (
                <Link key={manager.label} href={manager.href} className="block h-full w-full min-w-0">
                  {card}
                </Link>
              ) : (
                <div key={manager.label} className="h-full w-full min-w-0 cursor-not-allowed">
                  {card}
                </div>
              );
            })}
          </div>
        </section>

        <footer className="flex flex-col gap-2 border-t border-slate-900/10 py-4 text-xs font-semibold text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-700/15 bg-white/80 px-2 py-1 text-[10px] font-black text-slate-600"
              title="사이트 개발자"
            >
              <Settings size={11} />
              <span className="uppercase tracking-widest">Developer</span>
              <b className="text-slate-700">고든이고든요</b>
            </span>
            <span
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-700/15 bg-white/80 px-2 py-1 text-[10px] font-black text-slate-600"
              title="항해 데이터 파트너"
            >
              <Compass size={11} />
              <span className="uppercase tracking-widest">Data Navigator</span>
              <b className="text-slate-700">아스트라이오스</b>
            </span>
          </span>
          <span className="flex flex-wrap gap-x-3 gap-y-1 sm:justify-end">
            <span>PC와 모바일에 맞춘 항해 관리 대시보드</span>
            <span>비공식 팬 도구</span>
            <Link href="/privacy" className="font-bold text-slate-500 underline-offset-4 hover:text-teal-700 hover:underline">
              개인정보처리방침
            </Link>
          </span>
        </footer>
      </div>

      {pensionOpen && (
        <div
          className="fixed inset-0 z-[210] flex items-center justify-center bg-slate-950/45 p-3 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pension-modal-title"
        >
          <div
            className="app-panel flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg"
          >
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-slate-950 px-4 py-3 text-white">
              <div className="flex min-w-0 items-center gap-2">
                <Calculator size={16} className="text-teal-300" />
                <div className="min-w-0">
                  <h2 id="pension-modal-title" className="truncate text-sm font-black">연금항 투자 계산기</h2>
                  <p className="mt-0.5 text-[11px] font-bold text-slate-300">5/11~8/11 이벤트 · 8/10 주 500점 유지 기준</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPensionOpen(false)}
                className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-white/70 transition hover:bg-white/10 hover:text-white"
                aria-label="연금항 계산기 닫기"
              >
                <X size={17} />
              </button>
            </div>

            <div className="flex shrink-0 gap-0 border-b border-slate-200 bg-slate-50 px-3">
              <button
                type="button"
                onClick={() => setPensionTab('pension')}
                className={`relative -mb-px px-4 py-2.5 text-xs font-black transition ${
                  pensionTab === 'pension'
                    ? 'border-b-2 border-teal-600 text-teal-700'
                    : 'border-b-2 border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                연금/투자 계산
              </button>
              <button
                type="button"
                onClick={() => setPensionTab('monopoly')}
                className={`relative -mb-px px-4 py-2.5 text-xs font-black transition ${
                  pensionTab === 'monopoly'
                    ? 'border-b-2 border-indigo-600 text-indigo-700'
                    : 'border-b-2 border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                독점 상회 계산
              </button>
            </div>

            {pensionTab === 'pension' && (
            <div className="overflow-y-auto p-4 sm:p-5">
              <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                <section className="rounded-lg border border-slate-200 bg-white/90 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-widest text-teal-700">Investment Setup</p>
                      <h3 className="mt-1 text-lg font-black text-slate-950">투자 조건</h3>
                    </div>
                    <span className="rounded-md border border-teal-200 bg-teal-50 px-2 py-1 text-[10px] font-black text-teal-700">
                      1점 = 50,000두캇
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3">
                    <label className="grid gap-1.5">
                      <span className="text-[11px] font-black text-slate-500">투자 시작 주차</span>
                      <select
                        value={pensionWeekIndex}
                        onChange={event => setPensionWeekIndex(Number(event.target.value))}
                        className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800"
                      >
                        {pensionWeeks.map((week, index) => (
                          <option key={week.date} value={index}>
                            {week.date} 시작 · {week.week}주차
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="grid gap-1.5">
                      <span className="text-[11px] font-black text-slate-500">목표 항구 수</span>
                      <input
                        value={pensionPortCount}
                        onChange={event => setPensionPortCount(formatNumberInput(event.target.value))}
                        inputMode="numeric"
                        className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800"
                        placeholder="예: 191"
                      />
                      <span className="text-[10px] font-bold text-slate-400">전체 도시는 {TOTAL_PENSION_PORTS}개 기준입니다.</span>
                    </label>

                    <label className="grid gap-1.5">
                      <span className="text-[11px] font-black text-slate-500">보유 예산 선택 입력</span>
                      <div className="flex items-center gap-2">
                        <input
                          value={pensionBudgetEok}
                          onChange={event => setPensionBudgetEok(formatNumberInput(event.target.value))}
                          inputMode="numeric"
                          className="h-10 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800"
                          placeholder="예: 10,000"
                        />
                        <span className="shrink-0 text-xs font-black text-slate-500">억 두캇</span>
                      </div>
                    </label>

                    <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-black text-slate-500">공훈서 입력</span>
                        <span className="text-[10px] font-black text-slate-400">보유 장수</span>
                      </div>
                      <div className="mt-3 grid gap-2">
                        {meritBooks.map(book => {
                          const value = book.key === 'bronze'
                            ? bronzeBookCount
                            : book.key === 'silver'
                              ? silverBookCount
                              : goldBookCount;
                          const setter = book.key === 'bronze'
                            ? setBronzeBookCount
                            : book.key === 'silver'
                              ? setSilverBookCount
                              : setGoldBookCount;
                          return (
                            <label key={book.key} className="grid gap-1.5">
                              <span className="flex items-center justify-between gap-2 text-[11px] font-bold text-slate-600">
                                <span>{book.label}</span>
                                <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-black ${book.tone}`}>
                                  1장 {formatNumber(book.ducat / DUCAT_PER_POINT)}점
                                </span>
                              </span>
                              <div className="flex items-center gap-2">
                                <input
                                  value={value}
                                  onChange={event => setter(formatNumberInput(event.target.value))}
                                  inputMode="numeric"
                                  className="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800"
                                  placeholder="0"
                                />
                                <span className="shrink-0 text-xs font-black text-slate-500">장</span>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    <label className="grid gap-1.5">
                      <span className="text-[11px] font-black text-slate-500">목표 점수</span>
                      <input
                        value={targetScore}
                        onChange={event => setTargetScore(formatNumberInput(event.target.value))}
                        inputMode="numeric"
                        className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800"
                        placeholder="예: 1,000,000"
                      />
                    </label>
                  </div>
                </section>

                <div className="grid gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black uppercase tracking-widest text-teal-700">Pension</span>
                    <h3 className="text-sm font-black text-slate-950">연금 계산</h3>
                  </div>
                  <section className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border border-teal-200 bg-teal-50/80 p-4">
                      <p className="text-[11px] font-black text-teal-700">항구당 필요 점수</p>
                      <p className="mt-2 text-2xl font-black text-slate-950">{formatNumber(pensionCalc.perPortRequiredScore)}점</p>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-white/90 p-4">
                      <p className="text-[11px] font-black text-slate-500">항구당 필요 두캇</p>
                      <p className="mt-2 text-2xl font-black text-slate-950">{formatDucat(pensionCalc.perPortDucat)}</p>
                    </div>
                  </section>

                  <div className="flex items-center gap-2 pt-2">
                    <span className="text-[11px] font-black uppercase tracking-widest text-orange-700">Investment</span>
                    <h3 className="text-sm font-black text-slate-950">투자 계산</h3>
                  </div>
                  <section className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-4">
                      <p className="text-[11px] font-black text-amber-700">두캇의 점수 가치</p>
                      <p className="mt-2 text-2xl font-black text-slate-950">{formatNumber(pensionCalc.budgetScore)}점</p>
                      <p className="mt-1 text-xs font-bold text-slate-600">
                        {pensionCalc.budgetDucat > 0
                          ? `${formatDucat(pensionCalc.budgetDucat)} 기준`
                          : '보유 예산을 억 두캇 단위로 입력하세요.'}
                      </p>
                    </div>

                    <div className="rounded-lg border border-orange-200 bg-orange-50/80 p-4">
                      <p className="text-[11px] font-black text-orange-700">공훈서의 점수 가치</p>
                      <p className="mt-2 text-2xl font-black text-slate-950">{formatNumber(pensionCalc.meritScore)}점</p>
                      <p className="mt-1 text-xs font-bold text-slate-600">
                        {pensionCalc.meritDucat > 0
                          ? `${formatDucat(pensionCalc.meritDucat)} · 동 ${formatNumber(pensionCalc.meritCounts.bronze)}장 · 은 ${formatNumber(pensionCalc.meritCounts.silver)}장 · 금 ${formatNumber(pensionCalc.meritCounts.gold)}장`
                          : '보유 공훈서 장수를 입력하세요.'}
                      </p>
                    </div>

                    <div className={`rounded-lg border p-4 sm:col-span-2 ${
                      pensionCalc.targetScoreValue === 0
                        ? 'border-slate-200 bg-white/90'
                        : pensionCalc.targetGap <= 0
                          ? 'border-emerald-200 bg-emerald-50/80'
                          : 'border-rose-200 bg-rose-50/80'
                    }`}>
                      <p className={`text-[11px] font-black ${
                        pensionCalc.targetScoreValue === 0
                          ? 'text-slate-500'
                          : pensionCalc.targetGap <= 0
                            ? 'text-emerald-700'
                            : 'text-rose-700'
                      }`}>
                        목표 점수 대비
                      </p>
                      <p className="mt-2 text-2xl font-black text-slate-950">
                        {pensionCalc.targetScoreValue === 0
                          ? '-'
                          : pensionCalc.targetGap <= 0
                            ? `+${formatNumber(Math.abs(pensionCalc.targetGap))}점`
                            : `-${formatNumber(pensionCalc.targetGap)}점`}
                      </p>
                      <p className="mt-1 text-xs font-bold text-slate-600">
                        내 보유 {formatNumber(pensionCalc.ownedScore)}점 (두캇 {formatNumber(pensionCalc.budgetScore)} + 공훈서 {formatNumber(pensionCalc.meritScore)})
                        {pensionCalc.targetScoreValue > 0 ? ` · 목표 ${formatNumber(pensionCalc.targetScoreValue)}점` : ''}
                      </p>
                      {pensionCalc.targetGap > 0 && (
                        <p className="mt-2 text-xs font-bold text-rose-700">
                          부족분 충당: 두캇 {formatDucat(pensionCalc.targetGap * DUCAT_PER_POINT)} 또는{' '}
                          {meritBooks
                            .map(book => `${book.shortLabel} ${formatNumber(Math.ceil(pensionCalc.targetGap / (book.ducat / DUCAT_PER_POINT)))}장`)
                            .join(' · ')}
                        </p>
                      )}
                    </div>
                  </section>
                </div>
              </div>

              <section className="mt-4 rounded-lg border border-slate-200 bg-white/90 p-4">
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-widest text-sky-700">Quick Converter</p>
                    <h3 className="mt-1 text-sm font-black text-slate-950">점수 → 두캇 환산</h3>
                  </div>
                  <span className="rounded-md border border-sky-200 bg-sky-50 px-2 py-1 text-[10px] font-black text-sky-700">
                    1점 = {formatNumber(DUCAT_PER_POINT)}두캇
                  </span>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1.4fr] sm:items-end">
                  <label className="grid gap-1.5">
                    <span className="text-[11px] font-black text-slate-500">점수 입력</span>
                    <div className="flex items-center gap-2">
                      <input
                        value={scoreToConvert}
                        onChange={event => setScoreToConvert(formatNumberInput(event.target.value))}
                        inputMode="numeric"
                        className="h-10 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800"
                        placeholder="예: 1,000"
                      />
                      <span className="shrink-0 text-xs font-black text-slate-500">점</span>
                    </div>
                  </label>
                  <div className="rounded-lg border border-sky-200 bg-sky-50 p-3">
                    <p className="text-[11px] font-black text-sky-700">필요 두캇</p>
                    <p className="mt-1 text-2xl font-black text-slate-950">
                      {scoreToDucat.score > 0 ? formatDucat(scoreToDucat.ducat) : '-'}
                    </p>
                    <p className="mt-1 text-xs font-bold text-slate-600">
                      {scoreToDucat.score > 0
                        ? `${formatNumber(scoreToDucat.score)}점 × ${formatNumber(DUCAT_PER_POINT)} = ${formatNumber(scoreToDucat.ducat)}두캇`
                        : '점수를 입력하면 두캇으로 환산됩니다.'}
                    </p>
                  </div>
                </div>
              </section>

              <section className="mt-4 rounded-lg border border-slate-200 bg-white/90 p-4">
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Reference Table</p>
                    <h3 className="mt-1 text-sm font-black text-slate-950">8/10에 500점을 남기기 위한 시작일별 항구당 투자 기준</h3>
                  </div>
                  <span className="text-[11px] font-bold text-slate-400">금액은 항구 1개 기준</span>
                </div>

                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[620px] border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-[11px] font-black text-slate-500">
                        <th className="px-2 py-2">시작일</th>
                        <th className="px-2 py-2">주차</th>
                        <th className="px-2 py-2 text-right">항구당 총점</th>
                        <th className="px-2 py-2 text-right">500점 이후 추가</th>
                        <th className="px-2 py-2 text-right">항구당 금액</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pensionWeeks.map((week, index) => {
                        const active = index === pensionWeekIndex;
                        const extra = Math.max(0, week.requiredScore - 500);
                        return (
                          <tr key={week.date} className={active ? 'bg-teal-50/80' : 'bg-transparent'}>
                            <td className="px-2 py-2 font-black text-slate-800">{week.date}</td>
                            <td className="px-2 py-2 font-bold text-slate-500">{week.week}주차</td>
                            <td className="px-2 py-2 text-right font-black text-slate-900">{formatNumber(week.requiredScore)}점</td>
                            <td className="px-2 py-2 text-right font-bold text-slate-600">{formatNumber(extra)}점</td>
                            <td className="px-2 py-2 text-right font-black text-slate-900">{formatDucat(week.requiredScore * DUCAT_PER_POINT)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
            )}

            {pensionTab === 'monopoly' && (
            <div className="overflow-y-auto p-4 sm:p-5">
              <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
                <section className="rounded-lg border border-slate-200 bg-white/90 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-widest text-indigo-700">Monopoly Setup</p>
                      <h3 className="mt-1 text-lg font-black text-slate-950">상회 비중 입력</h3>
                    </div>
                    <span className="rounded-md border border-indigo-200 bg-indigo-50 px-2 py-1 text-[10px] font-black text-indigo-700">
                      투자 전·후 비교로 자동 환산
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <label className="grid min-w-0 gap-1.5">
                      <span className="text-[11px] font-black text-slate-500">투자한 점수</span>
                      <div className="flex min-w-0 items-center gap-2">
                        <input
                          value={monopolyInvestment}
                          onChange={event => setMonopolyInvestment(formatNumberInput(event.target.value))}
                          inputMode="numeric"
                          className="h-10 w-full min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800"
                          placeholder="예: 1,000,000"
                        />
                        <span className="shrink-0 text-xs font-black text-slate-500">점</span>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400">
                        실제 투자량(점). 점당 효율 자동 추정.
                      </span>
                    </label>
                    <label className="grid min-w-0 gap-1.5">
                      <span className="text-[11px] font-black text-slate-500">상회원 수 (선택)</span>
                      <div className="flex min-w-0 items-center gap-2">
                        <input
                          value={monopolyMemberCount}
                          onChange={event => setMonopolyMemberCount(formatNumberInput(event.target.value))}
                          inputMode="numeric"
                          className="h-10 w-full min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800"
                          placeholder="예: 20"
                        />
                        <span className="shrink-0 text-xs font-black text-slate-500">명</span>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400">
                        입력 시 1인당 분담량 계산.
                      </span>
                    </label>
                  </div>

                  <div className="mt-5">
                    <div className="grid grid-cols-[28px_minmax(70px,1fr)_1fr_1fr] items-center gap-2 px-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
                      <span className="text-center">내</span>
                      <span>상회명</span>
                      <span className="text-right">투자 전 %</span>
                      <span className="text-right">투자 후 %</span>
                    </div>
                    <div className="mt-2 grid gap-2">
                      {monopolyCompanies.map((c, i) => {
                        const row = monopolyCalc.rows[i];
                        const isMine = i === monopolyMyIndex;
                        return (
                          <div
                            key={i}
                            className={`grid grid-cols-[28px_minmax(70px,1fr)_1fr_1fr] items-center gap-2 rounded-lg border p-2 ${
                              isMine ? 'border-indigo-300 bg-indigo-50/60' : 'border-slate-200 bg-white'
                            }`}
                          >
                            <input
                              type="radio"
                              name="monopoly-my-company"
                              checked={isMine}
                              onChange={() => setMonopolyMyIndex(i)}
                              className="size-4 cursor-pointer accent-indigo-600 justify-self-center"
                              aria-label={`${c.name || `상회 ${i + 1}`}을 내 상회로 지정`}
                            />
                            <input
                              value={c.name}
                              onChange={event => setMonopolyCompanies(prev => prev.map((p, idx) => idx === i ? { ...p, name: event.target.value } : p))}
                              className="h-9 min-w-0 rounded-md border border-slate-200 bg-white px-2 text-xs font-bold text-slate-800"
                              placeholder={`상회 ${i + 1}`}
                            />
                            <input
                              value={c.before}
                              onChange={event => setMonopolyCompanies(prev => prev.map((p, idx) => idx === i ? { ...p, before: formatDecimalInput(event.target.value) } : p))}
                              inputMode="decimal"
                              className="h-9 min-w-0 rounded-md border border-slate-200 bg-white px-2 text-right text-xs font-bold text-slate-800"
                              placeholder="0.00"
                            />
                            <input
                              value={c.after}
                              onChange={event => setMonopolyCompanies(prev => prev.map((p, idx) => idx === i ? { ...p, after: formatDecimalInput(event.target.value) } : p))}
                              inputMode="decimal"
                              className="h-9 min-w-0 rounded-md border border-slate-200 bg-white px-2 text-right text-xs font-bold text-slate-800"
                              placeholder="0.00"
                            />
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-1">
                      <span className="text-[10px] font-bold text-slate-400">
                        합계: 전 {formatNumber(Math.round(monopolyCalc.sumBefore * 100) / 100)}% · 후 {formatNumber(Math.round(monopolyCalc.sumAfter * 100) / 100)}%
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setMonopolyCompanies(MONOPOLY_DEFAULT_COMPANIES);
                          setMonopolyInvestment('');
                          setMonopolyMemberCount('');
                          setMonopolyMyIndex(0);
                        }}
                        className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-black text-slate-600 hover:bg-slate-50"
                      >
                        초기화
                      </button>
                    </div>
                  </div>
                </section>

                <div className="grid gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black uppercase tracking-widest text-indigo-700">Result</span>
                    <h3 className="text-sm font-black text-slate-950">변화량 & 역전 계산</h3>
                  </div>

                  <section className="rounded-lg border border-slate-200 bg-white/90 p-4">
                    <p className="text-[11px] font-black text-slate-500">상회별 비중 변화 (1점당 추정 효율)</p>
                    <div className="mt-3 grid gap-1.5">
                      {monopolyCalc.rows.map(row => {
                        if (!row.filled) {
                          return (
                            <div key={row.index} className="flex items-center justify-between gap-2 rounded-md border border-dashed border-slate-200 px-2 py-1 text-[11px] font-bold text-slate-400">
                              <span>{row.name}</span>
                              <span>—</span>
                            </div>
                          );
                        }
                        const deltaSign = row.delta > 0 ? '+' : '';
                        const tone = row.delta > 0
                          ? 'border-emerald-200 bg-emerald-50/80 text-emerald-800'
                          : row.delta < 0
                            ? 'border-rose-200 bg-rose-50/80 text-rose-800'
                            : 'border-slate-200 bg-slate-50 text-slate-600';
                        return (
                          <div
                            key={row.index}
                            className={`grid grid-cols-[1fr_auto_auto] items-center gap-2 rounded-md border px-2 py-1 text-[11px] font-bold ${tone} ${row.isMine ? 'ring-2 ring-indigo-300' : ''}`}
                          >
                            <span className="truncate">
                              {row.isMine ? '⭐ ' : ''}{row.name}
                            </span>
                            <span className="font-black tabular-nums">
                              {deltaSign}{(Math.round(row.delta * 1000) / 1000).toFixed(3)}%p
                            </span>
                            <span className="text-[10px] tabular-nums opacity-80">
                              {monopolyCalc.investment > 0
                                ? `${row.ratePerPoint >= 0 ? '+' : ''}${(row.ratePerPoint * 1_000_000).toFixed(4)}%p/100만점`
                                : '—'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </section>

                  {(() => {
                    if (monopolyCalc.status === 'idle') {
                      return (
                        <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-4 text-center text-xs font-bold text-slate-500">
                          내 상회 포함 최소 2개 상회의 투자 전·후 비중과 투자 금액을 입력하세요.
                        </div>
                      );
                    }
                    if (monopolyCalc.status === 'invalid_investment') {
                      return (
                        <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-4 text-center text-xs font-black text-amber-700">
                          투자 점수를 입력하세요.
                        </div>
                      );
                    }
                    if (monopolyCalc.status === 'invalid_sum') {
                      return (
                        <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-4 text-center text-xs font-black text-amber-700">
                          비중 합계가 100%에서 0.5%p 이상 벗어납니다. 입력값을 확인하세요. (전 {formatNumber(Math.round(monopolyCalc.sumBefore * 100) / 100)}% / 후 {formatNumber(Math.round(monopolyCalc.sumAfter * 100) / 100)}%)
                        </div>
                      );
                    }
                    if (monopolyCalc.status === 'lead') {
                      return (
                        <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 p-4">
                          <p className="text-[11px] font-black text-emerald-700">현재 상태</p>
                          <p className="mt-2 text-2xl font-black text-slate-950">🏆 이미 1위</p>
                          <p className="mt-1 text-xs font-bold text-slate-600">
                            내 {monopolyCalc.me.name} {monopolyCalc.me.after.toFixed(2)}% · 2위 {monopolyCalc.leader?.name} {monopolyCalc.leader?.after.toFixed(2)}%
                          </p>
                        </div>
                      );
                    }
                    if (monopolyCalc.status === 'invalid_rate') {
                      return (
                        <div className="rounded-lg border border-rose-200 bg-rose-50/80 p-4 text-center text-xs font-black text-rose-700">
                          내 상회 비중이 오르지 않았습니다. 데이터를 확인하세요.
                        </div>
                      );
                    }
                    if (monopolyCalc.status === 'never') {
                      return (
                        <div className="rounded-lg border border-rose-200 bg-rose-50/80 p-4">
                          <p className="text-[11px] font-black text-rose-700">현재 추세 기준</p>
                          <p className="mt-2 text-2xl font-black text-slate-950">⚠️ 역전 불가</p>
                          <p className="mt-1 text-xs font-bold text-slate-600">
                            내 상승 폭이 1위 하락 폭보다 작거나 같아 격차가 좁혀지지 않습니다.
                          </p>
                        </div>
                      );
                    }
                    // status === 'behind'
                    return (
                      <>
                        <section className="grid gap-3 sm:grid-cols-2">
                          <div className="rounded-lg border border-slate-200 bg-white/90 p-4">
                            <p className="text-[11px] font-black text-slate-500">현재 격차</p>
                            <p className="mt-2 text-2xl font-black text-slate-950">{monopolyCalc.gap.toFixed(2)}%p</p>
                            <p className="mt-1 text-xs font-bold text-slate-600">
                              {monopolyCalc.leader?.name} {monopolyCalc.leader?.after.toFixed(2)}% − 내 {monopolyCalc.me.after.toFixed(2)}%
                            </p>
                          </div>
                          <div className="rounded-lg border border-slate-200 bg-white/90 p-4">
                            <p className="text-[11px] font-black text-slate-500">투자 1회당 격차 축소</p>
                            <p className="mt-2 text-2xl font-black text-slate-950">{monopolyCalc.perUnitGapClose.toFixed(3)}%p</p>
                            <p className="mt-1 text-xs font-bold text-slate-600">
                              {formatNumber(monopolyCalc.investment)}점 기준
                            </p>
                          </div>
                        </section>

                        <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4">
                          <p className="text-[11px] font-black text-indigo-700">필요한 추가 투자</p>
                          <p className="mt-2 text-3xl font-black text-slate-950">
                            +{formatNumber(monopolyCalc.remainingPoints)}점
                          </p>
                          <p className="mt-1 text-xs font-bold text-slate-600">
                            {formatDucat(monopolyCalc.remainingDucat)} · 같은 효율로 추가 투자 시
                          </p>

                          {monopolyCalc.memberCount > 0 && (
                            <div className="mt-3 rounded-md border border-indigo-300 bg-white p-3">
                              <p className="text-[11px] font-black text-indigo-700">
                                상회원 {formatNumber(monopolyCalc.memberCount)}명이 분담 시 1인당
                              </p>
                              <p className="mt-1 text-xl font-black text-slate-950 tabular-nums">
                                {formatNumber(monopolyCalc.perMemberPoints)}점 · {formatDucat(monopolyCalc.perMemberDucat)}
                              </p>
                              <p className="mt-1 text-[10px] font-bold text-slate-500">
                                총 {formatNumber(monopolyCalc.perMemberPoints * monopolyCalc.memberCount)}점 확보 (필요량보다 {formatNumber(monopolyCalc.perMemberPoints * monopolyCalc.memberCount - monopolyCalc.remainingPoints)}점 여유)
                              </p>
                            </div>
                          )}

                          <div className="mt-3 rounded-md border border-indigo-200 bg-white/70 p-3 text-[11px] font-bold text-slate-700">
                            <p>예상 역전 후</p>
                            <p className="mt-1 text-slate-900">
                              ⭐ 내 {monopolyCalc.me.name} <span className="font-black">{monopolyCalc.projectedMe.toFixed(2)}%</span>
                              <span className="mx-2 text-slate-400">vs</span>
                              {monopolyCalc.leader?.name} <span className="font-black">{monopolyCalc.projectedLeader.toFixed(2)}%</span>
                              <span className="ml-2 text-emerald-700">(+{(monopolyCalc.projectedMe - monopolyCalc.projectedLeader).toFixed(2)}%p)</span>
                            </p>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
            )}

            <div className="flex shrink-0 justify-end border-t border-slate-200 bg-slate-50 px-4 py-3">
              <button type="button" onClick={() => setPensionOpen(false)} className="tool-button h-9 px-4">
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      <input type="checkbox" id="update-modal" className="peer hidden" />

      <label
        htmlFor="update-modal"
        className="fixed inset-0 z-[200] hidden cursor-default items-center justify-center bg-slate-950/45 p-3 backdrop-blur-sm peer-checked:flex"
      >
        <div
          className="app-panel flex max-h-[86vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg"
          onClick={event => event.stopPropagation()}
        >
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-slate-950 px-4 py-3 text-white">
            <div className="flex min-w-0 items-center gap-2">
              <Clock size={16} className="text-teal-300" />
              <h2 className="truncate text-sm font-black">업데이트 내역</h2>
            </div>
            <label htmlFor="update-modal" className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-white/70 transition hover:bg-white/10 hover:text-white">
              <X size={17} />
            </label>
          </div>

          <div className="space-y-5 overflow-y-auto p-4 sm:p-5">
            {UPDATE_LOGS.map(log => (
              <section key={log.version} className="rounded-lg border border-slate-200 bg-white p-3">
                <div className="mb-3 flex items-center gap-2">
                  <span className={`rounded-md border px-2 py-1 text-[11px] font-black ${log.tone}`}>{log.label}</span>
                  <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-black text-slate-700">{log.version}</span>
                  <span className="ml-auto text-[11px] font-bold text-slate-400">{log.date}</span>
                </div>

                <div className="space-y-1.5">
                  {log.items.map((item, idx) => {
                    const style = TYPE_STYLE[item.type];
                    const Icon = style.icon;
                    return (
                      <div key={`${log.version}-${idx}`} className="flex items-start gap-2 rounded-md bg-slate-50 px-2.5 py-2">
                        <span className={`mt-0.5 flex shrink-0 items-center gap-1 rounded border px-1.5 py-0.5 text-[9px] font-black ${style.color}`}>
                          <Icon size={8} />
                          {style.label}
                        </span>
                        <span className="text-xs font-medium leading-5 text-slate-600">{item.text}</span>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>

          <div className="flex shrink-0 justify-end border-t border-slate-200 bg-slate-50 px-4 py-3">
            <label htmlFor="update-modal" className="tool-button h-9 cursor-pointer px-4">
              닫기
            </label>
          </div>
        </div>
      </label>
    </main>
  );
}
