// lib/trade/sheetSync.ts

export const ZONE_SHEET_GID = '1178990173'; // 해역별 추천 품목
export const CITY_SHEET_GID = '647153257';  // 도시별 추천 품목

// 룩업 맵: "키" → 추천품목[]
// 해역별: "극동아시아|전염병" → ["구슬 인형"]
// 도시별: "더블린|식료품" → ["사고", "카마스"]
export interface SheetItemMap {
    [key: string]: string[];
}

// ── 해역명 정규화: epidemic.ts 줄임말 → CSV 전체 이름 ────────────
const ZONE_CODE_TO_FULL: Record<string, string> = {
    '북해': '북해',
    '동지중해': '동지중해',
    '서지중해': '서지중해 대서양',
    '서아프': '아프리카 서부',
    '남아프': '아프리카 남부',
    '동아프': '아프리카 동부',
    '아라비아': '아라비아 서인도',
    '동인도': '동인도 인도차이나',
    '남아시아': '남아시아',
    '동아시아': '동아시아',
    '극동아': '극동아시아',
    '오세아': '오세아니아',
    '오세동': '오세아니아 동부',
    '북극': '북극해',
    '남미': '남아메리카',
    '카리브': '아메리카 동부',
    '북미서': '북아메리카 서부',
    '태평양': '태평양',
};

export function normalizeZoneName(code: string): string {
    return ZONE_CODE_TO_FULL[code] || code;
}

// ── CSV 한 줄 파싱 (따옴표 처리) ────────────────────────────────
function parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') { inQuotes = !inQuotes; }
        else if (char === ',' && !inQuotes) {
            result.push(current.replace(/^"|"$/g, '').trim());
            current = '';
        } else { current += char; }
    }
    result.push(current.replace(/^"|"$/g, '').trim());
    return result;
}

// ── 해역별 CSV 파싱 ──────────────────────────────────────────────
// 구조: 해역, 대유행종류, 추천교역품1, 추천교역품2, 추천교역품3, 추천교역품4
// 키:   "극동아시아|전염병" → ["구슬 인형"]
export function parseZoneCsv(csvText: string): SheetItemMap {
    const result: SheetItemMap = {};
    const lines = csvText.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) return result;

    for (let i = 1; i < lines.length; i++) { // 헤더 스킵
        const cols = parseCSVLine(lines[i]);
        if (cols.length < 3) continue;

        const zone = cols[0].trim(); // 해역명 (전체 이름)
        const epidType = cols[1].trim(); // 대유행 종류
        if (!zone || !epidType) continue;

        const items = cols.slice(2).map(c => c.trim()).filter(Boolean);
        if (items.length === 0) continue;

        const key = `${zone}|${epidType}`;
        result[key] = items;
    }

    return result;
}

// ── 도시별 CSV 파싱 ──────────────────────────────────────────────
// 구조: 해역, 항구명, 부양1, 추천품목1순위, 추천품목2순위, 추천품목3순위,
//                    부양2, 추천품목1순위, 추천품목2순위, 급매1
// 키:   "더블린|식료품" → ["사고", "카마스"]
export function parseCityCsv(csvText: string): SheetItemMap {
    const result: SheetItemMap = {};
    const lines = csvText.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) return result;

    for (let i = 1; i < lines.length; i++) { // 헤더 스킵
        const cols = parseCSVLine(lines[i]);
        if (cols.length < 3) continue;

        const city = cols[1].trim(); // 항구명
        if (!city) continue;

        // 부양1 (C열=index2 카테고리, D~F열=index3~5 품목)
        const boost1Cat = cols[2]?.trim();
        if (boost1Cat) {
            const items = [cols[3], cols[4], cols[5]]
                .map(c => c?.trim() || '')
                .filter(Boolean);
            if (items.length > 0) {
                result[`${city}|${boost1Cat}`] = items;
            }
        }

        // 부양2 (G열=index6 카테고리, H~I열=index7~8 품목)
        const boost2Cat = cols[6]?.trim();
        if (boost2Cat) {
            const items = [cols[7], cols[8]]
                .map(c => c?.trim() || '')
                .filter(Boolean);
            if (items.length > 0) {
                result[`${city}|${boost2Cat}`] = items;
            }
        }

        // 급매1 (J열=index9 카테고리 - 품목 열이 없으면 카테고리 자체를 품목으로)
        const flash1Cat = cols[9]?.trim();
        if (flash1Cat) {
            result[`${city}|급매`] = result[`${city}|급매`]
                ? [...result[`${city}|급매`], flash1Cat]
                : [flash1Cat];
        }
    }

    return result;
}

// ── API 라우트를 통해 시트 fetch ─────────────────────────────────
export async function fetchZoneSheet(): Promise<SheetItemMap> {
    const res = await fetch(`/api/sheet?gid=${ZONE_SHEET_GID}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Zone sheet fetch failed: ${res.status}`);
    const text = await res.text();
    const map = parseZoneCsv(text);
    console.log('✅ 해역별 시트 로딩:', Object.keys(map).length, '개 조합');
    return map;
}

export async function fetchCitySheet(): Promise<SheetItemMap> {
    const res = await fetch(`/api/sheet?gid=${CITY_SHEET_GID}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`City sheet fetch failed: ${res.status}`);
    const text = await res.text();
    const map = parseCityCsv(text);
    console.log('✅ 도시별 시트 로딩:', Object.keys(map).length, '개 조합');
    return map;
}