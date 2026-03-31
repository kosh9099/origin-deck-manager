import { Chromosome } from './types';

export function tournamentSelect(
  population: Chromosome[],
  tournamentSize: number,
  rng: () => number
): Chromosome {
  let best = population[Math.floor(rng() * population.length)];
  for (let i = 1; i < tournamentSize; i++) {
    const candidate = population[Math.floor(rng() * population.length)];
    if (candidate.fitness > best.fitness) {
      best = candidate;
    }
  }
  return best;
}
