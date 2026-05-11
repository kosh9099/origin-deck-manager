export type SailorMasterGrade = 'S+' | 'S' | 'A' | 'B' | 'C' | string;

export type SailorMasterType = '모험' | '전투' | '교역' | string;

export type SailorMasterTypeCode = 'A' | 'C' | 'T' | 'unknown';

export type SailorEffectCategory = 'level' | 'potential' | 'bond' | 'native';

export type SailorEffectDirection = 'increase' | 'decrease';

export interface SailorLanguage {
  name: string;
  level: number;
}

export interface SailorStats {
  포격술: number;
  충파술: number;
  지원술: number;
  백병술: number;
  박물학: number;
  심미학: number;
  척후법: number;
  보급법: number;
  구매전략: number;
  판매전략: number;
  협상전략: number;
  교환전략: number;
}

export interface SailorEffect {
  key: string;
  label: string;
  category: SailorEffectCategory;
  source: string;
  name: string;
  level?: number;
  direction?: SailorEffectDirection;
}

export interface SailorCombatSkills {
  level1?: string;
  level50?: string;
  bond?: string;
}

export interface NormalizedSailor {
  personalId: string;
  sequence: number;
  grade: SailorMasterGrade;
  type: SailorMasterType;
  typeCode: SailorMasterTypeCode;
  name: string;
  job: string;
  languages: SailorLanguage[];
  stats: SailorStats;
  effects: SailorEffect[];
  combatSkills: SailorCombatSkills;
  requirement?: string;
}

export interface SailorMaster0511 {
  schemaVersion: 1;
  source: {
    fileName: string;
    sheetName: string;
    normalizedAt: string;
    rowCount: number;
  };
  summary: {
    total: number;
    byGrade: Record<string, number>;
    byType: Record<string, number>;
    byGradeType: Record<string, number>;
  };
  sailors: NormalizedSailor[];
}
