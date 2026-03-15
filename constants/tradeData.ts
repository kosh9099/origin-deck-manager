export const BOOST_EVENT_TYPES = {
  "부양": [
    "식료품", "조미료", "염료", "공업품", "직물", "기호품", "공예품",
    "미술품", "귀금속", "보석", "잡화", "의약품", "섬유", "가축",
    "무기류", "총포류", "광석", "주류", "향신료", "향료"
  ],
  "급매": [] as string[] // 드롭다운은 시트에서 동적 로딩
};

// 급매 판별용 기준 목록 (시트 외 추가 항목도 여기서 관리)
// 시트의 급매1 열 고유값과 동일하게 유지
export const FLASH_ITEM_KEYS = [
  '흑요석', '수정세공', '네베르스로이드', '일렉트럼',
  '상급 은', '상급 캥거루고기'
];

export const FLAT_BOOST_CATEGORIES = [
  ...BOOST_EVENT_TYPES["부양"],
];

export const getBoostType = (category: string): '부양' | '급매' => {
  if (!category) return '부양';
  // 급매 기준 목록에서 정확히 일치 또는 부분 일치
  if (FLASH_ITEM_KEYS.some(item =>
    category === item || category.includes(item) || item.includes(category)
  )) return '급매';
  return '부양';
};