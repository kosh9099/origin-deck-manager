import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * 익명 방문자 세션 핑.
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
  return NextResponse.json({ ok: true });
}
