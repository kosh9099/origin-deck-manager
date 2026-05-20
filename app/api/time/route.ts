import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// 외부 시간 소스 응답을 30초간 서버 측 캐시 (외부 호출량 절감)
let cache: { serverMs: number; atLocal: number; source: string } | null = null;
const CACHE_MS = 30_000;
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/**
 * naver.com HTTP Date 헤더 — 네이버 서버 시각.
 * Date 헤더는 초 단위 절삭값이라 중간값(+500ms)과 응답 편도 지연을 보정.
 */
async function fromNaverDateHeader(): Promise<number | null> {
  const t0 = Date.now();
  const res = await fetch('https://www.naver.com', {
    method: 'HEAD',
    cache: 'no-store',
    signal: AbortSignal.timeout(3000),
  });
  const t1 = Date.now();
  const dateHeader = res.headers.get('date');
  if (!dateHeader) return null;
  const base = new Date(dateHeader).getTime();
  if (!Number.isFinite(base)) return null;
  // base = 응답 생성 시각의 초 절삭값 → +500ms(중간값) + 응답 편도 지연
  return base + 500 + (t1 - t0) / 2;
}

/** timeapi.io — KST 분해 필드(ms 정밀도)를 epoch ms 로 변환 (네이버 실패 시 폴백) */
async function fromTimeApiIo(): Promise<number | null> {
  const res = await fetch(
    'https://timeapi.io/api/time/current/zone?timeZone=Asia%2FSeoul',
    { cache: 'no-store', signal: AbortSignal.timeout(3000) }
  );
  if (!res.ok) return null;
  const d = await res.json();
  if (typeof d.year !== 'number') return null;
  // 분해 필드는 KST 벽시계 값 → UTC 로 환산 (KST = UTC+9)
  const ms =
    Date.UTC(d.year, d.month - 1, d.day, d.hour, d.minute, d.seconds, d.milliSeconds ?? 0) -
    KST_OFFSET_MS;
  return Number.isFinite(ms) ? ms : null;
}

/**
 * 정확한 현재 시각(epoch ms)을 반환.
 * 우선순위: 네이버 서버 시각 → timeapi.io → 서버 시계.
 * 클라이언트는 이 값으로 기기 시계와의 오프셋을 계산해 보정.
 */
export async function GET() {
  const nowLocal = Date.now();

  if (cache && nowLocal - cache.atLocal < CACHE_MS) {
    return NextResponse.json({
      now: cache.serverMs + (nowLocal - cache.atLocal),
      source: `cache:${cache.source}`,
    });
  }

  for (const [source, fn] of [
    ['naver', fromNaverDateHeader],
    ['timeapi.io', fromTimeApiIo],
  ] as const) {
    try {
      const ms = await fn();
      if (ms != null) {
        cache = { serverMs: ms, atLocal: Date.now(), source };
        return NextResponse.json({ now: ms, source });
      }
    } catch {
      // 다음 소스 시도
    }
  }

  return NextResponse.json({ now: Date.now(), source: 'fallback' });
}
