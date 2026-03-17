// lib/trade/barterEngine.ts

export interface BarterNode {
    name: string;
    type: 'barter' | 'trade' | 'hybrid';
    status?: '▲' | '—' | '▼';
    bestCities?: string[];
    children?: BarterNode[];
}

export function buildBarterTree(itemName: string, month: number, allData: any): BarterNode {
    const { recipes, itemMeta, cityClimate, schedule } = allData;

    // 1. 기본 노드 정보 설정
    const meta = itemMeta[itemName];
    let tradeStatus: '▲' | '—' | '▼' = '—';
    let tradeCities: string[] = [];

    if (meta) {
        const groups = ['공업품', '공예품', '무기류', '미술품', '총포류'];
        const scheduleKey = groups.includes(meta.category) ? '공업품/공예품/무기류/미술품/총포류' : meta.category;

        const statusGroups: Record<string, string[]> = { '성': [], '평': [], '비': [] };

        meta.cities.forEach((city: string) => {
            const climate = cityClimate[city];
            const cityStatus = schedule[scheduleKey]?.[climate]?.[`${month}월`] || '평';
            statusGroups[cityStatus].push(city);
        });

        // 💡 2. 우선순위 수정: 성수기(▲)를 가장 먼저 체크합니다!
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