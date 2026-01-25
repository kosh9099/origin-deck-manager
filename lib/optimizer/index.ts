import { Sailor, ShipConfig, OptimizerOptions, Ship, EXPLORATION_STATS } from '@/types'; // [수정] EXPLORATION_STATS 추가
import { filterSailors } from './filters';
import { fillFleetSlots } from './placement';
import { getSailorSkillLevel, getTradeStatSum } from './scoring';
import { ADMIRAL_GRADE, GRADE_RANK, MAX_SKILL_LEVELS } from './rules';

export function generateOptimizedFleet(
  sailors: Sailor[],
  essentialIds: Set<number>,
  bannedIds: Set<number>,
  fleetConfig: ShipConfig[],
  selectedAdmiralId: number,
  targetLevels: Record<string, number>,
  options: OptimizerOptions
) {
  const { all } = filterSailors(sailors, bannedIds);
  const usedIds = new Set<number>();
  
  const currentLevels: Record<string, number> = {};
  Object.keys(MAX_SKILL_LEVELS).forEach(sk => currentLevels[sk] = 0);

  // [추가] 1. 카테고리 목표치를 개별 스킬 목표치로 번역 (UI 대응)
  // '전리품': 10 설정 시 -> '투쟁적인 탐험가': 10 등으로 확장됩니다.
  const expandedTargets: Record<string, number> = { ...targetLevels };
  Object.entries(EXPLORATION_STATS).forEach(([category, skills]) => {
    const categoryGoal = targetLevels[category] || 0;
    if (categoryGoal > 0) {
      skills.forEach(skill => {
        expandedTargets[skill.name] = Math.max(expandedTargets[skill.name] || 0, categoryGoal);
      });
    }
  });

  // 2. 함대 빈 슬롯 생성 (의자 배치)
  const ships: Ship[] = fleetConfig.map(config => {
    const isFlagship = config.id === 1; 
    const advCount = Math.max(0, config.총선실 - config.전투선실 - (isFlagship ? 1 : 0));
    const cbtCount = Math.max(0, config.전투선실);

    return {
      id: config.id,
      admiral: null,
      adventure: Array(advCount).fill(null),
      combat: Array(cbtCount).fill(null)
    };
  });

  // 3. 제독 강제 배치
  const mainAdmiral = all.find(s => s.id === selectedAdmiralId);
  if (mainAdmiral && ships[0]) {
    ships[0].admiral = mainAdmiral;
    usedIds.add(mainAdmiral.id);
    Object.keys(MAX_SKILL_LEVELS).forEach(sk => {
      currentLevels[sk] += getSailorSkillLevel(mainAdmiral, sk);
    });
  }

  const getPriority = (s: Sailor, isCombatSlot: boolean) => {
    const isEssential = essentialIds.has(s.id);
    const sType = (s.타입 || '').trim();
    const sJob = (s.직업 || '').trim();
    const sGrade = (s.등급 || '').trim();

    if (isCombatSlot && sType !== '전투') return -1;
    if (!isCombatSlot && sType === '전투') return -1;

    if (!isCombatSlot && sType === '교역' && !options.includeTrade && !isEssential) {
        return -1;
    }

    // 4. 스킬 점수 계산 (확장된 목표치 사용)
    let skillScore = 0;
    Object.keys(MAX_SKILL_LEVELS).forEach(sk => {
      const lv = getSailorSkillLevel(s, sk);
      if (lv <= 0) return;

      const maxCap = MAX_SKILL_LEVELS[sk] || 10; 
      const current = currentLevels[sk] || 0;
      if (current >= maxCap) return;

      // [수정] 확장된 목표 스킬 점수 반영
      const target = expandedTargets[sk] || 0;
      const needed = maxCap - current;
      const effectiveLv = Math.min(lv, needed);

      if (effectiveLv > 0) {
        // 목표가 설정된 스킬이면 가중치를 대폭 상향 (100만 단위)
        // 이렇게 해야 전투 스킬 레벨이 높아도 목표 탐험 스킬 1레벨에게 밀립니다.
        const weight = target > 0 ? (1000000 * target) : 1; 
        skillScore += effectiveLv * weight;
      }
    });

    if (isEssential) {
        return 10000000000 + skillScore + (GRADE_RANK[sGrade] || 0);
    }

    const isBoarder = sJob === "백병대";
    const isSpec = sJob === "특공대";
    const hasSk = skillScore > 0;

    if (isCombatSlot) {
      if (sGrade === ADMIRAL_GRADE && hasSk) return 1000000000 + skillScore; 
      if (isBoarder && hasSk) return 900000000 + skillScore;
      if (isSpec && hasSk) return 800000000 + skillScore;
      
      if (options.includeBoarding && isBoarder) return 2000000 + (GRADE_RANK[sGrade] || 0);
      if (options.includeSpecialForces && isSpec) return 1000000 + (GRADE_RANK[sGrade] || 0);
      return -1;
    } 
    else {
      const isAdv = sType === '모험';
      const isTrade = sType === '교역';

      if (isAdv && hasSk) return 900000000 + skillScore;
      if (options.includeTrade && isTrade && hasSk) return 800000000 + skillScore;
      
      return 100 + (getTradeStatSum(s) / 1000) + (GRADE_RANK[sGrade] || 0);
    }
  };

  fillFleetSlots(ships, all, usedIds, currentLevels, getPriority);

  console.log("배치 결과 디버그:", ships);

  return { ships };
}