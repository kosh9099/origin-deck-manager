import type { BarterRecipe } from '@/types/barter';

const CSV_URL = '/data/barter_materials.csv';

let cache: { recipes: Map<string, BarterRecipe>; intermediates: Set<string> } | null = null;
let inflight: Promise<typeof cache> | null = null;

function parseCsv(text: string): Map<string, BarterRecipe> {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  const map = new Map<string, BarterRecipe>();
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim());
    const [output, category, ...rest] = cols;
    if (!output) continue;
    const materials = rest.filter(m => m && m.length > 0);
    map.set(output, { output, category: category ?? '', materials });
  }
  return map;
}

export async function loadRecipes(): Promise<{ recipes: Map<string, BarterRecipe>; intermediates: Set<string> }> {
  if (cache) return cache;
  if (inflight) return inflight as Promise<NonNullable<typeof cache>>;
  inflight = (async () => {
    const res = await fetch(CSV_URL);
    const text = await res.text();
    const recipes = parseCsv(text);
    const intermediates = new Set(recipes.keys());
    cache = { recipes, intermediates };
    return cache;
  })();
  return inflight as Promise<NonNullable<typeof cache>>;
}

export function isIntermediate(name: string, intermediates: Set<string>): boolean {
  return intermediates.has(name);
}
