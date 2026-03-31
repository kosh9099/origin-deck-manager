import { Sailor, Ship } from '@/types';
import { canFillCombatSlot, canFillAdventureSlot } from '../filters';
import { getSailorSkillLevel, calcSkillModeObjective, calcStatModeObjective, calcStatModeLootObjective } from '../scoring';
import { MAX_SKILL_LEVELS } from '../rules';
import { runGA } from './engine';
import { GAContext, DEFAULT_GA_CONFIG } from './types';
import { localSearchRefine, localSearch2opt } from './localSearch';
import { cloneChromosome, createGreedyChromosome, createSmartGreedyChromosome } from './chromosome';
import { evaluateFitness } from './fitness';
import type { StatWeightConfig } from '@/components/skill/StatWeightSettings';
import { LOOT_SKILLS } from '@/components/skill/StatWeightSettings';
import type { OptimizerMode } from '../index';

import { Chromosome } from './types';

const skillKeys = Object.keys(MAX_SKILL_LEVELS);

/** 염색체 교란: 배치된 1명 ↔ 미배치 1명 랜덤 교체 */
function perturbChromosome(c: Chromosome, ctx: GAContext, rng: () => number): void {
  const doCombat = rng() < 0.5;
  if (doCombat && c.combatIds.length > 0) {
    const placed = new Set(c.combatIds);
    const unplaced = ctx.combatCandidates.map(s => s.id).filter(id => !placed.has(id));
    if (unplaced.length > 0) {
      const ri = Math.floor(rng() * c.combatIds.length);
      const ui = Math.floor(rng() * unplaced.length);
      c.combatIds[ri] = unplaced[ui];
    }
  } else if (c.adventureIds.length > 0) {
    const placed = new Set(c.adventureIds);
    const unplaced = ctx.adventureCandidates.map(s => s.id).filter(id => !placed.has(id));
    if (unplaced.length > 0) {
      const ri = Math.floor(rng() * c.adventureIds.length);
      const ui = Math.floor(rng() * unplaced.length);
      c.adventureIds[ri] = unplaced[ui];
    }
  }
}

/**
 * GA 옵티마이저 공개 API
 * Phase 1 이후 빈 슬롯을 GA로 최적 배치
 */
export function runGeneticOptimizer(
  ships: Ship[],
  eligible: Sailor[],
  usedIds: Set<number>,
  essentialIds: Set<number>,
  selectedAdmiralId: number,
  mode: OptimizerMode,
  targetLevels: Record<string, number>,
  statConfig?: StatWeightConfig
): number {
  // 1. 빈 슬롯 수 계산
  let combatSlotCount = 0;
  let adventureSlotCount = 0;
  for (const ship of ships) {
    combatSlotCount += ship.combat.filter(s => s === null).length;
    adventureSlotCount += ship.adventure.filter(s => s === null).length;
  }

  if (combatSlotCount === 0 && adventureSlotCount === 0) {
    console.log('[GA] No empty slots to fill');
    return 0;
  }

  // 2. 후보 풀 구성 (이미 배치된 선원 제외)
  const combatCandidates = eligible.filter(s => !usedIds.has(s.id) && canFillCombatSlot(s));
  const adventureCandidates = eligible.filter(s => !usedIds.has(s.id) && canFillAdventureSlot(s));

  console.log(`[GA] Slots: combat=${combatSlotCount}, adventure=${adventureSlotCount}`);
  console.log(`[GA] Candidates: combat=${combatCandidates.length}, adventure=${adventureCandidates.length}`);

  // 슬롯 수 조정 (후보가 부족하면 줄임)
  const effectiveCombatSlots = Math.min(combatSlotCount, combatCandidates.length);
  const effectiveAdventureSlots = Math.min(adventureSlotCount, adventureCandidates.length);

  if (effectiveCombatSlots === 0 && effectiveAdventureSlots === 0) {
    console.log('[GA] No candidates available');
    return 0;
  }

  // 3. 기존 배치 선원의 스킬 합산 (baseSkillLevels)
  const baseSkillLevels = new Array(skillKeys.length).fill(0);
  for (const ship of ships) {
    const placed: (Sailor | null)[] = [ship.admiral, ...ship.combat, ...ship.adventure];
    for (const s of placed) {
      if (!s) continue;
      for (let i = 0; i < skillKeys.length; i++) {
        baseSkillLevels[i] += getSailorSkillLevel(s, skillKeys[i]);
      }
    }
  }

  // 4. 프로파일 캐시 구성
  const profileCache = new Map<number, number[]>();
  for (const s of [...combatCandidates, ...adventureCandidates]) {
    if (profileCache.has(s.id)) continue;
    const profile = new Array(skillKeys.length);
    for (let i = 0; i < skillKeys.length; i++) {
      profile[i] = getSailorSkillLevel(s, skillKeys[i]);
    }
    profileCache.set(s.id, profile);
  }

  // 5. 목적함수 구성
  let objectiveFn: (levels: Record<string, number>) => number;

  if (mode === 'skill') {
    objectiveFn = (levels) => calcSkillModeObjective(levels, targetLevels);
  } else {
    // stat 모드
    const sc = statConfig || { combat: 34, observation: 33, gathering: 33, lootFirst: false };
    if (sc.lootFirst) {
      objectiveFn = (levels) => calcStatModeLootObjective(levels, sc, LOOT_SKILLS);
    } else {
      objectiveFn = (levels) => calcStatModeObjective(levels, sc);
    }
  }

  // 6. RNG (매 실행마다 다른 결과)
  let seed = Date.now() ^ 0xDEADBEEF;
  const rng = () => {
    seed = (seed * 1664525 + 1013904223) & 0x7fffffff;
    return seed / 0x7fffffff;
  };

  // 7. GAContext 구성
  const ctx: GAContext = {
    combatCandidates,
    adventureCandidates,
    combatSlotCount: effectiveCombatSlots,
    adventureSlotCount: effectiveAdventureSlots,
    baseSkillLevels,
    objectiveFn,
    profileCache,
    skillKeys,
    rng,
  };

  // 디버그: 목표 스킬과 현재 기본 레벨 출력
  console.log('[GA] Target levels:', JSON.stringify(
    Object.fromEntries(Object.entries(targetLevels).filter(([, v]) => v > 0))
  ));
  console.log('[GA] Base skill levels (from admiral+essentials):',
    skillKeys.reduce((acc, sk, i) => {
      if (baseSkillLevels[i] > 0) acc[sk] = baseSkillLevels[i];
      return acc;
    }, {} as Record<string, number>)
  );

  // ════════════════════════════════════════════════════════════════
  // 전략 1: 스마트 그리디 (목표 잠금 + 초과 방지) + 로컬 서치
  // ════════════════════════════════════════════════════════════════
  const smart = createSmartGreedyChromosome(ctx, targetLevels);
  let best = localSearchRefine(smart, ctx);
  if (best.fitness < 0) {
    best = localSearch2opt(best, ctx);
    best = localSearchRefine(best, ctx);
  }
  console.log(`[Optimizer] SmartGreedy+LS: ${best.fitness}`);

  // ════════════════════════════════════════════════════════════════
  // 전략 2: 기존 그리디 + 로컬 서치 (비교용)
  // ════════════════════════════════════════════════════════════════
  const greedy = createGreedyChromosome(ctx);
  let greedyRefined = localSearchRefine(greedy, ctx);
  if (greedyRefined.fitness < 0) {
    greedyRefined = localSearch2opt(greedyRefined, ctx);
    greedyRefined = localSearchRefine(greedyRefined, ctx);
  }
  console.log(`[Optimizer] Greedy+LS: ${greedyRefined.fitness}`);
  if (greedyRefined.fitness > best.fitness) {
    best = greedyRefined;
  }

  // ════════════════════════════════════════════════════════════════
  // 전략 3: GA + 로컬 서치
  // ════════════════════════════════════════════════════════════════
  const gaResult = runGA(ctx, DEFAULT_GA_CONFIG);
  console.log(`[Optimizer] GA+LS: ${gaResult.fitness}`);
  if (gaResult.fitness > best.fitness) {
    best = gaResult;
  }

  // ════════════════════════════════════════════════════════════════
  // 전략 4: ILS — 최적해 주변 교란 + 로컬 서치 반복
  // ════════════════════════════════════════════════════════════════
  if (best.fitness < 0) {
    const ilsIterations = 20;
    for (let i = 0; i < ilsIterations; i++) {
      const perturbed = cloneChromosome(best);
      const k = 3 + Math.floor(rng() * 5); // 3~7명 교체
      for (let j = 0; j < k; j++) {
        perturbChromosome(perturbed, ctx, rng);
      }
      perturbed.fitness = evaluateFitness(perturbed, ctx);

      let refined = localSearchRefine(perturbed, ctx);
      if (refined.fitness < 0 && i < 8) {
        refined = localSearch2opt(refined, ctx);
        refined = localSearchRefine(refined, ctx);
      }

      if (refined.fitness > best.fitness) {
        best = refined;
        console.log(`[ILS] iter ${i}: improved to ${best.fitness}`);
      }
      if (best.fitness >= 0) break;
    }
  }

  console.log(`[Optimizer] Final: ${best.fitness}`);

  // 8. 최적 염색체를 Ship[] 빈 슬롯에 매핑
  const combatSailors = best.combatIds.map(id => eligible.find(s => s.id === id)!).filter(Boolean);
  const adventureSailors = best.adventureIds.map(id => eligible.find(s => s.id === id)!).filter(Boolean);

  let ci = 0;
  let ai = 0;
  for (const ship of ships) {
    for (let j = 0; j < ship.combat.length; j++) {
      if (ship.combat[j] === null && ci < combatSailors.length) {
        ship.combat[j] = combatSailors[ci++];
      }
    }
    for (let j = 0; j < ship.adventure.length; j++) {
      if (ship.adventure[j] === null && ai < adventureSailors.length) {
        ship.adventure[j] = adventureSailors[ai++];
      }
    }
  }

  return best.fitness;
}
