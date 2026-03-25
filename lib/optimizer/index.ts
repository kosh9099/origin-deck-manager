import { Sailor, ShipConfig, OptimizerOptions, Ship } from '@/types';
import { filterSailors } from './filters';
import { fillFleetSlots } from './placement';
import { getSailorSkillLevel, calculateTierScore, calculateStatWeightScore, calculateFleetSkills } from './scoring';
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
  const { all } = filterSailors(sailors, bannedIds);
  const usedIds = new Set<number>();
  const currentLevels: Record<string, number> = {};

  console.log("=== OPTIMIZER START (Fast Two-Pass Mode) ===");
  Object.keys(MAX_SKILL_LEVELS).forEach(sk => currentLevels[sk] = 0);

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

  const isQualifiedForCombat = (s: Sailor) =>
    s.등급 === 'S+' || s.직업 === '백병대' || s.직업 === '수석 호위기사';

  const hasExpSkill = (s: Sailor) =>
    Object.keys(MAX_SKILL_LEVELS).some(sk => getSailorSkillLevel(s, sk) > 0);

  // ════════════════════════════════════════════════════════════════
  // 1단계: 제독 & 필수 항해사 물리적 사전 배치
  // ════════════════════════════════════════════════════════════════
  const mainAdmiral = all.find(s => s.id === selectedAdmiralId);
  if (mainAdmiral && ships[0]) {
    ships[0].admiral = mainAdmiral;
    usedIds.add(mainAdmiral.id);
    Object.keys(MAX_SKILL_LEVELS).forEach(sk => {
      currentLevels[sk] = Math.min((currentLevels[sk] || 0) + getSailorSkillLevel(mainAdmiral, sk), MAX_SKILL_LEVELS[sk]);
    });
  }

  const essentials = all.filter(s => essentialIds.has(s.id) && s.id !== selectedAdmiralId);
  essentials.forEach(s => {
    let isPlaced = false;
    if (s.타입 === '전투' || isQualifiedForCombat(s)) {
      for (const ship of ships) {
        const emptyIdx = ship.combat.findIndex(slot => slot === null);
        if (emptyIdx !== -1) { ship.combat[emptyIdx] = s; isPlaced = true; break; }
      }
    }
    if (!isPlaced) {
      for (const ship of ships) {
        const emptyIdx = ship.adventure.findIndex(slot => slot === null);
        if (emptyIdx !== -1) { ship.adventure[emptyIdx] = s; isPlaced = true; break; }
      }
    }
    if (isPlaced) {
      usedIds.add(s.id);
      Object.keys(MAX_SKILL_LEVELS).forEach(sk => {
        currentLevels[sk] = Math.min((currentLevels[sk] || 0) + getSailorSkillLevel(s, sk), MAX_SKILL_LEVELS[sk]);
      });
    }
  });

  // ════════════════════════════════════════════════════════════════
  // 2단계: 투패스(Two-Pass) 기반 지능형 배치 (렉 없음!)
  // ════════════════════════════════════════════════════════════════

  // 항해사 탑승 시 목표 스킬에 단 1레벨이라도 초과가 발생하는지 검사하는 도우미 함수
  const causesAnyOverflow = (s: Sailor, targets?: Record<string, number>): boolean => {
    for (const sk in MAX_SKILL_LEVELS) {
      const lvl = getSailorSkillLevel(s, sk);
      if (lvl > 0) {
        const max = targets && targets[sk] > 0 ? targets[sk] : (MAX_SKILL_LEVELS[sk] || 10);
        const current = currentLevels[sk] || 0;
        if (current + lvl > max) return true;
      }
    }
    return false;
  };

  if (mode === 'skill') {
    const expandedTargets: Record<string, number> = { ...targetLevels };
    const hasActiveTargets = Object.values(expandedTargets).some(v => v > 0);

    // [Pass 1] 엄격 모드: 초과를 유발하는 선원은 무조건 차단 (완벽한 퍼즐 조각만 우선 배치)
    const getStrictPriority = (s: Sailor, isCombatSlot: boolean): number => {
      if (usedIds.has(s.id) || !hasActiveTargets) return -1;
      if (isCombatSlot && (s.타입 !== '전투' || !isQualifiedForCombat(s) || !hasExpSkill(s))) return -1;
      if (!isCombatSlot && (s.타입 !== '모험' || !hasExpSkill(s))) return -1;

      if (causesAnyOverflow(s, expandedTargets)) return -1; // 초과 절대 금지!
      return calculateTierScore(s, currentLevels, expandedTargets);
    };

    // [Pass 2] 유연 모드: 1차 배치 후에도 목표가 남았다면, 페널티를 받더라도 빈자리를 채움
    const getFlexiblePriority = (s: Sailor, isCombatSlot: boolean): number => {
      if (usedIds.has(s.id) || !hasActiveTargets) return -1;
      if (isCombatSlot && (s.타입 !== '전투' || !isQualifiedForCombat(s) || !hasExpSkill(s))) return -1;
      if (!isCombatSlot && (s.타입 !== '모험' || !hasExpSkill(s))) return -1;

      return calculateTierScore(s, currentLevels, expandedTargets);
    };

    console.log("=== Phase 1: Strict Exact Matches ===");
    fillFleetSlots(ships, all, usedIds, currentLevels, expandedTargets, getStrictPriority, false);

    console.log("=== Phase 2: Flexible Fill ===");
    fillFleetSlots(ships, all, usedIds, currentLevels, expandedTargets, getFlexiblePriority, false);
  }
  else if (mode === 'stat' && statConfig) {

    const makePriority = (config: StatWeightConfig, isStrict: boolean) => (s: Sailor, isCombatSlot: boolean): number => {
      if (usedIds.has(s.id) || !hasExpSkill(s)) return -1;
      if (isCombatSlot && (s.타입 !== '전투' || !isQualifiedForCombat(s))) return -1;
      if (!isCombatSlot && s.타입 !== '모험') return -1;

      if (isStrict && causesAnyOverflow(s)) return -1;
      return calculateStatWeightScore(s, currentLevels, config);
    };

    if (statConfig.lootFirst) {
      const lootTargets: Record<string, number> = {};
      LOOT_SKILLS.forEach(sk => { lootTargets[sk] = MAX_SKILL_LEVELS[sk] || 10; });
      const hasActiveLootTargets = Object.values(lootTargets).some(v => v > 0);

      const makeLootPriority = (isStrict: boolean) => (s: Sailor, isCombatSlot: boolean): number => {
        if (usedIds.has(s.id) || !hasExpSkill(s)) return -1;
        if (isCombatSlot && (s.타입 !== '전투' || !isQualifiedForCombat(s))) return -1;
        if (!isCombatSlot && s.타입 !== '모험') return -1;

        if (isStrict && causesAnyOverflow(s, lootTargets)) return -1;

        if (!isCombatSlot && hasActiveLootTargets) {
          const canContribute = LOOT_SKILLS.some(sk => (currentLevels[sk] || 0) < (MAX_SKILL_LEVELS[sk] ?? 10) && getSailorSkillLevel(s, sk) > 0);
          if (!canContribute) return -1;
        }
        return calculateTierScore(s, currentLevels, lootTargets);
      };

      console.log("=== Loot Phase 1: Strict ===");
      fillFleetSlots(ships, all, usedIds, currentLevels, lootTargets, makeLootPriority(true), false);
      console.log("=== Loot Phase 2: Flexible ===");
      fillFleetSlots(ships, all, usedIds, currentLevels, lootTargets, makeLootPriority(false), false);

      const statOnlyConfig: StatWeightConfig = { ...statConfig, lootFirst: false };
      console.log("=== Stat Phase 1: Strict ===");
      fillFleetSlots(ships, all, usedIds, currentLevels, {}, makePriority(statOnlyConfig, true), true);
      console.log("=== Stat Phase 2: Flexible ===");
      fillFleetSlots(ships, all, usedIds, currentLevels, {}, makePriority(statOnlyConfig, false), true);
    } else {
      console.log("=== Stat Phase 1: Strict ===");
      fillFleetSlots(ships, all, usedIds, currentLevels, {}, makePriority(statConfig, true), true);
      console.log("=== Stat Phase 2: Flexible ===");
      fillFleetSlots(ships, all, usedIds, currentLevels, {}, makePriority(statConfig, false), true);
    }
  }

  // ════════════════════════════════════════════════════════════════
  // 3단계: 선실 압축 (빈 공간 제거)
  // ════════════════════════════════════════════════════════════════
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

  console.log("=== OPTIMIZER RESULT ===");
  console.log("Total Deployed Crew Count:", allDeployedCrew.length);
  return { ships };
}