import { Sailor, Ship } from '@/types';
import { MAX_SKILL_LEVELS } from './rules';
import {
  getSailorSkillLevel,
  calculateGlobalDeviation,
  addSailorSkills,
  addSailorSkillsRaw,
  hasNoUsefulContribution
} from './scoring';

interface PlacedEntry {
  sailor: Sailor;
  shipIndex: number;
  slotType: 'combat' | 'adventure';
  slotIndex: number;
}

// clamped + raw 레벨 동시 계산
function recalcAllLevels(ships: Ship[]): { clamped: Record<string, number>; raw: Record<string, number> } {
  const clamped: Record<string, number> = {};
  const raw: Record<string, number> = {};
  Object.keys(MAX_SKILL_LEVELS).forEach(sk => { clamped[sk] = 0; raw[sk] = 0; });

  const addSailor = (s: Sailor) => {
    addSailorSkills(s, clamped);
    addSailorSkillsRaw(s, raw);
  };

  ships.forEach(ship => {
    if (ship.admiral) addSailor(ship.admiral);
    ship.combat.forEach(s => { if (s) addSailor(s); });
    ship.adventure.forEach(s => { if (s) addSailor(s); });
  });

  return { clamped, raw };
}

// 임시로 선원을 교환한 상태의 레벨을 계산 (ships를 실제로 변경하지 않음)
function calcLevelsWithSwap(
  ships: Ship[],
  swapShipIdx: number,
  swapSlotType: 'combat' | 'adventure',
  swapSlotIdx: number,
  newSailor: Sailor | null
): { clamped: Record<string, number>; raw: Record<string, number> } {
  const clamped: Record<string, number> = {};
  const raw: Record<string, number> = {};
  Object.keys(MAX_SKILL_LEVELS).forEach(sk => { clamped[sk] = 0; raw[sk] = 0; });

  const addSailor = (s: Sailor) => {
    addSailorSkills(s, clamped);
    addSailorSkillsRaw(s, raw);
  };

  ships.forEach((ship, si) => {
    if (ship.admiral) addSailor(ship.admiral);
    ship.combat.forEach((s, ci) => {
      if (si === swapShipIdx && swapSlotType === 'combat' && ci === swapSlotIdx) {
        if (newSailor) addSailor(newSailor);
        return;
      }
      if (s) addSailor(s);
    });
    ship.adventure.forEach((s, ai) => {
      if (si === swapShipIdx && swapSlotType === 'adventure' && ai === swapSlotIdx) {
        if (newSailor) addSailor(newSailor);
        return;
      }
      if (s) addSailor(s);
    });
  });

  return { clamped, raw };
}

function getPlacedEntries(ships: Ship[], protectedIds: Set<number>): PlacedEntry[] {
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
  const protectedIds = new Set<number>([admiralId, ...essentialIds]);

  let { clamped: currentLevels, raw: currentRaw } = recalcAllLevels(ships);
  let currentDeviation = calculateGlobalDeviation(currentLevels, targetLevels, currentRaw);

  console.log(`=== Swap Optimizer Start === deviation: ${currentDeviation.toFixed(1)}`);

  if (currentDeviation === 0) return currentLevels;

  for (let iter = 0; iter < maxIterations; iter++) {
    let improved = false;

    const placedEntries = getPlacedEntries(ships, protectedIds);
    const unplaced = allSailors.filter(s => !usedIds.has(s.id) && hasAnySkill(s));

    // ── 1. Swap-In: 배치 선원 ↔ 미배치 선원 교환 ──
    for (const entry of placedEntries) {
      for (const candidate of unplaced) {
        if (!isValidForSlot(candidate, entry.slotType, isQualifiedForCombat)) continue;

        // 정확한 trial 평가: 교환 후 레벨을 처음부터 재계산
        const { clamped: trialClamped, raw: trialRaw } = calcLevelsWithSwap(
          ships, entry.shipIndex, entry.slotType, entry.slotIndex, candidate
        );

        const newDeviation = calculateGlobalDeviation(trialClamped, targetLevels, trialRaw);
        if (newDeviation < currentDeviation) {
          const ship = ships[entry.shipIndex];
          ship[entry.slotType][entry.slotIndex] = candidate;
          usedIds.delete(entry.sailor.id);
          usedIds.add(candidate.id);

          currentLevels = trialClamped;
          currentRaw = trialRaw;
          currentDeviation = newDeviation;
          improved = true;

          console.log(`  Swap: ${entry.sailor.이름} → ${candidate.이름} (dev: ${newDeviation.toFixed(1)})`);
          if (currentDeviation === 0) break;
          break;
        }
      }
      if (currentDeviation === 0 || improved) break;
    }

    // ── 2. Remove: 배치 선원 제거가 편차를 줄이는 경우 ──
    if (!improved) {
      const placedEntries2 = getPlacedEntries(ships, protectedIds);
      for (const entry of placedEntries2) {
        const { clamped: trialClamped, raw: trialRaw } = calcLevelsWithSwap(
          ships, entry.shipIndex, entry.slotType, entry.slotIndex, null
        );

        const newDeviation = calculateGlobalDeviation(trialClamped, targetLevels, trialRaw);
        if (newDeviation < currentDeviation) {
          const ship = ships[entry.shipIndex];
          ship[entry.slotType][entry.slotIndex] = null;
          usedIds.delete(entry.sailor.id);

          currentLevels = trialClamped;
          currentRaw = trialRaw;
          currentDeviation = newDeviation;
          improved = true;

          console.log(`  Remove: ${entry.sailor.이름} (dev: ${newDeviation.toFixed(1)})`);
          break;
        }
      }
    }

    // ── 3. Insert: 빈 슬롯에 선원 삽입 ──
    if (!improved) {
      const unplaced2 = allSailors.filter(s => !usedIds.has(s.id) && hasAnySkill(s));

      for (let si = 0; si < ships.length && !improved; si++) {
        const ship = ships[si];

        for (let ci = 0; ci < ship.combat.length && !improved; ci++) {
          if (ship.combat[ci] !== null) continue;
          for (const candidate of unplaced2) {
            if (!isValidForSlot(candidate, 'combat', isQualifiedForCombat)) continue;

            const { clamped: trialClamped, raw: trialRaw } = calcLevelsWithSwap(
              ships, si, 'combat', ci, candidate
            );
            const newDeviation = calculateGlobalDeviation(trialClamped, targetLevels, trialRaw);
            if (newDeviation < currentDeviation) {
              ship.combat[ci] = candidate;
              usedIds.add(candidate.id);
              currentLevels = trialClamped;
              currentRaw = trialRaw;
              currentDeviation = newDeviation;
              improved = true;
              console.log(`  Insert(combat): ${candidate.이름} (dev: ${newDeviation.toFixed(1)})`);
              break;
            }
          }
        }

        for (let ai = 0; ai < ship.adventure.length && !improved; ai++) {
          if (ship.adventure[ai] !== null) continue;
          for (const candidate of unplaced2) {
            if (!isValidForSlot(candidate, 'adventure', isQualifiedForCombat)) continue;

            const { clamped: trialClamped, raw: trialRaw } = calcLevelsWithSwap(
              ships, si, 'adventure', ai, candidate
            );
            const newDeviation = calculateGlobalDeviation(trialClamped, targetLevels, trialRaw);
            if (newDeviation < currentDeviation) {
              ship.adventure[ai] = candidate;
              usedIds.add(candidate.id);
              currentLevels = trialClamped;
              currentRaw = trialRaw;
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
