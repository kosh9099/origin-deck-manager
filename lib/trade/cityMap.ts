import townCoordsRaw from '@/constants/townCoords.json';
import townLabelsRaw from '@/constants/townLabels.json';
import { REGION_PORTS } from '@/lib/trade/cities';

export type CityMapEntry = {
  city: string;       // 한글 도시명 (REGION_PORTS 의 표준 이름)
  townId: string;     // 게임 데이터 코드 (townXXXX)
  x: number;          // 지도 원본 픽셀 X (0~9972)
  y: number;          // 지도 원본 픽셀 Y (0~5886)
  s: number;          // 도시 등급 (1/2/3, 클수록 큰 항구)
  region: string;     // 해역 풀네임
};

type RawCoord = { id: string; x: number; y: number; s: number };
const coords = (townCoordsRaw as { towns: RawCoord[] }).towns;
const labels = townLabelsRaw as Record<string, string>;

// 도시 → 해역 리버스 맵
const CITY_TO_REGION: Record<string, string> = (() => {
  const m: Record<string, string> = {};
  for (const [region, cities] of Object.entries(REGION_PORTS)) {
    for (const c of cities) m[c] = region;
  }
  return m;
})();

/**
 * 한글명으로 조회되는 통합 도시 맵.
 * 라벨링 결과 + 좌표 + 해역 정보를 한 번에 묶음.
 */
export const CITY_MAP: Map<string, CityMapEntry> = (() => {
  const m = new Map<string, CityMapEntry>();
  const idToCoord = new Map<string, RawCoord>();
  for (const c of coords) idToCoord.set(c.id, c);
  for (const [townId, name] of Object.entries(labels)) {
    const c = idToCoord.get(townId);
    if (!c) continue;
    const region = CITY_TO_REGION[name];
    if (!region) continue;
    m.set(name, { city: name, townId, x: c.x, y: c.y, s: c.s, region });
  }
  return m;
})();

/**
 * townId 로 조회. (town8301 → { city: '아테네', ... })
 */
export const TOWN_ID_TO_CITY: Map<string, CityMapEntry> = (() => {
  const m = new Map<string, CityMapEntry>();
  for (const e of CITY_MAP.values()) m.set(e.townId, e);
  return m;
})();

/**
 * 해역별 도시 그룹.
 */
export const REGION_TO_CITIES: Map<string, CityMapEntry[]> = (() => {
  const m = new Map<string, CityMapEntry[]>();
  for (const e of CITY_MAP.values()) {
    if (!m.has(e.region)) m.set(e.region, []);
    m.get(e.region)!.push(e);
  }
  return m;
})();

export const ALL_CITIES: CityMapEntry[] = Array.from(CITY_MAP.values());
