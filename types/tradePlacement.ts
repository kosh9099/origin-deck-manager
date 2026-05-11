export type TradePlacementRoleCode = 'A' | 'C' | 'T' | 'unknown';

export type TradePlacementShipRole = 'adventure' | 'trade' | 'combat' | 'unknown';

export interface TradePlacementCrewStats {
  백병?: number;
  박물?: number;
  보급?: number;
  심미?: number;
  척후?: number;
  구매?: number;
  판매?: number;
  협상?: number;
  교환?: number;
}

export interface TradePlacementCrew {
  personalId: string;
  name?: string;
  grade: string;
  role: string;
  roleCode: TradePlacementRoleCode;
  job?: string;
  isAdmiral?: boolean;
  sequence?: number | null;
  stats?: TradePlacementCrewStats;
  adventureSkills?: Record<string, number>;
  unresolved?: boolean;
}

export interface TradePlacementAssetKey {
  key: string;
  kind: string;
  name: string;
  ownerId: string;
  scope: 'crew' | 'common';
  ownerGrade?: string;
  ownerRoleCode?: TradePlacementRoleCode;
  ownerRole?: string;
  ownerSequence?: number | null;
  ownerName?: string | null;
  unresolvedOwner?: boolean;
}

export interface TradePlacementShip {
  id: string;
  family: string;
  role: TradePlacementShipRole;
  tier: number | null;
  variant: string;
}

export interface TradePlacementTarget {
  index: number;
  key: string;
  label: string;
  sourceColumn?: string | null;
  level: number;
}

export interface TradePlacementSeed {
  schemaVersion: 1;
  purpose: 'trade-placement-manager-seed';
  source: {
    fileName: string;
    personalSettingsVersion: number;
    savedAt: string;
  };
  summary: {
    selectedCrewCount: number;
    resolvedCrewCount: number;
    unresolvedCrewCount: number;
    selectedEquipmentCount: number;
    selectedCostumeCount: number;
    selectedShipCount: number;
    selectedPetCount: number;
    activeAppMode: string;
  };
  dataGaps: string[];
  activeUiState: Record<string, unknown>;
  assets: {
    crew: {
      selectedIds: string[];
      byGrade: Record<string, number>;
      byRole: Record<string, number>;
      resolved: TradePlacementCrew[];
      unresolvedIds: string[];
    };
    equipment: {
      selectedKeys: string[];
      items: TradePlacementAssetKey[];
    };
    costumes: {
      selectedKeys: string[];
      items: TradePlacementAssetKey[];
    };
    pets: {
      selectedIds: string[];
      items: Array<{ id: string; family: string; sequence: number }>;
    };
    ships: {
      selectedIds: string[];
      items: TradePlacementShip[];
    };
  };
  placementModes: {
    adventure: {
      crewLimit: number;
      activeEffectIndex: number;
      targetLevels: TradePlacementTarget[];
      selectedEffectIndices: number[];
    };
    trade: {
      crewLimit: number;
      activeEffectIndex: number;
      selectedItem: string;
      targetLevels: TradePlacementTarget[];
      selectedEffectIndices: number[];
      tradePartSelections: unknown[];
    };
    barter: {
      crewLimit: number;
      activeEffectIndex: number;
      targetLevels: TradePlacementTarget[];
      selectedEffectIndices: number[];
    };
    combat: unknown;
  };
  derived: {
    tradeCandidateStats: Array<{
      personalId: string;
      name: string;
      grade: string;
      role: string;
      stats: TradePlacementCrewStats;
      tradeBaseScore: number;
    }>;
  };
}
