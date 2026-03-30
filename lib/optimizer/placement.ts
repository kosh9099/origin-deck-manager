import { Sailor, Ship } from '@/types';
import { getSailorSkillLevel } from './scoring';
import { MAX_SKILL_LEVELS } from './rules';

// ════════════════════════════════════════════════════════════════
// 자료구조
// ════════════════════════════════════════════════════════════════

export interface SlotRef {
  shipIndex: number;
  slotType: 'combat' | 'adventure';
  slotIndex: number;
}

// ════════════════════════════════════════════════════════════════
// Phase 2: 그리디 초기 배치 (기존 유지 + 개선)
// ════════════════════════════════════════════════════════════════

export function fillFleetSlots(
  ships: Ship[],
  allSailors: Sailor[],
  usedIds: Set<number>,
  currentLevels: Record<string, number>,
  getPriority: (s: Sailor, isCombatSlot: boolean) => number,
) {
  ships.forEach(ship => {

    // ── 전투 선실 채우기 ──
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

    // ── 일반 선실 채우기 ──
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

// ════════════════════════════════════════════════════════════════
// 스킬 프로파일 캐싱 (정규식 반복 방지)
// ════════════════════════════════════════════════════════════════

const SKILL_KEYS = Object.keys(MAX_SKILL_LEVELS);
const skillProfileCache = new Map<number, number[]>();

/** 선원의 모든 스킬 레벨을 배열로 캐싱 반환 (인덱스 = SKILL_KEYS 순서) */
function getSkillProfile(sailor: Sailor): number[] {
  let profile = skillProfileCache.get(sailor.id);
  if (profile) return profile;
  profile = new Array(SKILL_KEYS.length);
  for (let i = 0; i < SKILL_KEYS.length; i++) {
    profile[i] = getSailorSkillLevel(sailor, SKILL_KEYS[i]);
  }
  skillProfileCache.set(sailor.id, profile);
  return profile;
}

// ════════════════════════════════════════════════════════════════
// Phase 3: 스왑 기반 최적화
// ════════════════════════════════════════════════════════════════

/** 배치된 슬롯 전체를 SlotRef 배열로 열거 */
function enumerateFilledSlots(ships: Ship[]): SlotRef[] {
  const result: SlotRef[] = [];
  ships.forEach((ship, shipIndex) => {
    ship.combat.forEach((slot, slotIndex) => {
      if (slot !== null) result.push({ shipIndex, slotType: 'combat', slotIndex });
    });
    ship.adventure.forEach((slot, slotIndex) => {
      if (slot !== null) result.push({ shipIndex, slotType: 'adventure', slotIndex });
    });
  });
  return result;
}

/** 슬롯에서 선원 가져오기 */
function getSailorAt(ships: Ship[], ref: SlotRef): Sailor | null {
  return ships[ref.shipIndex][ref.slotType][ref.slotIndex];
}

/** 슬롯에 선원 배치 */
function setSailorAt(ships: Ship[], ref: SlotRef, sailor: Sailor): void {
  (ships[ref.shipIndex][ref.slotType] as (Sailor | null)[])[ref.slotIndex] = sailor;
}

/** 함대 전체에서 unclamped 스킬 레벨 합산 (제독 포함) */
export function computeUnclampedLevels(ships: Ship[]): Record<string, number> {
  const totals: Record<string, number> = {};
  Object.keys(MAX_SKILL_LEVELS).forEach(sk => totals[sk] = 0);

  ships.forEach(ship => {
    const allCrew: (Sailor | null)[] = [ship.admiral, ...ship.combat, ...ship.adventure];
    allCrew.forEach(s => {
      if (!s) return;
      Object.keys(MAX_SKILL_LEVELS).forEach(sk => {
        totals[sk] += getSailorSkillLevel(s, sk);
      });
    });
  });
  return totals;
}

/** unclamped → clamped 레벨 변환 */
function clampLevels(unclamped: Record<string, number>): Record<string, number> {
  const clamped: Record<string, number> = {};
  for (const sk in unclamped) {
    clamped[sk] = Math.min(unclamped[sk], MAX_SKILL_LEVELS[sk] || 10);
  }
  return clamped;
}

/** MAX_SKILL_LEVELS 초과 여부 검사 */
function anyExceedsMax(levels: Record<string, number>): boolean {
  for (const sk in MAX_SKILL_LEVELS) {
    if ((levels[sk] || 0) > MAX_SKILL_LEVELS[sk]) return true;
  }
  return false;
}

/**
 * 1-opt 힐 클라이밍: 배치 선원 ↔ 미배치 후보 1:1 교환
 * 개선이 없으면 수렴. 상태를 직접 변경함.
 * @returns 수렴 후 점수
 */
function hillClimb1opt(
  ships: Ship[],
  usedIds: Set<number>,
  unplacedPool: Sailor[],
  unclampedLevels: Record<string, number>,
  objectiveFn: (levels: Record<string, number>) => number,
  qualificationFn: (sailor: Sailor, slotType: 'combat' | 'adventure') => boolean,
  essentialIds: Set<number>,
  admiralId: number,
  maxIterations: number,
  deadline?: number
): number {
  let bestScore = objectiveFn(unclampedLevels);

  // 재사용 버퍼 (GC 부담 제거)
  const simBuf: Record<string, number> = {};
  for (const sk of SKILL_KEYS) { simBuf[sk] = 0; }

  // MAX 캐싱
  const maxArr: number[] = SKILL_KEYS.map(sk => MAX_SKILL_LEVELS[sk] || 10);

  // 후보를 슬롯 타입별로 미리 인덱싱
  const combatQualified = new Set<number>();
  const adventureQualified = new Set<number>();
  for (const s of unplacedPool) {
    if (qualificationFn(s, 'combat')) combatQualified.add(s.id);
    if (qualificationFn(s, 'adventure')) adventureQualified.add(s.id);
  }

  for (let iter = 0; iter < maxIterations; iter++) {
    if (deadline && Date.now() > deadline) break;
    const slots = enumerateFilledSlots(ships)
      .filter(slot => {
        const s = getSailorAt(ships, slot);
        if (!s) return false;
        if (s.id === admiralId) return false;
        if (essentialIds.has(s.id)) return false;
        return true;
      });

    let bestSwap: {
      slot: SlotRef; placed: Sailor; candidate: Sailor;
      candidateIdx: number; delta: number;
    } | null = null;

    for (const slot of slots) {
      const placed = getSailorAt(ships, slot)!;
      const placedProfile = getSkillProfile(placed);
      const qualSet = slot.slotType === 'combat' ? combatQualified : adventureQualified;

      for (let ci = 0; ci < unplacedPool.length; ci++) {
        const candidate = unplacedPool[ci];
        if (!qualSet.has(candidate.id)) continue;

        const candProfile = getSkillProfile(candidate);

        // 버퍼에 시뮬레이션 (할당 없음)
        let changed = false;
        for (let ki = 0; ki < SKILL_KEYS.length; ki++) {
          const diff = candProfile[ki] - placedProfile[ki];
          const sk = SKILL_KEYS[ki];
          if (diff !== 0) {
            simBuf[sk] = unclampedLevels[sk] + diff;
            changed = true;
          } else {
            simBuf[sk] = unclampedLevels[sk];
          }
        }
        if (!changed) continue;

        const newScore = objectiveFn(simBuf);
        const delta = newScore - bestScore;

        if (delta > 0 && (bestSwap === null || delta > bestSwap.delta)) {
          bestSwap = { slot, placed, candidate, candidateIdx: ci, delta };
        }
      }
    }

    if (!bestSwap) break;

    // 스왑 실행
    setSailorAt(ships, bestSwap.slot, bestSwap.candidate);
    usedIds.delete(bestSwap.placed.id);
    usedIds.add(bestSwap.candidate.id);
    unplacedPool.splice(bestSwap.candidateIdx, 1);
    unplacedPool.push(bestSwap.placed);

    // qualification set 업데이트: placed는 풀로, candidate는 풀에서 제거
    combatQualified.delete(bestSwap.candidate.id);
    adventureQualified.delete(bestSwap.candidate.id);
    if (qualificationFn(bestSwap.placed, 'combat')) combatQualified.add(bestSwap.placed.id);
    if (qualificationFn(bestSwap.placed, 'adventure')) adventureQualified.add(bestSwap.placed.id);

    // unclamped 업데이트 (캐시 프로파일 사용)
    const removedProfile = getSkillProfile(bestSwap.placed);
    const addedProfile = getSkillProfile(bestSwap.candidate);
    for (let ki = 0; ki < SKILL_KEYS.length; ki++) {
      const diff = addedProfile[ki] - removedProfile[ki];
      if (diff !== 0) {
        unclampedLevels[SKILL_KEYS[ki]] += diff;
      }
    }
    bestScore += bestSwap.delta;

    if (iter % 10 === 0) {
      console.log(`[Swap] Iter ${iter}: score=${bestScore}`);
    }
  }
  return bestScore;
}

/** 간단한 시드 기반 난수 (결정론적) */
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

/**
 * 스왑 최적화 메인: Iterated Local Search (ILS)
 *
 * 1) 1-opt 힐 클라이밍으로 수렴
 * 2) 수렴 시 교란(perturbation): 랜덤 K명 스왑
 * 3) 다시 1-opt → 개선되면 유지, 아니면 복원
 * 4) 반복 (최대 restarts 회)
 */
export function swapOptimize(
  ships: Ship[],
  usedIds: Set<number>,
  unplacedPool: Sailor[],
  unclampedLevels: Record<string, number>,
  objectiveFn: (levels: Record<string, number>) => number,
  qualificationFn: (sailor: Sailor, slotType: 'combat' | 'adventure') => boolean,
  essentialIds: Set<number>,
  admiralId: number,
  maxIterations: number = 200
): void {
  const startTime = Date.now();
  const TIME_LIMIT = 15000; // 최대 15초
  const deadline = startTime + TIME_LIMIT;

  console.log(`[Swap] Initial score: ${objectiveFn(unclampedLevels)}`);

  // Phase A: 첫 번째 1-opt
  let bestScore = hillClimb1opt(
    ships, usedIds, unplacedPool, unclampedLevels,
    objectiveFn, qualificationFn, essentialIds, admiralId, maxIterations, deadline
  );
  console.log(`[Swap] After initial 1-opt: score=${bestScore} (${Date.now() - startTime}ms)`);

  if (bestScore >= 0) return; // 이미 최적

  // Phase B: 교란 후 재시작 (ILS)
  const MAX_RESTARTS = 20;
  const PERTURB_COUNT = 6;
  const rng = seededRandom(42);

  for (let restart = 0; restart < MAX_RESTARTS; restart++) {
    if (bestScore >= 0 || Date.now() > deadline) break;

    // 상태 스냅샷 저장
    const snapShips = ships.map(ship => ({
      ...ship,
      combat: [...ship.combat],
      adventure: [...ship.adventure],
    }));
    const snapUsedIds = new Set(usedIds);
    const snapPool = [...unplacedPool];
    const snapUnclamped = { ...unclampedLevels };

    // 교란: 랜덤 K명을 미배치 후보와 교환
    const swappableSlots = enumerateFilledSlots(ships).filter(slot => {
      const s = getSailorAt(ships, slot);
      if (!s) return false;
      if (s.id === admiralId) return false;
      if (essentialIds.has(s.id)) return false;
      return true;
    });

    let perturbedCount = 0;
    const shuffledSlots = [...swappableSlots].sort(() => rng() - 0.5);

    for (const slot of shuffledSlots) {
      if (perturbedCount >= PERTURB_COUNT) break;

      const placed = getSailorAt(ships, slot);
      if (!placed) continue;

      // 자격 맞는 랜덤 후보 찾기
      const qualifiedCandidates = unplacedPool
        .map((c, i) => ({ c, i }))
        .filter(({ c }) => qualificationFn(c, slot.slotType));
      if (qualifiedCandidates.length === 0) continue;

      const pick = qualifiedCandidates[Math.floor(rng() * qualifiedCandidates.length)];

      // 스왑
      setSailorAt(ships, slot, pick.c);
      usedIds.delete(placed.id);
      usedIds.add(pick.c.id);
      unplacedPool.splice(pick.i, 1);
      unplacedPool.push(placed);

      for (const sk in MAX_SKILL_LEVELS) {
        unclampedLevels[sk] = unclampedLevels[sk]
          - getSailorSkillLevel(placed, sk) + getSailorSkillLevel(pick.c, sk);
      }

      perturbedCount++;
    }

    // 교란 후 1-opt 재시작
    const newScore = hillClimb1opt(
      ships, usedIds, unplacedPool, unclampedLevels,
      objectiveFn, qualificationFn, essentialIds, admiralId, maxIterations, deadline
    );

    if (newScore > bestScore) {
      bestScore = newScore;
      console.log(`[Swap] Restart ${restart}: improved to ${bestScore}`);
    } else {
      // 복원
      ships.forEach((ship, i) => {
        ship.admiral = snapShips[i].admiral;
        ship.combat = snapShips[i].combat;
        ship.adventure = snapShips[i].adventure;
      });
      usedIds.clear();
      snapUsedIds.forEach(id => usedIds.add(id));
      unplacedPool.length = 0;
      snapPool.forEach(s => unplacedPool.push(s));
      for (const sk in snapUnclamped) {
        unclampedLevels[sk] = snapUnclamped[sk];
      }
    }
  }

  console.log(`[Swap] Final score: ${bestScore}`);
}
