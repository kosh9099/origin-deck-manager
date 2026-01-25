// types/index.ts

// 1. 등급 및 타입 정의
export type SailorGrade = 'S+' | 'S' | 'A' | 'B' | 'C';
export type SailorType = '전투' | '모험' | '교역';

// 2. 항해사 데이터 구조
export interface Sailor {
  id: number;
  이름: string;
  등급: SailorGrade;
  타입: SailorType;
  직업: string;
  스킬: { [key: string]: number }; // 여기에 27개 스킬 데이터가 들어감
}

// 3. 함선 설정 구조
export interface ShipConfig {
  id: number;
  총선실: number;
  전투선실: number;
}

// 4. 고든님이 주신 27개 핵심 탐험 스킬 리스트 (여기로 교체!)
export const EXPLORATION_STATS = {
  '전리품': [
    { name: '투쟁적인 탐험가', max: 10 },
    { name: '호전적인 탐험가', max: 10 },
    { name: '꼼꼼한 탐험가', max: 10 },
    { name: '주의깊은 탐험가', max: 10 },
    { name: '성실한 탐험가', max: 10 },
    { name: '부지런한 탐험가', max: 10 },
  ],
  '전투': [
    { name: '험지 평정', max: 2 },
    { name: '전투적인 채집', max: 7 },
    { name: '전투적인 관찰', max: 8 },
    { name: '해적 척결', max: 10 },
    { name: '맹수 척결', max: 10 },
    { name: '해적 사냥', max: 10 },
    { name: '맹수 사냥', max: 10 },
  ],
  '관찰': [
    { name: '관찰 공부', max: 10 },
    { name: '관측 후 채집', max: 4 },
    { name: '관측 후 전투', max: 6 },
    { name: '생물 관찰', max: 7 },
    { name: '관찰 채집', max: 8 },
    { name: '험지 관찰', max: 2 },
    { name: '관찰 심화', max: 8 },
  ],
  '채집': [
    { name: '생물 채집', max: 6 },
    { name: '채집 우선 전투', max: 9 },
    { name: '채집 우선 관찰', max: 6 },
    { name: '험지 채집', max: 2 },
    { name: '채집 심화', max: 5 },
    { name: '채집 공부', max: 10 },
    { name: '탐사의 기본', max: 10 },
  ]
};