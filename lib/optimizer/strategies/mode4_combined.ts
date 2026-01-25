import { Sailor } from '@/types';
import { hasAnyTargetSkill } from '../scoring';

export const getCombinedCombatPriority = (s: Sailor, activeSkills: string[]) => {
  if (s.타입 !== '전투') return -1;
  const isAdm = s.등급 === "S+";
  const isBoard = s.직업 === "백병대";
  const isSpec = s.직업 === "특공대";
  const hasSk = hasAnyTargetSkill(s, activeSkills);

  if (hasSk && isAdm) return 1100;
  if (hasSk && isBoard) return 1000;
  if (!hasSk && isBoard) return 900; // 스킬 미보유 백병대가 특공대보다 위
  if (hasSk && isSpec) return 800;
  if (!hasSk && isSpec) return 700;
  return -1;
};