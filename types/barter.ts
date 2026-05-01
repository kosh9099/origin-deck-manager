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
