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
        // 목표치는 최대 10까지만 유효
        const target = Math.min(10, Math.max(expandedTargets[skill.name] || 0, categoryGoal));
        expandedTargets[skill.name] = target;
      });
    }
  });

  // 스킬 미설정 시 에러
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

  // 5. 제독 강제 배치 (스킬 레벨 반영)
  const mainAdmiral = all.find(s => s.id === selectedAdmiralId);
  if (mainAdmiral && ships[0]) {
    ships[0].admiral = mainAdmiral;
    usedIds.add(mainAdmiral.id);
    // 제독 스킬 합산 (최대 10 제한)
    Object.keys(MAX_SKILL_LEVELS).forEach(sk => {
      const lv = getSailorSkillLevel(mainAdmiral, sk);
      if (lv > 0) {
        currentLevels[sk] = Math.min(10, (currentLevels[sk] || 0) + lv);
      }
    });
  }

  // 6. 우선순위 결정 함수 (The Brain)
  const getPriority = (s: Sailor, isCombatSlot: boolean) => {
    if (usedIds.has(s.id)) return -1;
    const isEssential = essentialIds.has(s.id);
    
    // 필수 선원 최우선 (어디든 배치 가능)
    if (isEssential) return 20_000_000_000_000;

    // ▼▼▼ 전투 선실 로직 ▼▼▼
    if (isCombatSlot) {
      if (s.타입 !== '전투') return -1;

      // 목표 스킬 보유 여부 확인
      let hasTargetSkill = false;
      for (const sk in expandedTargets) {
        if (expandedTargets[sk] > 0 && getSailorSkillLevel(s, sk) > 0) {
          hasTargetSkill = true;
          break;
        }
      }

      const isAdm = s.등급 === 'S+'; // 전투 제독
      const isBoarder = s.직업 === "백병대";

      // [Rule 1] 스킬 보유 + (전투제독 OR 백병대) -> 최우선
      if (hasTargetSkill && (isAdm || isBoarder)) {
         return 2_000_000_000 + getBaseScore(s);
      }

      // [옵션] 예외 허용 (백병대 추가 ON)
      if (options.includeBoarding && isBoarder && !hasTargetSkill) {
         return 1_500_000_000 + getBaseScore(s);
      }
      
      // [옵션] 예외 허용 (특공대 추가 ON)
      const isSpec = s.직업 === "특공대";
      if (options.includeSpecialForces && isSpec) {
         if (hasTargetSkill) return 1_400_000_000 + getBaseScore(s);
         else return 1_300_000_000 + getBaseScore(s);
      }

      return -1; // 그 외에는 배치 불가
    }

    // ▼▼▼ 일반(모험) 선실 로직 ▼▼▼
    if (s.타입 === '전투') return -1; // 전투 요원 불가

    // [교역 차단] 옵션 OFF 시 교역 타입 절대 금지
    if (!options.includeTrade && s.타입 === '교역') {
        return -1;
    }

    // A. 목표 스킬 기여도 계산
    let bestSkillScore = 0;
    
    Object.keys(MAX_SKILL_LEVELS).forEach(sk => {
      const sailorLvl = getSailorSkillLevel(s, sk);
      if (sailorLvl <= 0) return;

      const current = currentLevels[sk] || 0;
      const target = expandedTargets[sk] || 0; 
      const maxCap = MAX_SKILL_LEVELS[sk] || 10;
      
      // 이미 10레벨이거나 목표를 달성했으면 낭비 (점수 0)
      if (current >= 10 || current >= target) return;

      // 유효한 기여 레벨 (목표치까지만 인정)
      const limit = Math.min(10, target);
      const needed = limit - current;
      const contribution = Math.min(sailorLvl, needed);

      if (contribution > 0) {
        // [가중치 공식]
        // 1. 스킬 중요도: MAX Cap이 큰 스킬(10)일수록 우선 (100조 단위)
        const typeWeight = maxCap * 100_000_000_000;
        
        // 2. 기여도: 레벨을 많이 채워줄수록(2렙) 우선 (100억 단위)
        const contribWeight = contribution * 10_000_000_000;
        
        const score = typeWeight + contribWeight;
        
        if (bestSkillScore < score) {
           bestSkillScore = score;
        }
      }
    });

    // 목표 스킬을 채워줄 수 있는 경우
    if (bestSkillScore > 0) {
      // 스킬 점수 + 계급 점수(동점자 처리: 등급>보급>직업)
      return bestSkillScore + getBaseScore(s);
    }

    // B. 빈자리 채우기 (Overflow)
    // 목표를 다 채운 뒤 남는 자리는 getBaseScore(등급>보급>직업) 순으로 채움
    // 단, 스킬 보유자보다 점수가 낮아야 하므로 1000으로 나눔
    return getBaseScore(s) / 1000;
  };

  // 7. 배치 실행
  fillFleetSlots(ships, all, usedIds, currentLevels, getPriority);

  console.log("배치 결과:", ships);
  return { ships };
}