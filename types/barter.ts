export type BarterRecipe = {
  output: string;
  category: string;
  materials: string[];
};

export type BarterRate = {
  outputQty: number;
  materialQty: Record<string, number>;
};

export type CartCard = {
  id: string;
  name: string;
  ticks: number;
  /** 카드별 1회 교환 비율. 같은 품목이라도 카드마다 다른 비율을 가질 수 있음. */
  rates?: Record<string, BarterRate>;
};

export type CalcNode = {
  name: string;
  needed: number;
  isLeaf: boolean;
  rateMissing: boolean;
  children: CalcNode[];
};

export type CalcResult = {
  tree: CalcNode;
  leafTotals: Record<string, number>;
  hasMissingRate: boolean;
};
