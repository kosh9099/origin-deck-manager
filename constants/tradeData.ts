export const BOOST_EVENT_TYPES = {
  "부양": [
    "식료품", "조미료", "염료", "공업품", "직물", "기호품", "공예품",
    "미술품", "귀금속", "보석", "잡화", "의약품", "섬유", "가축",
    "무기류", "총포류", "광석", "주류", "향신료", "향료"
  ],
  "급매": [] as string[]
};

export const FLAT_BOOST_CATEGORIES = [
  ...BOOST_EVENT_TYPES["부양"],
];

const BOOST_CATEGORY_SET = new Set(BOOST_EVENT_TYPES["부양"]);

/**
 * type 텍스트가 부양인지 급매인지 판별.
 * 부양 카테고리(20종) 중 하나면 부양, 아니면 급매(특정 품목명).
 * 사용자가 자유 입력한 값(예: 흑요석, 금괴, 신규 패치 품목)은 자동으로 급매 처리.
 */
export const getBoostType = (category: string): '부양' | '급매' => {
  if (!category) return '부양';
  return BOOST_CATEGORY_SET.has(category.trim()) ? '부양' : '급매';
};