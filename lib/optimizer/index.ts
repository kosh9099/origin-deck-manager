import { Sailor, ShipConfig, OptimizerOptions, Ship, EXPLORATION_STATS } from '@/types';
import { filterSailors } from './filters';
import { fillFleetSlots } from './placement';
import { getSailorSkillLevel, calculateTierScore } from './scoring';
import { MAX_SKILL_LEVELS } from './rules';

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
  
  const expandedTargets: Record<string, number> = { ...targetLevels };
  Object.entries(EXPLORATION_STATS).forEach(([category, skills]) => {
    const categoryGoal = targetLevels[category] || 0;
    if (categoryGoal > 0) {
      skills.forEach(skill => {
        expandedTargets[skill.name] = Math.min(10, Math.max(expandedTargets[skill.name] || 0, categoryGoal));
      });
    }
  });

  Object.keys(expandedTargets).forEach(sk => currentLevels[sk] = 0);

  const ships: Ship[] = fleetConfig.map(config => {
    const isFlagship = config.id === 1; 
    const advCount = Math.max(0, config.총선실 - config.전투선실 - (isFlagship ? 1 : 0));
    return { 
      id: config.id, 
      admiral: null, 
      adventure: Array(advCount).fill(null), 
      combat: Array(config.전투선실).fill(null) 
    };
  });

  const mainAdmiral = all.find(s => s.id === selectedAdmiralId);
  if (mainAdmiral && ships[0]) {
    ships[0].admiral = mainAdmiral;
    usedIds.add(mainAdmiral.id);
    Object.keys(expandedTargets).forEach(sk => {
      currentLevels[sk] += getSailorSkillLevel(mainAdmiral, sk);
    });
  }

  // 6. 우선순위 결정 함수: 타입 필터를 먼저 거친 후 필수 여부 판단
  const getPriority = (s: Sailor, isCombatSlot: boolean) => {
    if (usedIds.has(s.id)) return -1;

    // [로직 변경] 선실 타입에 따른 타입 제한을 최우선으로 적용
    if (isCombatSlot) {
      // 전투 선실: 무조건 전투 타입이어야 함
      if (s.타입 !== '전투') return -1;
      
      // 작가님 원칙: S+ 등급이거나 백병대 직업인 경우만 통과
      const isQualified = s.등급 === 'S+' || s.직업 === "백병대";
      if (!isQualified) return -1;
      
      // 통과된 인원 중 필수 항해사라면 최상위 점수, 아니면 티어 점수
      if (essentialIds.has(s.id)) return 20_000_000;
      return calculateTierScore(s, currentLevels, expandedTargets);

    } else {
      // 모험/교역 선실: 전투 타입은 절대 진입 불가
      if (s.타입 === '전투') return -1;
      if (!options.includeTrade && s.타입 === '교역') return -1;
      
      // 통과된 인원 중 필수 항해사라면 최상위 점수, 아니면 티어 점수
      if (essentialIds.has(s.id)) return 20_000_000;
      return calculateTierScore(s, currentLevels, expandedTargets);
    }
  };

  fillFleetSlots(ships, all, usedIds, currentLevels, getPriority);

  // 7. 사후 최적화 (정제 루프): 델타 업데이트 방식
  let deployed: { sailor: Sailor, sIdx: number, field: 'adventure' | 'combat', slIdx: number }[] = [];
  ships.forEach((ship, sIdx) => {
    ['adventure', 'combat'].forEach(type => {
      const field = type as 'adventure' | 'combat';
      ship[field].forEach((sailor, slIdx) => {
        if (sailor && !essentialIds.has(sailor.id) && sailor.id !== selectedAdmiralId) {
          deployed.push({ sailor, sIdx, field, slIdx });
        }
      });
    });
  });

  deployed.sort((a, b) => 
    calculateTierScore(a.sailor, currentLevels, expandedTargets) - 
    calculateTierScore(b.sailor, currentLevels, expandedTargets)
  );

  deployed.forEach(({ sailor, sIdx, field, slIdx }) => {
    let canRemove = true;
    for (const sk in expandedTargets) {
      const lv = getSailorSkillLevel(sailor, sk);
      if (lv > 0 && (currentLevels[sk] - lv) < expandedTargets[sk]) {
        canRemove = false;
        break;
      }
    }
    if (canRemove) {
      Object.keys(expandedTargets).forEach(sk => currentLevels[sk] -= getSailorSkillLevel(sailor, sk));
      (ships[sIdx] as any)[field][slIdx] = null;
      usedIds.delete(sailor.id);
    }
  });

  // 8. 선실 압축: 빈 공간(null) 제거
  ships.forEach(ship => {
    ['adventure', 'combat'].forEach(type => {
      const field = type as 'adventure' | 'combat';
      const originalLen = ship[field].length;
      const compacted = ship[field].filter(Boolean);
      while (compacted.length < originalLen) compacted.push(null);
      ship[field] = compacted as any;
    });
  });

  return { ships };
}