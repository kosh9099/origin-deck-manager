import { Sailor } from '@/types';
import { GRADE_RANK } from '../rules';
import { hasAnyTargetSkill } from '../scoring';

export const getSpecialCombatPriority = (s: Sailor, activeSkills: string[]) => {
  if (s.타입 !== '전투') return -1;
  const hasSk = hasAnyTargetSkill(s, activeSkills);
  const isBoard = s.직업 === "백병대";
  const isSpec = s.직업 === "특공대";

  if (hasSk && isBoard) return 1000 + GRADE_RANK[s.등급];
  if (hasSk && isSpec) return 900 + GRADE_RANK[s.등급]; // 스킬 있는 특공대
  if (!hasSk && isSpec) return 700 + GRADE_RANK[s.등급]; // 스킬 없는 특공대
  return -1;
};