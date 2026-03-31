import { Sailor, ShipConfig, OptimizerOptions, Ship } from '@/types';
import { filterSailors, hasExpSkill, isQualifiedForCombat, canFillCombatSlot, canFillAdventureSlot } from './filters';
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
import { runGeneticOptimizer } from './ga';

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

  console.log("=== OPTIMIZER START (GA) ===");
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

  // 필수 항해사 배치: 타입+자격만 확인, 탐험스킬 불요. 폴백 없음.
  const essentials = all.filter(s => essentialIds.has(s.id) && s.id !== selectedAdmiralId);
  essentials.forEach(s => {
    let isPlaced = false;
    if (s.타입 === '전투' && isQualifiedForCombat(s)) {
      for (const ship of ships) {
        const emptyIdx = ship.combat.findIndex(slot => slot === null);
        if (emptyIdx !== -1) { ship.combat[emptyIdx] = s; isPlaced = true; break; }
      }
    } else if (s.타입 === '모험') {
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
  // Phase 2+3: GA 최적화
  // ════════════════════════════════════════════════════════════════
  const gaScore = runGeneticOptimizer(
    ships, eligible, usedIds, essentialIds, selectedAdmiralId,
    mode, targetLevels, statConfig
  );
  console.log(`[GA] Final score: ${gaScore}`);

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
