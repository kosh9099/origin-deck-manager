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
  // 1. 초기 필터링
  const { all } = filterSailors(sailors, bannedIds);
  const usedIds = new Set<number>();
  
  // 2. 현재 함대 스킬 합계 (실시간 업데이트용)
  const currentLevels: Record<string, number> = {};
  Object.keys(MAX_SKILL_LEVELS).forEach(sk => currentLevels[sk] = 0);

  // 3. 목표치 확장 (카테고리 목표 반영)
  const expandedTargets: Record<string, number> = { ...targetLevels };
  Object.entries(EXPLORATION_STATS).forEach(([category, skills]) => {
    const categoryGoal = targetLevels[category] || 0;
    if (categoryGoal > 0) {
      skills.forEach(skill => {
        expandedTargets[skill.name] = Math.min(10, Math.max(expandedTargets[skill.name] || 0, categoryGoal));
      });
    }
  });

  const totalTargetSum = Object.values(expandedTargets).reduce((a, b) => a + b, 0);
  if (totalTargetSum === 0) {
    throw new Error("스킬을 설정해주세요.");
  }

  // 4. 함대 슬롯 생성
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

  // 5. 제독 배치 및 실시간 레벨 초기화
  const mainAdmiral = all.find(s => s.id === selectedAdmiralId);
  if (mainAdmiral && ships[0]) {
    ships[0].admiral = mainAdmiral;
    usedIds.add(mainAdmiral.id);
    Object.keys(MAX_SKILL_LEVELS).forEach(sk => {
      currentLevels[sk] += getSailorSkillLevel(mainAdmiral, sk);
    });
  }

  // 6. 우선순위 결정 함수 (등급 기반 동점자 처리 및 실시간 티어 반영)
  const getPriority = (s: Sailor, isCombatSlot: boolean) => {
    if (usedIds.has(s.id)) return -1;
    if (essentialIds.has(s.id)) return 20_000_000; // 필수 항해사 최우선

    if (isCombatSlot) {
      if (s.타입 !== '전투' || (s.등급 !== 'S+' && s.직업 !== "백병대")) return -1;
    } else {
      if (s.타입 === '전투') return -1;
      if (!options.includeTrade && s.타입 === '교역') return -1;
    }
    
    // scoring.ts의 수정된 티어 로직 호출
    return calculateTierScore(s, currentLevels, expandedTargets);
  };

  // 7. 1차 슬롯 배치 실행
  fillFleetSlots(ships, all, usedIds, currentLevels, getPriority);

  // ----------------------------------------------------------------
  // 8. 사후 최적화 (정밀 솎아내기): 델타 업데이트 방식
  // ----------------------------------------------------------------
  
  let deployedSailors: { sailor: Sailor, shipIdx: number, slotType: 'adventure' | 'combat', slotIdx: number }[] = [];
  ships.forEach((ship, sIdx) => {
    ['adventure', 'combat'].forEach(type => {
      const slotType = type as 'adventure' | 'combat';
      ship[slotType].forEach((sailor, slIdx) => {
        if (sailor && !essentialIds.has(sailor.id) && sailor.id !== selectedAdmiralId) {
          deployedSailors.push({ sailor, shipIdx: sIdx, slotType, slotIdx: slIdx });
        }
      });
    });
  });

  // 등급 및 기여도 점수가 낮은 사람부터 제거 시도
  deployedSailors.sort((a, b) => {
    const scoreA = calculateTierScore(a.sailor, currentLevels, expandedTargets);
    const scoreB = calculateTierScore(b.sailor, currentLevels, expandedTargets);
    return scoreA - scoreB; 
  });

  // 목표 유지 가능 여부 확인 후 불필요 인원 제거
  deployedSailors.forEach(({ sailor, shipIdx, slotType, slotIdx }) => {
    let canRemove = true;
    for (const sk in expandedTargets) {
      const lv = getSailorSkillLevel(sailor, sk);
      if (lv > 0) {
        if (currentLevels[sk] - lv < expandedTargets[sk]) {
          canRemove = false;
          break;
        }
      }
    }

    if (canRemove) {
      Object.keys(MAX_SKILL_LEVELS).forEach(sk => {
        currentLevels[sk] -= getSailorSkillLevel(sailor, sk);
      });
      ships[shipIdx][slotType][slotIdx] = null;
      usedIds.delete(sailor.id);
    }
  });

  return { ships };
}