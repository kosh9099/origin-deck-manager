export const BOOST_EVENT_TYPES = {
  "부양": [
    "식료품", "조미료", "염료", "공업품", "직물", "기호품", "공예품",
    "미술품", "귀금속", "보석", "잡화", "의약품", "섬유", "가축",
    "무기류", "총포류", "광석", "주류", "향신료", "향료"
  ],
  "급매": [
    "흑요석", "수정세공", "네베르스로이드"
  ]
};

// 유틸리티 용도 평탄화 배열
export const FLAT_BOOST_CATEGORIES = [
  ...BOOST_EVENT_TYPES["부양"],
  ...BOOST_EVENT_TYPES["급매"]
];

export const getBoostType = (category: string) => {
  if (BOOST_EVENT_TYPES["부양"].includes(category)) return "부양";
  if (BOOST_EVENT_TYPES["급매"].includes(category)) return "급매";
  return "부양";
};
