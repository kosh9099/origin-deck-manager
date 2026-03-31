import { Chromosome, GAContext } from './types';

/** 재사용 버퍼 (GC 방지) */
let levelsBuf: Record<string, number> = {};

export function evaluateFitness(chromosome: Chromosome, ctx: GAContext): number {
  const { skillKeys, baseSkillLevels, profileCache, objectiveFn } = ctx;

  // 버퍼 초기화: 고정 선원(제독+필수) 스킬 합산에서 시작
  for (let i = 0; i < skillKeys.length; i++) {
    levelsBuf[skillKeys[i]] = baseSkillLevels[i];
  }

  // 선택된 전투 선원 프로파일 합산
  for (const id of chromosome.combatIds) {
    const profile = profileCache.get(id);
    if (!profile) continue;
    for (let i = 0; i < skillKeys.length; i++) {
      levelsBuf[skillKeys[i]] += profile[i];
    }
  }

  // 선택된 모험 선원 프로파일 합산
  for (const id of chromosome.adventureIds) {
    const profile = profileCache.get(id);
    if (!profile) continue;
    for (let i = 0; i < skillKeys.length; i++) {
      levelsBuf[skillKeys[i]] += profile[i];
    }
  }

  return objectiveFn(levelsBuf);
}

export function evaluatePopulation(population: Chromosome[], ctx: GAContext): void {
  for (const c of population) {
    c.fitness = evaluateFitness(c, ctx);
  }
}
