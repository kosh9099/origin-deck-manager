import { NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/admin/auth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * city_minute_samples 의 특정 row 를 삭제.
 * 잘못된 분 샘플을 발견했을 때 관리자가 수동으로 정리.
 */
export async function POST(req: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  let id = '';
  try {
    const body = await req.json();
    id = typeof body?.id === 'string' ? body.id : '';
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (!id) {
    return NextResponse.json({ ok: false, error: 'missing_id' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('city_minute_samples')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ ok: false, error: 'db_error', detail: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
