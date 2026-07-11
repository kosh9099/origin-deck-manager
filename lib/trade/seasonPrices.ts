import rawData from '@/constants/seasonPrices.json';
import type { SeasonRecommendation } from '@/types/trade';
import { REGION_PORTS, APPLIED_PANDEMIC_ITEMS } from '@/lib/trade/cities';
import { normalizeZoneName } from '@/lib/trade/sheetSync';

type ItemMeta = {
  name: string;
  category: string;
  pandemic: string | null;
};

type PriceMode = 'pandemicLow' | 'pandemicHigh' | 'boostLow' | 'boostHigh';

type CategoryMultiplier = Record<PriceMode, number>;

type SeasonData = {
  version: number;
  priceModes: string[];
  categoryMultipliers: Record<string, CategoryMultiplier>;
  items: ItemMeta[];
  cities: string[];
  basePrices: Record<string, Record<string, number>>;
};

const data = rawData as SeasonData;

const TOP_N_BOOST = 3;     // 부양: 최상위 3개 (급매는 itemsByName 경로에서 1개 직접 반환)
const TOP_N_EPIDEMIC = 5;  // 대유행: 최상위 5개 (편차 컷 없이 그대로 노출)

// 추천에서 제외할 품목 (단가표 추천 로직에서 자동 제외)
const EXCLUDED_ITEMS = new Set<string>(['거울', '오크통', '개량된 청어 운반통', '대형철판', '백금']);

// 프리시즌 한정 품목: KST 2026-05-12 23:59:59 이후 제외
const PRESEASON_DEADLINE_UTC = new Date('2026-05-12T14:59:59Z').getTime();
const PRESEASON_ITEMS = new Set<string>(['금괴', '은괴', '목탄']);
const isPreseasonExpired = Date.now() > PRESEASON_DEADLINE_UTC;

// 이벤트 한정 일반 물교: KST 2026-08-09 23:59:59 이후 제외 (이후 자동 삭제)
const EVENT_DEADLINE_UTC = new Date('2026-08-09T14:59:59Z').getTime();
const EVENT_ITEMS = new Set<string>(['북해의 얼음']);
const isEventExpired = Date.now() > EVENT_DEADLINE_UTC;

// 특수 물교 품목 (랜덤 출현 — 특수 등록되지 않으면 비활성 표시)
export const SPECIAL_BARTER_ITEMS = new Set<string>([
  '독수리 깃털',
  '홍삼',
  '쿨릭',
  '리하쿠루',
  '수정 세공',
  '에뮤',
  '일렉트럼',
  '패각 세공품',
  '유목',
  '팔레파이',
  '코아우아우',
  '아이더 깃털',
  '수마',
]);

// 카테고리/이름 룩업 인덱스 (제외 품목은 후보에 포함하지 않음)
const itemsByCategory = new Map<string, ItemMeta[]>();
const itemsByName = new Map<string, ItemMeta>();
for (const item of data.items) {
  if (EXCLUDED_ITEMS.has(item.name)) continue;
  if (isPreseasonExpired && PRESEASON_ITEMS.has(item.name)) continue;
  if (isEventExpired && EVENT_ITEMS.has(item.name)) continue;
  const list = itemsByCategory.get(item.category) ?? [];
  list.push(item);
  itemsByCategory.set(item.category, list);
  itemsByName.set(item.name, item);
}

function priceAt(city: string, itemName: string, mode: PriceMode): number | null {
  const base = data.basePrices[city]?.[itemName];
  if (base == null) return null;
  const item = itemsByName.get(itemName);
  if (!item) return null;
  const mul = data.categoryMultipliers[item.category]?.[mode];
  if (mul == null) return null;
  return Math.round(base * mul);
}

/** 도시·품목의 부양↑/대유행↑ 최고가를 함께 반환. 데이터 없으면 null. */
export function getMaxPrices(city: string, itemName: string): { pandemicHigh: number; boostHigh: number } | null {
  const ph = priceAt(city, itemName, 'pandemicHigh');
  const bh = priceAt(city, itemName, 'boostHigh');
  if (ph == null || bh == null) return null;
  return { pandemicHigh: ph, boostHigh: bh };
}

function buildRec(city: string, itemName: string, lowMode: PriceMode, highMode: PriceMode): SeasonRecommendation | null {
  const high = priceAt(city, itemName, highMode);
  if (high == null) return null;
  const low = priceAt(city, itemName, lowMode);
  return { name: itemName, high, low: low ?? 0 };
}

function topN(
  recs: SeasonRecommendation[],
  n: number,
  strict = false,
  skipDeviationCut = false,
): SeasonRecommendation[] {
  const sorted = [...recs].sort((a, b) => b.high - a.high);
  const nonSpecials = sorted.filter(r =>
    !SPECIAL_BARTER_ITEMS.has(r.name) && (!strict || r.high >= 200000)
  );
  const candidates = nonSpecials.slice(0, n);
  let kept: SeasonRecommendation[];
  if (skipDeviationCut) {
    // 편차 컷 비활성화 — 후보 N개를 그대로 채택.
    kept = candidates;
  } else {
    kept = [];
    for (let i = 0; i < candidates.length; i++) {
      if (i > 0 && kept[0].high > 0) {
        const dropRate = 1 - candidates[i].high / kept[0].high;
        if (dropRate >= 0.3) break;
      }
      kept.push(candidates[i]);
    }
  }
  // 특수 품목: 유지된 비-특수 최저가 이상이면 함께 노출 (가격순으로 자연스럽게 끼움)
  const minKept = kept.length > 0 ? kept[kept.length - 1].high : 0;
  const specials = sorted.filter(
    r => SPECIAL_BARTER_ITEMS.has(r.name) && r.high >= minKept
  );
  return [...kept, ...specials].sort((a, b) => b.high - a.high);
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
  if (!data.basePrices[city]) return [];

  // 1. 카테고리 매칭
  const byCategory = itemsByCategory.get(type);
  if (byCategory && byCategory.length > 0) {
    const recs: SeasonRecommendation[] = [];
    for (const item of byCategory) {
      const rec = buildRec(city, item.name, 'boostLow', 'boostHigh');
      if (rec) recs.push(rec);
    }
    return topN(recs, TOP_N_BOOST);
  }

  // 2. 특정 품목명 매칭 (급매: type이 품목명 그 자체) → 그 품목 자체를 반환
  if (itemsByName.has(type)) {
    const rec = buildRec(city, type, 'boostLow', 'boostHigh');
    return rec ? [rec] : [];
  }

  return [];
}

/**
 * 대유행: 해역(짧은 이름 OR 풀네임) + 대유행 종류 → 대유행↑이 가장 비싼 품목 최대 3개.
 * 매칭 카테고리: APPLIED_PANDEMIC_ITEMS[type] (예: 전쟁 → 가축/무기류/총포류)
 * 가격: 해역 내 전체 도시에서 대유행↑ 최대값 / 대유행↓ 최소값
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

  // 각 후보 → 해역 내 전체 도시에서 대유행↑ 최대값, 대유행↓ 최소값
  const recs: SeasonRecommendation[] = [];
  for (const item of candidates) {
    let bestHigh = -Infinity;
    let bestLow = Infinity;
    let highCity: string | undefined;
    let lowCity: string | undefined;
    for (const city of zoneCities) {
      const high = priceAt(city, item.name, 'pandemicHigh');
      const low = priceAt(city, item.name, 'pandemicLow');
      if (high != null && high > bestHigh) { bestHigh = high; highCity = city; }
      if (low != null && low < bestLow) { bestLow = low; lowCity = city; }
    }
    if (bestHigh > -Infinity) {
      recs.push({
        name: item.name,
        high: bestHigh,
        low: bestLow === Infinity ? 0 : bestLow,
        highCity,
        lowCity: bestLow === Infinity ? undefined : lowCity,
      });
    }
  }

  return topN(recs, TOP_N_EPIDEMIC, true, true);
}
