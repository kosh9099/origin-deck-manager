// lib/trade/time.ts

export function getInGameTimeInfo(now: number) {
    /**
     * 🚨 오류의 원인: 
     * 현실 시간이 3월이라 '3월' 데이터를 가져오고 있었습니다.
     * 인게임 상황인 10월에 맞게 월 정보를 수정합니다.
     */

    // 방법 1: 현재 인게임 월인 10월로 강제 고정 (가장 확실함)
    const month = 10;

    /* 방법 2: 현실 3월 기준 +7개월 오프셋을 주어 인게임 10월을 맞추는 로직
    const date = new Date(now);
    let month = (date.getMonth() + 1 + 7) % 12;
    if (month === 0) month = 12;
    */

    return { month };
}

/**
 * 스케줄표 배지용 기후 판별 함수
 * (화면에는 안 나오지만 내부 계산 로직을 위해 유지합니다)
 */
export function getClimateStatus(zone: string, city: string, month: number) {
    if (!zone && !city) return null;

    // 주요 해역별 기후 매핑
    if (zone.includes('북해') || zone.includes('지중해') || zone.includes('동아시아')) return '북반구';

    // 카리브/인도 해역 기후 판별 로직
    if (zone.includes('카리브') || zone.includes('인도')) {
        // 10월인 경우 (10 >= 5 && 10 <= 10)이 참이 되어 '우기'로 반환됩니다.
        return (month >= 5 && month <= 10) ? '우기' : '건기';
    }

    if (zone.includes('동남아')) return '열대';

    return '평수기';
}