import { Sailor, ShipConfig, OptimizerOptions, Ship } from '@/types';
import { filterSailors, hasExpSkill } from './filters';
import { fillFleetSlots, swapOptimize, computeUnclampedLevels } from './placement';
import {
  getSailorSkillLevel,
  calculateTierScore,
  calculateTierScoreSoft,
  calculateStatWeightScore,
  calcSkillModeObjective,
  calcStatModeObjective,
  calcStatModeLootObjective,
} from './scoring';
import { MAX_SKILL_LEVELS } from './rules';
import type { StatWeightConfig } from '@/components/skill/StatWeightSettings';
import { LOOT_SKILLS } from '@/components/skill/StatWeightSettings';

export type OptimizerMode = 'skill' | 'stat';

export function autoDeployFleet(
  sailors: Sailor[],
  essentialIds: Set<number>,
  bannedIds: Set<number>,
  fleetConfig: ShipConfig[],
  selectedAdmiralId: number,
  mode: OptimizerMode,
  targetLevels: Record<string, number>,
  options: OptimizerOptions,
  statConfig?: StatWeightConfig
) {
  // ════════════════════════════════════════════════════════════════
  // Phase 0: 사전 필터
  // ════════════════════════════════════════════════════════════════
  const { all, eligible } = filterSailors(sailors, bannedIds);
  const usedIds = new Set<number>();
  const currentLevels: Record<string, number> = {};

  console.log("=== OPTIMIZER START (Swap-Based) ===");
  console.log(`Mode: ${mode}, Eligible sailors: ${eligible.length}`);
  Object.keys(MAX_SKILL_LEVELS).forEach(sk => currentLevels[sk] = 0);

  // 함선 슬롯 구성
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

  // 자격 검증 헬퍼
  const isQualifiedForCombat = (s: Sailor) =>
    s.등급 === 'S+' || s.직업 === '백병대' || s.직업 === '수석 호위기사';

  const canFillCombatSlot = (s: Sailor) =>
    s.타입 === '전투' && isQualifiedForCombat(s) && hasExpSkill(s);

  const canFillAdventureSlot = (s: Sailor) =>
    s.타입 === '모험' && hasExpSkill(s);

  // ════════════════════════════════════════════════════════════════
  // Phase 1: 제독 & 필수 항해사 사전 배치
  // ════════════════════════════════════════════════════════════════
  const mainAdmiral = all.find(s => s.id === selectedAdmiralId);
  if (mainAdmiral && ships[0]) {
    ships[0].admiral = mainAdmiral;
    usedIds.add(mainAdmiral.id);
    Object.keys(MAX_SKILL_LEVELS).forEach(sk => {
      currentLevels[sk] = Math.min(
        (currentLevels[sk] || 0) + getSailorSkillLevel(mainAdmiral, sk),
        MAX_SKILL_LEVELS[sk]
      );
    });
    console.log(`[Phase 1] Admiral placed: ${mainAdmiral.이름}`);
  }

  // 필수 항해사 배치 (타입에 맞춰)
  const essentials = all.filter(s => essentialIds.has(s.id) && s.id !== selectedAdmiralId);
  essentials.forEach(s => {
    let isPlaced = false;
    // 전투선실 자격 충족 시 전투선실 우선
    if (s.타입 === '전투' || isQualifiedForCombat(s)) {
      for (const ship of ships) {
        const emptyIdx = ship.combat.findIndex(slot => slot === null);
        if (emptyIdx !== -1) { ship.combat[emptyIdx] = s; isPlaced = true; break; }
      }
    }
    // 아니면 모험선실
    if (!isPlaced) {
      for (const ship of ships) {
        const emptyIdx = ship.adventure.findIndex(slot => slot === null);
        if (emptyIdx !== -1) { ship.adventure[emptyIdx] = s; isPlaced = true; break; }
      }
    }
    if (isPlaced) {
      usedIds.add(s.id);
      Object.keys(MAX_SKILL_LEVELS).forEach(sk => {
        currentLevels[sk] = Math.min(
          (currentLevels[sk] || 0) + getSailorSkillLevel(s, sk),
          MAX_SKILL_LEVELS[sk]
        );
      });
      console.log(`[Phase 1] Essential placed: ${s.이름} (${s.타입})`);
    }
  });

  // ════════════════════════════════════════════════════════════════
  // Phase 2: 그리디 초기 배치 (빈 슬롯 최대한 채움)
  // ════════════════════════════════════════════════════════════════

  if (mode === 'skill') {
    const expandedTargets: Record<string, number> = { ...targetLevels };
    const hasActiveTargets = Object.values(expandedTargets).some(v => v > 0);

    // Pass 1 (엄격): 초과 없는 완벽 매칭만
    if (hasActiveTargets) {
      const getStrictPriority = (s: Sailor, isCombatSlot: boolean): number => {
        if (usedIds.has(s.id)) return -1;
        if (isCombatSlot && !canFillCombatSlot(s)) return -1;
        if (!isCombatSlot && !canFillAdventureSlot(s)) return -1;
        return calculateTierScore(s, currentLevels, expandedTargets);
      };

      console.log("=== Phase 2 Pass 1: Strict ===");
      fillFleetSlots(ships, eligible, usedIds, currentLevels, getStrictPriority);
    }

    // Pass 2 (유연): target 초과 허용 (감점), 빈 슬롯 채움
    const getFlexiblePriority = (s: Sailor, isCombatSlot: boolean): number => {
      if (usedIds.has(s.id)) return -1;
      if (isCombatSlot && !canFillCombatSlot(s)) return -1;
      if (!isCombatSlot && !canFillAdventureSlot(s)) return -1;

      if (hasActiveTargets) {
        return calculateTierScoreSoft(s, currentLevels, expandedTargets);
      }
      // 목표 미설정 시: 모든 스킬을 MAX까지 채우는 것을 목표로
      const allMaxTargets: Record<string, number> = {};
      Object.keys(MAX_SKILL_LEVELS).forEach(sk => { allMaxTargets[sk] = MAX_SKILL_LEVELS[sk]; });
      return calculateTierScoreSoft(s, currentLevels, allMaxTargets);
    };

    console.log("=== Phase 2 Pass 2: Flexible ===");
    fillFleetSlots(ships, eligible, usedIds, currentLevels, getFlexiblePriority);
  }
  else if (mode === 'stat' && statConfig) {
    if (statConfig.lootFirst) {
      // 전리품 먼저 채움
      const lootTargets: Record<string, number> = {};
      LOOT_SKILLS.forEach(sk => { lootTargets[sk] = MAX_SKILL_LEVELS[sk] || 10; });

      const getLootPriority = (s: Sailor, isCombatSlot: boolean): number => {
        if (usedIds.has(s.id)) return -1;
        if (isCombatSlot && !canFillCombatSlot(s)) return -1;
        if (!isCombatSlot && !canFillAdventureSlot(s)) return -1;
        // 전리품 스킬에 기여 가능한 선원 우선
        const canContribute = LOOT_SKILLS.some(
          sk => (currentLevels[sk] || 0) < (MAX_SKILL_LEVELS[sk] ?? 10) && getSailorSkillLevel(s, sk) > 0
        );
        if (!canContribute) return -1;
        return calculateTierScoreSoft(s, currentLevels, lootTargets);
      };

      console.log("=== Phase 2: Loot Fill ===");
      fillFleetSlots(ships, eligible, usedIds, currentLevels, getLootPriority);

      // 나머지 슬롯: 스탯 가중치 기반
      const getStatPriority = (s: Sailor, isCombatSlot: boolean): number => {
        if (usedIds.has(s.id) || !hasExpSkill(s)) return -1;
        if (isCombatSlot && !canFillCombatSlot(s)) return -1;
        if (!isCombatSlot && !canFillAdventureSlot(s)) return -1;
        return calculateStatWeightScore(s, currentLevels, statConfig);
      };

      console.log("=== Phase 2: Stat Fill ===");
      fillFleetSlots(ships, eligible, usedIds, currentLevels, getStatPriority);
    } else {
      // 스탯만
      const getStatPriority = (s: Sailor, isCombatSlot: boolean): number => {
        if (usedIds.has(s.id) || !hasExpSkill(s)) return -1;
        if (isCombatSlot && !canFillCombatSlot(s)) return -1;
        if (!isCombatSlot && !canFillAdventureSlot(s)) return -1;
        return calculateStatWeightScore(s, currentLevels, statConfig);
      };

      console.log("=== Phase 2: Stat Fill ===");
      fillFleetSlots(ships, eligible, usedIds, currentLevels, getStatPriority);
    }
  }

  // ════════════════════════════════════════════════════════════════
  // Phase 3: 스왑 최적화
  // ════════════════════════════════════════════════════════════════

  // 미배치 후보 풀 구성
  const unplacedPool = eligible.filter(s => !usedIds.has(s.id));

  // unclamped 레벨 계산
  const unclampedLevels = computeUnclampedLevels(ships);

  // 슬롯 자격 검증 함수
  const qualificationFn = (sailor: Sailor, slotType: 'combat' | 'adventure'): boolean => {
    if (slotType === 'combat') return canFillCombatSlot(sailor);
    return canFillAdventureSlot(sailor);
  };

  if (mode === 'skill') {
    const expandedTargets: Record<string, number> = { ...targetLevels };
    const hasActiveTargets = Object.values(expandedTargets).some(v => v > 0);

    if (hasActiveTargets) {
      console.log("=== Phase 3: Swap Optimize (Skill Mode) ===");
      swapOptimize(
        ships, usedIds, unplacedPool, unclampedLevels,
        (levels) => calcSkillModeObjective(levels, expandedTargets),
        qualificationFn, essentialIds, selectedAdmiralId
      );
    } else {
      // 목표 미설정: 모든 스킬 MAX를 목표로 스왑
      const allMaxTargets: Record<string, number> = {};
      Object.keys(MAX_SKILL_LEVELS).forEach(sk => { allMaxTargets[sk] = MAX_SKILL_LEVELS[sk]; });

      console.log("=== Phase 3: Swap Optimize (Skill Mode - All Max) ===");
      swapOptimize(
        ships, usedIds, unplacedPool, unclampedLevels,
        (levels) => calcSkillModeObjective(levels, allMaxTargets),
        qualificationFn, essentialIds, selectedAdmiralId
      );
    }
  }
  else if (mode === 'stat' && statConfig) {
    if (statConfig.lootFirst) {
      console.log("=== Phase 3: Swap Optimize (Stat + Loot) ===");
      swapOptimize(
        ships, usedIds, unplacedPool, unclampedLevels,
        (levels) => {
          const clamped: Record<string, number> = {};
          for (const sk in levels) clamped[sk] = Math.min(levels[sk], MAX_SKILL_LEVELS[sk] || 10);
          return calcStatModeLootObjective(clamped, statConfig, LOOT_SKILLS);
        },
        qualificationFn, essentialIds, selectedAdmiralId
      );
    } else {
      console.log("=== Phase 3: Swap Optimize (Stat) ===");
      swapOptimize(
        ships, usedIds, unplacedPool, unclampedLevels,
        (levels) => {
          const clamped: Record<string, number> = {};
          for (const sk in levels) clamped[sk] = Math.min(levels[sk], MAX_SKILL_LEVELS[sk] || 10);
          return calcStatModeObjective(clamped, statConfig);
        },
        qualificationFn, essentialIds, selectedAdmiralId
      );
    }
  }

  // ════════════════════════════════════════════════════════════════
  // Phase 4: 선실 압축 (빈 공간 제거)
  // ════════════════════════════════════════════════════════════════
  const allDeployedCrew: Sailor[] = [];
  ships.forEach(ship => {
    if (ship.admiral) allDeployedCrew.push(ship.admiral);
    (['adventure', 'combat'] as const).forEach(field => {
      const originalLen = ship[field].length;
      const compacted = ship[field].filter(Boolean);
      compacted.forEach(s => { if (s) allDeployedCrew.push(s as Sailor); });
      while (compacted.length < originalLen) compacted.push(null);
      ship[field] = compacted as any;
    });
  });

  console.log("=== OPTIMIZER RESULT ===");
  console.log("Total Deployed Crew Count:", allDeployedCrew.length);
  return { ships };
}
