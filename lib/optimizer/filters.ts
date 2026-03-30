import { Sailor } from '@/types';
import { MAX_SKILL_LEVELS } from './rules';
import { getSailorSkillLevel } from './scoring';

/** 27종 탐험 스킬 중 1개 이상 보유 여부 */
export function hasExpSkill(s: Sailor): boolean {
  return Object.keys(MAX_SKILL_LEVELS).some(sk => getSailorSkillLevel(s, sk) > 0);
}

/**
 * 후보 선원 필터링
 * - 금지 선원 제거
 * - 교역 타입 제외
 * - 탐험 스킬 없는 선원 제외
 */
export function filterSailors(all: Sailor[], bannedIds: Set<number>) {
  const available = all.filter(s => !bannedIds.has(s.id));
  return {
    adventure: available.filter(s => s.타입 === '모험'),
    combat: available.filter(s => s.타입 === '전투'),
    trade: available.filter(s => s.타입 === '교역'),
    /** 옵티마이저용: 교역 제외 + 탐험 스킬 보유자만 */
    eligible: available.filter(s => s.타입 !== '교역' && hasExpSkill(s)),
    all: available
  };
}
