import { Sailor } from '@/types';
import { ADMIRAL_GRADE, GRADE_RANK } from '../rules';
import { hasAnyTargetSkill } from '../scoring';

export const getBasicCombatPriority = (s: Sailor, activeSkills: string[]) => {
  if (s.타입 !== '전투') return -1;
  const hasSk = hasAnyTargetSkill(s, activeSkills);
  const isAdm = s.등급 === ADMIRAL_GRADE;
  const isBoard = s.직업 === "백병대";

  // 오직 스킬 보유 제독 및 백병대만 허용
  if (hasSk && (isAdm || isBoard)) return 1000 + GRADE_RANK[s.등급];
  return -1; 
};

export const getBasicAdvPriority = (s: Sailor, activeSkills: string[]) => {
  if (s.타입 !== '모험') return -1;
  const hasSk = hasAnyTargetSkill(s, activeSkills);
  return hasSk ? 1000 + GRADE_RANK[s.등급] : 100 + GRADE_RANK[s.등급];
};