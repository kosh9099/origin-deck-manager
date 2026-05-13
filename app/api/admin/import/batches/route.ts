import { NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/admin/auth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from('import_batches')
    .select('id, kind, status, row_count, valid_count, result, created_at')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json({ ok: false, error: 'db_error', detail: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, batches: data ?? [] });
}
