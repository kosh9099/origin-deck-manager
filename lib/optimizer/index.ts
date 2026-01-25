import { Sailor, ShipConfig, OptimizerOptions, Ship } from '@/types'; // [수정] Ship 타입 추가
import { filterSailors } from './filters';
// initFleet 제거 (직접 생성함)
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
  // 1. 금지 항해사 필터링
  const { all } = filterSailors(sailors, bannedIds);
  const usedIds = new Set<number>();
  
  const currentLevels: Record<string, number> = {};
  Object.keys(MAX_SKILL_LEVELS).forEach(sk => currentLevels[sk] = 0);

  // [핵심 수정] initFleet 함수 대신 여기서 직접 ID를 포함하여 생성
  // 이 부분이 없어서 아까 'id is missing' 에러가 났던 것입니다.
  const ships: Ship[] = fleetConfig.map(config => ({
    id: config.id,           // [중요] ID 명시
    admiral: null,
    adventure: [],
    combat: []
  }));

  // 2. 제독 강제 배치
  const mainAdmiral = all.find(s => s.id === selectedAdmiralId);
  if (mainAdmiral && ships[0]) {
    ships[0].admiral = mainAdmiral;
    usedIds.add(mainAdmiral.id);
    Object.keys(MAX_SKILL_LEVELS).forEach(sk => {
      currentLevels[sk] += getSailorSkillLevel(mainAdmiral, sk);
    });
  }

  /**
   * [배치 우선순위 계산] - 지휘관님 로직 100% 유지
   */
  const getPriority = (s: Sailor, isCombatSlot: boolean) => {
    const isEssential = essentialIds.has(s.id);

    // A. [절대 규칙] 타입 제한
    if (isCombatSlot && s.타입 !== '전투') return -1;
    if (!isCombatSlot && s.타입 === '전투') return -1;

    // 교역 옵션 체크 (필수면 통과)
    if (!isCombatSlot && s.타입 === '교역' && !options.includeTrade && !isEssential) {
        return -1;
    }

    // B. 스킬 점수 계산
    let skillScore = 0;
    Object.keys(MAX_SKILL_LEVELS).forEach(sk => {
      const lv = getSailorSkillLevel(s, sk);
      if (lv <= 0) return;

      const maxCap = MAX_SKILL_LEVELS[sk] || 10; 
      const current = currentLevels[sk] || 0;

      if (current >= maxCap) return; // 만렙이면 점수 X

      const target = targetLevels[sk] || 0;
      const needed = maxCap - current;
      const effectiveLv = Math.min(lv, needed);

      if (effectiveLv > 0) {
        const weight = target > 0 ? (50000 * target) : 10; 
        skillScore += effectiveLv * weight;
      }
    });

    // 필수 항해사 VIP 프리패스
    if (isEssential) {
        return 10000000000 + skillScore + (GRADE_RANK[s.등급] || 0);
    }

    // --- 이하 일반 항해사 로직 ---

    const isBoarder = s.직업 === "백병대";
    const isSpec = s.직업 === "특공대";
    const hasSk = skillScore > 0;

    // C. [전투 선실]
    if (isCombatSlot) {
      if (s.등급 === ADMIRAL_GRADE && hasSk) return 1000000000 + skillScore; 
      if (isBoarder && hasSk) return 900000000 + skillScore;
      if (isSpec && hasSk) return 800000000 + skillScore;
      
      if (options.includeBoarding && isBoarder) return 2000000 + GRADE_RANK[s.등급];
      if (options.includeSpecialForces && isSpec) return 1000000 + GRADE_RANK[s.등급];

      return -1;
    } 
    
    // D. [일반 선실]
    else {
      const isAdv = s.타입 === '모험';
      const isTrade = s.타입 === '교역';

      if (isAdv && hasSk) return 900000000 + skillScore;
      if (options.includeTrade && isTrade && hasSk) return 800000000 + skillScore;
      
      return 100 + getTradeStatSum(s) / 1000;
    }
  };

  // 3. 엔진 가동
  fillFleetSlots(ships, all, usedIds, currentLevels, getPriority);

  return { ships };
}