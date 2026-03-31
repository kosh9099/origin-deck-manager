import { Chromosome, GAContext } from './types';
import { createRandomChromosome, createGreedyChromosome, cloneChromosome } from './chromosome';
import { evaluateFitness } from './fitness';
import { mutate1opt } from './mutation';

/**
 * 초기 인구 생성
 * - 1개: 그리디 시드 (최고 초기해)
 * - ~10개: 그리디 변형 (3~8명 랜덤 교체)
 * - 나머지: 완전 랜덤
 */
export function initializePopulation(size: number, ctx: GAContext): Chromosome[] {
  const population: Chromosome[] = [];

  // 1. 그리디 시드
  const greedy = createGreedyChromosome(ctx);
  population.push(greedy);
  console.log(`[GA Init] Greedy seed fitness: ${greedy.fitness}`);

  // 2. 그리디 변형 (그리디에서 3~8명 교체)
  const variantCount = Math.min(9, size - 1);
  for (let v = 0; v < variantCount; v++) {
    const variant = cloneChromosome(greedy);
    const swapCount = 3 + Math.floor(ctx.rng() * 6); // 3~8
    for (let s = 0; s < swapCount; s++) {
      mutate1opt(variant, ctx);
    }
    variant.fitness = evaluateFitness(variant, ctx);
    population.push(variant);
  }

  // 3. 나머지 랜덤
  while (population.length < size) {
    population.push(createRandomChromosome(ctx));
  }

  return population;
}
