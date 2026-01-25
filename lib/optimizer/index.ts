import { Sailor, ShipConfig, OptimizerOptions } from '@/types';
import { filterSailors } from './filters';
import { initFleet } from './strategies/base';
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
  // 1. 금지 항해사 필터링 (필수 항해사는 filters.ts에서 걸러지지 않으므로 여기서 처리됨)
  const { all } = filterSailors(sailors, bannedIds);
  const usedIds = new Set<number>();
  
  const currentLevels: Record<string, number> = {};
  Object.keys(MAX_SKILL_LEVELS).forEach(sk => currentLevels[sk] = 0);

  const ships = fleetConfig.map((_, i) => initFleet(fleetConfig, i));

  // 2. 제독 강제 배치
  const mainAdmiral = all.find(s => s.id === selectedAdmiralId);
  if (mainAdmiral) {
    ships[0].admiral = mainAdmiral;
    usedIds.add(mainAdmiral.id);
    Object.keys(MAX_SKILL_LEVELS).forEach(sk => {
      currentLevels[sk] += getSailorSkillLevel(mainAdmiral, sk);
    });
  }

  /**
   * [배치 우선순위 계산]
   */
  const getPriority = (s: Sailor, isCombatSlot: boolean) => {
    const isEssential = essentialIds.has(s.id);

    // A. [절대 규칙] 타입 제한
    // 전투 슬롯엔 전투만, 일반 슬롯엔 전투 금지 (이건 필수여도 지켜야 함)
    if (isCombatSlot && s.타입 !== '전투') return -1;
    if (!isCombatSlot && s.타입 === '전투') return -1;

    // [수정 1] 교역 옵션이 꺼져 있어도, '필수 항해사'라면 예외적으로 허용
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
        // 목표가 높을수록 가중치 (최대 50만점)
        const weight = target > 0 ? (50000 * target) : 10; 
        skillScore += effectiveLv * weight;
      }
    });

    // [수정 2] 필수 항해사 VIP 프리패스 (가장 중요!)
    // 스킬 점수가 0점이어도, 백병대가 아니어도 무조건 채용되도록 100억 점 부여
    if (isEssential) {
        // 100억 점 + 스킬 점수 (같은 필수끼리 경쟁 시 스킬 좋은 쪽 우대)
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