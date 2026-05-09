import { getLatestCityMinutes } from '@/lib/supabaseClient';
import { REGION_PORTS } from '@/lib/trade/cities';
import { normalizeZoneName } from '@/lib/trade/sheetSync';
import type { TradeEvent } from '@/types/trade';

export type CityMinuteMaps = {
  cityMinutes: Map<string, number>;     // 도시명 → 시작 분(0~59)
  zoneMaxMinutes: Map<string, number>;  // 해역명 → 그 해역에서 수집된 도시들의 최대 시작 분
};

export const EMPTY_CITY_MINUTE_MAPS: CityMinuteMaps = {
  cityMinutes: new Map(),
  zoneMaxMinutes: new Map(),
};

const HOUR_MS = 3600 * 1000;
const MINUTE_MS = 60 * 1000;

/**
 * Supabase trade_boosts 에서 수집된 도시별 분 데이터를 불러와 두 가지 맵으로 가공.
 * - cityMinutes: 도시 → 분
 * - zoneMaxMinutes: 해역 → 해당 해역 내 (수집된) 도시들의 max 분
 *
 * 데이터 미수집 도시/해역은 맵에 없음 → 호출자는 fallback (0분, 즉 1시간 정확) 처리.
 */
export async function loadCityMinuteMaps(): Promise<CityMinuteMaps> {
  const entries = await getLatestCityMinutes();
  const cityMinutes = new Map<string, number>();
  for (const e of entries) cityMinutes.set(e.city, e.minute);

  const cityToZone = new Map<string, string>();
  for (const [zone, cities] of Object.entries(REGION_PORTS)) {
    for (const c of cities) cityToZone.set(c, zone);
  }

  const zoneMaxMinutes = new Map<string, number>();
  for (const [city, minute] of cityMinutes) {
    const zone = cityToZone.get(city);
    if (!zone) continue;
    const cur = zoneMaxMinutes.get(zone);
    if (cur === undefined || minute > cur) zoneMaxMinutes.set(zone, minute);
  }

  return { cityMinutes, zoneMaxMinutes };
}

/**
 * 이벤트 1건의 실제 유지 시간(ms) 반환.
 *  - 부양/급매 (단일 도시): 해당 도시의 분 만큼 1시간을 연장.
 *  - 대유행 (해역 단위): 해역 내 max 분 만큼 1시간을 연장.
 *  - 데이터 없으면 1시간 (기존 동작 유지).
 */
export function eventDurationMs(
  event: Pick<TradeEvent, 'isBoost' | 'city' | 'zone'>,
  maps: CityMinuteMaps
): number {
  let extraMin = 0;
  if (event.isBoost) {
    if (event.city) extraMin = maps.cityMinutes.get(event.city) ?? 0;
  } else if (event.zone) {
    // 이벤트의 zone 은 단축명("동인도")일 수 있고, REGION_PORTS 는 풀네임("동인도 인도차이나").
    const zoneKey = maps.zoneMaxMinutes.has(event.zone)
      ? event.zone
      : normalizeZoneName(event.zone);
    extraMin = maps.zoneMaxMinutes.get(zoneKey) ?? 0;
  }
  return HOUR_MS + extraMin * MINUTE_MS;
}
