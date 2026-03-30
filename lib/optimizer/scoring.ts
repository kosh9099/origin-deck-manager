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
// 전역 편차 함수: 목표 대비 편차 + 낭비 페널티
// rawLevels = 클램핑 안 한 합산 (낭비 감지용)
// ════════════════════════════════════════════════════════════════
const SHORTFALL_WEIGHT = 3.0;
const OVERFLOW_WEIGHT = 1.0;
const WASTE_WEIGHT = 2.0;  // 맥스 초과 낭비 페널티

export function calculateGlobalDeviation(
  clampedLevels: Record<string, number>,
  targetLevels: Record<string, number>,
  rawLevels?: Record<string, number>
): number {
  let total = 0;

  for (const sk in targetLevels) {
    const target = targetLevels[sk];
    if (target <= 0) continue;
    const current = clampedLevels[sk] || 0;
    const diff = current - target;
    if (diff < 0) {
      total += Math.abs(diff) * SHORTFALL_WEIGHT;
    } else if (diff > 0) {
      total += diff * OVERFLOW_WEIGHT;
    }
  }

  // 낭비 페널티: rawLevels가 MAX를 초과하는 양
  if (rawLevels) {
    for (const sk in MAX_SKILL_LEVELS) {
      const raw = rawLevels[sk] || 0;
      const max = MAX_SKILL_LEVELS[sk] || 10;
      if (raw > max) {
        total += (raw - max) * WASTE_WEIGHT;
      }
    }
  }

  return total;
}

// ════════════════════════════════════════════════════════════════
// 선원 스킬 누적 헬퍼 (clamped)
// ════════════════════════════════════════════════════════════════
export function addSailorSkills(sailor: Sailor, currentLevels: Record<string, number>): void {
  for (const sk in MAX_SKILL_LEVELS) {
    const lvl = getSailorSkillLevel(sailor, sk);
    if (lvl > 0) {
      currentLevels[sk] = Math.min((currentLevels[sk] || 0) + lvl, MAX_SKILL_LEVELS[sk]);
    }
  }
}

// raw 합산 (클램핑 없음, 낭비 추적용)
export function addSailorSkillsRaw(sailor: Sailor, rawLevels: Record<string, number>): void {
  for (const sk in MAX_SKILL_LEVELS) {
    const lvl = getSailorSkillLevel(sailor, sk);
    if (lvl > 0) {
      rawLevels[sk] = (rawLevels[sk] || 0) + lvl;
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
export function hasNoUsefulContribution(sailor: Sailor, currentLevels: Record<string, number>): boolean {
  for (const sk in MAX_SKILL_LEVELS) {
    const lvl = getSailorSkillLevel(sailor, sk);
    if (lvl > 0) {
      const max = MAX_SKILL_LEVELS[sk] || 10;
      const current = currentLevels[sk] || 0;
      if (current < max) return false;
    }
  }
  return true;
}

// ════════════════════════════════════════════════════════════════
// 페널티 기반 스코어링 (낭비 페널티 포함)
// ════════════════════════════════════════════════════════════════
export function calculateTierScore(
  sailor: Sailor,
  currentLevels: Record<string, number>,
  targetLevels: Record<string, number>
): number {
  let benefitScore = 0;
  let penaltyScore = 0;
  let wastePenalty = 0;
  let hasContribution = false;

  for (const sk in MAX_SKILL_LEVELS) {
    const sailorLvl = getSailorSkillLevel(sailor, sk);
    if (sailorLvl <= 0) continue;

    const max = MAX_SKILL_LEVELS[sk] || 10;
    const target = targetLevels[sk] || 0;
    const current = currentLevels[sk] || 0;

    const usefulContribution = Math.min(sailorLvl, Math.max(0, max - current));
    const wastedLevels = sailorLvl - usefulContribution;

    // 낭비 레벨에 강한 페널티 (이미 맥스인 스킬에 추가되는 레벨)
    if (wastedLevels > 0) {
      wastePenalty += wastedLevels * 5000;
    }

    if (usefulContribution <= 0) continue;

    hasContribution = true;

    if (target > 0) {
      const remaining = Math.max(0, target - current);
      const usefulContrib = Math.min(usefulContribution, remaining);

      if (usefulContrib > 0) {
        benefitScore += (usefulContrib / max) * 100 * SHORTFALL_WEIGHT * 1000;
      }

      const overflow = Math.max(0, (current + usefulContribution) - target);
      if (overflow > 0) {
        penaltyScore += (overflow / max) * 100 * OVERFLOW_WEIGHT * 500;
      }
    } else {
      benefitScore += (usefulContribution / max) * 100 * 100;
    }
  }

  if (!hasContribution) return -1;

  const gradeScore = GRADE_RANK[sailor.등급] || 0;
  const netScore = benefitScore - penaltyScore - wastePenalty;

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

  if (hasNoUsefulContribution(sailor, currentLevels)) return -1;

  // 낭비 계산: 유효 기여 vs 전체 스킬 레벨
  let totalSailorLevels = 0;
  let wastedLevels = 0;
  for (const sk in MAX_SKILL_LEVELS) {
    const lvl = getSailorSkillLevel(sailor, sk);
    if (lvl > 0) {
      totalSailorLevels += lvl;
      const max = MAX_SKILL_LEVELS[sk] || 10;
      const current = currentLevels[sk] || 0;
      const waste = Math.max(0, (current + lvl) - max);
      wastedLevels += waste;
    }
  }

  // 낭비 비율이 높으면 대폭 감점
  const wasteRatio = totalSailorLevels > 0 ? wastedLevels / totalSailorLevels : 0;

  const contrib = getSailorStatContribution(sailor, currentLevels);

  if (contrib.combat <= 0 && contrib.observation <= 0 && contrib.gathering <= 0) {
    return -1;
  }

  const weightTotal = statConfig.combat + statConfig.observation + statConfig.gathering;

  let statScore = 0;
  if (weightTotal > 0) {
    statScore =
      contrib.combat * (statConfig.combat / weightTotal) +
      contrib.observation * (statConfig.observation / weightTotal) +
      contrib.gathering * (statConfig.gathering / weightTotal);
  } else {
    statScore = contrib.combat + contrib.observation + contrib.gathering;
  }

  // 낭비 비율 페널티 적용 (50% 이상 낭비면 점수 대폭 하락)
  const wastePenaltyMultiplier = Math.max(0.1, 1 - wasteRatio * 2);

  const gradeScore = (GRADE_RANK[sailor.등급] || 0) * 100;
  return 1_000_000 + Math.round(statScore * 10_000 * wastePenaltyMultiplier) + gradeScore;
}

export function getSupplyStat(sailor: Sailor): number { return Number(sailor.보급) || 0; }
export function getBaseScore(sailor: Sailor, prioritizeJob: boolean): number { return GRADE_RANK[sailor.등급] || 0; }
export function getTradeStatSum(sailor: Sailor): number { return 0; }
export function hasAnyTargetSkill(sailor: Sailor, skills: string[]): boolean {
  return skills.some(sk => getSailorSkillLevel(sailor, sk) > 0);
}
