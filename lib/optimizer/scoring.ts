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

// 빌드 에러 방지용 복구
export function getTradeStatSum(sailor: Sailor): number {
  if (!sailor) return 0;
  return (Number(sailor.박물) || 0) + (Number(sailor.보급) || 0) + (Number(sailor.백병) || 0);
}

/**
 * [수정] 기본 점수 (Rank 5: 빈 선실 채우기용)
 * * 옵션 OFF (기본): "보급 스탯이 높은 제독 또는 항해사"
 * 옵션 ON (보급/직업 우선): "제독 > 보급장 > 위생사 > 상담사 > 기타 직업"
 */
export function getBaseScore(sailor: Sailor, prioritizeJob: boolean): number {
  const supply = getSupplyStat(sailor);

  // [Case 1] 옵션 OFF: 보급 스탯 올인
  if (!prioritizeJob) {
    return supply;
  }

  // [Case 2] 옵션 ON: 직업 서열 중심 (보급은 동점자 처리용)
  // 점수 단위: 1억 단위로 직업 서열 구분
  const grade = (sailor.등급 || '').trim();
  const job = (sailor.직업 || '').trim();

  // 1. 제독 (S+)
  if (grade === 'S+') return 1_000_000_000 + supply;

  // 2. 보급장
  if (job === '보급장') return 800_000_000 + supply;

  // 3. 위생사
  if (job === '위생사') return 600_000_000 + supply;

  // 4. 상담사
  if (job === '상담사') return 400_000_000 + supply;

  // 5. 기타 직업 (보급 스탯만 반영)
  return 200_000_000 + supply;
}

// 빌드 에러 방지용
export function hasAnyTargetSkill(sailor: Sailor, skills: string[]): boolean {
  return skills.some(sk => getSailorSkillLevel(sailor, sk) > 0);
}