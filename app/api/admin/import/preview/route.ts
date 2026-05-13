import { NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/admin/auth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { parseImportText, type ImportKind, type ImportRecord } from '@/lib/admin/importTool';

const TABLE_BY_KIND: Record<ImportKind, string> = {
  sailors: 'sailor_master',
  season_prices: 'season_prices',
};

type PreviewRequest = {
  kind?: ImportKind;
  text?: string;
};

function isImportKind(value: unknown): value is ImportKind {
  return value === 'sailors' || value === 'season_prices';
}

function isSameRecord(existing: Record<string, unknown>, next: ImportRecord): boolean {
  if (next.import_key !== existing.import_key) return false;
  if ('name' in next) {
    return (
      existing.name === next.name &&
      existing.grade === next.grade &&
      existing.sailor_type === next.sailor_type &&
      existing.job === next.job
    );
  }
  return (
    existing.city === next.city &&
    existing.item_name === next.item_name &&
    existing.category === next.category &&
    existing.pandemic === next.pandemic &&
    existing.base_price === next.base_price &&
    existing.pandemic_low === next.pandemic_low &&
    existing.pandemic_high === next.pandemic_high &&
    existing.boost_low === next.boost_low &&
    existing.boost_high === next.boost_high
  );
}

async function loadExisting(kind: ImportKind, keys: string[]) {
  if (keys.length === 0) return new Map<string, Record<string, unknown>>();
  const { data, error } = await supabaseAdmin
    .from(TABLE_BY_KIND[kind])
    .select('*')
    .in('import_key', keys);

  if (error) throw error;
  return new Map((data ?? []).map(row => [String(row.import_key), row as Record<string, unknown>]));
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as PreviewRequest | null;
  if (!body || !isImportKind(body.kind) || typeof body.text !== 'string') {
    return NextResponse.json({ ok: false, error: 'invalid_request' }, { status: 400 });
  }

  const parsed = parseImportText(body.kind, body.text);
  const keys = parsed.records.map(record => record.import_key);

  let existing = new Map<string, Record<string, unknown>>();
  let warning: string | null = null;
  try {
    existing = await loadExisting(body.kind, keys);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown';
    warning = `Supabase 기존 데이터 조회를 건너뛰었습니다: ${message}`;
  }

  let added = 0;
  let updated = 0;
  let unchanged = 0;
  for (const record of parsed.records) {
    const current = existing.get(record.import_key);
    if (!current) added += 1;
    else if (isSameRecord(current, record)) unchanged += 1;
    else updated += 1;
  }

  return NextResponse.json({
    ok: true,
    kind: body.kind,
    rowCount: parsed.rows.length,
    validCount: parsed.records.length,
    errorCount: parsed.errors.length,
    headers: parsed.headers,
    unusedHeaders: parsed.unusedHeaders,
    summary: { added, updated, unchanged, errors: parsed.errors.length },
    warning,
    errors: parsed.errors.slice(0, 8),
    sample: parsed.records.slice(0, 5),
  });
}
