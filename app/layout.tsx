import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "대항오 덱 매니저",
  description: "교역 스케줄과 육탐 함대 배치를 관리하는 항해 도구",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="antialiased">
        {children}
        <VisitorTracker />
      </body>
    </html>
  );
}
