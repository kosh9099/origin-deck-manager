import { Sailor } from '@/types';

export interface GAConfig {
  populationSize: number;
  maxGenerations: number;
  timeLimitMs: number;
  convergenceLimit: number;
  elitismRate: number;
  mutationRate1opt: number;
  mutationRateKopt: number;
  tournamentSize: number;
}

export interface GAContext {
  combatCandidates: Sailor[];
  adventureCandidates: Sailor[];
  combatSlotCount: number;
  adventureSlotCount: number;
  baseSkillLevels: number[];
  objectiveFn: (unclampedLevels: Record<string, number>) => number;
  profileCache: Map<number, number[]>;
  skillKeys: string[];
  rng: () => number;
}

export interface Chromosome {
  combatIds: number[];
  adventureIds: number[];
  fitness: number;
}

export const DEFAULT_GA_CONFIG: GAConfig = {
  populationSize: 100,
  maxGenerations: 500,
  timeLimitMs: 20000,
  convergenceLimit: 60,
  elitismRate: 0.08,
  mutationRate1opt: 0.30,
  mutationRateKopt: 0.15,
  tournamentSize: 3,
};
