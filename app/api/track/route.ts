import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * 개인을 직접 식별하지 않는 방문자 세션 핑.
 * Body: { sessionId: string, pagePath?: string }
 * - 세션이 처음이면 INSERT, 기존이면 last_seen + page_path 업데이트.
 * - 응답은 가볍게 {ok}.
 */
export async function POST(req: Request) {
  let sessionId = '';
  let pagePath: string | undefined;
  try {
    const body = await req.json();
    sessionId = typeof body?.sessionId === 'string' ? body.sessionId : '';
    pagePath = typeof body?.pagePath === 'string' ? body.pagePath.slice(0, 200) : undefined;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (!sessionId) return NextResponse.json({ ok: false }, { status: 400 });

  const now = new Date().toISOString();
  // first_seen 은 컬럼 DEFAULT now() 로 INSERT 시 자동 채움 → 페이로드에 포함하지 않음.
  // 충돌 시 페이로드의 컬럼만 SET 되므로 first_seen 은 보존됨.
  const { error } = await supabaseAdmin
    .from('visitor_sessions')
    .upsert(
      { id: sessionId, last_seen: now, page_path: pagePath ?? null },
      { onConflict: 'id', ignoreDuplicates: false },
    );
  if (error) {
    // 테이블 미생성 등 — 콘솔 노이즈 줄이기 위해 warn
    console.warn('visitor track upsert failed:', error.message);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  // 장기 미방문 세션은 운영 통계 품질과 데이터 최소화를 위해 best-effort로 정리한다.
  const retentionCutoff = new Date(Date.now() - 366 * 24 * 60 * 60 * 1000).toISOString();
  const { error: cleanupError } = await supabaseAdmin.from('visitor_sessions').delete().lt('last_seen', retentionCutoff);
  if (cleanupError) {
    console.warn('visitor retention cleanup failed:', cleanupError.message);
  }

  return NextResponse.json({ ok: true });
}
