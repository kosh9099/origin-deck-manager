import { Sailor, Ship } from '@/types';
import { getSailorSkillLevel } from './scoring';
import { MAX_SKILL_LEVELS } from './rules';

/**
 * 사용자가 설정한 모든 목표 스킬 레벨에 도달했는지 확인합니다.
 * 목표가 하나도 설정되지 않은 경우는 "달성 완료"로 보지 않아
 * 최대한 스킬을 채우는 모드를 유지합니다.
 */
function allTargetsMet(
  currentLevels: Record<string, number>,
  expandedTargets: Record<string, number>
): boolean {
  const activeTargets = Object.entries(expandedTargets).filter(([, v]) => v > 0);
  if (activeTargets.length === 0) return false;
  return activeTargets.every(([sk, target]) => (currentLevels[sk] || 0) >= target);
}

export function fillFleetSlots(
  ships: Ship[],
  allSailors: Sailor[],
  usedIds: Set<number>,
  currentLevels: Record<string, number>,
  expandedTargets: Record<string, number>,
  getPriority: (s: Sailor, isCombatSlot: boolean) => number,
  skipEarlyExit: boolean = false  // [모드 B] true이면 목표 달성 후에도 슬롯을 계속 채움
) {
  ships.forEach(ship => {

    // ── 전투 선실 채우기 ──────────────────────────────────────────
    ship.combat.forEach((slot, i) => {

      // [Fix Bug 2] 이미 채워진 슬롯은 건너뜀
      // → lootFirst 페이즈1에서 채운 슬롯을 페이즈2가 덮어쓰는 현상 방지
      if (slot !== null) return;

      // [모드 A] 목표 달성 시 조기 종료 / [모드 B] 슬롯 끝까지 채움
      if (!skipEarlyExit && allTargetsMet(currentLevels, expandedTargets)) return;

      const best = allSailors
        .filter(s => !usedIds.has(s.id))
        .map(s => ({ s, p: getPriority(s, true) }))
        .filter(item => item.p > 0)
        .sort((a, b) => b.p - a.p)[0];

      if (best) {
        ship.combat[i] = best.s;
        usedIds.add(best.s.id);
        // [Fix] 맥스레벨을 초과하지 않도록 클램핑하여 누적
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

      // [Fix Bug 2] 이미 채워진 슬롯은 건너뜀
      if (slot !== null) return;

      // [모드 A] 목표 달성 시 조기 종료 / [모드 B] 슬롯 끝까지 채움
      if (!skipEarlyExit && allTargetsMet(currentLevels, expandedTargets)) return;

      const best = allSailors
        .filter(s => !usedIds.has(s.id))
        .map(s => ({ s, p: getPriority(s, false) }))
        .filter(item => item.p > 0)
        .sort((a, b) => b.p - a.p)[0];

      if (best) {
        ship.adventure[i] = best.s;
        usedIds.add(best.s.id);
        // [Fix] 맥스레벨을 초과하지 않도록 클램핑하여 누적
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