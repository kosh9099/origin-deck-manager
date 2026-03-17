export interface BarterNode {
    name: string;
    type: 'barter' | 'trade';
    status?: '▲' | '—' | '▼';
    bestCities?: string[];
    children?: BarterNode[];
}

export function buildBarterTree(itemName: string, month: number, allData: any): BarterNode {
    const { recipes, itemMeta, cityClimate, schedule } = allData;

    // 1. 물물교환 품목(조합템)인 경우
    if (recipes[itemName]) {
        return {
            name: itemName,
            type: 'barter',
            children: recipes[itemName].map((child: string) => buildBarterTree(child, month, allData))
        };
    }

    // 2. 일반 교역품인 경우
    const meta = itemMeta[itemName];
    if (!meta) return { name: itemName, type: 'trade', status: '—', bestCities: [] };

    const groups = ['공업품', '공예품', '무기류', '미술품', '총포류'];
    const scheduleKey = groups.includes(meta.category) ? '공업품/공예품/무기류/미술품/총포류' : meta.category;

    const statusGroups: Record<string, string[]> = { '성': [], '평': [], '비': [] };

    meta.cities.forEach((city: string) => {
        const climate = cityClimate[city];
        const cityStatus = schedule[scheduleKey]?.[climate]?.[`${month}월`] || '평';
        statusGroups[cityStatus].push(city);
    });

    // 성수기 > 평수기 > 비수기 순으로 도시 필터링
    let status: '▲' | '—' | '▼' = '—';
    let cities: string[] = [];

    if (statusGroups['성'].length > 0) { status = '▲'; cities = statusGroups['성']; }
    else if (statusGroups['평'].length > 0) { status = '—'; cities = statusGroups['평']; }
    else { status = '▼'; cities = statusGroups['비']; }

    return { name: itemName, type: 'trade', status, bestCities: cities };
}