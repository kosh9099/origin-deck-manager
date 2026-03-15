import { NextRequest, NextResponse } from 'next/server';

const SHEET_BASE = 'https://docs.google.com/spreadsheets/d/1a5k-W5WhGUcD1BVZamuxLg0UKntHewUPdpOjQx1C5hc/export?format=csv';
const ALLOWED_GIDS = ['1178990173', '647153257'];

// 캐시 완전 비활성화 — 항상 구글 시트에서 최신 데이터를 가져옴
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
    const gid = request.nextUrl.searchParams.get('gid');

    if (!gid || !ALLOWED_GIDS.includes(gid)) {
        return NextResponse.json({ error: 'Invalid gid' }, { status: 400 });
    }

    try {
        const sheetUrl = `${SHEET_BASE}&gid=${gid}`;
        const res = await fetch(sheetUrl, {
            headers: { 'Accept': 'text/csv' },
            cache: 'no-store', // 서버사이드 캐시 완전 비활성화
        });

        if (!res.ok) {
            return NextResponse.json(
                { error: `Sheet fetch failed: ${res.status}` },
                { status: res.status }
            );
        }

        const csv = await res.text();

        return new NextResponse(csv, {
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                // 브라우저/CDN 캐시도 비활성화
                'Cache-Control': 'no-store, no-cache, must-revalidate',
                'Pragma': 'no-cache',
            },
        });
    } catch (e) {
        console.error('Sheet proxy error:', e);
        return NextResponse.json({ error: 'Failed to fetch sheet' }, { status: 500 });
    }
}