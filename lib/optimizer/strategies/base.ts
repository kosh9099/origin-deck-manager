import { Sailor, ShipConfig } from '@/types';

export function initFleet(fleetConfig: ShipConfig[], idx: number) {
  const conf = fleetConfig[idx];
  const isFlagship = idx === 0;
  const advCount = conf.총선실 - conf.전투선실 - (isFlagship ? 1 : 0);
  
  return {
    admiral: null as Sailor | null,
    adventure: Array(Math.max(0, advCount)).fill(null),
    combat: Array(conf.전투선실).fill(null)
  };
}