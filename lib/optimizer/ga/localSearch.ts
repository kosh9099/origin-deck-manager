import { Chromosome, GAContext } from './types';
import { evaluateFitness } from './fitness';
import { cloneChromosome } from './chromosome';

/**
 * 최적 개선 1-opt 로컬 서치 (Hill Climbing)
 *
 * GA가 찾은 해를 기반으로, 모든 가능한 1-swap을 체계적으로 시도하여
 * 가장 큰 개선을 주는 교체를 반복 적용.
 *
 * GA의 랜덤 탐색과 달리 결정적(deterministic)이고 완전(exhaustive)하므로
 * 단일 교체로 개선 가능한 해는 반드시 찾아냄.
 */
export function localSearchRefine(
  chromosome: Chromosome,
  ctx: GAContext,
  maxIterations: number = 50
): Chromosome {
  const best = cloneChromosome(chromosome);
  const combatCandidateIds = ctx.combatCandidates.map(s => s.id);
  const adventureCandidateIds = ctx.adventureCandidates.map(s => s.id);

  for (let iter = 0; iter < maxIterations; iter++) {
    let improved = false;
    let bestFitness = best.fitness;
    let bestSwapType: 'combat' | 'adventure' | null = null;
    let bestSwapIdx = -1;
    let bestSwapNewId = -1;

    // 현재 배치된 ID 세트
    const placedCombat = new Set(best.combatIds);
    const placedAdventure = new Set(best.adventureIds);

    // 전투 풀: 모든 (배치 ↔ 미배치) 조합 시도
    const unplacedCombat = combatCandidateIds.filter(id => !placedCombat.has(id));
    for (let i = 0; i < best.combatIds.length; i++) {
      const origId = best.combatIds[i];
      for (const newId of unplacedCombat) {
        best.combatIds[i] = newId;
        const f = evaluateFitness(best, ctx);
        if (f > bestFitness) {
          bestFitness = f;
          bestSwapType = 'combat';
          bestSwapIdx = i;
          bestSwapNewId = newId;
        }
        best.combatIds[i] = origId;
      }
    }

    // 모험 풀: 모든 (배치 ↔ 미배치) 조합 시도
    const unplacedAdventure = adventureCandidateIds.filter(id => !placedAdventure.has(id));
    for (let i = 0; i < best.adventureIds.length; i++) {
      const origId = best.adventureIds[i];
      for (const newId of unplacedAdventure) {
        best.adventureIds[i] = newId;
        const f = evaluateFitness(best, ctx);
        if (f > bestFitness) {
          bestFitness = f;
          bestSwapType = 'adventure';
          bestSwapIdx = i;
          bestSwapNewId = newId;
        }
        best.adventureIds[i] = origId;
      }
    }

    // 최적 교체 적용
    if (bestSwapType && bestSwapIdx >= 0) {
      if (bestSwapType === 'combat') {
        best.combatIds[bestSwapIdx] = bestSwapNewId;
      } else {
        best.adventureIds[bestSwapIdx] = bestSwapNewId;
      }
      best.fitness = bestFitness;
      improved = true;
    }

    if (!improved) break;
  }

  return best;
}

/**
 * 2-opt 로컬 서치: 같은 풀 내에서 2명 동시 교체
 * 1-opt으로 개선 불가능할 때 추가 탐색
 */
export function localSearch2opt(
  chromosome: Chromosome,
  ctx: GAContext,
  maxIterations: number = 20
): Chromosome {
  const best = cloneChromosome(chromosome);
  const combatCandidateIds = ctx.combatCandidates.map(s => s.id);
  const adventureCandidateIds = ctx.adventureCandidates.map(s => s.id);

  for (let iter = 0; iter < maxIterations; iter++) {
    let improved = false;
    let bestFitness = best.fitness;
    let bestSwap: { type: 'combat' | 'adventure'; i1: number; i2: number; n1: number; n2: number } | null = null;

    // 전투 2-opt
    const unplacedCombat = combatCandidateIds.filter(id => !new Set(best.combatIds).has(id));
    if (unplacedCombat.length >= 2) {
      for (let i1 = 0; i1 < best.combatIds.length; i1++) {
        for (let i2 = i1 + 1; i2 < best.combatIds.length; i2++) {
          const orig1 = best.combatIds[i1];
          const orig2 = best.combatIds[i2];
          for (let u1 = 0; u1 < unplacedCombat.length; u1++) {
            for (let u2 = u1 + 1; u2 < unplacedCombat.length; u2++) {
              best.combatIds[i1] = unplacedCombat[u1];
              best.combatIds[i2] = unplacedCombat[u2];
              const f = evaluateFitness(best, ctx);
              if (f > bestFitness) {
                bestFitness = f;
                bestSwap = { type: 'combat', i1, i2, n1: unplacedCombat[u1], n2: unplacedCombat[u2] };
              }
            }
          }
          best.combatIds[i1] = orig1;
          best.combatIds[i2] = orig2;
        }
      }
    }

    // 모험 2-opt (후보가 너무 많으면 제한)
    const unplacedAdventure = adventureCandidateIds.filter(id => !new Set(best.adventureIds).has(id));
    if (unplacedAdventure.length >= 2 && unplacedAdventure.length <= 30) {
      for (let i1 = 0; i1 < best.adventureIds.length; i1++) {
        for (let i2 = i1 + 1; i2 < best.adventureIds.length; i2++) {
          const orig1 = best.adventureIds[i1];
          const orig2 = best.adventureIds[i2];
          for (let u1 = 0; u1 < unplacedAdventure.length; u1++) {
            for (let u2 = u1 + 1; u2 < unplacedAdventure.length; u2++) {
              best.adventureIds[i1] = unplacedAdventure[u1];
              best.adventureIds[i2] = unplacedAdventure[u2];
              const f = evaluateFitness(best, ctx);
              if (f > bestFitness) {
                bestFitness = f;
                bestSwap = { type: 'adventure', i1, i2, n1: unplacedAdventure[u1], n2: unplacedAdventure[u2] };
              }
            }
          }
          best.adventureIds[i1] = orig1;
          best.adventureIds[i2] = orig2;
        }
      }
    }

    if (bestSwap) {
      if (bestSwap.type === 'combat') {
        best.combatIds[bestSwap.i1] = bestSwap.n1;
        best.combatIds[bestSwap.i2] = bestSwap.n2;
      } else {
        best.adventureIds[bestSwap.i1] = bestSwap.n1;
        best.adventureIds[bestSwap.i2] = bestSwap.n2;
      }
      best.fitness = bestFitness;
      improved = true;
    }

    if (!improved) break;
  }

  return best;
}
