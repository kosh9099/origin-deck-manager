// [수정] 아래 3줄을 추가해야 에러가 사라집니다.
import { Sailor } from '@/types';
import { hasAnyTargetSkill } from '../scoring';
import { GRADE_RANK } from '../rules';

export const getBoardingCombatPriority = (s: Sailor, activeSkills: string[]) => {
  if (s.타입 !== '전투') return -1;
  const hasSk = hasAnyTargetSkill(s, activeSkills);
  const isBoard = s.직업 === "백병대";

  // 지휘관님 기존 로직 유지
  if (hasSk && isBoard) return 1000 + (GRADE_RANK[s.등급] || 0);
  if (!hasSk && isBoard) return 800 + (GRADE_RANK[s.등급] || 0); // 스킬 없어도 백병대면 오케이
  return -1;
};