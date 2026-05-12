import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import VisitorTracker from "@/components/visitor/VisitorTracker";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://origin-deck-manager.vercel.app"),
  applicationName: "대항오 덱 매니저",
  title: {
    default: "대항오 덱 매니저",
    template: "%s | 대항오 덱 매니저",
  },
  description: "교역 스케줄과 육탐 함대 배치를 관리하는 항해 도구",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    shortcut: "/favicon.svg",
  },
  openGraph: {
    title: "대항오 덱 매니저",
    description: "교역 스케줄과 육탐 함대 배치를 관리하는 항해 도구",
    url: "/",
    siteName: "대항오 덱 매니저",
    locale: "ko_KR",
    type: "website",
  },
};

// 모바일에서 페이지 자체 핀치 줌으로 인해 맵 좌표계가 깨지는 문제 방지.
// 맵은 자체 핀치 줌(touchAction: none)을 가지므로 페이지 레벨에서는 줌 비활성.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

const themeScript = `
(() => {
  try {
    const saved = localStorage.getItem('odm_theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = saved === 'dark' || saved === 'light' ? saved : (prefersDark ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.dataset.theme = theme;
  } catch {}
})();
`;

const adsenseClient = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <body className="antialiased">
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {adsenseClient && (
          <Script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClient}`}
            crossOrigin="anonymous"
            strategy="afterInteractive"
          />
        )}
        {children}
        <VisitorTracker />
      </body>
    </html>
  );
}
