// lib/trade/barterEngine.ts

export interface BarterNode {
    name: string;
    type: 'barter' | 'trade' | 'hybrid';
    status?: '▲' | '—' | '▼';
    bestCities?: string[];
    children?: BarterNode[];
}

/**
 * 기후별 월 오프셋 계산 (fallback용)
 * - 건기/우기, 건기2/우기2: +1 오프셋
 */
function getEffectiveMonth(baseMonth: number, climate: string): number {
    const offsetClimates = ['건기/우기', '건기2/우기2'];
    if (offsetClimates.includes(climate)) {
        return (baseMonth % 12) + 1;
    }
    return baseMonth;
}

/**
 * 항구+아이템의 해당 월 시즌 상태를 조회합니다.
 * 1. portSeason (구글시트 직접 데이터)에서 먼저 조회
 * 2. 없으면 기존 category×climate 방식으로 fallback
 */
function getCitySeasonStatus(
    city: string,
    itemName: string,
    month: number,
    allData: any
): string {
    const { cityClimate, schedule, portSeason } = allData;

    // 1차: portSeason에서 직접 조회 (항구:아이템 키)
    const portKey = `${city}:${itemName}`;
    if (portSeason?.[portKey]) {
        return portSeason[portKey][`${month}월`] || '평';
    }

    // 2차: 기존 category×climate fallback
    const meta = allData.itemMeta[itemName];
    if (!meta) return '평';

    const climate = cityClimate[city];
    if (!climate) return '평';

    const groups = ['공업품', '공예품', '무기류', '미술품', '총포류'];
    const scheduleKey = groups.includes(meta.category) ? '공업품/공예품/무기류/미술품/총포류' : meta.category;

    const effectiveMonth = getEffectiveMonth(month, climate);
    return schedule[scheduleKey]?.[climate]?.[`${effectiveMonth}월`] || '평';
}

export function buildBarterTree(itemName: string, month: number, allData: any): BarterNode {
    const { recipes, itemMeta } = allData;

    // 1. 기본 노드 정보 설정
    const meta = itemMeta[itemName];
    let tradeStatus: '▲' | '—' | '▼' = '—';
    let tradeCities: string[] = [];

    if (meta) {
        const statusGroups: Record<string, string[]> = { '성': [], '평': [], '비': [] };

        meta.cities.forEach((city: string) => {
            const cityStatus = getCitySeasonStatus(city, itemName, month, allData);
            statusGroups[cityStatus].push(city);
        });

        // 💡 우선순위: 성수기(▲) > 평수기(—) > 비수기(▼)
        if (statusGroups['성'].length > 0) {
            tradeStatus = '▲';
            tradeCities = statusGroups['성'];
        } else if (statusGroups['평'].length > 0) {
            tradeStatus = '—';
            tradeCities = statusGroups['평'];
        } else if (statusGroups['비'].length > 0) {
            tradeStatus = '▼';
            tradeCities = statusGroups['비'];
        }
    }

    // 3. 조합 및 하이브리드 여부 판단
    const recipe = recipes[itemName];
    const isHybrid = meta && recipe;

    const node: BarterNode = {
        name: itemName,
        type: isHybrid ? 'hybrid' : (recipe ? 'barter' : 'trade'),
        status: tradeStatus,
        bestCities: tradeCities,
        children: recipe ? recipe.map((child: string) => buildBarterTree(child, month, allData)) : undefined
    };

    return node;
}