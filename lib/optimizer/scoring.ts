import { Sailor } from '@/types';

/**
 * 항해사의 데이터에서 스킬 레벨을 정밀 추출합니다.
 */
export function getSailorSkillLevel(sailor: Sailor, skillName: string): number {
  if (!sailor) return 0;
  
  // 검색어 정규화 (공백 제거 및 소문자화)
  const target = skillName.replace(/\s+/g, "").toLowerCase();

  // 패턴 1: DB의 키가 스킬명과 일치하는 경우 (콘솔 로그 형태)
  for (const key in sailor) {
    const keyNorm = key.replace(/\s+/g, "").toLowerCase();
    if (keyNorm === target) {
      const val = sailor[key];
      // 숫자인 경우 즉시 반환 (49가 찍히는 문제 해결의 핵심)
      if (typeof val === 'number') return val;
      if (typeof val === 'string' && !isNaN(Number(val))) return Number(val);
    }
  }

  // 패턴 2: 특정 컬럼의 값(Value)에 텍스트로 포함된 경우 (CSV 텍스트 형태)
  let foundTextLevel = 0;
  Object.values(sailor).forEach((val) => {
    if (typeof val === 'string') {
      const valNorm = val.replace(/\s+/g, "").toLowerCase();
      if (valNorm.includes(target)) {
        // "스킬명LV2" 또는 "스킬명 2" 등에서 숫자 추출
        const regex = new RegExp(`${target}(?:lv)?(\\d+)`, 'i');
        const match = valNorm.match(regex);
        if (match && match[1]) {
          foundTextLevel = Math.max(foundTextLevel, parseInt(match[1], 10));
        } else {
          // 이름은 있는데 숫자가 없으면 지휘관님 규정대로 1레벨
          foundTextLevel = Math.max(foundTextLevel, 1);
        }
      }
    }
  });

  return foundTextLevel;
}

export function getTradeStatSum(sailor: Sailor): number {
  if (!sailor) return 0;
  // DB 컬럼명 박물, 보급, 백병 반영
  return (Number(sailor.박물) || 0) + (Number(sailor.보급) || 0) + (Number(sailor.백병) || 0);
}