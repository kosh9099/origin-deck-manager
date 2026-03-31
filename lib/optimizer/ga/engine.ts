import { Chromosome, GAConfig, GAContext } from './types';
import { initializePopulation } from './population';
import { tournamentSelect } from './selection';
import { uniformSubsetCrossover } from './crossover';
import { applyMutation } from './mutation';
import { evaluateFitness } from './fitness';
import { cloneChromosome, createRandomChromosome } from './chromosome';
import { localSearchRefine, localSearch2opt } from './localSearch';

export function runGA(ctx: GAContext, config: GAConfig): Chromosome {
  const startTime = Date.now();
  const deadline = startTime + config.timeLimitMs;

  // 초기 인구 생성
  let population = initializePopulation(config.populationSize, ctx);

  // 그리디 시드에 로컬 서치 적용 (더 좋은 시작점)
  const greedySeed = population[0];
  const refined = localSearchRefine(greedySeed, ctx);
  if (refined.fitness > greedySeed.fitness) {
    console.log(`[GA] Greedy seed improved by local search: ${greedySeed.fitness} → ${refined.fitness}`);
    population[0] = refined;
  }

  // 최고 개체 추적
  let bestEver = cloneChromosome(
    population.reduce((a, b) => a.fitness > b.fitness ? a : b)
  );
  let stagnation = 0;

  console.log(`[GA] Gen 0: best=${bestEver.fitness}, pop=${population.length}`);

  for (let gen = 1; gen <= config.maxGenerations; gen++) {
    if (Date.now() > deadline) {
      console.log(`[GA] Time limit reached at gen ${gen}`);
      break;
    }
    if (bestEver.fitness >= 0) {
      console.log(`[GA] Perfect score reached at gen ${gen}`);
      break;
    }
    if (stagnation >= config.convergenceLimit) {
      console.log(`[GA] Converged at gen ${gen} (${stagnation} stagnant)`);
      break;
    }

    // 적합도 기준 정렬 (내림차순)
    population.sort((a, b) => b.fitness - a.fitness);

    const nextGen: Chromosome[] = [];

    // 엘리트 보존
    const eliteCount = Math.max(1, Math.floor(config.populationSize * config.elitismRate));
    for (let i = 0; i < eliteCount; i++) {
      nextGen.push(cloneChromosome(population[i]));
    }

    // 다양성 주입: 20세대마다 정체 시 하위 20%를 랜덤 개체로 교체
    if (stagnation > 0 && stagnation % 20 === 0) {
      const injectCount = Math.floor(config.populationSize * 0.2);
      for (let i = 0; i < injectCount; i++) {
        nextGen.push(createRandomChromosome(ctx));
      }
      console.log(`[GA] Gen ${gen}: injected ${injectCount} random immigrants (stagnation=${stagnation})`);
    }

    // 교배 + 돌연변이로 나머지 채우기
    while (nextGen.length < config.populationSize) {
      const parent1 = tournamentSelect(population, config.tournamentSize, ctx.rng);
      const parent2 = tournamentSelect(population, config.tournamentSize, ctx.rng);

      const [child1, child2] = uniformSubsetCrossover(parent1, parent2, ctx);

      applyMutation(child1, ctx, config);
      applyMutation(child2, ctx, config);

      child1.fitness = evaluateFitness(child1, ctx);
      child2.fitness = evaluateFitness(child2, ctx);

      nextGen.push(child1);
      if (nextGen.length < config.populationSize) {
        nextGen.push(child2);
      }
    }

    population = nextGen;

    // 최고 개체 갱신
    const genBest = population.reduce((a, b) => a.fitness > b.fitness ? a : b);
    if (genBest.fitness > bestEver.fitness) {
      bestEver = cloneChromosome(genBest);
      stagnation = 0;
    } else {
      stagnation++;
    }

    if (gen % 50 === 0) {
      console.log(`[GA] Gen ${gen}: best=${bestEver.fitness}, genBest=${genBest.fitness}, stagnation=${stagnation}`);
    }
  }

  // ════════════════════════════════════════════════════════════════
  // Post-GA: 로컬 서치로 최종 연마
  // ════════════════════════════════════════════════════════════════
  const preLocalFitness = bestEver.fitness;

  // 1-opt: 모든 단일 교체를 체계적으로 시도
  bestEver = localSearchRefine(bestEver, ctx);
  if (bestEver.fitness > preLocalFitness) {
    console.log(`[GA] 1-opt local search: ${preLocalFitness} → ${bestEver.fitness}`);
  }

  // 2-opt: 1-opt으로 더 이상 개선 불가시 2명 동시 교체 시도
  if (bestEver.fitness < 0) {
    const pre2opt = bestEver.fitness;
    bestEver = localSearch2opt(bestEver, ctx);
    if (bestEver.fitness > pre2opt) {
      console.log(`[GA] 2-opt local search: ${pre2opt} → ${bestEver.fitness}`);
      // 2-opt 후 다시 1-opt (2-opt이 열어준 새로운 1-opt 기회)
      bestEver = localSearchRefine(bestEver, ctx);
      console.log(`[GA] Post-2opt 1-opt: → ${bestEver.fitness}`);
    }
  }

  console.log(`[GA] Final: best=${bestEver.fitness}, elapsed=${Date.now() - startTime}ms`);
  return bestEver;
}
