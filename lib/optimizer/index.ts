import { Sailor, ShipConfig, OptimizerOptions, Ship } from '@/types';
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

  // 1. 함대 빈 슬롯 생성 (의자 갯수만큼 미리 null로 채워두기)
  const ships: Ship[] = fleetConfig.map(config => {
    const isFlagship = config.id === 1; 
    
    // 모험 선실 수 = 총 선실 - 전투 선실 (기함이면 제독 자리 1개 추가 제외)
    const advCount = Math.max(0, config.총선실 - config.전투선실 - (isFlagship ? 1 : 0));
    const cbtCount = Math.max(0, config.전투선실);

    return {
      id: config.id,
      admiral: null,
      // Array(n).fill(null)을 해줘야 '의자'가 생깁니다.
      adventure: Array(advCount).fill(null),
      combat: Array(cbtCount).fill(null)
    };
  });

  // 2. 제독 강제 배치
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

    let skillScore = 0;
    Object.keys(MAX_SKILL_LEVELS).forEach(sk => {
      const lv = getSailorSkillLevel(s, sk);
      if (lv <= 0) return;

      const maxCap = MAX_SKILL_LEVELS[sk] || 10; 
      const current = currentLevels[sk] || 0;
      if (current >= maxCap) return;

      const target = targetLevels[sk] || 0;
      const needed = maxCap - current;
      const effectiveLv = Math.min(lv, needed);

      if (effectiveLv > 0) {
        const weight = target > 0 ? (100000 * target) : 1; 
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

  // 3. 엔진 가동 (이제 의자가 있으니 항해사들이 앉을 것입니다!)
  fillFleetSlots(ships, all, usedIds, currentLevels, getPriority);

  console.log("배치 결과 디버그:", ships);

  return { ships };
}