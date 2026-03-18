// lib/trade/time.ts

export function getInGameTimeInfo(now: number) {
    /**
     * 인게임 시간 계산
     * 현실 시간 1일당 인게임 1개월이 지나며, 매일 오전 9시(KST)를 기준으로 변경됩니다.
     * 엑셀 수식 역산 결과: 기준일(Month 1 시작일)은 2024년 7월 28일 오전 9시(KST)입니다.
     */

    // 기준일: 2024-07-28 09:00:00 KST
    const baseDate = new Date('2024-07-28T09:00:00+09:00').getTime();
    
    // 밀리초 단위 차이를 일 단위로 변환합니다.
    const diffMs = now - baseDate;
    
    // 경과한 일수를 구합니다. (음수일 수도 있으므로 Math.floor 사용)
    const passedDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    // 1~12월 순환 (음수 모듈러 연산 보정)
    let month = (passedDays % 12) + 1;
    if (month <= 0) {
        month += 12;
    }
    
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