import { Sailor, Ship } from '@/types';
import { MAX_SKILL_LEVELS } from './rules';
import {
  getSailorSkillLevel,
  calculateGlobalDeviation,
  addSailorSkills,
  removeSailorSkills,
  hasNoUsefulContribution
} from './scoring';

interface PlacedEntry {
  sailor: Sailor;
  shipIndex: number;
  slotType: 'combat' | 'adventure';
  slotIndex: number;
}

// 배치된 모든 선원으로부터 currentLevels를 처음부터 재계산
function recalcLevels(ships: Ship[], admiralId: number): Record<string, number> {
  const levels: Record<string, number> = {};
  Object.keys(MAX_SKILL_LEVELS).forEach(sk => levels[sk] = 0);

  ships.forEach(ship => {
    if (ship.admiral) addSailorSkills(ship.admiral, levels);
    ship.combat.forEach(s => { if (s) addSailorSkills(s, levels); });
    ship.adventure.forEach(s => { if (s) addSailorSkills(s, levels); });
  });

  return levels;
}

// 배치된 선원 목록을 추출 (제독, 필수선원 제외)
function getPlacedEntries(
  ships: Ship[],
  protectedIds: Set<number>
): PlacedEntry[] {
  const entries: PlacedEntry[] = [];
  ships.forEach((ship, si) => {
    ship.combat.forEach((s, ci) => {
      if (s && !protectedIds.has(s.id)) {
        entries.push({ sailor: s, shipIndex: si, slotType: 'combat', slotIndex: ci });
      }
    });
    ship.adventure.forEach((s, ai) => {
      if (s && !protectedIds.has(s.id)) {
        entries.push({ sailor: s, shipIndex: si, slotType: 'adventure', slotIndex: ai });
      }
    });
  });
  return entries;
}

// 슬롯 자격 검사
function isValidForSlot(
  sailor: Sailor,
  slotType: 'combat' | 'adventure',
  isQualifiedForCombat: (s: Sailor) => boolean
): boolean {
  if (slotType === 'combat') {
    return sailor.타입 === '전투' && isQualifiedForCombat(sailor);
  }
  return sailor.타입 === '모험';
}

// 선원이 스킬을 하나라도 가지고 있는지
function hasAnySkill(s: Sailor): boolean {
  return Object.keys(MAX_SKILL_LEVELS).some(sk => getSailorSkillLevel(s, sk) > 0);
}

export function optimizeBySwap(
  ships: Ship[],
  allSailors: Sailor[],
  usedIds: Set<number>,
  targetLevels: Record<string, number>,
  essentialIds: Set<number>,
  admiralId: number,
  isQualifiedForCombat: (s: Sailor) => boolean,
  maxIterations: number = 30
): Record<string, number> {
  // 제독 + 필수선원은 swap 대상에서 제외
  const protectedIds = new Set<number>([admiralId, ...essentialIds]);

  let currentLevels = recalcLevels(ships, admiralId);
  let currentDeviation = calculateGlobalDeviation(currentLevels, targetLevels);

  console.log(`=== Swap Optimizer Start === deviation: ${currentDeviation.toFixed(1)}`);

  if (currentDeviation === 0) return currentLevels;

  for (let iter = 0; iter < maxIterations; iter++) {
    let improved = false;

    const placedEntries = getPlacedEntries(ships, protectedIds);

    // 미배치 후보: 스킬이 있는 선원만
    const unplaced = allSailors.filter(s => !usedIds.has(s.id) && hasAnySkill(s));

    // ── 1. Swap-In: 배치 선원 ↔ 미배치 선원 교환 ──
    for (const entry of placedEntries) {
      for (const candidate of unplaced) {
        // 슬롯 자격 검사
        if (!isValidForSlot(candidate, entry.slotType, isQualifiedForCombat)) continue;

        // 임시 교환: 기존 선원 제거 → 새 선원 추가
        const tempLevels = { ...currentLevels };
        removeSailorSkills(entry.sailor, tempLevels);

        // 하드캡 검사
        if (hasNoUsefulContribution(candidate, tempLevels)) continue;

        addSailorSkills(candidate, tempLevels);

        const newDeviation = calculateGlobalDeviation(tempLevels, targetLevels);
        if (newDeviation < currentDeviation) {
          // 교환 확정
          const ship = ships[entry.shipIndex];
          ship[entry.slotType][entry.slotIndex] = candidate;

          usedIds.delete(entry.sailor.id);
          usedIds.add(candidate.id);

          currentLevels = recalcLevels(ships, admiralId);
          currentDeviation = newDeviation;
          improved = true;

          console.log(`  Swap: ${entry.sailor.이름} → ${candidate.이름} (dev: ${newDeviation.toFixed(1)})`);

          if (currentDeviation === 0) break;
          break; // first-improvement: 개선 발견 즉시 다음 라운드
        }
      }
      if (currentDeviation === 0 || improved) break;
    }

    // ── 2. Remove: 배치 선원 제거가 편차를 줄이는 경우 ──
    if (!improved) {
      const placedEntries2 = getPlacedEntries(ships, protectedIds);
      for (const entry of placedEntries2) {
        const tempLevels = { ...currentLevels };
        removeSailorSkills(entry.sailor, tempLevels);

        const newDeviation = calculateGlobalDeviation(tempLevels, targetLevels);
        if (newDeviation < currentDeviation) {
          const ship = ships[entry.shipIndex];
          ship[entry.slotType][entry.slotIndex] = null;
          usedIds.delete(entry.sailor.id);

          currentLevels = recalcLevels(ships, admiralId);
          currentDeviation = newDeviation;
          improved = true;

          console.log(`  Remove: ${entry.sailor.이름} (dev: ${newDeviation.toFixed(1)})`);
          break;
        }
      }
    }

    // ── 3. Insert: 빈 슬롯에 미배치 선원 삽입이 편차를 줄이는 경우 ──
    if (!improved) {
      const unplaced2 = allSailors.filter(s => !usedIds.has(s.id) && hasAnySkill(s));

      for (let si = 0; si < ships.length && !improved; si++) {
        const ship = ships[si];

        // 빈 전투 슬롯
        for (let ci = 0; ci < ship.combat.length && !improved; ci++) {
          if (ship.combat[ci] !== null) continue;
          for (const candidate of unplaced2) {
            if (!isValidForSlot(candidate, 'combat', isQualifiedForCombat)) continue;
            if (hasNoUsefulContribution(candidate, currentLevels)) continue;

            const tempLevels = { ...currentLevels };
            addSailorSkills(candidate, tempLevels);
            const newDeviation = calculateGlobalDeviation(tempLevels, targetLevels);
            if (newDeviation < currentDeviation) {
              ship.combat[ci] = candidate;
              usedIds.add(candidate.id);
              currentLevels = recalcLevels(ships, admiralId);
              currentDeviation = newDeviation;
              improved = true;
              console.log(`  Insert(combat): ${candidate.이름} (dev: ${newDeviation.toFixed(1)})`);
              break;
            }
          }
        }

        // 빈 일반 슬롯
        for (let ai = 0; ai < ship.adventure.length && !improved; ai++) {
          if (ship.adventure[ai] !== null) continue;
          for (const candidate of unplaced2) {
            if (!isValidForSlot(candidate, 'adventure', isQualifiedForCombat)) continue;
            if (hasNoUsefulContribution(candidate, currentLevels)) continue;

            const tempLevels = { ...currentLevels };
            addSailorSkills(candidate, tempLevels);
            const newDeviation = calculateGlobalDeviation(tempLevels, targetLevels);
            if (newDeviation < currentDeviation) {
              ship.adventure[ai] = candidate;
              usedIds.add(candidate.id);
              currentLevels = recalcLevels(ships, admiralId);
              currentDeviation = newDeviation;
              improved = true;
              console.log(`  Insert(adv): ${candidate.이름} (dev: ${newDeviation.toFixed(1)})`);
              break;
            }
          }
        }
      }
    }

    if (!improved || currentDeviation === 0) {
      console.log(`=== Swap Optimizer Done === iter: ${iter + 1}, final deviation: ${currentDeviation.toFixed(1)}`);
      break;
    }
  }

  return currentLevels;
}
