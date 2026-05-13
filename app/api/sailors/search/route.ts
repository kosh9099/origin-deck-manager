import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') ?? '').trim();
  const grade = (searchParams.get('grade') ?? '').trim();
  const type = (searchParams.get('type') ?? '').trim();
  const limit = Math.min(Number(searchParams.get('limit') ?? 50) || 50, 100);

  let query = supabaseAdmin
    .from('sailor_master')
    .select('*')
    .order('name', { ascending: true })
    .limit(limit);

  if (q) {
    query = query.or(`name.ilike.%${q}%,job.ilike.%${q}%,sailor_type.ilike.%${q}%`);
  }
  if (grade) query = query.eq('grade', grade);
  if (type) query = query.eq('sailor_type', type);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ ok: false, error: 'db_error', detail: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    sailors: (data ?? []).map(row => ({
      importKey: row.import_key,
      personalId: row.personal_id,
      name: row.name,
      grade: row.grade,
      type: row.sailor_type,
      job: row.job,
      payload: row.payload,
      updatedAt: row.updated_at,
    })),
  });
}
