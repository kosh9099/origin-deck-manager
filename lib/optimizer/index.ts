import { Sailor, ShipConfig, OptimizerOptions, Ship, EXPLORATION_STATS } from '@/types';
import { filterSailors } from './filters';
import { fillFleetSlots } from './placement';
import { getSailorSkillLevel, getSupplyStat, getBaseScore } from './scoring';
import { ADMIRAL_GRADE, GRADE_RANK, MAX_SKILL_LEVELS } from './rules';
import { SKILL_STATS } from './data/skillStats';

export function generateOptimizedFleet(
  sailors: Sailor[],
  essentialIds: Set<number>,
  bannedIds: Set<number>,
  fleetConfig: ShipConfig[],
  selectedAdmiralId: number,
  targetLevels: Record<string, number>,
  options: OptimizerOptions
) {
  // 1. 기본 필터링
  const { all } = filterSailors(sailors, bannedIds);
  const usedIds = new Set<number>();
  
  // 2. 현재 스킬 레벨 초기화
  const currentLevels: Record<string, number> = {};
  Object.keys(MAX_SKILL_LEVELS).forEach(sk => currentLevels[sk] = 0);

  // 3. 목표치 확장 및 유효성 검사
  const expandedTargets: Record<string, number> = { ...targetLevels };
  Object.entries(EXPLORATION_STATS).forEach(([category, skills]) => {
    const categoryGoal = targetLevels[category] || 0;
    if (categoryGoal > 0) {
      skills.forEach(skill => {
        const target = Math.min(10, Math.max(expandedTargets[skill.name] || 0, categoryGoal));
        expandedTargets[skill.name] = target;
      });
    }
  });

  const totalTargetSum = Object.values(expandedTargets).reduce((a, b) => a + b, 0);
  if (totalTargetSum === 0) {
    throw new Error("스킬을 설정해주세요.");
  }

  // 4. 함대 슬롯 생성
  const ships: Ship[] = fleetConfig.map(config => {
    const isFlagship = config.id === 1; 
    const advCount = Math.max(0, config.총선실 - config.전투선실 - (isFlagship ? 1 : 0));
    const cbtCount = Math.max(0, config.전투선실);

    return {
      id: config.id,
      admiral: null,
      adventure: Array(advCount).fill(null),
      combat: Array(cbtCount).fill(null)
    };
  });

  // 5. 제독 강제 배치
  const mainAdmiral = all.find(s => s.id === selectedAdmiralId);
  if (mainAdmiral && ships[0]) {
    ships[0].admiral = mainAdmiral;
    usedIds.add(mainAdmiral.id);
    Object.keys(MAX_SKILL_LEVELS).forEach(sk => {
      const lv = getSailorSkillLevel(mainAdmiral, sk);
      if (lv > 0) {
        currentLevels[sk] = Math.min(10, (currentLevels[sk] || 0) + lv);
      }
    });
  }

  // 6. 우선순위 결정 함수
  const getPriority = (s: Sailor, isCombatSlot: boolean) => {
    if (usedIds.has(s.id)) return -1;
    const isEssential = essentialIds.has(s.id);
    if (isEssential) return 20_000_000_000_000; // 절대존엄

    // ----------------------------------------------------------------
    // [Step 1] 스킬 기여도 및 Rank 1~4 점수 계산 (일반 선실용)
    // ----------------------------------------------------------------
    let bestSkillScore = 0;
    
    // 이 선원이 목표 스킬에 기여할 수 있는지 체크
    Object.keys(MAX_SKILL_LEVELS).forEach(sk => {
      const sailorLvl = getSailorSkillLevel(s, sk);
      if (sailorLvl <= 0) return;

      const current = currentLevels[sk] || 0;
      const target = expandedTargets[sk] || 0; 
      
      // 이미 목표 달성했으면 점수 없음 -> Rank 5(빈자리)로 넘어감
      if (current >= 10 || current >= target) return;

      // 유효한 기여도 (낭비 방지)
      const limit = Math.min(10, target);
      const needed = limit - current;
      const contribution = Math.min(sailorLvl, needed);

      if (contribution > 0) {
        // [긴급도 보정] 0/10인 스킬을 가진 놈을 8/10인 놈보다 먼저 (50조)
        const urgency = (1 - (current / target)) * 50_000_000_000_000;
        
        let rankScore = 0;

        // [Rank 1] LV2 스킬 보유자 (500조)
        if (sailorLvl >= 2) {
            rankScore = 500_000_000_000_000;
        }
        // [Rank 2] 모험 타입 제독 (400조)
        else if (s.타입 === '모험' && s.등급 === 'S+') {
            rankScore = 400_000_000_000_000;
        }
        // [Rank 3] 모험 타입 항해사 (300조)
        else if (s.타입 === '모험') {
            rankScore = 300_000_000_000_000;
        }
        // [Rank 4] 기타 스킬 보유자 (200조) - 교역/전투 등
        else {
            rankScore = 200_000_000_000_000;
        }

        const total = rankScore + urgency;
        if (bestSkillScore < total) bestSkillScore = total;
      }
    });

    // ----------------------------------------------------------------
    // [전투 선실] - 규칙 4번 엄수
    // ----------------------------------------------------------------
    if (isCombatSlot) {
      if (s.타입 !== '전투') return -1;

      const isAdm = s.등급 === 'S+'; 
      const isBoarder = s.직업 === "백병대";

      // 1. 목표 스킬 보유 AND (제독 OR 백병대) -> 최우선
      if (bestSkillScore > 0 && (isAdm || isBoarder)) {
          // Rank 1~4 점수 그대로 활용 (이미 조 단위임)
          return bestSkillScore + getBaseScore(s, options.prioritizeSupply);
      }

      // 옵션: 백병대 추가
      if (options.includeBoarding && isBoarder) {
         return 1_500_000_000 + getBaseScore(s, options.prioritizeSupply);
      }
      
      // 옵션: 특공대 추가
      if (options.includeSpecialForces && s.직업 === "특공대") {
         return 1_300_000_000 + getBaseScore(s, options.prioritizeSupply);
      }

      // 스킬도 없고 옵션도 해당 안되면 탈락
      return -1;
    }

    // ----------------------------------------------------------------
    // [일반(모험) 선실]
    // ----------------------------------------------------------------
    if (s.타입 === '전투') return -1; // 전투 요원 금지

    // 교역 차단 (규칙 5번)
    if (!options.includeTrade && s.타입 === '교역') {
        return -1;
    }

    // Rank 1~4: 목표 스킬 채우기 (조 단위 점수)
    if (bestSkillScore > 0) {
      return bestSkillScore + getBaseScore(s, options.prioritizeSupply);
    }

    // Rank 5: 목표 채운 후 빈자리 채우기
    // getBaseScore가 옵션에 따라 (보급순) 또는 (제독>직업순)으로 점수 반환
    return getBaseScore(s, options.prioritizeSupply);
  };

  fillFleetSlots(ships, all, usedIds, currentLevels, getPriority);

  console.log("배치 결과:", ships);
  return { ships };
}