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
  // 모드 A 전용
  targetLevels: Record<string, number>,
  options: OptimizerOptions,
  // 모드 B 전용
  statConfig?: StatWeightConfig
) {
  const { all } = filterSailors(sailors, bannedIds);
  const usedIds = new Set<number>();
  const currentLevels: Record<string, number> = {};

  console.log("=== OPTIMIZER START ===");
  console.log("mode:", mode);
  console.log("targetLevels:", targetLevels);
  console.log("statConfig:", statConfig);

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

  const mainAdmiral = all.find(s => s.id === selectedAdmiralId);
  if (mainAdmiral && ships[0]) {
    ships[0].admiral = mainAdmiral;
    usedIds.add(mainAdmiral.id);
    Object.keys(MAX_SKILL_LEVELS).forEach(sk => {
      currentLevels[sk] = (currentLevels[sk] || 0) + getSailorSkillLevel(mainAdmiral, sk);
    });
  }

  // ── 공통: 슬롯 타입 자격 검사 ──────────────────────────────────
  const isQualifiedForCombat = (s: Sailor) =>
    s.등급 === 'S+' || s.직업 === '백병대' || s.직업 === '수석 호위기사';

  const hasExpSkill = (s: Sailor) =>
    Object.keys(MAX_SKILL_LEVELS).some(sk => getSailorSkillLevel(s, sk) > 0);

  // ════════════════════════════════════════════════════════════════
  // 모드 A: 스킬 개별 설정
  // ════════════════════════════════════════════════════════════════
  if (mode === 'skill') {
    const expandedTargets: Record<string, number> = { ...targetLevels };
    const hasActiveTargets = Object.values(expandedTargets).some(v => v > 0);

    const getPriority = (s: Sailor, isCombatSlot: boolean): number => {
      if (usedIds.has(s.id)) return -1;

      if (isCombatSlot) {
        if (s.타입 !== '전투') return -1;
        if (essentialIds.has(s.id)) return 20_000_000;
        if (!isQualifiedForCombat(s)) return -1;
        if (!hasExpSkill(s)) return -1;
        return calculateTierScore(s, currentLevels, expandedTargets);
      } else {
        if (s.타입 !== '모험') return -1;
        if (essentialIds.has(s.id)) return 20_000_000;
        if (!hasExpSkill(s)) return -1;
        if (hasActiveTargets) {
          const canContribute = Object.entries(expandedTargets).some(([sk, target]) => {
            if (target <= 0) return false;
            const current = currentLevels[sk] || 0;
            const cap = MAX_SKILL_LEVELS[sk] ?? 10;
            return current < cap && getSailorSkillLevel(s, sk) > 0;
          });
          if (!canContribute) return -1;
        }
        return calculateTierScore(s, currentLevels, expandedTargets);
      }
    };

    // 모드 A: 목표 달성 시 조기 종료 (skipEarlyExit=false)
    fillFleetSlots(ships, all, usedIds, currentLevels, expandedTargets, getPriority, false);
  }

  // ════════════════════════════════════════════════════════════════
  // 모드 B: 능력치 종합 설정
  // ════════════════════════════════════════════════════════════════
  else if (mode === 'stat' && statConfig) {

    const makeStatPriority = (config: StatWeightConfig) =>
      (s: Sailor, isCombatSlot: boolean): number => {
        if (usedIds.has(s.id)) return -1;

        if (isCombatSlot) {
          if (s.타입 !== '전투') return -1;
          if (essentialIds.has(s.id)) return 20_000_000;
          if (!isQualifiedForCombat(s)) return -1;
          if (!hasExpSkill(s)) return -1;
          return calculateStatWeightScore(s, currentLevels, config);
        } else {
          if (s.타입 !== '모험') return -1;
          if (essentialIds.has(s.id)) return 20_000_000;
          if (!hasExpSkill(s)) return -1;
          return calculateStatWeightScore(s, currentLevels, config);
        }
      };

    if (statConfig.lootFirst) {
      // ── 페이즈 1: 전리품 6종 먼저 맥스 ──────────────────────────
      console.log("=== 페이즈 1: 전리품 먼저 맥스 ===");

      // 전리품 스킬만 목표로 설정 (모두 맥스레벨 10)
      const lootTargets: Record<string, number> = {};
      LOOT_SKILLS.forEach(sk => { lootTargets[sk] = MAX_SKILL_LEVELS[sk] || 10; });

      const hasActiveLootTargets = Object.values(lootTargets).some(v => v > 0);

      const getLootPriority = (s: Sailor, isCombatSlot: boolean): number => {
        if (usedIds.has(s.id)) return -1;

        if (isCombatSlot) {
          if (s.타입 !== '전투') return -1;
          if (essentialIds.has(s.id)) return 20_000_000;
          if (!isQualifiedForCombat(s)) return -1;
          if (!hasExpSkill(s)) return -1;
          return calculateTierScore(s, currentLevels, lootTargets);
        } else {
          if (s.타입 !== '모험') return -1;
          if (essentialIds.has(s.id)) return 20_000_000;
          if (!hasExpSkill(s)) return -1;
          if (hasActiveLootTargets) {
            const canContribute = LOOT_SKILLS.some(sk => {
              const current = currentLevels[sk] || 0;
              const cap = MAX_SKILL_LEVELS[sk] ?? 10;
              return current < cap && getSailorSkillLevel(s, sk) > 0;
            });
            if (!canContribute) return -1;
          }
          return calculateTierScore(s, currentLevels, lootTargets);
        }
      };

      // 페이즈 1: 전리품 목표 달성 시 조기 종료
      fillFleetSlots(ships, all, usedIds, currentLevels, lootTargets, getLootPriority, false);

      // ── 페이즈 2: 남은 슬롯에 능력치 비중 배치 ────────────────────
      console.log("=== 페이즈 2: 능력치 비중 배치 ===");

      // lootFirst는 페이즈2에서 의미 없으므로 제거한 config 사용
      const statOnlyConfig: StatWeightConfig = { ...statConfig, lootFirst: false };
      fillFleetSlots(ships, all, usedIds, currentLevels, {}, makeStatPriority(statOnlyConfig), true);

    } else {
      // ── lootFirst 없음: 전체 슬롯을 능력치 비중으로 채움 ──────────
      fillFleetSlots(ships, all, usedIds, currentLevels, {}, makeStatPriority(statConfig), true);
    }
  }

  // 선실 압축: 빈 공간(null) 제거 후 앞으로 당김
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