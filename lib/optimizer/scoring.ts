import { Sailor, Ship } from '@/types';
import { GRADE_RANK } from './rules';

export const SKILL_MAX_LEVELS: Record<string, number> = {
  // [전리품]
  "투쟁적인 탐험가": 10, "호전적인 탐험가": 10, "꼼꼼한 탐험가": 10, 
  "주의깊은 탐험가": 10, "성실한 탐험가": 10, "부지런한 탐험가": 10,
  // [전투]
  "험지 평정": 2, "전투적인 채집": 7, "전투적인 관찰": 8, 
  "해적 척결": 10, "맹수 척결": 10, "해적 사냥": 10, "맹수 사냥": 10,
  // [관찰]
  "관찰 공부": 10, "관측 후 채집": 4, "관측 후 전투": 6, 
  "생물 관찰": 7, "관찰 채집": 8, "험지 관찰": 2, "관찰 심화": 8,
  // [채집]
  "생물 채집": 6, "채집 우선 전투": 9, "채집 우선 관찰": 6, 
  "험지 채집": 2, "채집 심화": 5, "채집 공부": 10, "탐사의 기본": 10
};

/**
 * 선단 전체의 스킬 레벨을 합산하고 Max 제한(Clamping)을 적용하는 헬퍼 함수
 */
export function calculateFleetSkills(sailors: Sailor[]): Record<string, number> {
  const totals: Record<string, number> = {};
  
  // 1. 합산
  sailors.forEach(sailor => {
    if (!sailor) return;
    Object.keys(SKILL_MAX_LEVELS).forEach(skill => {
      const level = getSailorSkillLevel(sailor, skill);
      if (level > 0) {
        totals[skill] = (totals[skill] || 0) + level;
      }
    });
  });

  // 2. Max 제한 적용 (절대 수치 10 및 개별 Max 참조)
  const clamped: Record<string, number> = {};
  for (const skill in totals) {
    const max = Math.min(10, SKILL_MAX_LEVELS[skill] || 10);
    clamped[skill] = Math.min(totals[skill], max);
  }
  return clamped;
}

/**
 * 항해사의 데이터에서 스킬 레벨을 정밀 추출합니다. (규칙: 기본 1, 'LV2' 또는 'LV 2' 포함 시 2)
 */
export function getSailorSkillLevel(sailor: Sailor, skillName: string): number {
  if (!sailor) return 0;
  
  // 1. 프론트엔드에서 미리 파싱해둔 숫자형이 있는지 확인
  if (sailor[skillName] !== undefined && typeof sailor[skillName] === 'number') {
    return sailor[skillName];
  }

  // 2. 원시 데이터 텍스트 파싱 매칭 ('LV2' 정규식 엄격 적용)
  // 스킬명 뒤에 띄어쓰기가 있든 없든 LV2를 찾아내는 정규식
  const lv2Regex = new RegExp(`^${skillName.replace(/\s+/g, "\\s*")}\\s*LV2$`, "i");
  const baseRegex = new RegExp(`^${skillName.replace(/\s+/g, "\\s*")}$`, "i");

  for (const key in sailor) {
    const val = sailor[key];
    if (typeof val === 'string') {
      const trimmedVal = val.trim();
      if (lv2Regex.test(trimmedVal)) return 2;
      if (baseRegex.test(trimmedVal)) return 1;
      
      // 혹시 단순 포함 여부로 체크해야 예약어 충돌이 적을 경우 대비 (후방 호환)
      if (trimmedVal.toLowerCase().includes(skillName.toLowerCase())) {
         if (/\s*LV2$/i.test(trimmedVal)) return 2;
         return 1;
      }
    }
  }

  return 0;
}

/**
 * [수정] 등급 기반 동점자 처리 로직 반영
 * 기여도가 같을 경우 등급이 높은 항해사를 우선합니다.
 */
export function calculateTierScore(
  sailor: Sailor,
  currentLevels: Record<string, number>,
  targetLevels: Record<string, number>
): number {
  let totalScore = 0;
  let hasContribution = false;

  // 모든 육탐 스킬에 대해 평가 수행
  for (const sk in SKILL_MAX_LEVELS) {
    const sailorLvl = getSailorSkillLevel(sailor, sk);
    if (sailorLvl <= 0) continue;

    const max = Math.min(10, SKILL_MAX_LEVELS[sk] || 10);
    const target = targetLevels[sk] || 0;
    const current = currentLevels[sk] || 0;

    // 1. 기여도 계산
    // 아직 상한선(max)에 도달하지 않았을 때만 기여 인정
    const remainingToMax = Math.max(0, max - current);
    const contribution = Math.min(sailorLvl, remainingToMax);

    if (contribution > 0) {
      hasContribution = true;
      // 가중치 계산: 사용자가 설정한 목표치(1~10)가 높을수록 더 높은 점수 부여
      // 목표 설정이 없으면(0) 기본 가중치 1 적용
      const weight = target > 0 ? (target * 10) : 1;
      totalScore += (contribution * 1000 * weight);
    }

    // 2. 낭비 페널티 (Very Important)
    // 이 선원을 넣었을 때 max를 초과하게 되면 페널티 부여
    const overflow = Math.max(0, (current + sailorLvl) - max);
    if (overflow > 0) {
      // 낭비되는 양만큼 점수 삭감
      totalScore -= (overflow * 5000);
    }
    
    // 사용자가 설정한 목표치(target)를 초과하는 경우에도 약한 페널티 (딱 맞추기 권장)
    if (target > 0) {
       const targetOverflow = Math.max(0, (current + sailorLvl) - target);
       if (targetOverflow > 0) {
         totalScore -= (targetOverflow * 1000);
       }
    }
  }

  if (!hasContribution) return -1;

  // 등급 점수 (S+ 등급 우선 순위 동점자 처리용)
  const gradeScore = GRADE_RANK[sailor.등급] || 0;
  
  // 최종 점수: 기본 100만점 + 가중치 합산 점수 + 등급 보너스
  return 1_000_000 + totalScore + gradeScore;
}

// 기존 인터페이스 유지
export function getSupplyStat(sailor: Sailor): number { return Number(sailor.보급) || 0; }
export function getBaseScore(sailor: Sailor, prioritizeJob: boolean): number { return GRADE_RANK[sailor.등급] || 0; }
export function getTradeStatSum(sailor: Sailor): number { return 0; }
export function hasAnyTargetSkill(sailor: Sailor, skills: string[]): boolean {
  return skills.some(sk => getSailorSkillLevel(sailor, sk) > 0);
}