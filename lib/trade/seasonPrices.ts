import rawData from '@/constants/seasonPrices.json';
import type { SeasonRecommendation } from '@/types/trade';
import { REGION_PORTS, APPLIED_PANDEMIC_ITEMS } from '@/lib/trade/cities';
import { normalizeZoneName } from '@/lib/trade/sheetSync';

type ItemMeta = {
  name: string;
  category: string;
  pandemic: string | null;
};

type SeasonData = {
  priceKeys: string[]; // ["기본가", "대유행↓", "대유행↑", "부양↓", "부양↑"]
  items: ItemMeta[];
  cities: string[];
  prices: Record<string, Record<string, (number | null)[]>>;
};

const data = rawData as SeasonData;

// priceKeys 인덱스
const IDX_PANDEMIC_LOW = 1;  // 대유행↓
const IDX_PANDEMIC_HIGH = 2; // 대유행↑
const IDX_BOOST_LOW = 3;     // 부양↓
const IDX_BOOST_HIGH = 4;    // 부양↑

const TOP_N_BOOST = 2;     // 부양: 최상위 2개 (급매는 itemsByName 경로에서 1개 직접 반환)
const TOP_N_EPIDEMIC = 2;  // 대유행: 최상위 2개

// 추천에서 제외할 품목 (단가표 추천 로직에서 자동 제외)
const EXCLUDED_ITEMS = new Set<string>(['거울', '오크통', '개량된 청어 운반통', '대형철판']);

// 카테고리/이름 룩업 인덱스 (제외 품목은 후보에 포함하지 않음)
const itemsByCategory = new Map<string, ItemMeta[]>();
const itemsByName = new Map<string, ItemMeta>();
for (const item of data.items) {
  if (EXCLUDED_ITEMS.has(item.name)) continue;
  const list = itemsByCategory.get(item.category) ?? [];
  list.push(item);
  itemsByCategory.set(item.category, list);
  itemsByName.set(item.name, item);
}

function pricesAt(city: string, itemName: string): (number | null)[] | null {
  return data.prices[city]?.[itemName] ?? null;
}

function buildRec(city: string, itemName: string, lowIdx: number, highIdx: number): SeasonRecommendation | null {
  const p = pricesAt(city, itemName);
  if (!p) return null;
  const high = p[highIdx];
  if (high == null) return null;
  return { name: itemName, high, low: p[lowIdx] ?? 0 };
}

function topN(recs: SeasonRecommendation[], n: number): SeasonRecommendation[] {
  const sorted = recs.sort((a, b) => b.high - a.high).slice(0, n);
  if (sorted.length >= 2 && sorted[0].high > 0) {
    const ratio = sorted[1].high / sorted[0].high;
    if (ratio < 0.8) return [sorted[0]];
  }
  return sorted;
}

/**
 * 부양/급매: 도시 + type(카테고리 또는 품목명) → 부양↑이 가장 비싼 품목 최대 3개.
 *
 * type 해석:
 *   1. 카테고리 매칭 (예: '가축', '잡화')   → 카테고리 내 상위 N개
 *   2. 특정 품목명 매칭 (예: '패각 세공품', '흑요석')
 *      → 카테고리 내 상위 N개 (해당 품목의 카테고리)에서 그 품목이 1순위로 오도록
 *   3. 둘 다 미매칭 → []
 */
export function getBoostRecommendations(city: string, type: string): SeasonRecommendation[] {
  if (!data.prices[city]) return [];

  // 1. 카테고리 매칭
  const byCategory = itemsByCategory.get(type);
  if (byCategory && byCategory.length > 0) {
    const recs: SeasonRecommendation[] = [];
    for (const item of byCategory) {
      const rec = buildRec(city, item.name, IDX_BOOST_LOW, IDX_BOOST_HIGH);
      if (rec) recs.push(rec);
    }
    return topN(recs, TOP_N_BOOST);
  }

  // 2. 특정 품목명 매칭 (급매: type이 품목명 그 자체) → 그 품목 자체를 반환
  if (itemsByName.has(type)) {
    const rec = buildRec(city, type, IDX_BOOST_LOW, IDX_BOOST_HIGH);
    return rec ? [rec] : [];
  }

  return [];
}

/**
 * 대유행: 해역(짧은 이름 OR 풀네임) + 대유행 종류 → 대유행↑이 가장 비싼 품목 최대 3개.
 * 매칭 카테고리: APPLIED_PANDEMIC_ITEMS[type] (예: 전쟁 → 가축/무기류/총포류)
 * 가격: 해역 내 도시 중 대유행↑ 최대값 (가장 좋은 매도 도시 기준)
 */
export function getEpidemicRecommendations(zone: string, type: string): SeasonRecommendation[] {
  const cats = APPLIED_PANDEMIC_ITEMS[type];
  if (!cats || cats.length === 0) return [];

  const fullZone = normalizeZoneName(zone);
  const zoneCities = REGION_PORTS[fullZone] ?? REGION_PORTS[zone];
  if (!zoneCities || zoneCities.length === 0) return [];

  // 후보 품목: cats에 속하는 모든 item
  const candidates: ItemMeta[] = [];
  for (const cat of cats) {
    const list = itemsByCategory.get(cat);
    if (list) candidates.push(...list);
  }
  if (candidates.length === 0) return [];

  // 각 후보 → 해역 내 도시 중 대유행↑ 최대값
  const recs: SeasonRecommendation[] = [];
  for (const item of candidates) {
    let bestHigh = -Infinity;
    let bestLow = 0;
    for (const city of zoneCities) {
      const p = pricesAt(city, item.name);
      if (!p) continue;
      const high = p[IDX_PANDEMIC_HIGH];
      if (high == null) continue;
      if (high > bestHigh) {
        bestHigh = high;
        bestLow = p[IDX_PANDEMIC_LOW] ?? 0;
      }
    }
    if (bestHigh > -Infinity) {
      recs.push({ name: item.name, high: bestHigh, low: bestLow });
    }
  }

  return topN(recs, TOP_N_EPIDEMIC);
}
