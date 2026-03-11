import { Sailor, Ship } from '@/types';
import { getSailorSkillLevel } from './scoring';
import { MAX_SKILL_LEVELS } from './rules';

/**
 * [새 기능] 사용자가 설정한 모든 목표 스킬 레벨에 도달했는지 확인합니다.
 * 목표가 하나도 설정되지 않은 경우(expandedTargets가 비었거나 모두 0)는
 * "달성 완료"로 보지 않아 최대한 스킬을 채우는 모드를 유지합니다.
 */
function allTargetsMet(
  currentLevels: Record<string, number>,
  expandedTargets: Record<string, number>
): boolean {
  const activeTargets = Object.entries(expandedTargets).filter(([, v]) => v > 0);
  if (activeTargets.length === 0) return false; // 목표 미설정 → 공석 없이 계속 채움
  return activeTargets.every(([sk, target]) => (currentLevels[sk] || 0) >= target);
}

export function fillFleetSlots(
  ships: Ship[],
  allSailors: Sailor[],
  usedIds: Set<number>,
  currentLevels: Record<string, number>,
  expandedTargets: Record<string, number>,
  getPriority: (s: Sailor, isCombatSlot: boolean) => number
) {
  ships.forEach(ship => {

    // ── 전투 선실 채우기 ──────────────────────────────────────────
    ship.combat.forEach((_, i) => {

      // [새 기능] 목표 스킬을 모두 달성했다면 나머지 슬롯은 공석으로 유지
      if (allTargetsMet(currentLevels, expandedTargets)) return;

      const best = allSailors
        .filter(s => !usedIds.has(s.id))
        .map(s => ({ s, p: getPriority(s, true) }))
        .filter(item => item.p > 0)
        .sort((a, b) => b.p - a.p)[0];

      if (best) {
        ship.combat[i] = best.s;
        usedIds.add(best.s.id);

        // [Bug B Fix] expandedTargets가 아닌 MAX_SKILL_LEVELS 전체 키 기준으로 갱신
        // → 목표 미설정 스킬도 currentLevels에 반영되어 그리디 알고리즘이 정상 작동
        Object.keys(MAX_SKILL_LEVELS).forEach(sk => {
          currentLevels[sk] = (currentLevels[sk] || 0) + getSailorSkillLevel(best.s, sk);
        });
      }
    });

    // ── 일반 선실 채우기 ──────────────────────────────────────────
    ship.adventure.forEach((_, i) => {

      // [새 기능] 목표 스킬을 모두 달성했다면 나머지 슬롯은 공석으로 유지
      if (allTargetsMet(currentLevels, expandedTargets)) return;

      const best = allSailors
        .filter(s => !usedIds.has(s.id))
        .map(s => ({ s, p: getPriority(s, false) }))
        .filter(item => item.p > 0)
        .sort((a, b) => b.p - a.p)[0];

      if (best) {
        ship.adventure[i] = best.s;
        usedIds.add(best.s.id);

        // [Bug B Fix] MAX_SKILL_LEVELS 전체 키 기준으로 currentLevels 갱신
        Object.keys(MAX_SKILL_LEVELS).forEach(sk => {
          currentLevels[sk] = (currentLevels[sk] || 0) + getSailorSkillLevel(best.s, sk);
        });
      }
    });
  });
}