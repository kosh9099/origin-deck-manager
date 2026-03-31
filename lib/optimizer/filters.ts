import { Sailor } from '@/types';
import { MAX_SKILL_LEVELS } from './rules';
import { getSailorSkillLevel } from './scoring';

/** 27종 탐험 스킬 중 1개 이상 보유 여부 */
export function hasExpSkill(s: Sailor): boolean {
  return Object.keys(MAX_SKILL_LEVELS).some(sk => getSailorSkillLevel(s, sk) > 0);
}

/** 전투선실 자격: S+ 등급 OR 백병대 OR 수석 호위기사 */
export function isQualifiedForCombat(s: Sailor): boolean {
  return s.등급 === 'S+' || s.직업 === '백병대' || s.직업 === '수석 호위기사';
}

/** 전투선실 배치 가능 여부 (Phase 2/3용: 타입+자격+탐험스킬) */
export function canFillCombatSlot(s: Sailor): boolean {
  return s.타입 === '전투' && isQualifiedForCombat(s) && hasExpSkill(s);
}

/** 모험선실 배치 가능 여부 (Phase 2/3용: 타입+탐험스킬) */
export function canFillAdventureSlot(s: Sailor): boolean {
  return s.타입 === '모험' && hasExpSkill(s);
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
