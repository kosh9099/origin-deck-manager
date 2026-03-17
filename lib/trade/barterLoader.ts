import Papa from 'papaparse';

export async function loadCsvData(url: string): Promise<any[]> {
    const response = await fetch(url);
    const csvText = await response.text();

    // 💡 해결 1: BOM(Byte Order Mark) 제거
    const cleanCsvText = csvText.replace(/^\uFEFF/, "");

    return new Promise((resolve) => {
        Papa.parse(cleanCsvText, {
            header: true,
            skipEmptyLines: true, // 공백 라인 무시
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
        const key = row['물교품']?.trim();
        if (!key) return; // 💡 해결 3: 유효하지 않은 키 방지

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
            // 💡 해결 2: 콤마(,)와 슬래시(/) 구분자 모두 대응
            cities: rawCities.split(/[,/]/).map((c: string) => c.trim()).filter(Boolean)
        };
    });

    const cityClimate: Record<string, string> = {};
    rawCityClimate.forEach((row: any) => {
        const cityName = row['항구명']?.trim();
        if (cityName) {
            cityClimate[cityName] = row['기후']?.trim();
        }
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

    return { recipes, itemMeta, cityClimate, schedule };
}