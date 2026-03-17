// lib/trade/time.ts

export function getInGameTimeInfo(now: number) {
    const date = new Date(now);
    // 현실의 특정 시점을 기준으로 게임 월을 계산하는 로직 (유저님의 기준에 맞게 조정 가능)
    const month = (date.getMonth() + 1);
    return { month };
}

/**
 * 💡 빌드 에러의 원인이었던 함수입니다.
 * 항구의 기후 정보를 반환하여 스케줄표에 배지를 달아줍니다.
 */
export function getClimateStatus(zone: string, city: string, month: number) {
    // 실제 로직은 CITY_CLIMATE DB를 참조하게 되지만, 
    // 우선은 해역(zone) 정보를 바탕으로 직관적인 기후를 반환합니다.
    if (!zone && !city) return null;

    if (zone.includes('카리브') || zone.includes('인도') || zone.includes('아프리카')) {
        // 예: 카리브/인도 지역의 계절 판별
        const isWet = month >= 5 && month <= 10;
        return isWet ? '우기' : '건기';
    }

    if (zone.includes('동남아')) return '열대';
    if (zone.includes('북해') || zone.includes('지중해')) return '북반구';
    if (zone.includes('남아메리카') || zone.includes('오세아니아')) return '남반구';

    return '평수기';
}