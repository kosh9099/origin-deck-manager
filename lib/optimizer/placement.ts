import { Sailor, Ship } from '@/types';
import { getSailorSkillLevel } from './scoring';
import { MAX_SKILL_LEVELS } from './rules';

export function fillFleetSlots(
  ships: Ship[],
  allSailors: Sailor[],
  usedIds: Set<number>,
  currentLevels: Record<string, number>,
  getPriority: (s: Sailor, isCombatSlot: boolean) => number
) {
  ships.forEach(ship => {

    // ── 전투 선실 채우기 ──────────────────────────────────────────
    ship.combat.forEach((slot, i) => {
      if (slot !== null) return;

      const best = allSailors
        .filter(s => !usedIds.has(s.id))
        .map(s => ({ s, p: getPriority(s, true) }))
        .filter(item => item.p > 0)
        .sort((a, b) => b.p - a.p)[0];

      if (best) {
        ship.combat[i] = best.s;
        usedIds.add(best.s.id);
        Object.keys(MAX_SKILL_LEVELS).forEach(sk => {
          currentLevels[sk] = Math.min(
            (currentLevels[sk] || 0) + getSailorSkillLevel(best.s, sk),
            MAX_SKILL_LEVELS[sk]
          );
        });
      }
    });

    // ── 일반 선실 채우기 ──────────────────────────────────────────
    ship.adventure.forEach((slot, i) => {
      if (slot !== null) return;

      const best = allSailors
        .filter(s => !usedIds.has(s.id))
        .map(s => ({ s, p: getPriority(s, false) }))
        .filter(item => item.p > 0)
        .sort((a, b) => b.p - a.p)[0];

      if (best) {
        ship.adventure[i] = best.s;
        usedIds.add(best.s.id);
        Object.keys(MAX_SKILL_LEVELS).forEach(sk => {
          currentLevels[sk] = Math.min(
            (currentLevels[sk] || 0) + getSailorSkillLevel(best.s, sk),
            MAX_SKILL_LEVELS[sk]
          );
        });
      }
    });
  });
}
