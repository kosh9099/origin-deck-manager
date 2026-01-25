import { getTradeStatSum } from '../scoring';

export const getTradeAdvPriority = (s: Sailor, activeSkills: string[]) => {
  const hasSk = hasAnyTargetSkill(s, activeSkills);
  const isAdv = s.타입 === '모험';
  const isTrade = s.타입 === '교역';

  if (isAdv && hasSk) return 2000; // 모험 스킬보유 최우선
  if (isTrade && hasSk) return 1500; // 모험가로 부족할 때 교역 스킬보유
  
  // 남는 자리는 교역가 스탯순 (박물+보급+백병)
  if (isTrade) return 1000 + (getTradeStatSum(s) / 100);
  if (isAdv) return 500 + GRADE_RANK[s.등급];
  return -1;
};