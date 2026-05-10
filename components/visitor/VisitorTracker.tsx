'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { getOrCreateSessionId } from '@/lib/visitor/session';

const HEARTBEAT_INTERVAL_MS = 30_000; // 30초마다 핑

async function ping(sessionId: string, pagePath: string) {
  if (!sessionId) return;
  try {
    await fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, pagePath }),
      keepalive: true,
    });
  } catch {
    // 네트워크 오류 무시 — 다음 핑에서 복구.
  }
}

/**
 * 익명 방문자 트래커.
 * - 페이지 로드 / 라우트 변경 시 1회 핑
 * - 페이지가 visible 상태일 때 30초마다 heartbeat
 * - 백그라운드 탭으로 가면 핑 중지 (서버 부하 감소)
 */
export default function VisitorTracker() {
  const pathname = usePathname();

  useEffect(() => {
    const sessionId = getOrCreateSessionId();
    if (!sessionId) return;

    // 즉시 1회 핑
    ping(sessionId, pathname);

    let timer: ReturnType<typeof setInterval> | null = null;

    const startHeartbeat = () => {
      if (timer) return;
      timer = setInterval(() => ping(sessionId, pathname), HEARTBEAT_INTERVAL_MS);
    };
    const stopHeartbeat = () => {
      if (timer) { clearInterval(timer); timer = null; }
    };

    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      startHeartbeat();
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        ping(sessionId, pathname);
        startHeartbeat();
      } else {
        stopHeartbeat();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      stopHeartbeat();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [pathname]);

  return null;
}
