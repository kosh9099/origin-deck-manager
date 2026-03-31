import { Chromosome, GAContext } from './types';
import { evaluateFitness } from './fitness';
import { MAX_SKILL_LEVELS } from '../rules';

/** 랜덤 염색체 생성: 각 풀에서 슬롯 수만큼 랜덤 선택 */
export function createRandomChromosome(ctx: GAContext): Chromosome {
  const combatIds = shuffle(
    ctx.combatCandidates.map(s => s.id),
    ctx.rng
  ).slice(0, ctx.combatSlotCount);

  const adventureIds = shuffle(
    ctx.adventureCandidates.map(s => s.id),
    ctx.rng
  ).slice(0, ctx.adventureSlotCount);

  const c: Chromosome = { combatIds, adventureIds, fitness: -Infinity };
  c.fitness = evaluateFitness(c, ctx);
  return c;
}

/** 그리디 염색체: 한 명씩 추가하며 기여도 최고인 선원 선택 */
export function createGreedyChromosome(ctx: GAContext): Chromosome {
  const { skillKeys, baseSkillLevels, profileCache, objectiveFn } = ctx;

  // 현재 스킬 레벨 (고정 선원 포함)
  const currentLevels = [...baseSkillLevels];

  const combatIds: number[] = [];
  const adventureIds: number[] = [];
  const usedIds = new Set<number>();

  // 전투 슬롯 채우기
  const combatPool = ctx.combatCandidates.map(s => s.id);
  for (let slot = 0; slot < ctx.combatSlotCount; slot++) {
    let bestId = -1;
    let bestScore = -Infinity;

    for (const id of combatPool) {
      if (usedIds.has(id)) continue;
      const profile = profileCache.get(id);
      if (!profile) continue;

      // currentLevels에 이미 선택된 선원이 포함되어 있으므로 후보만 추가
      const buf: Record<string, number> = {};
      for (let i = 0; i < skillKeys.length; i++) {
        buf[skillKeys[i]] = currentLevels[i] + profile[i];
      }

      const score = objectiveFn(buf);
      if (score > bestScore) {
        bestScore = score;
        bestId = id;
      }
    }

    if (bestId !== -1) {
      combatIds.push(bestId);
      usedIds.add(bestId);
      const profile = profileCache.get(bestId)!;
      for (let i = 0; i < skillKeys.length; i++) currentLevels[i] += profile[i];
    }
  }

  // 모험 슬롯 채우기
  const adventurePool = ctx.adventureCandidates.map(s => s.id);
  for (let slot = 0; slot < ctx.adventureSlotCount; slot++) {
    let bestId = -1;
    let bestScore = -Infinity;

    for (const id of adventurePool) {
      if (usedIds.has(id)) continue;
      const profile = profileCache.get(id);
      if (!profile) continue;

      const buf: Record<string, number> = {};
      for (let i = 0; i < skillKeys.length; i++) {
        buf[skillKeys[i]] = currentLevels[i] + profile[i];
      }
      const score = objectiveFn(buf);
      if (score > bestScore) {
        bestScore = score;
        bestId = id;
      }
    }

    if (bestId !== -1) {
      adventureIds.push(bestId);
      usedIds.add(bestId);
      const profile = profileCache.get(bestId)!;
      for (let i = 0; i < skillKeys.length; i++) currentLevels[i] += profile[i];
    }
  }

  const c: Chromosome = { combatIds, adventureIds, fitness: -Infinity };
  c.fitness = evaluateFitness(c, ctx);
  return c;
}

/**
 * 스마트 그리디: 목표 달성 스킬을 잠금하여 초과 방지
 *
 * 핵심 전략:
 * 1. 각 후보를 "적자 해소량 - 초과 페널티"로 평가
 * 2. 이미 목표 달성된 스킬에 초과 기여하는 후보는 감점
 * 3. 전투/모험을 번갈아 선택 (한쪽 먼저 고정 → 다른쪽 최적화 방지)
 */
export function createSmartGreedyChromosome(
  ctx: GAContext,
  targetLevels: Record<string, number>
): Chromosome {
  const { skillKeys, baseSkillLevels, profileCache } = ctx;

  const currentLevels = [...baseSkillLevels];
  const combatIds: number[] = [];
  const adventureIds: number[] = [];
  const usedIds = new Set<number>();

  const combatPool = ctx.combatCandidates.map(s => s.id);
  const adventurePool = ctx.adventureCandidates.map(s => s.id);

  // 총 슬롯 수만큼 반복, 전투/모험 번갈아 선택
  const totalSlots = ctx.combatSlotCount + ctx.adventureSlotCount;
  let combatFilled = 0;
  let adventureFilled = 0;

  for (let step = 0; step < totalSlots; step++) {
    // 어느 풀에서 선택할지 결정
    const combatDone = combatFilled >= ctx.combatSlotCount;
    const adventureDone = adventureFilled >= ctx.adventureSlotCount;
    if (combatDone && adventureDone) break;

    let pools: { pool: number[]; type: 'combat' | 'adventure' }[] = [];
    if (!combatDone) pools.push({ pool: combatPool, type: 'combat' });
    if (!adventureDone) pools.push({ pool: adventurePool, type: 'adventure' });

    let globalBestId = -1;
    let globalBestScore = -Infinity;
    let globalBestType: 'combat' | 'adventure' = 'combat';

    for (const { pool, type } of pools) {
      for (const id of pool) {
        if (usedIds.has(id)) continue;
        const profile = profileCache.get(id);
        if (!profile) continue;

        // 후보 점수 = 적자 해소량 - 초과 페널티
        let score = 0;
        let wouldOverflowLocked = false;

        for (let i = 0; i < skillKeys.length; i++) {
          const sk = skillKeys[i];
          const contribution = profile[i];
          if (contribution <= 0) continue;

          const current = currentLevels[i];
          const target = targetLevels[sk] || 0;
          const max = MAX_SKILL_LEVELS[sk] || 10;

          if (target > 0) {
            const deficit = Math.max(0, target - current);
            if (deficit > 0) {
              // 적자 해소: 실제로 적자를 줄이는 만큼만 가산
              const effectiveContribution = Math.min(contribution, deficit);
              score += effectiveContribution * 1_000_000;

              // 적자를 넘어서는 초과분: 감점
              const excess = contribution - deficit;
              if (excess > 0) {
                score -= excess * 200_000;
              }
            } else {
              // 이미 목표 달성된 스킬에 초과 기여: 강한 감점
              score -= contribution * 200_000;
              wouldOverflowLocked = true;
            }
          } else {
            // 비목표 스킬: MAX 초과만 감점
            if (current + contribution > max) {
              score -= (current + contribution - max) * 50_000;
            }
          }
        }

        // 아무 적자도 해소 못하고 초과만 시키면 최악의 점수
        if (wouldOverflowLocked && score <= 0) {
          score -= 500_000;
        }

        if (score > globalBestScore) {
          globalBestScore = score;
          globalBestId = id;
          globalBestType = type;
        }
      }
    }

    if (globalBestId !== -1) {
      if (globalBestType === 'combat') {
        combatIds.push(globalBestId);
        combatFilled++;
      } else {
        adventureIds.push(globalBestId);
        adventureFilled++;
      }
      usedIds.add(globalBestId);
      const profile = profileCache.get(globalBestId)!;
      for (let i = 0; i < skillKeys.length; i++) currentLevels[i] += profile[i];
    } else {
      break; // 더 이상 유효한 후보 없음
    }
  }

  // 남은 슬롯이 있으면 가장 적은 피해를 주는 후보로 채우기
  while (combatFilled < ctx.combatSlotCount) {
    let bestId = -1;
    let bestScore = -Infinity;
    for (const id of combatPool) {
      if (usedIds.has(id)) continue;
      const profile = profileCache.get(id);
      if (!profile) continue;
      const buf: Record<string, number> = {};
      for (let i = 0; i < skillKeys.length; i++) buf[skillKeys[i]] = currentLevels[i] + profile[i];
      const score = ctx.objectiveFn(buf);
      if (score > bestScore) { bestScore = score; bestId = id; }
    }
    if (bestId === -1) break;
    combatIds.push(bestId);
    usedIds.add(bestId);
    const profile = profileCache.get(bestId)!;
    for (let i = 0; i < skillKeys.length; i++) currentLevels[i] += profile[i];
    combatFilled++;
  }
  while (adventureFilled < ctx.adventureSlotCount) {
    let bestId = -1;
    let bestScore = -Infinity;
    for (const id of adventurePool) {
      if (usedIds.has(id)) continue;
      const profile = profileCache.get(id);
      if (!profile) continue;
      const buf: Record<string, number> = {};
      for (let i = 0; i < skillKeys.length; i++) buf[skillKeys[i]] = currentLevels[i] + profile[i];
      const score = ctx.objectiveFn(buf);
      if (score > bestScore) { bestScore = score; bestId = id; }
    }
    if (bestId === -1) break;
    adventureIds.push(bestId);
    usedIds.add(bestId);
    const profile = profileCache.get(bestId)!;
    for (let i = 0; i < skillKeys.length; i++) currentLevels[i] += profile[i];
    adventureFilled++;
  }

  const c: Chromosome = { combatIds, adventureIds, fitness: -Infinity };
  c.fitness = evaluateFitness(c, ctx);
  return c;
}

export function cloneChromosome(c: Chromosome): Chromosome {
  return {
    combatIds: c.combatIds.slice(),
    adventureIds: c.adventureIds.slice(),
    fitness: c.fitness,
  };
}

function shuffle(arr: number[], rng: () => number): number[] {
  const result = arr.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
