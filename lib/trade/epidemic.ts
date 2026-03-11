import { TradeEvent } from '@/types/trade';

export const ZONE_HOUR_MAP: Record<string, number> = {
  "북해": 0, "동지중해": -1, "서지중해": -2, "서아프": -3,
  "남아프": -4, "동아프": -5, "아라비아": -6, "동인도": -7,
  "남아시아": -8, "동아시아": -9, "극동아": -10, "오세아": -11,
  "오세동": -12, "북극": -13, "남미": -14, "카리브": -15,
  "북미서": -16, "태평양": -17
};

export const POP_NAMES: Record<string, string> = {
  'pop1': '사치', 'pop2': '호황', 'pop3': '개발', 'pop4': '후원',
  'pop5': '전쟁', 'pop6': '홍수', 'pop7': '전염병', 'pop8': '축제'
};

const BASE_TIMESTAMP = 1670889600; // 2022-12-13 00:00:00 UTC 기준점

/**
 * 특정 시간(Unix Timestamp, 초) 기준으로 해당 해역에 발생하는 유행을 계산하여 배열로 반환.
 * @param zone_hour 해역별 시차 값
 * @param i_hour 미래 예측 시간 오프셋 (+1, +2 ...)
 * @param now 대상 시간 (초 단위) - 없으면 기본 현재 시간 측정
 * @returns 발생하는 유행 키값 배열 (최대 2개 반환) - 예: ['pop1', 'pop5']
 */
export function getPopularTypes(zone_hour: number, i_hour: number = 0, targetTimeInSeconds?: number): string[] {
  const now = targetTimeInSeconds ?? Math.floor(Date.now() / 1000);
  
  // 기준점으로부터 경과된 '시간(Hour)' 수 계산
  const p_hour = Math.floor((now - BASE_TIMESTAMP) / 3600);
  
  // 파이썬 로직: Si = p_hour + zone_hour + (zone_hour * 400) + i_hour
  const Si = p_hour + zone_hour + (zone_hour * 400) + i_hour;
  
  const res: string[] = [];
  
  // 발생 주기 모듈러 연산
  if (Si % 379 === 0) res.push('pop1');
  if (Si % 337 === 0) res.push('pop2');
  if (Si % 311 === 0) res.push('pop3');
  if (Si % 269 === 0) res.push('pop4');
  if (Si % 241 === 0) res.push('pop5');
  if (Si % 223 === 0) res.push('pop6');
  if (Si % 199 === 0) res.push('pop7');
  if (Si % 179 === 0) res.push('pop8');
  
  return res.slice(0, 2); // 최대 2개 반환
}

/**
 * 현재 시간 기준으로 향후 `lookaheadHours` 시간 동안의 모든 해역의 대유행 스케줄을 계산하여 배열로 반환합니다.
 * @param lookaheadHours 예측할 미래 시간 (기본값: 36)
 */
export function generateEpidemicSchedules(lookaheadHours: number = 36): TradeEvent[] {
  const events: TradeEvent[] = [];
  const nowMs = Date.now();
  
  // 현재 시각의 정각(0분 0초) Timestamp(ms)를 계산하여 시작점으로 잡음
  const currentHourStartMs = new Date(nowMs).setMinutes(0, 0, 0);
  
  for (let i = 0; i <= lookaheadHours; i++) {
    // 순회할 대상 시간: 현재 정각 + i시간
    const targetMs = currentHourStartMs + (i * 3600 * 1000);
    const targetSecond = Math.floor(targetMs / 1000);
    
    // 이 시간 블록(1시간 단위)에 각 해역별로 대유행이 있는지 검사
    for (const [zoneName, zoneOffset] of Object.entries(ZONE_HOUR_MAP)) {
      // i_hour는 함수 내부에서 경과시간에 합산되므로, targetSecond(현재 테스트 시간) 자체를 넘기거나 getPopularTypes 내부 구조에 맞게 설계.
      // Python 원문은 i_hour를 시간 오프셋으로 사용했지만, targetSecond를 직접 지정하면 i_hour는 0으로 고정해도 무방함.
      const popTypes = getPopularTypes(zoneOffset, 0, targetSecond);
      
      if (popTypes.length > 0) {
        // 하나의 해역에 2개 이상 유행이 뜰 수 있으므로 각각 이벤트로 분리
        popTypes.forEach(popTypeKey => {
          const typeName = POP_NAMES[popTypeKey];
          
          events.push({
            id: `autogen-${zoneName}-${targetMs}-${popTypeKey}`,
            zone: zoneName,
            type: typeName,
            isBoost: false,
            startTime: targetMs,
            endTime: targetMs + (3600 * 1000), // 정각 ~ 다음 정각까지 1시간
            items: [], // 유저들이 채울 빈 배열
          });
        });
      }
    }
  }
  
  // 시간 순서대로 정렬 (startTime 오름차순)
  return events.sort((a, b) => a.startTime - b.startTime);
}
