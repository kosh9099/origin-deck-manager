import { Chromosome, GAContext } from './types';

/**
 * Uniform Subset Crossover
 * 전투/모험 각각 독립 처리 (타입이 배타적이므로)
 */
export function uniformSubsetCrossover(
  parent1: Chromosome,
  parent2: Chromosome,
  ctx: GAContext
): [Chromosome, Chromosome] {
  const child1Combat = crossSubset(
    parent1.combatIds, parent2.combatIds,
    ctx.combatSlotCount,
    ctx.combatCandidates.map(s => s.id),
    ctx.rng
  );
  const child2Combat = crossSubset(
    parent2.combatIds, parent1.combatIds,
    ctx.combatSlotCount,
    ctx.combatCandidates.map(s => s.id),
    ctx.rng
  );

  const child1Adventure = crossSubset(
    parent1.adventureIds, parent2.adventureIds,
    ctx.adventureSlotCount,
    ctx.adventureCandidates.map(s => s.id),
    ctx.rng
  );
  const child2Adventure = crossSubset(
    parent2.adventureIds, parent1.adventureIds,
    ctx.adventureSlotCount,
    ctx.adventureCandidates.map(s => s.id),
    ctx.rng
  );

  return [
    { combatIds: child1Combat, adventureIds: child1Adventure, fitness: -Infinity },
    { combatIds: child2Combat, adventureIds: child2Adventure, fitness: -Infinity },
  ];
}

function crossSubset(
  primary: number[],
  secondary: number[],
  targetSize: number,
  allCandidateIds: number[],
  rng: () => number
): number[] {
  const set1 = new Set(primary);
  const set2 = new Set(secondary);

  // 공통 ID는 무조건 포함
  const common: number[] = [];
  const exclusive1: number[] = [];
  const exclusive2: number[] = [];

  for (const id of primary) {
    if (set2.has(id)) common.push(id);
    else exclusive1.push(id);
  }
  for (const id of secondary) {
    if (!set1.has(id)) exclusive2.push(id);
  }

  const result = [...common];
  const remaining = targetSize - result.length;

  // 배타적 ID를 합쳐서 셔플 후 필요한 만큼 선택
  const pool = [...exclusive1, ...exclusive2];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  const resultSet = new Set(result);
  for (const id of pool) {
    if (result.length >= targetSize) break;
    if (!resultSet.has(id)) {
      result.push(id);
      resultSet.add(id);
    }
  }

  // 아직 미달이면 전체 후보에서 보충
  if (result.length < targetSize) {
    const shuffledAll = allCandidateIds.slice();
    for (let i = shuffledAll.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [shuffledAll[i], shuffledAll[j]] = [shuffledAll[j], shuffledAll[i]];
    }
    for (const id of shuffledAll) {
      if (result.length >= targetSize) break;
      if (!resultSet.has(id)) {
        result.push(id);
        resultSet.add(id);
      }
    }
  }

  return result.slice(0, targetSize);
}
