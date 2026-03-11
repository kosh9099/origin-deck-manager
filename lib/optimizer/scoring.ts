import { Sailor, Ship } from '@/types';
import { GRADE_RANK, MAX_SKILL_LEVELS } from './rules';

// [Fix #1b] SKILL_MAX_LEVELS를 rules.ts에서 import하여 단일 진실의 원청으로 통합
const SKILL_MAX_LEVELS = MAX_SKILL_LEVELS;


/**
 * 선단 전체의 스킬 레벨을 합산하고 Max 제한(Clamping)을 적용하는 헬퍼 함수
 */
export function calculateFleetSkills(sailors: Sailor[]): Record<string, number> {
  const totals: Record<string, number> = {};
  
  // 1. 합산
  sailors.forEach(sailor => {
    if (!sailor) return;
    Object.keys(SKILL_MAX_LEVELS).forEach(skill => {
      const level = getSailorSkillLevel(sailor, skill);
      if (level > 0) {
        totals[skill] = (totals[skill] || 0) + level;
      }
    });
  });

  // 2. Max 제한 적용 (절대 수치 10 및 개별 Max 참조)
  const clamped: Record<string, number> = {};
  for (const skill in totals) {
    const max = Math.min(10, SKILL_MAX_LEVELS[skill] || 10);
    clamped[skill] = Math.min(totals[skill], max);
  }
  return clamped;
}

/**
 * 항해사의 데이터에서 스킬 레벨을 정밀 추출합니다. (규칙: 기본 1, 'LV2' 또는 'LV 2' 포함 시 2)
 */
export function getSailorSkillLevel(sailor: Sailor, skillName: string): number {
  if (!sailor) return 0;
  
  // 1. 프론트엔드에서 미리 파싱해둔 숫자형이 있는지 확인
  if (sailor[skillName] !== undefined && typeof sailor[skillName] === 'number') {
    return sailor[skillName];
  }

  // 2. 원시 데이터 텍스트 파싱 매칭 ('LV2' 정규식 엄격 적용)
  // 스킬명 뒤에 띄어쓰기가 있든 없든 LV2를 찾아내는 정규식
  const lv2Regex = new RegExp(`^${skillName.replace(/\s+/g, "\\s*")}\\s*LV2$`, "i");
  const baseRegex = new RegExp(`^${skillName.replace(/\s+/g, "\\s*")}$`, "i");

  for (const key in sailor) {
    const val = sailor[key];
    if (typeof val === 'string') {
      const trimmedVal = val.trim();
      if (lv2Regex.test(trimmedVal)) return 2;
      if (baseRegex.test(trimmedVal)) return 1;
      // [Fix #4] includes() fallback 제거: 부분 일치 오탐 방지 (실제 데이터는 page.tsx에서 숫자로 전처리됨)
    }
  }

  return 0;
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
  let totalScore = 0;
  let hasContribution = false;
  // [근본 원인 #1 수정] 목표 스킬이 있을 때 해당 스킬에 기여하는지 별도 추적
  let contributesToTarget = false;

  // 목표 스킬이 하나라도 설정되어 있는지 확인
  const hasActiveTargets = Object.values(targetLevels).some(v => v > 0);

  // 모든 육탐 스킬에 대해 평가 수행
  for (const sk in SKILL_MAX_LEVELS) {
    const sailorLvl = getSailorSkillLevel(sailor, sk);
    if (sailorLvl <= 0) continue;

    const max = Math.min(10, SKILL_MAX_LEVELS[sk] || 10);
    const target = targetLevels[sk] || 0;
    const current = currentLevels[sk] || 0;

    // 1. 기여도 계산 (상한선 미달성 시에만 기여 인정)
    const remainingToMax = Math.max(0, max - current);
    const contribution = Math.min(sailorLvl, remainingToMax);

    if (contribution > 0) {
      hasContribution = true;
      // 가중치: 목표 설정 스킬은 최대 100배, 미설정 스킬은 1배
      const weight = target > 0 ? (target * 10) : 1;
      totalScore += (contribution * 1000 * weight);

      // [핵심] 이 스킬이 목표 스킬이고 기여도가 있으면 마킹
      if (target > 0) {
        contributesToTarget = true;
      }
    }

    // 2. 낭비 페널티 (max 초과)
    const overflow = Math.max(0, (current + sailorLvl) - max);
    if (overflow > 0) {
      totalScore -= (overflow * 5000);
    }

    // target 초과 페널티 (max 초과분과 중복 적용 방지)
    if (target > 0) {
      const targetOverflow = Math.max(0, Math.min(current + sailorLvl, max) - target);
      if (targetOverflow > 0) {
        totalScore -= (targetOverflow * 1000);
      }
    }
  }

  // 기여 스킬 자체가 없으면 배제
  if (!hasContribution) return -1;

  // [근본 원인 #1 수정] 목표 스킬이 설정된 상태에서 목표 스킬에 기여가 전혀 없으면 배제
  // → 목표 스킬 항해사가 소진되면 나머지 슬롯은 자동으로 공석이 됨 (근본 원인 #2도 해결)
  if (hasActiveTargets && !contributesToTarget) return -1;

  // 등급 보너스 (동점자 처리용)
  const gradeScore = GRADE_RANK[sailor.등급] || 0;

  // 최종 점수: 기본 100만점 + 가중치 합산 + 등급 보너스
  return 1_000_000 + totalScore + gradeScore;
}

// 기존 인터페이스 유지
export function getSupplyStat(sailor: Sailor): number { return Number(sailor.보급) || 0; }
export function getBaseScore(sailor: Sailor, prioritizeJob: boolean): number { return GRADE_RANK[sailor.등급] || 0; }
export function getTradeStatSum(sailor: Sailor): number { return 0; }
export function hasAnyTargetSkill(sailor: Sailor, skills: string[]): boolean {
  return skills.some(sk => getSailorSkillLevel(sailor, sk) > 0);
}