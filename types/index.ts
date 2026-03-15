export interface Sailor {
  id: number;
  이름: string;
  등급: string;
  타입: string;
  직업: string;
  무기: string;
  통솔: string;
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
  includeBoarding: boolean;
  includeSpecialForces: boolean;
  includeTrade: boolean;
  prioritizeSupply: boolean;
}

export interface Ship {
  id: number;
  admiral: Sailor | null;
  adventure: (Sailor | null)[];
  combat: (Sailor | null)[];
}