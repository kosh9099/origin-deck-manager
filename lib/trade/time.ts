// lib/trade/time.ts

export function getInGameTimeInfo(now: number) {
    const date = new Date(now);
    // 현실의 월을 기준으로 인게임 월(1~12) 계산
    const month = date.getMonth() + 1;

    return { month };
}

/**
 * 스케줄표 배지용 기후 판별 함수
 */
export function getClimateStatus(zone: string, city: string, month: number) {
    if (!zone && !city) return null;

    // 주요 해역별 기후 매핑
    if (zone.includes('북해') || zone.includes('지중해') || zone.includes('동아시아')) return '북반구';
    if (zone.includes('카리브') || zone.includes('인도')) return (month >= 5 && month <= 10) ? '우기' : '건기';
    if (zone.includes('동남아')) return '열대';

    return '평수기';
}