import type { BarterRecipe, BarterRate, CalcNode, CalcResult, CartCard } from '@/types/barter';

// 게임 내부 비율의 정밀도 차이를 흡수하기 위한 하위 재료 여유분 (+3)
const BUFFER_ADD = 3;

function calcNode(
  name: string,
  needed: number,
  recipes: Map<string, BarterRecipe>,
  rates: Record<string, BarterRate>,
  intermediates: Set<string>,
  asLeaf: Set<string>,
  leafTotals: Record<string, number>,
  intermediateTotals: Record<string, number>,
  missingFlag: { value: boolean }
): CalcNode {
  const isIntermediate = intermediates.has(name) && !asLeaf.has(name);
  if (!isIntermediate) {
    leafTotals[name] = (leafTotals[name] ?? 0) + needed;
    return { name, needed, isLeaf: true, rateMissing: false, children: [] };
  }
  intermediateTotals[name] = (intermediateTotals[name] ?? 0) + needed;
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
    const childNeed = matQty > 0 ? Math.ceil((needed * matQty) / rate!.outputQty) + BUFFER_ADD : 0;
    children.push(calcNode(matName, childNeed, recipes, rates, intermediates, asLeaf, leafTotals, intermediateTotals, missingFlag));
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
  const intermediateTotals: Record<string, number> = {};
  const missingFlag = { value: false };

  if (!recipe) {
    return {
      tree: { name: card.name, needed: card.ticks, isLeaf: true, rateMissing: false, children: [] },
      leafTotals: { [card.name]: card.ticks },
      intermediateTotals: {},
      hasMissingRate: false,
    };
  }

  const safeRate = rate ?? { outputQty: 0, materialQty: {} };
  const children: CalcNode[] = [];
  for (const matName of recipe.materials) {
    const matQty = safeRate.materialQty[matName] ?? 0;
    const need = matQty * card.ticks;
    children.push(calcNode(matName, need, recipes, rates, intermediates, asLeaf, leafTotals, intermediateTotals, missingFlag));
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
    intermediateTotals,
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

export function mergeIntermediateTotals(results: CalcResult[]): Record<string, number> {
  const merged: Record<string, number> = {};
  for (const r of results) {
    for (const [name, qty] of Object.entries(r.intermediateTotals)) {
      merged[name] = (merged[name] ?? 0) + qty;
    }
  }
  return merged;
}

/** 행 체크박스 키 — 카드 안에서 (부모, 품목) 조합으로 행을 식별 */
export function rowKey(cardId: string, parentName: string, name: string): string {
  return `${cardId}|${parentName}|${name}`;
}

/**
 * 체크된 행의 needed 수량을 품목별로 합산.
 * - leaf 행 → leaf 맵, intermediate 행 → intermediate 맵
 * - 카드 트리를 BarterCart 의 flattenChildren 과 동일한 순서로 순회
 */
export function computePreparedTotals(
  results: CalcResult[],
  cardIds: string[],
  checked: Set<string>
): { leaf: Record<string, number>; intermediate: Record<string, number> } {
  const leaf: Record<string, number> = {};
  const intermediate: Record<string, number> = {};
  results.forEach((result, idx) => {
    const cardId = cardIds[idx];
    if (!cardId) return;
    const walk = (node: CalcNode, parentName: string) => {
      for (const c of node.children) {
        if (checked.has(rowKey(cardId, parentName, c.name))) {
          if (c.isLeaf) leaf[c.name] = (leaf[c.name] ?? 0) + c.needed;
          else intermediate[c.name] = (intermediate[c.name] ?? 0) + c.needed;
        }
        if (!c.isLeaf && !c.rateMissing) walk(c, c.name);
      }
    };
    walk(result.tree, result.tree.name);
  });
  return { leaf, intermediate };
}
