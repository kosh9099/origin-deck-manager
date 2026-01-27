import { Sailor } from '@/types';
import { GRADE_RANK } from './rules';

/**
 * 항해사의 데이터에서 스킬 레벨을 정밀 추출합니다.
 */
export function getSailorSkillLevel(sailor: Sailor, skillName: string): number {
  if (!sailor) return 0;
  
  const target = skillName.replace(/\s+/g, "").toLowerCase();

  // 패턴 1: DB Key 일치
  for (const key in sailor) {
    const keyNorm = key.replace(/\s+/g, "").toLowerCase();
    if (keyNorm === target) {
      const val = sailor[key];
      if (typeof val === 'number') return val;
      if (typeof val === 'string' && !isNaN(Number(val))) return Number(val);
    }
  }

  // 패턴 2: 텍스트 포함 검색 (LV2 감지)
  let foundTextLevel = 0;
  Object.values(sailor).forEach((val) => {
    if (typeof val === 'string') {
      const valNorm = val.replace(/\s+/g, "").toLowerCase();
      if (valNorm.includes(target)) {
        const regex = new RegExp(`${target}(?:lv)?(\\d+)`, 'i');
        const match = valNorm.match(regex);
        if (match && match[1]) {
          foundTextLevel = Math.max(foundTextLevel, parseInt(match[1], 10));
        } else {
          foundTextLevel = Math.max(foundTextLevel, 1);
        }
      }
    }
  });

  return foundTextLevel;
}

/**
 * 보급 스탯 추출
 */
export function getSupplyStat(sailor: Sailor): number {
  if (!sailor) return 0;
  return Number(sailor.보급) || 0;
}

/**
 * [복구] 교역 스탯 합계 (기존 전략 파일 호환용)
 * 박물 + 보급 + 백병
 */
export function getTradeStatSum(sailor: Sailor): number {
  if (!sailor) return 0;
  return (Number(sailor.박물) || 0) + (Number(sailor.보급) || 0) + (Number(sailor.백병) || 0);
}

/**
 * [수정] 일반 선실 기본 점수 (스킬 기여도가 같을 때 or 빈자리 채울 때)
 * 지휘관님 서열 정의:
 * 1. 모험 타입 제독 (S+)
 * 2. 높은 등급 (S > A > B...)
 * 3. 높은 보급 스탯
 * 4. 직업 (보급장 > 위생사 > 상담사 > 기타)
 */
export function getBaseScore(sailor: Sailor): number {
  const grade = (sailor.등급 || '').trim();
  const type = (sailor.타입 || '').trim();
  const job = (sailor.직업 || '').trim();
  const supply = getSupplyStat(sailor);

  // 1순위: 모험 타입 S+ 제독 (9억 점 + @)
  if (grade === 'S+' && type === '모험') {
    return 900_000_000 + supply; 
  }

  // 2순위: 등급 점수 (천만 단위)
  const gradeScore = (GRADE_RANK[grade] || 0) * 1_000_000;
  
  // 3순위: 보급 점수 (십의 자리 이상 사용)
  const supplyScore = supply * 10;

  // 4순위: 직업 점수 (일의 자리 사용)
  let jobScore = 0;
  if (job === '보급장') jobScore = 3;
  else if (job === '위생사') jobScore = 2;
  else if (job === '상담사') jobScore = 1;

  // 최종 점수 합산
  return gradeScore + supplyScore + jobScore;
}

// 빌드 에러 방지용
export function hasAnyTargetSkill(sailor: Sailor, skills: string[]): boolean {
  return skills.some(sk => getSailorSkillLevel(sailor, sk) > 0);
}