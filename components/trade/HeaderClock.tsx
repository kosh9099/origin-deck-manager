'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Clock } from 'lucide-react';

/**
 * 한국 표준시(KST) 실시간 시:분:초 표시.
 * - /api/time 에서 정확한 표준 시각을 받아 기기 시계와의 오프셋을 계산해 보정.
 * - 기기 시계가 틀어져 있어도 네이버 시계와 동일한 정확한 시각을 표시.
 * - API 실패 시 기기 시계로 자연 폴백.
 */
export default function HeaderClock() {
  const [time, setTime] = useState<string>('');
  const [source, setSource] = useState<string>('');
  // serverNow - clientNow (ms). 기기 시계 보정값.
  const offsetRef = useRef(0);

  useEffect(() => {
    let alive = true;

    const sync = async () => {
      try {
        const t0 = Date.now();
        const res = await fetch('/api/time', { cache: 'no-store' });
        const t1 = Date.now();
        if (!alive || !res.ok) return;
        const data = await res.json();
        if (!alive || typeof data.now !== 'number') return;
        // 서버 시각은 왕복 지연의 중간 시점에 대응한다고 근사
        offsetRef.current = data.now - (t0 + (t1 - t0) / 2);
        if (typeof data.source === 'string') setSource(data.source);
      } catch {
        // 오프셋 유지 (초기값 0 = 기기 시계)
      }
    };

    const tick = () => {
      const corrected = new Date(Date.now() + offsetRef.current);
      setTime(
        corrected.toLocaleTimeString('en-GB', {
          timeZone: 'Asia/Seoul',
          hour12: false,
        })
      );
    };

    sync().then(tick);
    tick();
    const tickId = setInterval(tick, 1000);
    // 5분마다 재동기화 (기기 시계 드리프트 보정)
    const resyncId = setInterval(sync, 5 * 60 * 1000);

    return () => {
      alive = false;
      clearInterval(tickId);
      clearInterval(resyncId);
    };
  }, []);

  // SSR/CSR hydration mismatch 방지 — 마운트 후에만 렌더
  if (!time) return null;

  const tip = source.includes('naver')
    ? '네이버 서버 시각 동기화 (KST)'
    : source.includes('timeapi')
      ? '표준시 동기화됨 (KST)'
      : source
        ? '서버 시계 기준 (KST)'
        : '기기 시계 기준 (KST)';

  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 rounded-md border border-teal-200 bg-teal-50 px-2 py-1 text-[13px] font-black tabular-nums text-teal-700"
      title={tip}
    >
      <Clock size={13} className="text-teal-500" />
      {time}
    </span>
  );
}
