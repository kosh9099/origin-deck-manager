import { NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/admin/auth';
import { supabase } from '@/lib/supabaseClient';

const KST_OFFSET_MS = 9 * 3600 * 1000;
const ACTIVE_WINDOW_MS = 5 * 60 * 1000; // 5분
const DAY_MS = 24 * 3600 * 1000;

/**
 * KST 기준 오늘 자정(UTC 기준 시각) 반환.
 */
function kstStartOfDay(now: number): number {
  const kstNow = now + KST_OFFSET_MS;
  const kstMidnight = kstNow - (kstNow % DAY_MS);
  return kstMidnight - KST_OFFSET_MS;
}

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const nowMs = Date.now();
  const activeSinceIso = new Date(nowMs - ACTIVE_WINDOW_MS).toISOString();
  const todayStartIso = new Date(kstStartOfDay(nowMs)).toISOString();
  const sevenDaysAgoIso = new Date(kstStartOfDay(nowMs) - 6 * DAY_MS).toISOString();

  // 1. 현재 활성 세션 (최근 5분 이내 활동)
  const activeQ = await supabase
    .from('visitor_sessions')
    .select('id, last_seen, page_path', { count: 'exact' })
    .gte('last_seen', activeSinceIso)
    .order('last_seen', { ascending: false })
    .limit(50);

  // 2. 오늘(KST) 신규 방문 세션 수
  const todayQ = await supabase
    .from('visitor_sessions')
    .select('id', { count: 'exact', head: true })
    .gte('first_seen', todayStartIso);

  // 3. 누적 방문 세션 수 (전체)
  const totalQ = await supabase
    .from('visitor_sessions')
    .select('id', { count: 'exact', head: true });

  // 4. 최근 7일치 일별 신규 방문 (first_seen 기준)
  const last7Q = await supabase
    .from('visitor_sessions')
    .select('first_seen')
    .gte('first_seen', sevenDaysAgoIso);

  if (activeQ.error || todayQ.error || totalQ.error || last7Q.error) {
    const detail =
      activeQ.error?.message ?? todayQ.error?.message ?? totalQ.error?.message ?? last7Q.error?.message ?? 'unknown';
    return NextResponse.json({ ok: false, error: 'db_error', detail }, { status: 500 });
  }

  // 일별 카운트 (KST 기준 yyyy-mm-dd 키)
  const dailyCountsMap = new Map<string, number>();
  for (let i = 0; i < 7; i++) {
    const dayMs = kstStartOfDay(nowMs) - i * DAY_MS;
    const dateStr = new Date(dayMs + KST_OFFSET_MS).toISOString().slice(0, 10);
    dailyCountsMap.set(dateStr, 0);
  }
  for (const row of (last7Q.data ?? []) as Array<{ first_seen: string }>) {
    const dayMs = kstStartOfDay(new Date(row.first_seen).getTime());
    const key = new Date(dayMs + KST_OFFSET_MS).toISOString().slice(0, 10);
    if (dailyCountsMap.has(key)) dailyCountsMap.set(key, (dailyCountsMap.get(key) ?? 0) + 1);
  }
  const last7Days = Array.from(dailyCountsMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return NextResponse.json({
    ok: true,
    activeCount: activeQ.count ?? 0,
    activeSessions: (activeQ.data ?? []).map((r: { id: string; last_seen: string; page_path: string | null }) => ({
      id: r.id,
      lastSeen: r.last_seen,
      pagePath: r.page_path,
    })),
    todayCount: todayQ.count ?? 0,
    totalCount: totalQ.count ?? 0,
    last7Days,
  });
}
