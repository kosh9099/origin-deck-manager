import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import seasonCalendar from '@/constants/seasonCalendar.json';

// 서버 사이드에서만 실행 — 알고리즘이 클라이언트 번들에 포함되지 않음

type SeasonCalendar = {
    cities: Record<string, { region: string | null; months: (string | null)[] }>;
    items: Record<string, { category: string | null; cities: string[] }>;
    itemClasses: Record<string, string>;
    portSeason: Record<string, string[]>; // "city|item" → 12개월 ["성"|"평"|"비"]
};

const calendar = seasonCalendar as SeasonCalendar;

function loadCsvFile(filename: string): any[] {
    const filePath = path.join(process.cwd(), 'public', 'data', filename);
    const csvText = fs.readFileSync(filePath, 'utf-8').replace(/^﻿/, '');
    const result = Papa.parse(csvText, { header: true, skipEmptyLines: true });
    return result.data as any[];
}

function getRecipes(): Record<string, string[]> {
    const rawBarter = loadCsvFile('barter_materials.csv');
    const recipes: Record<string, string[]> = {};
    rawBarter.forEach((row: any) => {
        const key = row['물교품']?.trim();
        if (!key) return;
        const mats: string[] = [];
        for (let i = 1; i <= 9; i++) {
            const mat = row[`재료${i}`]?.trim();
            if (mat) mats.push(mat);
        }
        recipes[key] = mats;
    });
    return recipes;
}

// --- 비공개 알고리즘 (서버에서만 실행) ---

interface BarterNode {
    name: string;
    type: 'barter' | 'trade' | 'hybrid';
    status?: '▲' | '—' | '▼';
    bestCities?: string[];
    children?: BarterNode[];
}

/**
 * (도시, 품목, 월) → 시즌 상태('성'|'평'|'비')
 * 신규 [교역품] 시트 직접 룩업, 누락 시 '평' 반환.
 */
function getCitySeasonStatus(city: string, itemName: string, month: number): string {
    const key = `${city}|${itemName}`;
    const months = calendar.portSeason[key];
    if (!months) return '평';
    return months[month - 1] ?? '평';
}

const STATUS_MARKER: Record<string, '▲' | '—' | '▼'> = {
    성: '▲',
    평: '—',
    비: '▼',
};

function buildBarterTree(itemName: string, month: number, recipes: Record<string, string[]>): BarterNode {
    const meta = calendar.items[itemName];
    let tradeStatus: '▲' | '—' | '▼' = '—';
    let tradeCities: string[] = [];

    if (meta) {
        const groups: Record<string, string[]> = { 성: [], 평: [], 비: [] };
        for (const city of meta.cities) {
            const status = getCitySeasonStatus(city, itemName, month);
            (groups[status] ?? groups['평']).push(city);
        }
        // 우선순위: 성수기 > 평수기 > 비수기
        const winning = groups['성'].length > 0 ? '성' : groups['평'].length > 0 ? '평' : '비';
        tradeStatus = STATUS_MARKER[winning];
        tradeCities = groups[winning];
    }

    const recipe = recipes[itemName];
    const isHybrid = !!meta && !!recipe;

    return {
        name: itemName,
        type: isHybrid ? 'hybrid' : recipe ? 'barter' : 'trade',
        status: tradeStatus,
        bestCities: tradeCities,
        children: recipe ? recipe.map((child: string) => buildBarterTree(child, month, recipes)) : undefined,
    };
}

// --- API 엔드포인트 ---

export async function POST(request: NextRequest) {
    try {
        const { itemName, month } = await request.json();

        if (!itemName || !month) {
            return NextResponse.json({ error: '필수 파라미터가 누락되었습니다.' }, { status: 400 });
        }

        const recipes = getRecipes();
        const tree = buildBarterTree(itemName, month, recipes);

        return NextResponse.json({ tree });
    } catch (e) {
        console.error('Barter API error:', e);
        return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
    }
}
