import { Sailor, Ship } from '@/types';
import { GRADE_RANK, MAX_SKILL_LEVELS } from './rules';
import { SKILL_STATS } from './data/skillStats';
import type { StatWeightConfig } from '@/components/skill/StatWeightSettings';

const SKILL_MAX_LEVELS = MAX_SKILL_LEVELS;


/**
 * 선단 전체의 스킬 레벨을 합산하고 Max 제한(Clamping)을 적용하는 헬퍼 함수
 */
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

/**
 * 항해사의 데이터에서 스킬 레벨을 정밀 추출합니다.
 */
export function getSailorSkillLevel(sailor: Sailor, skillName: string): number {
  if (!sailor) return 0;

  if (sailor[skillName] !== undefined && typeof sailor[skillName] === 'number') {
    return sailor[skillName];
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

/**
 * [능력치 모드 전용]
 * 이 항해사가 배치될 때 함대 능력치(전투/관찰/채집)에 기여하는 추가분을 계산합니다.
 * SKILL_STATS 테이블 기준으로 "배치 전 레벨 → 배치 후 레벨" 차이를 반환합니다.
 */
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

    // [Fix] pirate와 beast도 전투 비중에 포함
    // → 해적 척결/사냥, 맹수 척결/사냥은 SKILL_STATS에서 combat=0, pirate/beast에만 기여
    // → 사용자가 "전투 비중"을 올리면 이 스킬들도 우선 배치되어야 함
    result.combat += (statsAfter.combat - (statsBefore?.combat ?? 0))
      + (statsAfter.pirate - (statsBefore?.pirate ?? 0))
      + (statsAfter.beast - (statsBefore?.beast ?? 0));
    result.observation += statsAfter.observation - (statsBefore?.observation ?? 0);
    result.gathering += statsAfter.gathering - (statsBefore?.gathering ?? 0);
  }

  return result;
}

/**
 * [모드 A — 스킬 개별 설정]
 * 기존 스킬 기여 점수 기반 배치 점수를 반환합니다.
 */
export function calculateTierScore(
  sailor: Sailor,
  currentLevels: Record<string, number>,
  targetLevels: Record<string, number>
): number {
  let totalScore = 0;
  let hasContribution = false;
  let contributesToTarget = false;

  const hasActiveTargets = Object.values(targetLevels).some(v => v > 0);

  for (const sk in SKILL_MAX_LEVELS) {
    const sailorLvl = getSailorSkillLevel(sailor, sk);
    if (sailorLvl <= 0) continue;

    const max = Math.min(10, SKILL_MAX_LEVELS[sk] || 10);
    const target = targetLevels[sk] || 0;
    const current = currentLevels[sk] || 0;

    const remainingToMax = Math.max(0, max - current);
    const contribution = Math.min(sailorLvl, remainingToMax);

    if (contribution > 0) {
      hasContribution = true;

      // [Fix E] 달성 비율 기반 가중치
      const weight = target > 0 ? Math.round((target / max) * 100) : 1;
      totalScore += contribution * 1000 * weight;

      if (target > 0) contributesToTarget = true;
    }

    // 낭비 페널티
    const overflow = Math.max(0, current + sailorLvl - max);
    if (overflow > 0) totalScore -= overflow * 5000;

    // [Fix D] target 초과 페널티
    if (target > 0) {
      const effectiveAfter = Math.min(current + sailorLvl, max);
      const effectiveBefore = Math.min(current, max);
      const actualContribution = effectiveAfter - effectiveBefore;
      const targetOverflow = Math.max(0, effectiveBefore + actualContribution - target);
      if (targetOverflow > 0) totalScore -= targetOverflow * 1000;
    }
  }

  if (!hasContribution) return -1;

  // 목표 스킬 기여 게이트 (모드 A 전용)
  if (hasActiveTargets && !contributesToTarget) return -1;

  const gradeScore = GRADE_RANK[sailor.등급] || 0;

  // [Fix F] 최소 1점 보장
  return Math.max(1, 1_000_000 + totalScore + gradeScore);
}

/**
 * [모드 B — 능력치 종합 설정]
 * 전투/관찰/채집 비중 가중치 기반 배치 점수를 반환합니다.
 *
 * 점수 구조:
 *   1순위 — 사용자 비중에 따른 능력치 기여 점수 (statScore)
 *   2순위 — 등급 보너스 (동점자 처리)
 *
 * [Fix] 전리품 스킬 항해사 처리:
 *   전리품 스킬은 combat/observation/gathering에 직접 기여하지 않음
 *   → contrib 합이 0이어도 탈락시키지 않고 최저 등급 점수 부여
 *   → 비중 기여 항해사들이 먼저 배치되고, 남은 슬롯을 전리품 항해사가 채움
 */
export function calculateStatWeightScore(
  sailor: Sailor,
  currentLevels: Record<string, number>,
  statConfig: StatWeightConfig
): number {
  // 육탐 스킬이 하나도 없으면 완전 배제
  const hasExpSkill = Object.keys(SKILL_MAX_LEVELS).some(
    sk => getSailorSkillLevel(sailor, sk) > 0
  );
  if (!hasExpSkill) return -1;

  const contrib = getSailorStatContribution(sailor, currentLevels);
  const weightTotal = statConfig.combat + statConfig.observation + statConfig.gathering;

  let statScore = 0;

  if (contrib.combat > 0 || contrib.observation > 0 || contrib.gathering > 0) {
    // 능력치 기여가 있는 경우 → 비중 적용
    if (weightTotal > 0) {
      statScore =
        contrib.combat * (statConfig.combat / weightTotal) +
        contrib.observation * (statConfig.observation / weightTotal) +
        contrib.gathering * (statConfig.gathering / weightTotal);
    } else {
      // 비중 미설정 시 단순 합산
      statScore = contrib.combat + contrib.observation + contrib.gathering;
    }
  }
  // 능력치 기여 0 (전리품 스킬 등) → statScore = 0
  // 탈락시키지 않고 등급 보너스만으로 최저 순위에 배치

  // [스케일 설계]
  // statScore * 10,000 → 능력치 1포인트 기여 = 10,000점
  // gradeScore * 100   → S+(5,000) / S(4,000) / A(3,000) / B(2,000) / C(1,000)
  //   → 같은 statScore일 때 등급 순서로 정렬
  //   → statScore 차이가 있으면 등급이 역전되지 않음
  const gradeScore = (GRADE_RANK[sailor.등급] || 0) * 100;

  return Math.max(1, 1_000_000 + Math.round(statScore * 10_000) + gradeScore);
}

// 기존 인터페이스 유지
export function getSupplyStat(sailor: Sailor): number { return Number(sailor.보급) || 0; }
export function getBaseScore(sailor: Sailor, prioritizeJob: boolean): number { return GRADE_RANK[sailor.등급] || 0; }
export function getTradeStatSum(sailor: Sailor): number { return 0; }
export function hasAnyTargetSkill(sailor: Sailor, skills: string[]): boolean {
  return skills.some(sk => getSailorSkillLevel(sailor, sk) > 0);
}