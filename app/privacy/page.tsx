import type { Metadata } from 'next';
import Link from 'next/link';
import { Anchor, ArrowLeft, ExternalLink, ShieldCheck } from 'lucide-react';

export const metadata: Metadata = {
  title: '개인정보처리방침 | 대항오 덱 매니저',
  description: '대항오 덱 매니저의 개인정보 처리, 외부 서비스, 광고 쿠키 사용 안내',
};

const sections = [
  {
    title: '1. 개인정보 처리 항목',
    items: [
      '본 사이트는 회원가입 및 로그인 계정을 운영하지 않으며, 이름, 이메일, 비밀번호 등 회원 식별 정보를 직접 수집하지 않습니다.',
      '서비스 제공, 보안, 통계 확인 및 광고 제공 과정에서 개인을 직접 식별하지 않는 방문 세션 ID, 접속 페이지, 최초/최근 방문 시각, 브라우저 및 기기 정보, 쿠키 및 유사 식별자가 처리될 수 있습니다.',
      '활성 세션 통계는 브라우저에서 생성한 임의의 방문 세션 ID, 현재 또는 최근 접속 페이지 경로, 최초 방문 시각, 최근 방문 시각을 기준으로 계산합니다. 이 통계에는 이름, 이메일, 게임 닉네임, 비밀번호, 정확한 위치정보, 브라우저 지문을 직접 저장하지 않습니다.',
      '본 사이트 서버는 방문 통계 목적으로 IP 주소를 별도 저장하지 않습니다. 다만 Vercel, Supabase, Google 등 외부 서비스의 호스팅·보안·광고 처리 과정에서 IP 주소 또는 IP 기반의 대략적 지역 정보가 일시적으로 처리될 수 있습니다.',
      '브라우저 localStorage에는 테마, 필터, 계산기, 덱 설정 등 도구 사용 설정이 저장될 수 있습니다.',
      '관리자 기능을 이용하는 경우에 한하여 관리자 인증 상태 유지를 위한 쿠키가 저장될 수 있으며, 일반 이용자에게는 해당 쿠키가 발급되지 않습니다.',
    ],
  },
  {
    title: '2. 이용 목적',
    items: [
      '교역 매니저, 육탐 매니저 등 도구 기능 제공',
      '방문자 수, 활성 세션, 접속 페이지 등 서비스 운영 통계 확인',
      '취미로 운영하는 팬 도구의 실제 이용 규모와 트래픽 증가 추이를 확인하여, 안정적인 서비스 운영과 서버 비용·인프라 확장 필요성을 판단',
      '사용자 브라우저에서 설정값을 유지하여 사용 편의성 개선',
      '사이트 보안, 오류 확인, 비정상 이용 방지',
      '광고 노출, 광고 빈도 제한, 광고 성과 측정 및 맞춤형 또는 비맞춤형 광고 제공',
    ],
  },
  {
    title: '3. 보관 및 파기',
    items: [
      '브라우저 localStorage에 저장된 설정은 사용자가 브라우저 데이터를 삭제하면 함께 삭제됩니다.',
      '방문 세션 기록은 최근 이용 현황과 서비스 운영 통계 확인에 필요한 동안 보관합니다. 통계 목적이 달성되었거나 서비스 운영 또는 통계 기능이 종료·중단된 경우, 또는 이용자의 삭제 요청이 기술적으로 확인 가능한 경우 삭제하거나 개인을 식별할 수 없는 집계 형태로 전환합니다.',
      '보관 목적이 달성되거나 보관기간이 지난 서버 기록은 데이터베이스에서 삭제하고, 외부 서비스의 로그는 각 서비스의 보관 정책에 따라 삭제 또는 비식별 처리됩니다.',
      '서버에는 로그인 계정, 이메일, 비밀번호 등 회원 정보를 저장하지 않습니다.',
    ],
  },
  {
    title: '4. 처리위탁 및 외부 서비스 이용',
    items: [
      'Supabase: 공개 데이터 및 방문 통계 저장, 데이터베이스 운영',
      'Vercel: 웹사이트 호스팅, 배포, 접속 로그 및 보안·성능 관리',
      'Google AdSense: 광고 제공, 광고 빈도 제한, 광고 성과 측정, 맞춤형 또는 비맞춤형 광고 제공',
    ],
  },
  {
    title: '5. 국외 처리 및 이전 가능성',
    items: [
      '본 사이트는 Supabase, Vercel, Google AdSense 등 해외 사업자가 제공하는 서비스를 이용하므로, 서비스 운영 과정에서 관련 정보가 국외 서버에서 처리·보관될 수 있습니다.',
      '이전받는 자: Supabase, Inc., Vercel Inc., Google LLC 및 각 서비스의 계열사·하위 처리업체',
      '이전 국가: 미국 및 각 서비스 제공자가 인프라를 운영하는 국가. 정확한 처리 국가는 서비스 리전, 네트워크 경로, 광고 제공 상황에 따라 달라질 수 있습니다.',
      '이전 일시 및 방법: 이용자가 사이트에 접속하거나 도구 기능을 사용하거나 광고가 표시되는 시점에 네트워크를 통해 전송 또는 저장됩니다.',
      '이전 항목: 방문 세션 ID, 접속 페이지, 방문 시각, 브라우저·기기 정보, IP 주소 또는 IP 기반의 대략적 지역 정보, 쿠키 및 광고 식별자 등 각 서비스 제공에 필요한 정보',
      '이전 목적 및 보유·이용 기간: 웹사이트 호스팅, 데이터베이스 운영, 보안·성능 관리, 광고 제공 및 성과 측정을 위해 처리되며, 본 방침의 보관 기준과 각 외부 서비스의 개인정보 처리방침 및 보관 정책에 따릅니다.',
      '국외 처리에 동의하지 않는 경우 브라우저 쿠키 차단, 광고 설정 변경, 사이트 이용 중단 또는 개인정보 보호책임자에게 문의할 수 있습니다. 다만 이 경우 일부 기능 또는 광고 표시가 제한될 수 있습니다.',
    ],
  },
  {
    title: '6. 안전성 확보 조치',
    items: [
      '본 사이트는 처리하는 정보를 최소화하고, 이름·이메일·비밀번호·게임 닉네임 등 회원 식별 정보를 서버에 저장하지 않는 방식으로 운영합니다.',
      '방문 통계 데이터와 관리자 설정은 서버 API를 통해 처리하며, 클라이언트 코드에 Supabase 비밀키가 노출되지 않도록 환경변수와 서버 전용 모듈로 분리합니다.',
      '관리자 인증에는 비밀번호 해시와 HttpOnly, SameSite 쿠키를 사용하며, 운영 환경에서는 보안 쿠키 설정을 적용합니다.',
      'Supabase 테이블에는 Row Level Security 등 접근 제한을 적용하고, 공개 데이터와 운영 통계 데이터의 접근 범위를 분리합니다.',
      'Vercel과 Supabase가 제공하는 HTTPS 전송, 접근 제어, 로그 및 보안 기능을 이용해 서비스 운영 중 발생할 수 있는 무단 접근과 정보 노출 위험을 줄입니다.',
    ],
  },
  {
    title: '7. 이용자의 권리와 요청 방법',
    items: [
      '이용자는 개인정보와 관련하여 열람, 정정, 삭제, 처리정지 요청을 할 수 있습니다.',
      '본 사이트가 회원 계정을 운영하지 않는 특성상 요청 처리 과정에서 본인 또는 요청 내용을 확인하기 위한 최소한의 정보가 필요할 수 있습니다.',
      '개인정보 관련 요청은 아래 개인정보 보호책임자 이메일로 접수할 수 있으며, 운영자는 합리적인 범위에서 지체 없이 확인합니다.',
    ],
  },
  {
    title: '8. 쿠키 및 localStorage 거부 방법',
    items: [
      '사용자는 브라우저 설정을 통해 쿠키 저장을 거부하거나 삭제할 수 있습니다.',
      '브라우저 데이터 삭제를 통해 localStorage에 저장된 테마, 필터, 계산기, 덱 설정 등 도구 사용 설정을 삭제할 수 있습니다.',
      '쿠키 또는 localStorage를 삭제하거나 차단하는 경우 일부 기능이 정상적으로 동작하지 않을 수 있습니다.',
    ],
  },
];

const externalServiceLinks = [
  { label: 'Supabase 개인정보처리방침', href: 'https://supabase.com/privacy' },
  { label: 'Supabase 이용약관', href: 'https://supabase.com/terms' },
  { label: 'Vercel 개인정보처리방침', href: 'https://vercel.com/legal/privacy-policy' },
  { label: 'Vercel 이용약관', href: 'https://vercel.com/legal/terms' },
  { label: 'Google 개인정보처리방침', href: 'https://policies.google.com/privacy?hl=ko' },
  { label: 'Google 서비스 약관', href: 'https://policies.google.com/terms?hl=ko' },
];

const privacyReliefLinks = [
  { label: '개인정보분쟁조정위원회', phone: '1833-6972', href: 'https://www.kopico.go.kr' },
  { label: '개인정보침해신고센터', phone: '118', href: 'https://privacy.kisa.or.kr' },
  { label: '대검찰청', phone: '1301', href: 'https://www.spo.go.kr' },
  { label: '경찰청 사이버범죄신고시스템', phone: '182', href: 'https://ecrm.police.go.kr' },
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
                대항오 덱 매니저는 회원가입 및 로그인 계정을 운영하지 않으며, 도구 제공, 서비스 운영 통계 확인, 보안 및 광고
                제공에 필요한 범위의 정보만 처리합니다.
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
              <h2 className="text-sm font-black text-slate-900">외부 서비스 정책 링크</h2>
              <p className="mt-3 text-xs font-semibold leading-5 text-slate-600">
                Supabase, Vercel, Google의 개인정보 처리 및 약관은 각 서비스가 제공하는 최신 정책을 따릅니다. 아래 링크에서
                각 외부 서비스의 정책을 확인할 수 있습니다.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {externalServiceLinks.map(link => (
                  <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    className="tool-button h-9 px-3 text-xs"
                  >
                    {link.label}
                    <ExternalLink size={13} />
                  </a>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white/80 p-4">
              <h2 className="text-sm font-black text-slate-900">Google 광고 쿠키 안내</h2>
              <p className="mt-3 text-xs font-semibold leading-5 text-slate-600">
                Google을 포함한 제3자 광고 사업자는 사용자의 본 사이트 또는 다른 사이트 방문 기록을 바탕으로 광고를
                게재하기 위해 쿠키를 사용할 수 있습니다. Google의 광고 쿠키 사용으로 Google 및 Google 파트너는 사용자에게
                맞춤형 광고 또는 비맞춤형 광고를 제공할 수 있으며, 사용자는 Google 광고 설정에서 개인 맞춤 광고를 선택
                해제할 수 있습니다. 다른 제3자 광고 공급업체 또는 광고 네트워크의 쿠키도 사이트 광고 게재에 사용될 수
                있습니다.
              </p>
              <p className="mt-3 text-xs font-semibold leading-5 text-slate-600">
                EEA, 영국, 스위스 등 일부 지역 이용자에게 광고를 제공하는 경우 Google의 동의 관리 요건이 적용될 수 있으며,
                관련 법령과 Google 정책에 따라 광고 쿠키 및 개인 맞춤 광고에 대한 별도 동의 안내가 표시될 수 있습니다.
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
                <a
                  href="https://www.aboutads.info/"
                  target="_blank"
                  rel="noreferrer"
                  className="tool-button h-9 px-3 text-xs"
                >
                  제3자 광고 쿠키 선택 해제 안내
                  <ExternalLink size={13} />
                </a>
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white/80 p-4">
              <h2 className="text-sm font-black text-slate-900">개인정보 보호책임자 및 문의</h2>
              <p className="mt-3 text-xs font-semibold leading-5 text-slate-600">
                개인정보 보호 관련 문의, 열람·정정·삭제·처리정지 요청은 아래 연락처로 요청할 수 있습니다.
              </p>
              <p className="mt-2 text-xs font-semibold leading-5 text-slate-600">
                개인정보 보호책임자: <b className="text-slate-800">고든이고든요</b>
              </p>
              <a
                href="mailto:jlg882020@gmail.com"
                className="mt-2 inline-flex text-xs font-black text-teal-700 underline-offset-4 hover:underline"
              >
                jlg882020@gmail.com
              </a>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white/80 p-4">
              <h2 className="text-sm font-black text-slate-900">개인정보 침해 신고 및 상담</h2>
              <p className="mt-3 text-xs font-semibold leading-5 text-slate-600">
                개인정보 침해로 인한 신고나 상담이 필요한 경우 아래 기관에 문의할 수 있습니다.
              </p>
              <div className="mt-3 divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-slate-50/70">
                {privacyReliefLinks.map(link => (
                  <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between gap-3 px-3 py-2.5 text-xs font-bold text-slate-700 transition-colors hover:bg-white hover:text-teal-700"
                  >
                    <span className="min-w-0">
                      <span className="block truncate">{link.label}</span>
                      <span className="mt-0.5 block text-[11px] font-black text-slate-400">국번없이 {link.phone}</span>
                    </span>
                    <ExternalLink size={13} className="shrink-0" />
                  </a>
                ))}
              </div>
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
