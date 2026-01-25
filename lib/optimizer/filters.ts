import { Sailor } from '@/types';

export function filterSailors(all: Sailor[], bannedIds: Set<number>) {
  const available = all.filter(s => !bannedIds.has(s.id));
  return {
    adventure: available.filter(s => s.타입 === '모험'),
    combat: available.filter(s => s.타입 === '전투'),
    trade: available.filter(s => s.타입 === '교역'),
    all: available
  };
}