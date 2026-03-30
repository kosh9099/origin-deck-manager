import { Sailor, ShipConfig, OptimizerOptions, Ship } from '@/types';
import { filterSailors } from './filters';
import { fillFleetSlots } from './placement';
import {
  getSailorSkillLevel,
  calculateTierScore,
  calculateStatWeightScore,
  calculateFleetSkills,
  addSailorSkills,
  hasNoUsefulContribution
} from './scoring';
import { MAX_SKILL_LEVELS } from './rules';
import { optimizeBySwap } from './swap';
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

  console.log("=== OPTIMIZER START (Greedy + Swap) ===");
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
  // 1단계: 제독 & 필수 항해사 배치
  // ════════════════════════════════════════════════════════════════
  const mainAdmiral = all.find(s => s.id === selectedAdmiralId);
  if (mainAdmiral && ships[0]) {
    ships[0].admiral = mainAdmiral;
    usedIds.add(mainAdmiral.id);
    addSailorSkills(mainAdmiral, currentLevels);
  }

  const essentials = all.filter(s => essentialIds.has(s.id) && s.id !== selectedAdmiralId);
  essentials.forEach(s => {
    let isPlaced = false;
    if (s.타입 === '전투' && isQualifiedForCombat(s)) {
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
      addSailorSkills(s, currentLevels);
    }
  });

  // ════════════════════════════════════════════════════════════════
  // 2단계: Greedy 배치 (페널티 기반 단일 패스)
  // ════════════════════════════════════════════════════════════════

  if (mode === 'skill') {
    const expandedTargets: Record<string, number> = { ...targetLevels };

    const getPriority = (s: Sailor, isCombatSlot: boolean): number => {
      if (usedIds.has(s.id) || !hasExpSkill(s)) return -1;
      if (isCombatSlot && (s.타입 !== '전투' || !isQualifiedForCombat(s))) return -1;
      if (!isCombatSlot && s.타입 !== '모험') return -1;
      return calculateTierScore(s, currentLevels, expandedTargets);
    };

    console.log("=== Greedy Fill ===");
    fillFleetSlots(ships, all, usedIds, currentLevels, getPriority);

    // ════════════════════════════════════════════════════════════════
    // 3단계: Swap 최적화
    // ════════════════════════════════════════════════════════════════
    const hasActiveTargets = Object.values(expandedTargets).some(v => v > 0);
    if (hasActiveTargets) {
      const finalLevels = optimizeBySwap(
        ships, all, usedIds, expandedTargets,
        essentialIds, selectedAdmiralId, isQualifiedForCombat
      );
      // currentLevels 동기화
      Object.assign(currentLevels, finalLevels);
    }
  }
  else if (mode === 'stat' && statConfig) {

    const makePriority = (config: StatWeightConfig) => (s: Sailor, isCombatSlot: boolean): number => {
      if (usedIds.has(s.id) || !hasExpSkill(s)) return -1;
      if (isCombatSlot && (s.타입 !== '전투' || !isQualifiedForCombat(s))) return -1;
      if (!isCombatSlot && s.타입 !== '모험') return -1;
      if (hasNoUsefulContribution(s, currentLevels)) return -1;
      return calculateStatWeightScore(s, currentLevels, config);
    };

    if (statConfig.lootFirst) {
      // 전리품 스킬 먼저 채우기
      const lootTargets: Record<string, number> = {};
      LOOT_SKILLS.forEach(sk => { lootTargets[sk] = MAX_SKILL_LEVELS[sk] || 10; });

      const getLootPriority = (s: Sailor, isCombatSlot: boolean): number => {
        if (usedIds.has(s.id) || !hasExpSkill(s)) return -1;
        if (isCombatSlot && (s.타입 !== '전투' || !isQualifiedForCombat(s))) return -1;
        if (!isCombatSlot && s.타입 !== '모험') return -1;
        if (hasNoUsefulContribution(s, currentLevels)) return -1;

        const canContribute = LOOT_SKILLS.some(sk =>
          (currentLevels[sk] || 0) < (MAX_SKILL_LEVELS[sk] ?? 10) && getSailorSkillLevel(s, sk) > 0
        );
        if (!isCombatSlot && !canContribute) return -1;

        return calculateTierScore(s, currentLevels, lootTargets);
      };

      console.log("=== Loot Greedy Fill ===");
      fillFleetSlots(ships, all, usedIds, currentLevels, getLootPriority);

      // 전리품 swap 최적화
      optimizeBySwap(
        ships, all, usedIds, lootTargets,
        essentialIds, selectedAdmiralId, isQualifiedForCombat
      );

      // 남은 슬롯은 스탯 가중치로
      const statOnlyConfig: StatWeightConfig = { ...statConfig, lootFirst: false };
      console.log("=== Stat Greedy Fill ===");
      fillFleetSlots(ships, all, usedIds, currentLevels, makePriority(statOnlyConfig));
    } else {
      console.log("=== Stat Greedy Fill ===");
      fillFleetSlots(ships, all, usedIds, currentLevels, makePriority(statConfig));
    }

    // stat 모드 최종 swap: 모든 스킬 맥스를 목표로 전역 최적화
    const allMaxTargets: Record<string, number> = {};
    Object.keys(MAX_SKILL_LEVELS).forEach(sk => { allMaxTargets[sk] = MAX_SKILL_LEVELS[sk]; });
    console.log("=== Stat Final Swap ===");
    const finalLevels = optimizeBySwap(
      ships, all, usedIds, allMaxTargets,
      essentialIds, selectedAdmiralId, isQualifiedForCombat
    );
    Object.assign(currentLevels, finalLevels);
  }

  // ════════════════════════════════════════════════════════════════
  // 최종: 선실 압축 (빈 공간 제거)
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
