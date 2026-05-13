import { NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/admin/auth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { parseImportText, type ImportKind, type ImportRecord, type SeasonPriceImportRecord } from '@/lib/admin/importTool';

const TABLE_BY_KIND: Record<ImportKind, string> = {
  sailors: 'sailor_master',
  season_prices: 'season_prices',
};

type ApplyRequest = {
  kind?: ImportKind;
  text?: string;
};

function isImportKind(value: unknown): value is ImportKind {
  return value === 'sailors' || value === 'season_prices';
}

function chunks<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) result.push(items.slice(i, i + size));
  return result;
}

function isSeasonPrice(record: ImportRecord): record is SeasonPriceImportRecord {
  return 'item_name' in record;
}

async function upsertRecords(kind: ImportKind, records: ImportRecord[]) {
  let affected = 0;
  for (const batch of chunks(records, 400)) {
    const { error } = await supabaseAdmin
      .from(TABLE_BY_KIND[kind])
      .upsert(batch, { onConflict: 'import_key' });
    if (error) throw error;
    affected += batch.length;
  }
  return affected;
}

async function upsertSeasonItems(records: ImportRecord[]) {
  const items = new Map<string, { item_name: string; category: string | null; pandemic: string | null; payload: Record<string, unknown> }>();
  for (const record of records) {
    if (!isSeasonPrice(record)) continue;
    items.set(record.item_name, {
      item_name: record.item_name,
      category: record.category,
      pandemic: record.pandemic,
      payload: record.payload,
    });
  }

  for (const batch of chunks(Array.from(items.values()), 400)) {
    const { error } = await supabaseAdmin
      .from('season_items')
      .upsert(batch, { onConflict: 'item_name' });
    if (error) throw error;
  }
}

async function writeImportBatch(
  kind: ImportKind,
  status: 'success' | 'failed',
  headers: string[],
  rowCount: number,
  validCount: number,
  result: Record<string, unknown>,
) {
  await supabaseAdmin.from('import_batches').insert({
    kind,
    status,
    headers,
    row_count: rowCount,
    valid_count: validCount,
    result,
  });
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as ApplyRequest | null;
  if (!body || !isImportKind(body.kind) || typeof body.text !== 'string') {
    return NextResponse.json({ ok: false, error: 'invalid_request' }, { status: 400 });
  }

  const parsed = parseImportText(body.kind, body.text);
  if (parsed.errors.length > 0) {
    await writeImportBatch(body.kind, 'failed', parsed.headers, parsed.rows.length, parsed.records.length, {
      errors: parsed.errors,
    }).catch(() => undefined);
    return NextResponse.json(
      { ok: false, error: 'validation_failed', errors: parsed.errors, rowCount: parsed.rows.length },
      { status: 400 }
    );
  }

  try {
    if (body.kind === 'season_prices') await upsertSeasonItems(parsed.records);
    const affected = await upsertRecords(body.kind, parsed.records);
    const result = { affected, mode: 'merge', missingRows: 'kept' };
    await writeImportBatch(body.kind, 'success', parsed.headers, parsed.rows.length, parsed.records.length, result);

    return NextResponse.json({
      ok: true,
      kind: body.kind,
      rowCount: parsed.rows.length,
      affected,
      result,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'unknown';
    await writeImportBatch(body.kind, 'failed', parsed.headers, parsed.rows.length, parsed.records.length, {
      error: detail,
    }).catch(() => undefined);
    return NextResponse.json({ ok: false, error: 'db_error', detail }, { status: 500 });
  }
}
