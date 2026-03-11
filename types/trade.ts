export interface TradeEvent {
  id: string; // 고유 ID (ex: "epidemic-북해-1710000000", "boost-uuid")
  zone: string; // 해역 (ex: "북해", "동지중해")
  city?: string; // 유저 부양 시 특정 항구 (ex: "런던")
  type: string; // 유행 종류 (ex: "사치", "호황", "개발", "부양", "부양(향료)", 등)
  isBoost: boolean; // 유저가 제보한 부양인지 여부 (True = 부양, False = 자동 연산된 대유행)
  startTime: number; // 이벤트 시작 시간 (Unix Timestamp MS)
  endTime?: number; // 이벤트 종료 시간 (대유행은 보통 정각 단위 1시간 지속 등으로 가정)
  
  // Voting & Item Recommendations
  items: TradeItem[]; // 추천 품목 목록
}

export interface TradeItem {
  id: string;      // 해당 아이템 추천의 DB 고유 ID
  name: string;    // 품목명 (ex: "오수", "파두아")
  upvotes: number;
  downvotes: number;
  isUserVoted?: 'up' | 'down' | null; // 현재 클라이언트(유저)가 투표한 이력이 있는지 여부
}

export interface BoostFormData {
  zone: string;
  city: string;
  type: string;
  hour: number; // 0~23 시단위, 또는 구체적 타임스탬프
  minute: number; 
}
