import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';

// 서버 사이드에서만 실행 — 알고리즘이 클라이언트 번들에 포함되지 않음

function loadCsvFile(filename: string): any[] {
    const filePath = path.join(process.cwd(), 'public', 'data', filename);
    const csvText = fs.readFileSync(filePath, 'utf-8').replace(/^\uFEFF/, '');
    const result = Papa.parse(csvText, { header: true, skipEmptyLines: true });
    return result.data;
}

let cachedData: any = null;

function getAllData() {
    if (cachedData) return cachedData;

    const rawBarter = loadCsvFile('barter_materials.csv');
    const rawItemInfo = loadCsvFile('item_info.csv');
    const rawCityClimate = loadCsvFile('city_climate.csv');
    const rawSchedule = loadCsvFile('season_schedule.csv');
    const rawPortSeason = loadCsvFile('port_season.csv');

    const recipes: Record<string, string[]> = {};
    rawBarter.forEach((row: any) => {
        const key = row['물교품']?.trim();
        if (!key) return;
        const mats = [];
        for (let i = 1; i <= 9; i++) {
            const mat = row[`재료${i}`]?.trim();
            if (mat) mats.push(mat);
        }
        recipes[key] = mats;
    });

    const itemMeta: Record<string, any> = {};
    rawItemInfo.forEach((row: any) => {
        const name = row['이름']?.trim();
        if (!name) return;
        const rawCities = row['항구']?.replace(/"/g, '') || '';
        itemMeta[name] = {
            category: row['종류']?.trim(),
            cities: rawCities.split(/[,/]/).map((c: string) => c.trim()).filter(Boolean)
        };
    });

    const cityClimate: Record<string, string> = {};
    rawCityClimate.forEach((row: any) => {
        const cityName = row['항구명']?.trim();
        if (cityName) cityClimate[cityName] = row['기후']?.trim();
    });

    const schedule: Record<string, any> = {};
    rawSchedule.forEach((row: any) => {
        const cat = row['품목']?.trim();
        const cli = row['기후']?.trim();
        if (cat && cli) {
            if (!schedule[cat]) schedule[cat] = {};
            schedule[cat][cli] = row;
        }
    });

    const portSeason: Record<string, Record<string, string>> = {};
    rawPortSeason.forEach((row: any) => {
        const port = row['항구']?.trim();
        const item = row['아이템']?.trim();
        if (port && item) {
            const key = `${port}:${item}`;
            portSeason[key] = {};
            for (let m = 1; m <= 12; m++) {
                portSeason[key][`${m}월`] = row[`${m}월`]?.trim() || '평';
            }
        }
    });

    cachedData = { recipes, itemMeta, cityClimate, schedule, portSeason };
    return cachedData;
}

// --- 비공개 알고리즘 (서버에서만 실행) ---

interface BarterNode {
    name: string;
    type: 'barter' | 'trade' | 'hybrid';
    status?: '▲' | '—' | '▼';
    bestCities?: string[];
    children?: BarterNode[];
}

function getEffectiveMonth(baseMonth: number, climate: string): number {
    const offsetClimates = ['건기/우기', '건기2/우기2'];
    if (offsetClimates.includes(climate)) {
        return (baseMonth % 12) + 1;
    }
    return baseMonth;
}

function getCitySeasonStatus(city: string, itemName: string, month: number, allData: any): string {
    const { cityClimate, schedule, portSeason, itemMeta } = allData;

    const portKey = `${city}:${itemName}`;
    if (portSeason?.[portKey]) {
        return portSeason[portKey][`${month}월`] || '평';
    }

    const meta = itemMeta[itemName];
    if (!meta) return '평';

    const climate = cityClimate[city];
    if (!climate) return '평';

    const groups = ['공업품', '공예품', '무기류', '미술품', '총포류'];
    const scheduleKey = groups.includes(meta.category) ? '공업품/공예품/무기류/미술품/총포류' : meta.category;

    const effectiveMonth = getEffectiveMonth(month, climate);
    return schedule[scheduleKey]?.[climate]?.[`${effectiveMonth}월`] || '평';
}

function buildBarterTree(itemName: string, month: number, allData: any): BarterNode {
    const { recipes, itemMeta } = allData;
    const meta = itemMeta[itemName];
    let tradeStatus: '▲' | '—' | '▼' = '—';
    let tradeCities: string[] = [];

    if (meta) {
        const statusGroups: Record<string, string[]> = { '성': [], '평': [], '비': [] };
        meta.cities.forEach((city: string) => {
            const cityStatus = getCitySeasonStatus(city, itemName, month, allData);
            statusGroups[cityStatus].push(city);
        });

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

    const recipe = recipes[itemName];
    const isHybrid = meta && recipe;

    return {
        name: itemName,
        type: isHybrid ? 'hybrid' : (recipe ? 'barter' : 'trade'),
        status: tradeStatus,
        bestCities: tradeCities,
        children: recipe ? recipe.map((child: string) => buildBarterTree(child, month, allData)) : undefined
    };
}

// --- API 엔드포인트 ---

export async function POST(request: NextRequest) {
    try {
        const { itemName, month } = await request.json();

        if (!itemName || !month) {
            return NextResponse.json({ error: '필수 파라미터가 누락되었습니다.' }, { status: 400 });
        }

        const allData = getAllData();
        const tree = buildBarterTree(itemName, month, allData);

        return NextResponse.json({ tree });
    } catch (e) {
        console.error('Barter API error:', e);
        return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
    }
}
