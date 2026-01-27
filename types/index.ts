export interface Sailor {
  id: number;
  이름: string;
  등급: string;
  타입: string;
  직업: string;
  무기: string;
  통솔: string; // CSV에서 숫자가 문자열로 들어올 수 있음
  포격: string;
  충파: string;
  지원: string;
  백병: string;
  박물: string;
  심미: string;
  척후: string;
  보급: string;
  구매: string;
  판매: string;
  협상: string;
  교환: string;
  [key: string]: any; // 스킬 컬럼 등 동적 접근 허용
}

export interface ShipConfig {
  id: number;
  총선실: number;
  전투선실: number;
}

export interface OptimizerOptions {
  includeBoarding: boolean;      // 백병대 추가
  includeSpecialForces: boolean; // 특공대 추가
  includeTrade: boolean;         // 교역 항해사 허용
  prioritizeSupply: boolean;     // [신규] 보급/직업 우선 고려
}

export interface Ship {
  id: number;
  admiral: Sailor | null;
  adventure: (Sailor | null)[];
  combat: (Sailor | null)[];
}

export const EXPLORATION_STATS = {
  '탐험': [
    { name: '투쟁적인 탐험가', stat: 'combat' },
    { name: '호전적인 탐험가', stat: 'combat' },
    { name: '부지런한 탐험가', stat: 'observation' },
    { name: '야심찬 탐험가', stat: 'observation' },
    { name: '호기심 많은 탐험가', stat: 'gathering' },
    { name: '유능한 탐험가', stat: 'gathering' }
  ],
  '협상': [
    { name: '설득의 달인', stat: 'supply' },
    { name: '능숙한 협상가', stat: 'supply' },
    { name: '평화주의자', stat: 'supply' }
  ],
  '전투': [
    { name: '해적 척결', stat: 'pirate' },
    { name: '해적 사냥', stat: 'pirate' },
    { name: '맹수 척결', stat: 'beast' },
    { name: '맹수 사냥', stat: 'beast' }
  ],
  '항해': [
    { name: '험지 평정', stat: 'observation' },
    { name: '험지 돌파', stat: 'observation' },
    { name: '자연의 친구', stat: 'gathering' },
    { name: '자연과의 조화', stat: 'gathering' }
  ],
  '관찰': [
    { name: '관찰 심화', stat: 'observation' },
    { name: '관찰 공부', stat: 'observation' },
    { name: '관찰의 기본', stat: 'observation' }
  ],
  '채집': [
    { name: '생물 채집', stat: 'gathering' },
    { name: '채집 우선 전투', stat: 'combat' },
    { name: '채집 우선 관찰', stat: 'observation' },
    { name: '험지 채집', stat: 'observation' },
    { name: '채집 심화', stat: 'gathering' },
    { name: '채집 공부', stat: 'gathering' },
    { name: '탐사의 기본', stat: 'gathering' }
  ]
} as const;