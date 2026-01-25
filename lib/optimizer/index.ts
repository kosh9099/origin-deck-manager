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

  const ships: Ship[] = fleetConfig.map(config => ({
    id: config.id,
    admiral: null,
    adventure: [],
    combat: []
  }));

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
    
    // [데이터 방어] 공백 제거 및 undefined 방지
    const sType = (s.타입 || '').trim();
    const sJob = (s.직업 || '').trim();
    const sGrade = (s.등급 || '').trim();

    // A. 타입 제한 (전투 슬롯엔 전투만, 일반 슬롯엔 모험/교역만)
    if (isCombatSlot && sType !== '전투') return -1;
    if (!isCombatSlot && sType === '전투') return -1;

    // 교역 옵션 체크
    if (!isCombatSlot && sType === '교역' && !options.includeTrade && !isEssential) {
        return -1;
    }

    // B. 스킬 점수 계산
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
        // 목표가 설정된 스킬에 엄청난 가중치를 부여합니다.
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

    // C. 전투 선실 배치 로직
    if (isCombatSlot) {
      if (sGrade === ADMIRAL_GRADE && hasSk) return 1000000000 + skillScore; 
      if (isBoarder && hasSk) return 900000000 + skillScore;
      if (isSpec && hasSk) return 800000000 + skillScore;
      
      if (options.includeBoarding && isBoarder) return 2000000 + (GRADE_RANK[sGrade] || 0);
      if (options.includeSpecialForces && isSpec) return 1000000 + (GRADE_RANK[sGrade] || 0);

      // 아무 조건도 만족 못하면 전투 선실에서 탈락
      return -1;
    } 
    
    // D. 일반 선실 배치 로직
    else {
      const isAdv = sType === '모험';
      const isTrade = sType === '교역';

      // 스킬이 있으면 최우선 배치
      if (isAdv && hasSk) return 900000000 + skillScore;
      if (options.includeTrade && isTrade && hasSk) return 800000000 + skillScore;
      
      // 스킬이 없더라도 빈자리를 채우기 위해 기본 점수 부여 (탈락 방지)
      return 100 + (getTradeStatSum(s) / 1000) + (GRADE_RANK[sGrade] || 0);
    }
  };

  fillFleetSlots(ships, all, usedIds, currentLevels, getPriority);

  // [디버그] 배치가 끝난 후 결과를 콘솔에 출력
  console.log("배치 완료된 함대 상황:", ships);

  return { ships };
}