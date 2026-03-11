import { Sailor, ShipConfig, OptimizerOptions, Ship, EXPLORATION_STATS } from '@/types';
import { filterSailors } from './filters';
import { fillFleetSlots } from './placement';
import { getSailorSkillLevel, calculateTierScore, calculateFleetSkills } from './scoring';
import { MAX_SKILL_LEVELS } from './rules';

export function autoDeployFleet(
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

  console.log("=== OPTIMIZER START ===");
  console.log("targetLevels received:", targetLevels);
  console.log("expandedTargets computed:", expandedTargets);
  console.log("options:", options);

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

    // 핵심 육탐 스킬 보유 판별 함수
    const hasExpSkill = () => {
      return Object.keys(MAX_SKILL_LEVELS).some(sk => getSailorSkillLevel(s, sk) > 0);
    };

    if (isCombatSlot) {
      // 전투 선실: 무조건 전투 타입 + (제독 또는 백병대) + (육탐 스킬 1개 이상)
      if (s.타입 !== '전투') return -1;
      
      const isQualifiedRole = s.등급 === 'S+' || s.직업 === "백병대"; // 제독(S+) 또는 백병대
      if (!isQualifiedRole) return -1;
      
      if (!hasExpSkill()) return -1; // 육탐 스킬이 한 개도 없으면 탈락
      
      // 통과된 인원 중 필수 항해사라면 최상위 점수, 아니면 티어 점수
      if (essentialIds.has(s.id)) return 20_000_000;
      
      const score = calculateTierScore(s, currentLevels, expandedTargets);
      return score;

    } else {
      // 일반 선실 (모험/교역 등): 사용자가 설정한 로직에 따라 타입 제한
      // 원칙: "일반 선실: 항해사 데이터의 타입 === '모험' 인 인원만 배치"
      if (s.타입 !== '모험') return -1;
      
      // 통과된 인원 중 필수 항해사라면 최상위 점수, 아니면 티어 점수
      if (essentialIds.has(s.id)) return 20_000_000;
      
      const score = calculateTierScore(s, currentLevels, expandedTargets);
      return score;
    }
  };

  fillFleetSlots(ships, all, usedIds, currentLevels, expandedTargets, getPriority);



  // 8. 선실 압축: 빈 공간(null) 제거
  const allDeployedCrew: Sailor[] = [];
  ships.forEach(ship => {
    if (ship.admiral) allDeployedCrew.push(ship.admiral);
    
    ['adventure', 'combat'].forEach(type => {
      const field = type as 'adventure' | 'combat';
      const originalLen = ship[field].length;
      const compacted = ship[field].filter(Boolean);
      compacted.forEach(s => { if (s) allDeployedCrew.push(s as Sailor); });
      while (compacted.length < originalLen) compacted.push(null);
      ship[field] = compacted as any;
    });
  });

  const finalSkills = calculateFleetSkills(allDeployedCrew);
  console.log("=== OPTIMIZER RESULT ===");
  console.log("Total Deployed Crew Count:", allDeployedCrew.length);
  console.log("Final Clamped Skills:", finalSkills);

  return { ships };
}