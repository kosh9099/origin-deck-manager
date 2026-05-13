import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { APPLIED_PANDEMIC_ITEMS, REGION_PORTS } from '@/lib/trade/cities';
import { normalizeZoneName } from '@/lib/trade/sheetSync';
import { getBoostRecommendations, getEpidemicRecommendations } from '@/lib/trade/seasonPrices';

type SeasonPriceRow = {
  city: string;
  item_name: string;
  category: string | null;
  pandemic_low: number | null;
  pandemic_high: number | null;
  boost_low: number | null;
  boost_high: number | null;
};

function topBoost(rows: SeasonPriceRow[]) {
  return rows
    .filter(row => row.boost_high != null)
    .sort((a, b) => Number(b.boost_high) - Number(a.boost_high))
    .slice(0, 3)
    .map(row => ({
      name: row.item_name,
      high: Number(row.boost_high),
      low: Number(row.boost_low ?? 0),
    }));
}

function topEpidemic(rows: SeasonPriceRow[]) {
  const byItem = new Map<string, { name: string; high: number; low: number; highCity?: string; lowCity?: string }>();

  for (const row of rows) {
    if (row.pandemic_high == null) continue;
    const current = byItem.get(row.item_name) ?? {
      name: row.item_name,
      high: -Infinity,
      low: Infinity,
      highCity: undefined,
      lowCity: undefined,
    };

    if (Number(row.pandemic_high) > current.high) {
      current.high = Number(row.pandemic_high);
      current.highCity = row.city;
    }
    if (row.pandemic_low != null && Number(row.pandemic_low) < current.low) {
      current.low = Number(row.pandemic_low);
      current.lowCity = row.city;
    }
    byItem.set(row.item_name, current);
  }

  return Array.from(byItem.values())
    .filter(row => Number.isFinite(row.high))
    .map(row => ({ ...row, low: Number.isFinite(row.low) ? row.low : 0 }))
    .sort((a, b) => b.high - a.high)
    .slice(0, 5);
}

async function fromSupabase(cityOrZone: string, type: string, mode: string) {
  if (mode === 'epidemic') {
    const categories = APPLIED_PANDEMIC_ITEMS[type] ?? [];
    const zone = normalizeZoneName(cityOrZone);
    const cities = REGION_PORTS[zone] ?? REGION_PORTS[cityOrZone] ?? [];
    if (categories.length === 0 || cities.length === 0) return [];

    const { data, error } = await supabaseAdmin
      .from('season_prices')
      .select('city, item_name, category, pandemic_low, pandemic_high, boost_low, boost_high')
      .in('city', cities)
      .in('category', categories);
    if (error) throw error;
    return topEpidemic((data ?? []) as SeasonPriceRow[]);
  }

  const categoryQuery = supabaseAdmin
    .from('season_prices')
    .select('city, item_name, category, pandemic_low, pandemic_high, boost_low, boost_high')
    .eq('city', cityOrZone)
    .eq('category', type);

  const categoryResult = await categoryQuery;
  if (categoryResult.error) throw categoryResult.error;
  if ((categoryResult.data ?? []).length > 0) return topBoost(categoryResult.data as SeasonPriceRow[]);

  const itemResult = await supabaseAdmin
    .from('season_prices')
    .select('city, item_name, category, pandemic_low, pandemic_high, boost_low, boost_high')
    .eq('city', cityOrZone)
    .eq('item_name', type)
    .limit(1);
  if (itemResult.error) throw itemResult.error;
  return topBoost(itemResult.data as SeasonPriceRow[]);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const city = (searchParams.get('city') ?? searchParams.get('zone') ?? '').trim();
  const type = (searchParams.get('type') ?? '').trim();
  const mode = (searchParams.get('mode') ?? 'boost').trim();

  if (!city || !type) {
    return NextResponse.json({ ok: false, error: 'missing_params' }, { status: 400 });
  }

  try {
    const recs = await fromSupabase(city, type, mode);
    if (recs.length > 0) return NextResponse.json({ ok: true, source: 'supabase', recommendations: recs });
  } catch {
    // Fall back to the bundled JSON while the new tables are being created or backfilled.
  }

  const fallback = mode === 'epidemic'
    ? getEpidemicRecommendations(city, type)
    : getBoostRecommendations(city, type);
  return NextResponse.json({ ok: true, source: 'bundled-json', recommendations: fallback });
}
