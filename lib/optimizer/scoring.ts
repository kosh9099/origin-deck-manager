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

export function calculateTierScore(
  sailor: Sailor,
  currentLevels: Record<string, number>,
  targetLevels: Record<string, number>
): number {
  let totalScore = 0;
  let hasContribution = false;
  let contributesToTarget = false;

  const hasActiveTargets = Object.values(targetLevels).some(v => v > 0);

  if (hasActiveTargets) {
    const contributesToUnmetTarget = Object.entries(targetLevels).some(([sk, target]) => {
      if (target <= 0) return false;
      const max = SKILL_MAX_LEVELS[sk] ?? 10;
      const current = Math.min(currentLevels[sk] || 0, max);
      return current < target && getSailorSkillLevel(sailor, sk) > 0;
    });
    if (!contributesToUnmetTarget) return -1;
  }

  for (const sk in SKILL_MAX_LEVELS) {
    const sailorLvl = getSailorSkillLevel(sailor, sk);
    if (sailorLvl <= 0) continue;

    const max = Math.min(10, SKILL_MAX_LEVELS[sk] || 10);
    const target = targetLevels[sk] || 0;
    const current = Math.min(currentLevels[sk] || 0, max);

    // [Fix 6번] 맥스 레벨 초과 시 무조건 원천 차단 (배치 불가)
    if (current + sailorLvl > max) {
      return -1;
    }

    const remainingToMax = Math.max(0, max - current);
    const contribution = Math.min(sailorLvl, remainingToMax);

    if (contribution > 0) {
      hasContribution = true;
      // [Fix 7번] 레벨 수치가 아닌, 맥스 레벨 대비 채워준 비율(%)을 점수화
      const percentContributed = (contribution / max) * 100;
      const targetWeight = target > 0 ? (target / max) : 1;

      // % 비율 기반으로 점수 부여 (맥스 2짜리 1렙 = 50%, 맥스 10짜리 1렙 = 10%)
      totalScore += percentContributed * 1000 * targetWeight;

      if (target > 0) contributesToTarget = true;
    }

    if (target > 0) {
      const effectiveAfter = Math.min(current + sailorLvl, max);
      const effectiveBefore = Math.min(current, max);
      const actualContribution = effectiveAfter - effectiveBefore;
      const targetOverflow = Math.max(0, effectiveBefore + actualContribution - target);
      if (targetOverflow > 0) return -1; // 목표 레벨 초과도 원천 차단
    }
  }

  if (!hasContribution) return -1;
  if (hasActiveTargets && !contributesToTarget) return -1;

  const gradeScore = GRADE_RANK[sailor.등급] || 0;
  return 1_000_000 + totalScore + gradeScore;
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

  // [Fix 6번] 모드 B에서도 스킬이 하나라도 맥스를 초과하면 즉시 탈락 (원천 차단)
  for (const sk in SKILL_MAX_LEVELS) {
    const sailorLvl = getSailorSkillLevel(sailor, sk);
    if (sailorLvl > 0) {
      const max = Math.min(10, SKILL_MAX_LEVELS[sk] || 10);
      const current = Math.min(currentLevels[sk] || 0, max);
      if (current + sailorLvl > max) {
        return -1;
      }
    }
  }

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

// ════════════════════════════════════════════════════════════════
// Phase 2용: 유연 배치 스코어링 (target 초과 = 감점, -1 아님)
// ════════════════════════════════════════════════════════════════

export function calculateTierScoreSoft(
  sailor: Sailor,
  currentLevels: Record<string, number>,
  targetLevels: Record<string, number>
): number {
  let totalScore = 0;
  let overflowPenalty = 0;
  let hasContribution = false;

  for (const sk in MAX_SKILL_LEVELS) {
    const sailorLvl = getSailorSkillLevel(sailor, sk);
    if (sailorLvl <= 0) continue;

    const max = MAX_SKILL_LEVELS[sk];
    const current = currentLevels[sk] || 0;

    hasContribution = true;

    // MAX 초과분은 클램핑되어 낭비되므로 감점만 (차단하지 않음)
    if (current + sailorLvl > max) {
      overflowPenalty += (current + sailorLvl - max) * 3000;
    }
    const target = targetLevels[sk] || 0;

    // target 초과 → 감점만 (배치는 허용, 스왑으로 교정)
    if (target > 0 && current + sailorLvl > target) {
      overflowPenalty += (current + sailorLvl - target) * 5000;
    }

    const contribution = Math.min(sailorLvl, max - current);
    const percentContributed = (contribution / max) * 100;
    const targetWeight = target > 0 ? (target / max) : 1;
    totalScore += percentContributed * 1000 * targetWeight;
  }

  if (!hasContribution) return -1;

  const gradeScore = GRADE_RANK[sailor.등급] || 0;
  return 1_000_000 + totalScore - overflowPenalty + gradeScore;
}

// ════════════════════════════════════════════════════════════════
// Phase 3용: 함대 전체 목적함수 (스왑 최적화에 사용)
// ════════════════════════════════════════════════════════════════

/**
 * 스킬 모드 목적함수: 목표값에 "정확히" 도달하도록 유도
 *
 * 페널티 구조:
 *   - 미도달(undershoot): -1,000,000 × 부족 레벨 (절대 최우선)
 *   - 초과(overshoot):    -200,000 × 초과 레벨 (낭비 = 슬롯 낭비)
 *   - MAX 초과:           -50,000 × 초과 레벨 (비목표 스킬 포함)
 *
 * 0 = 모든 목표 스킬이 정확히 target에 도달, 초과 없음
 */
export function calcSkillModeObjective(
  unclampedLevels: Record<string, number>,
  targetLevels: Record<string, number>
): number {
  let score = 0;

  // 1. 목표 스킬: 미도달 + 초과 페널티
  for (const sk in targetLevels) {
    const target = targetLevels[sk] || 0;
    if (target <= 0) continue;

    const unclamped = unclampedLevels[sk] || 0;
    const max = MAX_SKILL_LEVELS[sk] || 10;
    const clamped = Math.min(unclamped, max);

    // 미도달: 클램핑 기준 (게임에서 보이는 실제 레벨)
    if (clamped < target) {
      score -= (target - clamped) * 1_000_000;
    }

    // 초과: 목표를 넘긴 레벨은 슬롯 낭비 → 강한 페널티
    if (unclamped > target) {
      score -= (unclamped - target) * 200_000;
    }
  }

  // 2. 모든 스킬: MAX 초과는 어디서든 낭비
  for (const sk in MAX_SKILL_LEVELS) {
    const unclamped = unclampedLevels[sk] || 0;
    const max = MAX_SKILL_LEVELS[sk];
    if (unclamped > max) {
      score -= (unclamped - max) * 50_000;
    }
  }

  return score;
}

/**
 * 스탯 모드 목적함수: 함대 전체 스킬 레벨에서 스탯 합산 → 가중 점수
 */
export function calcStatModeObjective(
  currentLevels: Record<string, number>,
  statConfig: StatWeightConfig
): number {
  const totalStat = { combat: 0, observation: 0, gathering: 0 };

  for (const sk in MAX_SKILL_LEVELS) {
    const level = currentLevels[sk] || 0;
    if (level <= 0) continue;

    const clampedLevel = Math.min(level, MAX_SKILL_LEVELS[sk]);
    const stats = SKILL_STATS[sk]?.[clampedLevel as keyof (typeof SKILL_STATS)[string]];
    if (!stats) continue;

    totalStat.combat += stats.combat + (stats.pirate || 0) / 2 + (stats.beast || 0) / 2;
    totalStat.observation += stats.observation;
    totalStat.gathering += stats.gathering;
  }

  const weightTotal = statConfig.combat + statConfig.observation + statConfig.gathering;
  if (weightTotal > 0) {
    return totalStat.combat * (statConfig.combat / weightTotal)
      + totalStat.observation * (statConfig.observation / weightTotal)
      + totalStat.gathering * (statConfig.gathering / weightTotal);
  }
  return totalStat.combat + totalStat.observation + totalStat.gathering;
}

/**
 * 스탯 모드 + lootFirst 목적함수:
 * 전리품 스킬이 정확히 MAX가 아니면 엄청난 감점 → 스왑 시 전리품 절대 보호
 */
export function calcStatModeLootObjective(
  currentLevels: Record<string, number>,
  statConfig: StatWeightConfig,
  lootSkills: string[]
): number {
  let lootPenalty = 0;
  for (const sk of lootSkills) {
    const target = MAX_SKILL_LEVELS[sk] || 10;
    const current = currentLevels[sk] || 0;
    const diff = current - target;
    if (diff !== 0) {
      lootPenalty += Math.abs(diff) * 100_000;
    }
  }

  const statScore = calcStatModeObjective(currentLevels, statConfig);
  return statScore - lootPenalty;
}