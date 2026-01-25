export const getBoardingCombatPriority = (s: Sailor, activeSkills: string[]) => {
  if (s.타입 !== '전투') return -1;
  const hasSk = hasAnyTargetSkill(s, activeSkills);
  const isBoard = s.직업 === "백병대";

  if (hasSk && isBoard) return 1000 + GRADE_RANK[s.등급];
  if (!hasSk && isBoard) return 800 + GRADE_RANK[s.등급]; // 스킬 없어도 백병대면 오케이
  return -1;
};