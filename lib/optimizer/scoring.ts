import { Sailor, Ship } from '@/types';
import { GRADE_RANK, MAX_SKILL_LEVELS } from './rules';
import { SKILL_STATS } from './data/skillStats';
import type { StatWeightConfig } from '@/components/skill/StatWeightSettings';

const SKILL_MAX_LEVELS = MAX_SKILL_LEVELS;

export function calculateFleetSkills(sailors: Sailor[]): Record<string, number> {
  const totals: Record<string, number> = {};
  sailors.forEach(sailor => {
    if (!sailor) return;
    Object.keys(SKILL_MAX_LEVELS).forEach(skill => {
      const level = getSailorSkillLevel(sailor, skill);
      if (level > 0) {
        totals[skill] = (totals[skill] || 0) + level;
      }
    });
  });
  const clamped: Record<string, number> = {};
  for (const skill in totals) {
    const max = Math.min(10, SKILL_MAX_LEVELS[skill] || 10);
    clamped[skill] = Math.min(totals[skill], max);
  }
  return clamped;
}

export function getSailorSkillLevel(sailor: Sailor, skillName: string): number {
  if (!sailor) return 0;

  if (sailor[skillName] !== undefined && typeof sailor[skillName] === 'number') {
    return Math.min(sailor[skillName], MAX_SKILL_LEVELS[skillName] ?? 10);
  }

  const lv2Regex = new RegExp(`^${skillName.replace(/\s+/g, "\\s*")}\\s*LV2$`, "i");
  const baseRegex = new RegExp(`^${skillName.replace(/\s+/g, "\\s*")}$`, "i");
  for (const key in sailor) {
    const val = sailor[key];
    if (typeof val === 'string') {
      const trimmedVal = val.trim();
      if (lv2Regex.test(trimmedVal)) return 2;
      if (baseRegex.test(trimmedVal)) return 1;
    }
  }
  return 0;
}

export function getSailorStatContribution(
  sailor: Sailor,
  currentLevels: Record<string, number>
): { combat: number; observation: number; gathering: number } {
  const result = { combat: 0, observation: 0, gathering: 0 };

  for (const sk in SKILL_MAX_LEVELS) {
    const sailorLvl = getSailorSkillLevel(sailor, sk);
    if (sailorLvl <= 0) continue;

    const max = Math.min(10, SKILL_MAX_LEVELS[sk] || 10);
    const current = Math.min(currentLevels[sk] || 0, max);
    const after = Math.min(current + sailorLvl, max);
    if (after <= current) continue;

    const statsBefore = SKILL_STATS[sk]?.[current as keyof typeof SKILL_STATS[string]];
    const statsAfter = SKILL_STATS[sk]?.[after as keyof typeof SKILL_STATS[string]];
    if (!statsAfter) continue;

    result.combat += (statsAfter.combat - (statsBefore?.combat ?? 0))
      + (statsAfter.pirate - (statsBefore?.pirate ?? 0)) / 2
      + (statsAfter.beast - (statsBefore?.beast ?? 0)) / 2;
    result.observation += statsAfter.observation - (statsBefore?.observation ?? 0);
    result.gathering += statsAfter.gathering - (statsBefore?.gathering ?? 0);
  }

  return result;
}

// ════════════════════════════════════════════════════════════════
// 전역 편차 함수: 목표 대비 현재 레벨의 총 편차를 계산
// 값이 작을수록 좋은 배치 (0 = 완벽)
// ════════════════════════════════════════════════════════════════
const SHORTFALL_WEIGHT = 3.0;  // 미달 페널티 (목표 못 채운 것)
const OVERFLOW_WEIGHT = 1.0;   // 초과 페널티 (목표 넘긴 것)

export function calculateGlobalDeviation(
  currentLevels: Record<string, number>,
  targetLevels: Record<string, number>
): number {
  let total = 0;
  for (const sk in targetLevels) {
    const target = targetLevels[sk];
    if (target <= 0) continue;
    const current = currentLevels[sk] || 0;
    const diff = current - target;
    if (diff < 0) {
      total += Math.abs(diff) * SHORTFALL_WEIGHT;
    } else if (diff > 0) {
      total += diff * OVERFLOW_WEIGHT;
    }
  }
  return total;
}

// ════════════════════════════════════════════════════════════════
// 선원의 스킬 기여를 currentLevels에 누적/제거하는 헬퍼
// ════════════════════════════════════════════════════════════════
export function addSailorSkills(sailor: Sailor, currentLevels: Record<string, number>): void {
  for (const sk in MAX_SKILL_LEVELS) {
    const lvl = getSailorSkillLevel(sailor, sk);
    if (lvl > 0) {
      currentLevels[sk] = Math.min((currentLevels[sk] || 0) + lvl, MAX_SKILL_LEVELS[sk]);
    }
  }
}

export function removeSailorSkills(sailor: Sailor, currentLevels: Record<string, number>): void {
  for (const sk in MAX_SKILL_LEVELS) {
    const lvl = getSailorSkillLevel(sailor, sk);
    if (lvl > 0) {
      currentLevels[sk] = Math.max(0, (currentLevels[sk] || 0) - lvl);
    }
  }
}

// 선원이 유효 기여를 하나도 못 하는지 검사
// (모든 보유 스킬이 이미 맥스 → 배치해봤자 순수 낭비)
export function hasNoUsefulContribution(sailor: Sailor, currentLevels: Record<string, number>): boolean {
  for (const sk in MAX_SKILL_LEVELS) {
    const lvl = getSailorSkillLevel(sailor, sk);
    if (lvl > 0) {
      const max = MAX_SKILL_LEVELS[sk] || 10;
      const current = currentLevels[sk] || 0;
      // 이 스킬에 기여 가능한 여유가 있으면 → 유효 기여 있음
      if (current < max) return false;
    }
  }
  return true; // 모든 스킬이 이미 맥스 → 쓸모없음
}

// ════════════════════════════════════════════════════════════════
// 페널티 기반 스코어링 (기존 즉사 방식 → 감점 방식)
// ════════════════════════════════════════════════════════════════
export function calculateTierScore(
  sailor: Sailor,
  currentLevels: Record<string, number>,
  targetLevels: Record<string, number>
): number {
  let benefitScore = 0;
  let penaltyScore = 0;
  let hasContribution = false;

  for (const sk in MAX_SKILL_LEVELS) {
    const sailorLvl = getSailorSkillLevel(sailor, sk);
    if (sailorLvl <= 0) continue;

    const max = MAX_SKILL_LEVELS[sk] || 10;
    const target = targetLevels[sk] || 0;
    const current = currentLevels[sk] || 0;

    // 이미 맥스인 스킬은 낭비 — 즉사 아님, 그냥 건너뜀
    const contribution = Math.min(sailorLvl, Math.max(0, max - current));
    if (contribution <= 0) continue;

    hasContribution = true;

    if (target > 0) {
      // 미달 부분에 기여하는 양 (목표까지 남은 양 중 채워주는 양)
      const remaining = Math.max(0, target - current);
      const usefulContrib = Math.min(contribution, remaining);

      if (usefulContrib > 0) {
        benefitScore += (usefulContrib / max) * 100 * SHORTFALL_WEIGHT * 1000;
      }

      // 목표 초과 부분 (페널티, 하지만 즉사 아님)
      const overflow = Math.max(0, (current + contribution) - target);
      if (overflow > 0) {
        penaltyScore += (overflow / max) * 100 * OVERFLOW_WEIGHT * 500;
      }
    } else {
      benefitScore += (contribution / max) * 100 * 100;
    }
  }

  if (!hasContribution) return -1;

  const gradeScore = GRADE_RANK[sailor.등급] || 0;
  const netScore = benefitScore - penaltyScore;

  // 순점수가 음수여도 배치 가능 (swap 단계에서 개선 가능)
  // 단, 기여 자체가 0이면 -1
  return 1_000_000 + netScore + gradeScore;
}

export function calculateStatWeightScore(
  sailor: Sailor,
  currentLevels: Record<string, number>,
  statConfig: StatWeightConfig
): number {
  const hasExpSkill = Object.keys(SKILL_MAX_LEVELS).some(
    sk => getSailorSkillLevel(sailor, sk) > 0
  );
  if (!hasExpSkill) return -1;

  // 유효 기여가 하나도 없으면 탈락
  if (hasNoUsefulContribution(sailor, currentLevels)) return -1;

  const contrib = getSailorStatContribution(sailor, currentLevels);

  if (contrib.combat <= 0 && contrib.observation <= 0 && contrib.gathering <= 0) {
    return -1;
  }

  const weightTotal = statConfig.combat + statConfig.observation + statConfig.gathering;

  let statScore = 0;
  if (contrib.combat > 0 || contrib.observation > 0 || contrib.gathering > 0) {
    if (weightTotal > 0) {
      statScore =
        contrib.combat * (statConfig.combat / weightTotal) +
        contrib.observation * (statConfig.observation / weightTotal) +
        contrib.gathering * (statConfig.gathering / weightTotal);
    } else {
      statScore = contrib.combat + contrib.observation + contrib.gathering;
    }
  }

  const gradeScore = (GRADE_RANK[sailor.등급] || 0) * 100;
  return 1_000_000 + Math.round(statScore * 10_000) + gradeScore;
}

export function getSupplyStat(sailor: Sailor): number { return Number(sailor.보급) || 0; }
export function getBaseScore(sailor: Sailor, prioritizeJob: boolean): number { return GRADE_RANK[sailor.등급] || 0; }
export function getTradeStatSum(sailor: Sailor): number { return 0; }
export function hasAnyTargetSkill(sailor: Sailor, skills: string[]): boolean {
  return skills.some(sk => getSailorSkillLevel(sailor, sk) > 0);
}
