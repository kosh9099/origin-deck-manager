import { Sailor } from '@/types';
import { GRADE_RANK } from './rules'; // 등급별 점수 매핑 (S+: 500, S: 400 ... 등)

/**
 * 항해사의 데이터에서 스킬 레벨을 정밀 추출합니다. (기존 유지)
 */
export function getSailorSkillLevel(sailor: Sailor, skillName: string): number {
  if (!sailor) return 0;
  const target = skillName.replace(/\s+/g, "").toLowerCase();

  for (const key in sailor) {
    const keyNorm = key.replace(/\s+/g, "").toLowerCase();
    if (keyNorm === target) {
      const val = sailor[key];
      if (typeof val === 'number') return val;
      if (typeof val === 'string' && !isNaN(Number(val))) return Number(val);
    }
  }

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
 * [수정] 등급 기반 동점자 처리 로직 반영
 * 기여도가 같을 경우 등급이 높은 항해사를 우선합니다.
 */
export function calculateTierScore(
  sailor: Sailor,
  currentLevels: Record<string, number>,
  targetLevels: Record<string, number>
): number {
  let totalContribution = 0;
  let totalWaste = 0;
  let hasTargetLV2 = false;

  for (const sk in targetLevels) {
    const sailorLvl = getSailorSkillLevel(sailor, sk);
    if (sailorLvl <= 0) continue;

    const target = targetLevels[sk] || 0;
    const current = currentLevels[sk] || 0;
    const needed = Math.max(0, target - current);

    const contribution = Math.min(sailorLvl, needed);
    const waste = Math.max(0, sailorLvl - needed);

    if (contribution > 0) {
      totalContribution += contribution;
      if (sailorLvl >= 2) hasTargetLV2 = true;
    }
    totalWaste += waste;
  }

  if (totalContribution === 0) return -1;

  // 등급 점수 추출 (GRADE_RANK에 정의된 수치 사용, 없으면 0)
  const gradeScore = GRADE_RANK[sailor.등급] || 0;

  // 기본 점수: 기여도 + LV2 보너스 + 등급 점수(동점자 처리)
  const base = (totalContribution * 1000) + (hasTargetLV2 ? 500 : 0) + gradeScore;

  if (totalWaste === 0) {
    return 1_000_000 + base; // Tier A
  } else {
    const penalized = 100_000 + base - (totalWaste * 10000);
    return Math.max(1, penalized); 
  }
}

// 기존 인터페이스 유지
export function getSupplyStat(sailor: Sailor): number { return Number(sailor.보급) || 0; }
export function getBaseScore(sailor: Sailor, prioritizeJob: boolean): number { return GRADE_RANK[sailor.등급] || 0; }
export function getTradeStatSum(sailor: Sailor): number { return 0; }
export function hasAnyTargetSkill(sailor: Sailor, skills: string[]): boolean {
  return skills.some(sk => getSailorSkillLevel(sailor, sk) > 0);
}