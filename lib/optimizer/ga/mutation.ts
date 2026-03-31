import { Chromosome, GAConfig, GAContext } from './types';

/** 1-opt 돌연변이: 배치 1명 ↔ 미배치 1명 교체 */
export function mutate1opt(chromosome: Chromosome, ctx: GAContext): void {
  const { rng } = ctx;

  // 50% 확률로 전투 또는 모험 선택
  if (rng() < 0.5 && chromosome.combatIds.length > 0 && ctx.combatCandidates.length > chromosome.combatIds.length) {
    swapOneInArray(chromosome.combatIds, ctx.combatCandidates.map(s => s.id), rng);
  } else if (chromosome.adventureIds.length > 0 && ctx.adventureCandidates.length > chromosome.adventureIds.length) {
    swapOneInArray(chromosome.adventureIds, ctx.adventureCandidates.map(s => s.id), rng);
  }
}

/** k-opt 돌연변이: k명 동시 교체 */
export function mutateKopt(chromosome: Chromosome, ctx: GAContext, k: number = 2): void {
  for (let i = 0; i < k; i++) {
    mutate1opt(chromosome, ctx);
  }
}

/** 확률에 따라 돌연변이 적용 */
export function applyMutation(
  chromosome: Chromosome,
  ctx: GAContext,
  config: GAConfig
): void {
  const r = ctx.rng();
  if (r < config.mutationRateKopt) {
    const k = 2 + Math.floor(ctx.rng() * 2); // 2 or 3
    mutateKopt(chromosome, ctx, k);
  } else if (r < config.mutationRateKopt + config.mutationRate1opt) {
    mutate1opt(chromosome, ctx);
  }
}

function swapOneInArray(ids: number[], allCandidateIds: number[], rng: () => number): void {
  const placed = new Set(ids);
  const unplaced = allCandidateIds.filter(id => !placed.has(id));
  if (unplaced.length === 0) return;

  const removeIdx = Math.floor(rng() * ids.length);
  const addIdx = Math.floor(rng() * unplaced.length);
  ids[removeIdx] = unplaced[addIdx];
}
