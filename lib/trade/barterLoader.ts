import Papa from 'papaparse';

export async function loadCsvData(url: string): Promise<any[]> {
    const response = await fetch(url);
    const csvText = await response.text();

    return new Promise((resolve) => {
        Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => resolve(results.data),
        });
    });
}

export async function initBarterSystem() {
    const [rawBarter, rawItemInfo, rawCityClimate, rawSchedule] = await Promise.all([
        loadCsvData('/data/barter_materials.csv'),
        loadCsvData('/data/item_info.csv'),
        loadCsvData('/data/city_climate.csv'),
        loadCsvData('/data/season_schedule.csv'),
    ]);

    const recipes: Record<string, string[]> = {};
    rawBarter.forEach((row: any) => {
        const mats = [];
        for (let i = 1; i <= 9; i++) {
            const mat = row[`재료${i}`]?.trim();
            if (mat) mats.push(mat);
        }
        recipes[row['물교품']?.trim()] = mats;
    });

    const itemMeta: Record<string, any> = {};
    rawItemInfo.forEach((row: any) => {
        const rawCities = row['항구']?.replace(/"/g, '') || '';
        itemMeta[row['이름']?.trim()] = {
            category: row['종류']?.trim(),
            cities: rawCities.split(',').map((c: string) => c.trim())
        };
    });

    const cityClimate: Record<string, string> = {};
    rawCityClimate.forEach((row: any) => {
        cityClimate[row['항구명']?.trim()] = row['기후']?.trim();
    });

    const schedule: Record<string, any> = {};
    rawSchedule.forEach((row: any) => {
        const cat = row['품목']?.trim();
        const cli = row['기후']?.trim();
        if (!schedule[cat]) schedule[cat] = {};
        schedule[cat][cli] = row;
    });

    return { recipes, itemMeta, cityClimate, schedule };
}