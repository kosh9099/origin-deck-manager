import type { BarterRecipe, BarterRate, CalcNode, CalcResult, CartCard } from '@/types/barter';

function calcNode(
  name: string,
  needed: number,
  recipes: Map<string, BarterRecipe>,
  rates: Record<string, BarterRate>,
  intermediates: Set<string>,
  asLeaf: Set<string>,
  leafTotals: Record<string, number>,
  missingFlag: { value: boolean }
): CalcNode {
  const isIntermediate = intermediates.has(name) && !asLeaf.has(name);
  if (!isIntermediate) {
    leafTotals[name] = (leafTotals[name] ?? 0) + needed;
    return { name, needed, isLeaf: true, rateMissing: false, children: [] };
  }
  const recipe = recipes.get(name);
  const rate = rates[name];
  const hasRate = rate && rate.outputQty > 0 && recipe && recipe.materials.length > 0;
  if (!hasRate) {
    missingFlag.value = true;
    return { name, needed, isLeaf: false, rateMissing: true, children: [] };
  }
  const children: CalcNode[] = [];
  for (const matName of recipe!.materials) {
    const matQty = rate!.materialQty[matName] ?? 0;
    const childNeed = matQty > 0 ? Math.ceil((needed * matQty) / rate!.outputQty) : 0;
    children.push(calcNode(matName, childNeed, recipes, rates, intermediates, asLeaf, leafTotals, missingFlag));
  }
  return { name, needed, isLeaf: false, rateMissing: false, children };
}

export function calculateCard(
  card: CartCard,
  recipes: Map<string, BarterRecipe>,
  rates: Record<string, BarterRate>,
  intermediates: Set<string>,
  asLeaf: Set<string>
): CalcResult {
  const recipe = recipes.get(card.name);
  const rate = rates[card.name];
  const leafTotals: Record<string, number> = {};
  const missingFlag = { value: false };

  if (!recipe) {
    return {
      tree: { name: card.name, needed: card.ticks, isLeaf: true, rateMissing: false, children: [] },
      leafTotals: { [card.name]: card.ticks },
      hasMissingRate: false,
    };
  }

  const safeRate = rate ?? { outputQty: 0, materialQty: {} };
  const children: CalcNode[] = [];
  for (const matName of recipe.materials) {
    const matQty = safeRate.materialQty[matName] ?? 0;
    const need = matQty * card.ticks;
    children.push(calcNode(matName, need, recipes, rates, intermediates, asLeaf, leafTotals, missingFlag));
  }

  return {
    tree: {
      name: card.name,
      needed: safeRate.outputQty * card.ticks,
      isLeaf: false,
      rateMissing: false,
      children,
    },
    leafTotals,
    hasMissingRate: missingFlag.value,
  };
}

export function mergeLeafTotals(results: CalcResult[]): Record<string, number> {
  const merged: Record<string, number> = {};
  for (const r of results) {
    for (const [name, qty] of Object.entries(r.leafTotals)) {
      merged[name] = (merged[name] ?? 0) + qty;
    }
  }
  return merged;
}
