import type { Metadata } from 'next';
import Link from 'next/link';
import { Anchor, ArrowLeft, ExternalLink, ShieldCheck } from 'lucide-react';

export const metadata: Metadata = {
  title: '개인정보처리방침 | 대항오 덱 매니저',
  description: '대항오 덱 매니저의 개인정보 처리 및 광고 쿠키 사용 안내',
};

const sections = [
  {
    title: '수집하는 정보',
    items: [
      '익명 방문 세션 ID, 접속 페이지, 최초/최근 방문 시각',
      '브라우저에 저장되는 테마, 필터, 계산기, 덱 설정 등 도구 사용 설정',
      '관리자 기능 이용 시 관리자 인증 쿠키',
      'Google AdSense 광고가 표시되는 경우 광고 제공을 위한 쿠키 또는 식별자',
    ],
  },
  {
    title: '이용 목적',
    items: [
      '교역 매니저, 육탐 매니저 등 도구 기능 제공',
      '방문자 수와 활성 세션 등 익명 통계 확인',
      '사용자 브라우저에서 설정값을 유지해 사용 편의성 개선',
      '광고 노출, 광고 빈도 제한, 광고 성과 측정',
    ],
  },
  {
    title: '보관 및 삭제',
    items: [
      '브라우저 localStorage에 저장된 설정은 사용자가 브라우저 데이터를 삭제하면 함께 삭제됩니다.',
      '익명 방문 세션 기록은 서비스 운영 통계 목적으로 보관하며, 필요가 사라지면 정리할 수 있습니다.',
      '서버에는 로그인 계정, 이메일, 비밀번호 등 회원 정보를 저장하지 않습니다.',
    ],
  },
  {
    title: '제3자 서비스',
    items: [
      'Supabase: 공개 데이터와 익명 방문 통계 저장',
      'Vercel: 웹사이트 호스팅 및 배포',
      'Google AdSense: 광고 제공 및 광고 쿠키 사용 가능',
    ],
  },
];

export default function PrivacyPage() {
  return (
    <main className="app-bg min-h-screen px-4 py-5 text-slate-900 sm:px-6 lg:px-8">
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.045]"
        style={{ backgroundImage: 'url(/maps/world-map.webp)', backgroundSize: 'cover', backgroundPosition: 'center' }}
      />

      <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-col gap-4">
        <header className="flex items-center justify-between gap-3 border-b border-slate-900/10 py-3">
          <Link href="/" className="tool-button h-9 px-3">
            <ArrowLeft size={14} />
            메인으로
          </Link>
          <span className="flex size-9 items-center justify-center rounded-lg border border-teal-800/15 bg-white/80 text-teal-700 shadow-sm">
            <Anchor size={18} />
          </span>
        </header>

        <section className="app-panel rounded-lg p-5 sm:p-6">
          <div className="flex items-start gap-3 border-b border-slate-200 pb-5">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-teal-100 bg-teal-50 text-teal-700">
              <ShieldCheck size={22} />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-widest text-teal-700">Privacy Policy</p>
              <h1 className="mt-1 text-2xl font-black text-slate-950">개인정보처리방침</h1>
              <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
                대항오 덱 매니저는 로그인 계정을 운영하지 않으며, 도구 제공과 익명 통계 확인에 필요한 최소한의 정보만
                사용합니다.
              </p>
              <p className="mt-2 text-[11px] font-bold text-slate-400">시행일: 2026년 5월 12일</p>
            </div>
          </div>

          <div className="mt-5 space-y-5">
            {sections.map(section => (
              <section key={section.title} className="rounded-lg border border-slate-200 bg-white/80 p-4">
                <h2 className="text-sm font-black text-slate-900">{section.title}</h2>
                <ul className="mt-3 space-y-2 text-xs font-semibold leading-5 text-slate-600">
                  {section.items.map(item => (
                    <li key={item} className="flex gap-2">
                      <span className="mt-2 size-1.5 shrink-0 rounded-full bg-teal-500" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}

            <section className="rounded-lg border border-slate-200 bg-white/80 p-4">
              <h2 className="text-sm font-black text-slate-900">Google 광고 쿠키 안내</h2>
              <p className="mt-3 text-xs font-semibold leading-5 text-slate-600">
                Google을 포함한 제3자 광고 사업자는 사용자의 이전 방문 기록을 바탕으로 광고를 게재하기 위해 쿠키를 사용할 수
                있습니다. 사용자는 Google 광고 설정에서 개인 맞춤 광고를 선택 해제할 수 있습니다.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <a
                  href="https://adssettings.google.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="tool-button h-9 px-3 text-xs"
                >
                  Google 광고 설정
                  <ExternalLink size={13} />
                </a>
                <a
                  href="https://policies.google.com/technologies/partner-sites?hl=ko"
                  target="_blank"
                  rel="noreferrer"
                  className="tool-button h-9 px-3 text-xs"
                >
                  Google 파트너 사이트 데이터 사용
                  <ExternalLink size={13} />
                </a>
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white/80 p-4">
              <h2 className="text-sm font-black text-slate-900">문의</h2>
              <p className="mt-3 text-xs font-semibold leading-5 text-slate-600">
                개인정보 처리와 관련한 문의는 사이트 운영자 <b className="text-slate-800">고든이고든요</b>에게 요청할 수
                있습니다.
              </p>
              <a
                href="mailto:jlg882020@gmail.com"
                className="mt-2 inline-flex text-xs font-black text-teal-700 underline-offset-4 hover:underline"
              >
                jlg882020@gmail.com
              </a>
            </section>

            <p className="text-[11px] font-semibold leading-5 text-slate-400">
              본 사이트는 대항해시대 오리진의 비공식 팬 도구이며, LINE Games 또는 Motif의 공식 서비스가 아닙니다.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
